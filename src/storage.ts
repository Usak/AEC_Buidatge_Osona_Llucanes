import {FORMAT,parseBackup,validate,type Result} from './model';
export const STORAGE_KEY='aec-osona-llucanes-results-v1';
function readSync():Result[]{
  const stored=localStorage.getItem(STORAGE_KEY);
  if(!stored)return [];
  try{return parseBackup(JSON.parse(stored));}
  catch{throw Error('La còpia desada en aquest navegador no es pot llegir. Conserva-la i recupera una còpia JSON abans de continuar.');}
}
export async function readResults():Promise<Result[]>{return readSync();}
export async function saveResult(input:Result):Promise<Result>{
  const save=()=>{
    const record=validate(input),records=readSync();
    const current=records.find(r=>r.centre.id===record.centre.id);
    if((current?.revision||0)!==record.revision)throw Error('Ja hi ha una versió més recent d’aquest centre. Recarrega els resultats abans de tornar a desar.');
    const saved={...record,revision:record.revision+1,updatedAt:new Date().toISOString()};
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({format:FORMAT,records:[saved,...records.filter(r=>r.centre.id!==saved.centre.id)]}));}
    catch{throw Error('No s’ha pogut desar al navegador. Comprova l’espai disponible i descarrega la fitxa JSON per conservar els acords.');}
    return saved;
  };
  return navigator.locks? navigator.locks.request(STORAGE_KEY,save):save();
}
