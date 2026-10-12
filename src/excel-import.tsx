import {useState} from 'react';
import {axes,type Centre,type Result} from './model';
import {excelResult,type ExcelPreview} from './excel';
export default function ExcelImport({preview,centres,onCancel,onContinue}:{preview:ExcelPreview;centres:Centre[];onCancel:()=>void;onContinue:(result:Result)=>void}){
  const [centreId,setCentreId]=useState(preview.suggestedCentreId),[date,setDate]=useState(''),[participants,setParticipants]=useState('');
  const [procedure,setProcedure]=useState('Selecció amb X al full Excel'),[validated,setValidated]=useState(false),[error,setError]=useState('');
  const [reviewed,setReviewed]=useState<Record<string,boolean>>(Object.fromEntries(preview.axes.map(a=>[a.axisId,a.reviewed])));
  const [selections,setSelections]=useState<Record<string,string[]>>(Object.fromEntries(preview.axes.map(a=>[a.axisId,[...a.priorities]])));
  const total=preview.axes.reduce((sum,a)=>sum+(reviewed[a.axisId]?selections[a.axisId].length:0),0);
  function submit(e:React.FormEvent){
    e.preventDefault();setError('');
    const centre=centres.find(c=>c.id===centreId);if(!centre){setError('Tria el centre al qual corresponen aquests resultats.');return;}
    try{onContinue(excelResult(preview,{centre,date,participants:participants.trim()?Number(participants):null,procedure,status:validated?'validated':'draft'},reviewed,selections));}
    catch(e){setError(e instanceof Error?e.message:'No s’han pogut preparar els resultats.');}
  }
  return <div className="modal-backdrop"><section className="modal excel-modal" role="dialog" aria-modal="true" aria-labelledby="excel-title">
    <div className="eix-num">IMPORTACIÓ EXCEL · REVISIÓ DE LES MARQUES</div><h2 id="excel-title">Revisar el full de càlcul</h2>
    <p className="excel-file">{preview.fileName}</p><p>{preview.axes.length} eixos detectats · <strong>{total} objectius seleccionats</strong> · Sense ordre de prioritat</p>
    <form onSubmit={submit}><div className="form-grid">
      <label className="wide">Centre del full Excel<select required value={centreId} onChange={e=>setCentreId(e.target.value)}><option value="">Tria el centre…</option>{centres.map(c=><option key={c.id} value={c.id}>{c.name} · {c.municipi}</option>)}</select></label>
      <label>Data de l’assemblea<input type="date" value={date} onInput={e=>setDate(e.currentTarget.value)} onChange={e=>setDate(e.target.value)}/></label>
      <label>Participants <span className="optional">(opcional)</span><input type="number" min="1" max="100000" step="1" value={participants} onChange={e=>setParticipants(e.target.value)}/></label>
      <label className="wide">Procediment acordat<input maxLength={2000} value={procedure} onChange={e=>setProcedure(e.target.value)}/></label>
    </div><p className="fine">Confirma el centre suggerit a partir del nom del fitxer. La data i els participants no s’inventen: completa’ls si els coneixes.</p>
    {preview.warnings.length>0&&<div className="note compact"><strong>Correspondències que cal revisar</strong>{preview.warnings.map((w,i)=><p key={i}>{w}</p>)}</div>}
    {preview.issues.length>0&&<div className="error excel-issues" role="alert"><strong>Cal corregir {preview.issues.length} files de l’Excel abans de continuar</strong><ul>{preview.issues.map((issue,i)=><li key={i}><strong>{issue.sheetName} · fila {issue.row}</strong><span>{issue.text}</span><small>Marca: {issue.mark}. Fes servir X/x a la columna B i un enunciat de la plantilla o un codi d’objectiu reconegut.</small></li>)}</ul><p>Les files sense correspondència no s’importen automàticament. Corregeix el fitxer i torna’l a seleccionar.</p></div>}
    <div className="excel-axes">{preview.axes.map(entry=>{
      const axis=axes.find(a=>a.id===entry.axisId)!;
      return <section className="excel-axis" key={entry.axisId}><div className="excel-axis-header"><label className="check"><input type="checkbox" checked={reviewed[entry.axisId]} onChange={e=>setReviewed({...reviewed,[entry.axisId]:e.target.checked})}/><strong>{axis.name}: eix debatut</strong></label><span>{reviewed[entry.axisId]?selections[entry.axisId].length:0} seleccionats</span></div>
        <details><summary>Veure objectius i esmenes detectats</summary><p className="fine">{entry.recognized} enunciats reconeguts · Les marques X no determinen cap ordre.</p>
          {!entry.priorities.length&&<p className="muted">Sense objectius marcats. Si l’eix s’ha debatut sense seleccionar-ne cap, marca «eix debatut».</p>}
          {entry.priorities.map(id=><label className="check excel-objective" key={id}><input type="checkbox" disabled={!reviewed[entry.axisId]} checked={selections[entry.axisId].includes(id)} onChange={e=>setSelections({...selections,[entry.axisId]:e.target.checked?[...selections[entry.axisId],id]:selections[entry.axisId].filter(x=>x!==id)})}/><span><span className="code">{id}</span>{axis.items.find(i=>i.id===id)?.title}</span></label>)}
          {entry.amendment&&<div className="excel-amendment"><strong>Esmenes del full</strong><p>{entry.amendment}</p></div>}
        </details>{!reviewed[entry.axisId]&&<p className="fine">Aquest eix queda pendent; no s’importen les seves seleccions ni esmenes.</p>}</section>;
    })}</div>
    <label className="check"><input type="checkbox" checked={validated} onChange={e=>setValidated(e.target.checked)}/>Validar el resultat perquè compti al buidatge (cal data i almenys un eix debatut)</label>
    {error&&<p className="error" role="alert">{error}</p>}
    <p className="fine">Pots continuar com a esborrany. La pantalla següent et demanarà confirmació i et permetrà conservar el resultat existent del centre.</p>
    <div className="modal-actions"><button type="button" className="secondary" onClick={onCancel}>Cancel·lar</button><button type="submit" disabled={preview.issues.length>0}>Revisar importació</button></div>
    </form>
  </section></div>;
}
