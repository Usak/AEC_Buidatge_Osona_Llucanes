import axesData from './data/axes.json';
import centresData from './data/centres.json';
export const axes = axesData;
export const centres = centresData;
export const FORMAT = 'aec-osona-llucanes-v1';
export type Centre = { id: string; name: string; comarca: string; municipi: string; naturalesa?: string; tipus?: string };
export type Result = { centre: Centre; date: string; participants: number | null; procedure: string; status: 'draft' | 'validated'; axes: Record<string, { reviewed: boolean; priorities: string[]; amendment: string; ranked?: boolean }>; notes: string; revision: number; updatedAt?: string };
export function blank(centre: Centre): Result {
  return {centre, date:'', participants:null, procedure:'Acord de l’assemblea', status:'draft', axes:Object.fromEntries(axes.map(a=>[a.id,{reviewed:false,priorities:[],amendment:''}])), notes:'', revision:0};
}
export function validate(input: unknown): Result {
  const r = input as Result;
  if (!r || typeof r !== 'object' || !r.centre || typeof r.centre.id !== 'string') throw Error('Falta identificar el centre.');
  const known = centres.find(c=>c.id===r.centre.id);
  const bounded = (s: unknown, max: number) => typeof s === 'string' && s.length <= max;
  if (!known && (!/^ALT-[a-zA-Z0-9-]{1,60}$/.test(r.centre.id) || !bounded(r.centre.name,200) || !r.centre.name.trim() || !bounded(r.centre.municipi,120) || !r.centre.municipi.trim() || !['Osona','Lluçanès'].includes(r.centre.comarca))) throw Error('Centre desconegut o dades del centre incompletes.');
  if (!['draft','validated'].includes(r.status)) throw Error('Estat de la fitxa incorrecte.');
  if (r.date !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !Number.isFinite(Date.parse(r.date)) || new Date(r.date).toISOString().slice(0,10)!==r.date)) throw Error('Data no vàlida.');
  if (r.participants!==null && (!Number.isSafeInteger(r.participants) || r.participants<1 || r.participants>100000)) throw Error('El nombre de participants ha de ser un enter positiu o quedar buit.');
  if (!bounded(r.procedure,2000) || !bounded(r.notes,10000)) throw Error('Procediment o observacions massa llargs.');
  if (!Number.isSafeInteger(r.revision) || r.revision<0) throw Error('Versió del resultat no vàlida.');
  const normalized: Result = {...r, centre: known || {id:r.centre.id,name:r.centre.name.trim(),comarca:r.centre.comarca,municipi:r.centre.municipi.trim()}, axes:{}};
  for (const a of axes) {
    const v=r.axes?.[a.id];
    if (!v || typeof v.reviewed!=='boolean' || (v.ranked!==undefined && typeof v.ranked!=='boolean') || !Array.isArray(v.priorities) || v.priorities.length> a.items.length || new Set(v.priorities).size!==v.priorities.length || v.priorities.some(id=>!a.items.some(i=>i.id===id)) || !bounded(v.amendment,10000)) throw Error(`Dades no vàlides a l’eix ${a.name}.`);
    if (!v.reviewed && (v.priorities.length || v.amendment.trim())) throw Error(`Marca com a debatut l’eix ${a.name} per desar-ne els acords.`);
    normalized.axes[a.id]={reviewed:v.reviewed,priorities:[...v.priorities],amendment:v.amendment,...(v.ranked===undefined?{}:{ranked:v.ranked})};
  }
  if (r.status==='validated' && (!r.date || !r.procedure.trim() || !axes.some(a=>r.axes[a.id].reviewed))) throw Error('Per validar cal la data, el procediment i almenys un eix debatut.');
  return normalized;
}
export function aggregate(records: Result[], axisId: string) {
  const eligible=records.filter(r=>r.status==='validated' && r.axes[axisId]?.reviewed);
  const axis=axes.find(a=>a.id===axisId)!;
  return {denominator:eligible.length, rows:axis.items.map(item=> {
    const count=eligible.filter(r=>r.axes[axisId].priorities.includes(item.id)).length;
    const ranks=eligible.filter(r=>r.axes[axisId].ranked!==false).map(r=>r.axes[axisId].priorities.indexOf(item.id)+1).filter(n=>n>0);
    return {...item, count, rankedCount:ranks.length, percent:eligible.length ? count/eligible.length*100:0, mean:ranks.length ? ranks.reduce((s,n)=>s+n,0)/ranks.length:null};
  }).sort((a,b)=>b.count-a.count || (a.mean ?? Infinity)-(b.mean ?? Infinity) || a.id.localeCompare(b.id))};
}
export function parseBackup(value: unknown): Result[] {
  const data=value as {format:string;records:Result[]};
  if (!data || data.format!==FORMAT || !Array.isArray(data.records) || data.records.length>1000) throw Error('El fitxer ha de ser una còpia JSON exportada amb aquesta web (màxim 1.000 centres).');
  const records=data.records.map(validate);
  if (new Set(records.map(r=>r.centre.id)).size!==records.length) throw Error('El fitxer conté més d’un resultat per al mateix centre.');
  return records;
}
