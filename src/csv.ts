import { axes, centres, validate, type Result } from './model';
const columns=['codi_centre','centre','comarca','municipi','data','participants','procediment','estat','eix','debatut','objectiu','ordre','esmena','observacions'];
export function csv(rows: unknown[][]) {
  return '\uFEFF'+rows.map(row=>row.map(value=> {
    let s=String(value??'');
    if(/^[=+@-]/.test(s)) s="'"+s;
    return '"'+s.replaceAll('"','""')+'"';
  }).join(';')).join('\r\n');
}
export function recordsCsv(records: Result[]) {
  return csv([[...columns,'amb_prioritat'],...records.flatMap(r=>axes.flatMap(a=> {
    const v=r.axes[a.id];
    return (v.priorities.length?v.priorities:['']).map((id,index)=>[r.centre.id,r.centre.name,r.centre.comarca,r.centre.municipi,r.date,r.participants,r.procedure,r.status,a.id,v.reviewed?'sí':'no',id,id&&v.ranked!==false?index+1:'',v.amendment,r.notes,v.ranked===undefined?'':v.ranked?'sí':'no']);
  }))]);
}
function readCsv(text: string) {
  const separator=text.split(/\r?\n/)[0].includes(';')?';':',';
  const rows:string[][]=[]; let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"'){if(quoted && text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===separator && !quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r') && !quoted){if(c==='\r' && text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean)) rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted) throw Error('El CSV conté cometes sense tancar.');
  row.push(cell);if(row.some(Boolean))rows.push(row);
  return rows;
}
export function parseRecordsCsv(text: string):Result[] {
  const rows=readCsv(text.replace(/^\uFEFF/,''));
  const header=rows.shift();
  if(!header || columns.some(c=>!header.includes(c))) throw Error('Falten columnes al CSV. Descarrega la plantilla per veure el format.');
  if(rows.length>150000) throw Error('El CSV és massa gran.');
  const output=new Map<string,Result>();
  const orders=new Map<string,Map<number,string>>();
  const unordered=new Map<string,string[]>();
  for(const [index,row] of rows.entries()) {
    const value=Object.fromEntries(header.map((h,i)=>[h,(row[i]||'').replace(/^'(?=[=+@-])/,'')]));
    const centre=centres.find(c=>c.id===value.codi_centre)||{id:value.codi_centre,name:value.centre,comarca:value.comarca,municipi:value.municipi};
    const reviewed=['sí','si','true','1'].includes(value.debatut.toLowerCase());
    if(!['sí','si','true','1','no','false','0'].includes(value.debatut.toLowerCase()))throw Error(`Fila ${index+2}: "debatut" ha de ser sí o no.`);
    const axis=axes.find(a=>a.id===value.eix);
    if(!axis)throw Error(`Fila ${index+2}: eix desconegut.`);
    const metadata={centre,date:value.data,participants:value.participants.trim()===''?null:Number(value.participants),procedure:value.procediment,status:value.estat as Result['status'],notes:value.observacions,revision:0};
    let result=output.get(centre.id);
    if(!result){result={...metadata,axes:Object.fromEntries(axes.map(a=>[a.id,{reviewed:false,priorities:[],amendment:''}]))};output.set(centre.id,result);}
    else if(JSON.stringify({...result,axes:undefined})!==JSON.stringify(metadata))throw Error(`Fila ${index+2}: dades de centre, data, participants o estat contradictòries.`);
    const key=centre.id+':'+axis.id;
    const mode=(value.amb_prioritat||'').trim().toLowerCase();
    if(mode && !['sí','si','true','1','no','false','0'].includes(mode))throw Error(`Fila ${index+2}: "amb_prioritat" ha de ser sí o no.`);
    const ranked=mode?['sí','si','true','1'].includes(mode):undefined;
    if(orders.has(key) && (result.axes[axis.id].reviewed!==reviewed || result.axes[axis.id].amendment!==value.esmena))throw Error(`Fila ${index+2}: dades contradictòries per al mateix eix.`);
    if(orders.has(key) && result.axes[axis.id].ranked!==ranked)throw Error(`Fila ${index+2}: el mateix eix barreja objectius amb ordre i sense ordre.`);
    if(!orders.has(key))orders.set(key,new Map());
    result.axes[axis.id].reviewed=reviewed;result.axes[axis.id].amendment=value.esmena;
    if(ranked!==undefined)result.axes[axis.id].ranked=ranked;
    if(value.objectiu){
      if(ranked===false){
        if(value.ordre.trim())throw Error(`Fila ${index+2}: deixa l’ordre buit per als objectius sense prioritat.`);
        const ids=unordered.get(key)||[];
        if(ids.includes(value.objectiu))throw Error(`Fila ${index+2}: objectiu duplicat.`);
        ids.push(value.objectiu);unordered.set(key,ids);continue;
      }
      const n=Number(value.ordre), ranking=orders.get(key)!;
      if(!Number.isSafeInteger(n) || n<1 || n>axis.items.length || ranking.has(n) || [...ranking.values()].includes(value.objectiu))throw Error(`Fila ${index+2}: ordre o objectiu duplicat o incorrecte.`);
      ranking.set(n,value.objectiu);
    }else if(value.ordre.trim())throw Error(`Fila ${index+2}: hi ha un ordre sense objectiu.`);
  }
  for(const result of output.values())for(const axis of axes){
    if(result.axes[axis.id].ranked===false){result.axes[axis.id].priorities=unordered.get(result.centre.id+':'+axis.id)||[];continue;}
    const sorted=[...(orders.get(result.centre.id+':'+axis.id)||[])].sort(([a],[b])=>a-b);
    if(sorted.some(([n],i)=>n!==i+1))throw Error(`L’ordre de ${result.centre.name} / ${axis.name} ha de ser consecutiu des d’1.`);
    result.axes[axis.id].priorities=sorted.map(([,id])=>id);
  }
  return [...output.values()].map(validate);
}
