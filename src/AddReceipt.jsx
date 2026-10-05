import { useRef,useEffect,useState } from 'react';
import { X, Paperclip, LoaderCircle } from 'lucide-react';
import { request } from './api.js';
import VoiceReceipt from './VoiceReceipt.jsx';
import { suggestReceiptDetails } from './receiptSuggestions.js';
export default function AddReceipt({open,onClose,onSaved}) {
  const dialog=useRef(null); const form=useRef(null);
  const [error,setError]=useState('');const [saving,setSaving]=useState(false); const [fileName,setFileName]=useState('');
  const [voiceBusy,setVoiceBusy]=useState(false);
  const extraction=useRef(null);const [reading,setReading]=useState(false);const [readStatus,setReadStatus]=useState('');const [extracted,setExtracted]=useState(null);
  useEffect(()=>{if(open){setError('');setFileName('');setReadStatus('');setExtracted(null);setReading(false);form.current?.reset();dialog.current?.showModal();}else dialog.current?.close();return()=>extraction.current?.abort();},[open]);
  function useExtracted(result) {
    const fields=form.current.elements;const suggestion=suggestReceiptDetails(result.text);
    if(!fields.title.value.trim()&&suggestion.title){fields.title.value=suggestion.title;fields.category.value=suggestion.category;}
    fields.receiptText.value=[fields.receiptText.value.trim(),result.text].filter(Boolean).join('\n\n').slice(0,12000);
    fields.checked.checked=false;setExtracted(null);
  }
  async function readFile(event) {
    extraction.current?.abort();const controller=new AbortController();extraction.current=controller;
    const file=event.target.files[0];setFileName(file?.name||'');setExtracted(null);setReadStatus('');setError('');
    if(!file){setReading(false);return;}setReading(true);
    try {
      const {extractReceipt}=await import('./extractReceipt.js');
      const result=await extractReceipt(file,{signal:controller.signal,onProgress:text=>{if(!controller.signal.aborted)setReadStatus(text);}});
      if(controller.signal.aborted)return;
      if(!result.text.trim())throw new Error('No readable text found. Try a clearer photo, or type the details below.');
      if(!form.current.elements.receiptText.value.trim()){useExtracted(result);setReadStatus(`${result.note} Suggested details are below.`);}
      else {setExtracted(result);setReadStatus(`${result.note} Your existing text is unchanged.`);}
    } catch(e) {if(!controller.signal.aborted)setReadStatus(e.message);}
    finally {if(!controller.signal.aborted)setReading(false);}
  }
  function useVoice(note) {
    const fields=form.current.elements;
    if(!fields.title.value.trim()){fields.title.value=note.title;fields.category.value=note.category;}
    fields.receiptText.value=[fields.receiptText.value.trim(),note.receiptText].filter(Boolean).join('\n\n');
    fields.checked.checked=false;
    fields.receiptText.focus();
  }
  async function save(event) {
    event.preventDefault();setError('');setSaving(true);
    try {
      const data=new FormData(form.current);
      const body={title:data.get('title'),receiptText:data.get('receiptText'),merchant:data.get('merchant'),category:data.get('category'),purchaseDate:data.get('purchaseDate')||null,warrantyEndDate:data.get('warrantyEndDate')||null,checked:data.get('checked')==='on'};
      const file=data.get('attachment');
      if(file?.size) {
        if(file.size>6*1024*1024) throw new Error('Please choose a file smaller than 6 MB.');
        if(!['image/jpeg','image/png','application/pdf'].includes(file.type)) throw new Error('Choose a JPG, PNG or PDF.');
        const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('Could not read this file.'));reader.readAsDataURL(file);});
        body.attachment={name:file.name,type:file.type,data:base64};
      }
      const result=await request('/api/receipts',{method:'POST',body:JSON.stringify(body)});
      onSaved(result.receipt);onClose();
    } catch(e){setError(e.message);}finally{setSaving(false);}
  }
  return <dialog ref={dialog} className="add-dialog" aria-labelledby="add-title" onCancel={event=>{if(saving)event.preventDefault();else onClose();}} onClose={()=>{if(open&&!saving)onClose();}}>
    <div className="dialog-heading"><div><h2 id="add-title">A place for this receipt.</h2><p>Add the details once. Find them when you need them.</p></div><button className="icon-button" aria-label="Close add receipt" disabled={saving} onClick={onClose}><X/></button></div>
    <form ref={form} onSubmit={save}>
      <label className="attachment-label"><span><Paperclip size={17}/> Upload a receipt <span>(optional)</span></span><input name="attachment" type="file" accept="image/png,image/jpeg,application/pdf" disabled={saving||voiceBusy} onChange={readFile}/><small>{fileName||'JPG, PNG or PDF · up to 6 MB · English + Hindi OCR'}</small></label>
      {readStatus&&<p className="field-help" role="status">{reading&&<LoaderCircle className="spin" size={16}/>} {readStatus}</p>}
      {extracted&&<div><details><summary>Preview extracted text</summary><pre style={{whiteSpace:'pre-wrap',maxHeight:180,overflow:'auto'}}>{extracted.text}</pre></details><button type="button" className="quiet-button" onClick={()=>useExtracted(extracted)}>Add extracted text to my notes</button></div>}
      <VoiceReceipt open={open} disabled={saving||reading} onApply={useVoice} onBusyChange={setVoiceBusy}/>
      <label>Receipt title<input name="title" required minLength={2} maxLength={120} placeholder="e.g. Washing machine" autoFocus/></label>
      <div className="field-row"><label>Shop or service provider<input name="merchant" maxLength={120} placeholder="e.g. Home Appliances"/></label><label>Category<select name="category" defaultValue="Appliances"><option>Appliances</option><option>Services</option><option>Other</option></select></label></div>
      <label>Receipt text<textarea name="receiptText" required minLength={20} maxLength={12000} rows={6} placeholder="Paste or type the receipt text, including the item, invoice number and any dates."/></label>
      <p className="field-help">Upload, speak, type or paste. Extracted text can be wrong; check it against the original before saving. Dates stay blank until you confirm them.</p>
      <div className="field-row"><label>Purchase / service date <span>(optional)</span><input name="purchaseDate" type="date"/></label><label>Warranty ends <span>(only if stated)</span><input name="warrantyEndDate" type="date"/></label></div>
      <label className="checkbox-label"><input type="checkbox" name="checked" required/><span>I checked the text and dates against my source. I left unknown dates blank.</span></label>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="quiet-button" disabled={saving} onClick={onClose}>Cancel</button><button className="primary" disabled={saving||reading||voiceBusy}>{saving?<><LoaderCircle className="spin" size={18}/>Saving and indexing…</>:'Save receipt'}</button></div>
    </form>
  </dialog>;
}
