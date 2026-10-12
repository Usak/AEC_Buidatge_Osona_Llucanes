import {axes,centres,blank,validate,type Centre,type Result} from './model';
import reference from './data/excel-template.json';
export type ExcelAxis={axisId:string;sheetName:string;priorities:string[];amendment:string;reviewed:boolean;recognized:number};
export type ExcelIssue={sheetName:string;row:number;text:string;mark:string};
export type ExcelPreview={fileName:string;axes:ExcelAxis[];issues:ExcelIssue[];warnings:string[];suggestedCentreId:string};
type Cell={v?:unknown;f?:string};
export type Workbook={SheetNames:string[];Sheets:Record<string,Record<string,Cell|unknown>>};
type XlsxApi={read:(buffer:ArrayBuffer|Uint8Array,options:Record<string,unknown>)=>Workbook};
const normalize=(s:unknown)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f\u200b-\u200f\u2060\ufeff]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const groups=new Set(['GENERAL','0-3','PAE','FP','LLEURE','PRIMER CICLE INFANTIL (0-3)','SEGON CICLE INFANTIL (3-6)','ALTRES','PRIMÀRIA','EAP','PRIMER I SEGON CICLE INFANTIL: 0-3, 3-6','ÀREA DE MÚSICA','CIÈNCIES EN PERILL','FILOSOFIA AL BATXILLERAT','GENERAL SECUNDÀRIA','Aclariment PAE:'].map(normalize));
const lookups=new Map(axes.map(a=>{
  const items=new Map<string,string[]>();
  for(const item of a.items){items.set(normalize(item.id+' '+item.title),[item.id]);items.set(normalize(item.title),[item.id]);items.set(normalize(item.description),[item.id]);}
  for(const item of reference.find(r=>r.axisId===a.id)?.items||[])items.set(normalize(item.text),item.ids);
  return [a.id,items];
}));
function axisForSheet(name:string){
  const n=normalize(name).replace(/^eix\s*\d*\s*/,'').replace(/^\d+\s*/,'');
  return axes.find(a=>[normalize(a.id),normalize(a.name),normalize(reference.find(r=>r.axisId===a.id)?.sheetName||'').replace(/^eix\s*\d*\s*/,''),...(a.id==='llengua'?['catala','llengua catalana']:[]),...(a.id==='inclusiva'?['educacio inclusiva','inclusio']:[]),...(a.id==='democracia'?['democracia']:[]),...(a.id==='infraestructures'?['infraestructures','infrastructures']:[])].includes(n));
}
function marked(v:unknown){return v===true||v===1||['x','si','true','✓','✔','☑'].includes(String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));}
function value(sheet:Workbook['Sheets'][string],address:string){const c=sheet[address] as Cell|undefined;return c?.v??'';}
function matchIds(axisId:string,text:string){
  const axis=axes.find(a=>a.id===axisId)!;
  const code=text.match(/^\s*\[?([A-Z]\d{2})\]?\s*(?:[.·:\-–—]|\s|$)/i)?.[1]?.toUpperCase();
  if(code&&axis.items.some(i=>i.id===code))return [code];
  return lookups.get(axisId)!.get(normalize(text));
}
export function parseExcelWorkbook(workbook:Workbook,fileName:string):ExcelPreview{
  if(!Array.isArray(workbook.SheetNames)||workbook.SheetNames.length>100)throw Error('El llibre Excel té massa fulls o no es pot llegir.');
  const result:ExcelPreview={fileName,axes:[],issues:[],warnings:[],suggestedCentreId:''};
  const found=new Set<string>();
  for(const name of workbook.SheetNames){
    const axis=axisForSheet(name);if(!axis)continue;
    if(found.has(axis.id))throw Error(`Hi ha dos fulls per a l’eix ${axis.name}. Importa un únic centre per llibre Excel.`);
    found.add(axis.id);
    const sheet=workbook.Sheets[name];
    const addresses=Object.keys(sheet).filter(k=>/^[A-Z]+\d+$/.test(k));
    const rowNumbers=[...new Set(addresses.map(k=>Number(k.match(/\d+$/)![0])))].sort((a,b)=>a-b);
    if(rowNumbers.some(n=>n>10000)||addresses.length>200000)throw Error(`El full ${name} supera el límit de mida (10.000 files).`);
    let amendments=false,recognized=0;const priorities:string[]=[],notes:string[]=[];
    for(const row of rowNumbers){
      const text=String(value(sheet,'A'+row)).trim(),mark=value(sheet,'B'+row);
      const b=String(mark??'').trim();
      if(normalize(text).startsWith('esmenes')){
        amendments=true;
        const sameRow=addresses.filter(k=>k!=='A'+row&&Number(k.match(/\d+$/)![0])===row).map(k=>String(value(sheet,k)).trim()).filter(Boolean);
        if(sameRow.length)notes.push(sameRow.join('\n'));
        continue;
      }
      if(amendments){
        const values=addresses.filter(k=>Number(k.match(/\d+$/)![0])===row).sort((a,b)=>a.localeCompare(b)).map(k=>String(value(sheet,k)).trim()).filter(Boolean);
        if(values.length)notes.push(values.join('\n'));continue;
      }
      if(!text && !b)continue;
      if(normalize(b).startsWith('no votar'))continue;
      if(!text){if(marked(mark))result.issues.push({sheetName:name,row,text:'Marca sense enunciat a la columna A',mark:b});continue;}
      if(groups.has(normalize(text))){if(marked(mark))result.issues.push({sheetName:name,row,text,mark:b});continue;}
      const ids=matchIds(axis.id,text);
      if(ids)recognized++;
      if(!marked(mark)){
        const formula=(sheet['B'+row] as Cell|undefined)?.f;
        if(formula&&(mark===''||mark===undefined))result.issues.push({sheetName:name,row,text,mark:'Fórmula sense resultat desat. Recalcula i desa el llibre.'});
        else if(b&&!['no','false','0','-'].includes(normalize(b))&&!normalize(b).startsWith('marqueu'))result.issues.push({sheetName:name,row,text,mark:b});
        continue;
      }
      if(!ids){result.issues.push({sheetName:name,row,text,mark:b});continue;}
      for(const id of ids){
        if(priorities.includes(id))throw Error(`El full ${name} selecciona dues vegades l’objectiu ${id}. Revisa les files duplicades.`);
        priorities.push(id);
      }
      if(ids.length>1)result.warnings.push(`${name}, fila ${row}: l’enunciat agrupa ${ids.join(' i ')}. La marca selecciona tots dos objectius; revisa’ls abans de desar.`);
    }
    if(!recognized&&!priorities.length&&!notes.length)throw Error(`El full ${name} no conté objectius reconeguts de la plantilla.`);
    result.axes.push({axisId:axis.id,sheetName:name,priorities,amendment:notes.join('\n\n'),reviewed:priorities.length>0||notes.length>0,recognized});
  }
  if(!result.axes.length)throw Error('No hi ha fulls d’eixos reconeguts. Cal un full per eix (EIX SALARIS, EIX RÀTIOS…) amb els objectius a A i les marques X a B.');
  const filename=normalize(fileName.replace(/\.xlsx$/i,'').replace(/plantilla|exemple|buidatge/gi,'').replace(/\bie\b/gi,'Institut Escola'));
  const candidates=centres.filter(c=>normalize(c.name)===filename||normalize(c.name).replace(/^(institut escola|escola|institut) /,'')===filename.replace(/^(institut escola|escola|institut) /,''));
  if(candidates.length===1)result.suggestedCentreId=candidates[0].id;
  return result;
}
export function excelResult(preview:ExcelPreview,metadata:{centre:Centre;date:string;participants:number|null;procedure:string;status:Result['status']},reviewed:Record<string,boolean>,selections?:Record<string,string[]>):Result{
  if(preview.issues.length)throw Error('Cal corregir les marques o els objectius no reconeguts a l’Excel abans d’importar-lo.');
  const result={...blank(metadata.centre),...metadata};
  for(const entry of preview.axes){
    const ids=selections?.[entry.axisId]??entry.priorities;
    const wasReviewed=reviewed[entry.axisId]??entry.reviewed;
    result.axes[entry.axisId]={reviewed:wasReviewed,priorities:wasReviewed?[...ids]:[],amendment:wasReviewed?entry.amendment:'',ranked:false};
  }
  return validate(result);
}
let libraryPromise:Promise<XlsxApi>|undefined;
function loadLibrary():Promise<XlsxApi>{
  const global=window as unknown as {XLSX?:XlsxApi};
  if(global.XLSX)return Promise.resolve(global.XLSX);
  if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=new URL('./vendor/xlsx-0.20.3.min.js',document.baseURI).href;
    script.onload=()=>global.XLSX?resolve(global.XLSX):reject(Error('No s’ha pogut preparar el lector Excel.'));
    script.onerror=()=>{script.remove();libraryPromise=undefined;reject(Error('No s’ha pogut carregar el lector Excel. Recarrega la web i torna-ho a provar.'));};
    document.head.appendChild(script);
  });
  return libraryPromise;
}
export async function readExcel(buffer:ArrayBuffer|Uint8Array,fileName:string,api?:XlsxApi):Promise<ExcelPreview>{
  const xlsx=api||await loadLibrary();let workbook:Workbook;
  try{workbook=xlsx.read(buffer,{type:'array',cellFormula:true,cellHTML:false,cellDates:false});}
  catch{throw Error('No es pot llegir l’Excel. Comprova que sigui un .xlsx vàlid i que no estigui protegit amb contrasenya.');}
  return parseExcelWorkbook(workbook,fileName);
}
