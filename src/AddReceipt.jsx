import { useRef,useEffect,useState } from 'react';
import { X, Paperclip, LoaderCircle } from 'lucide-react';
import { request } from './api.js';
export default function AddReceipt({open,onClose,onSaved}) {
  const dialog=useRef(null); const form=useRef(null);
  const [error,setError]=useState('');const [saving,setSaving]=useState(false); const [fileName,setFileName]=useState('');
  useEffect(()=>{if(open){setError('');setFileName('');form.current?.reset();dialog.current?.showModal();}else dialog.current?.close();},[open]);
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
      <label>Receipt title<input name="title" required minLength={2} maxLength={120} placeholder="e.g. Washing machine" autoFocus/></label>
      <div className="field-row"><label>Shop or service provider<input name="merchant" maxLength={120} placeholder="e.g. Home Appliances"/></label><label>Category<select name="category" defaultValue="Appliances"><option>Appliances</option><option>Services</option><option>Other</option></select></label></div>
      <label>Receipt text<textarea name="receiptText" required minLength={20} maxLength={12000} rows={6} placeholder="Paste or type the receipt text, including the item, invoice number and any dates."/></label>
      <p className="field-help">Enter the text yourself. This version does not read photos automatically.</p>
      <div className="field-row"><label>Purchase / service date <span>(optional)</span><input name="purchaseDate" type="date"/></label><label>Warranty ends <span>(only if stated)</span><input name="warrantyEndDate" type="date"/></label></div>
      <label className="attachment-label"><span><Paperclip size={17}/> Original receipt <span>(optional)</span></span><input name="attachment" type="file" accept="image/png,image/jpeg,application/pdf" onChange={event=>setFileName(event.target.files[0]?.name||'')}/><small>{fileName||'JPG, PNG or PDF · up to 6 MB'}</small></label>
      <label className="checkbox-label"><input type="checkbox" name="checked" required/><span>I checked the text and dates against my source. I left unknown dates blank.</span></label>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="quiet-button" disabled={saving} onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving?<><LoaderCircle className="spin" size={18}/>Saving and indexing…</>:'Save receipt'}</button></div>
    </form>
  </dialog>;
}
