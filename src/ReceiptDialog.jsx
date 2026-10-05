import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import ReceiptDetail from './ReceiptDetail.jsx';

export default function ReceiptDialog({ open, receipt, onClose, onArchive, archiving }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (!open) { element.close(); return; }
    element.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; element.close(); };
  }, [open]);
  return <dialog ref={dialog} className="receipt-dialog" aria-label={`${receipt?.title || 'Saved'} receipt`} onCancel={onClose} onClose={onClose}>
    <button className="icon-button close-receipt" aria-label="Close receipt" onClick={onClose} autoFocus><X size={22}/></button>
    {open && <ReceiptDetail receipt={receipt} onArchive={onArchive} archiving={archiving}/>}
  </dialog>;
}
