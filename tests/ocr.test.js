import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readReceiptImage,disposeOcr } from '../server/ocr.js';
import { suggestReceiptDetails } from '../src/receiptSuggestions.js';
test('OCR recognises a real image fixture and suggests its bill type',async()=>{
  try {
    const result=await readReceiptImage(await readFile(new URL('./fixtures/electricity-demo.png',import.meta.url)));
    assert.match(result.text,/ELECTRICITY BILL/i);
    assert.match(result.text,/400\.00/);
    assert.match(result.text,/OCR-DEMO-400/);
    assert.deepEqual(suggestReceiptDetails(result.text),{title:'Electricity bill',category:'Services'});
  } finally {await disposeOcr();}
});
test('receipt suggestions leave unknown and multi-item documents for manual classification',()=>{
  assert.equal(suggestReceiptDetails('washing machine and refrigerator').title,'');
  assert.equal(suggestReceiptDetails('Receipt 003 for miscellaneous goods').title,'');
  assert.equal(suggestReceiptDetails('बिजली बिल ४०० रुपये').title,'Electricity bill');
  assert.equal(suggestReceiptDetails('Electric kettle invoice').title,'Electric kettle');
});
