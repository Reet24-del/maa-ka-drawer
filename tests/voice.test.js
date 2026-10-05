import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceReceipt } from '../src/voiceReceipt.js';
import { decodePcm } from '../server/transcription.js';
test('voice samples reject NaN, clipping and recordings longer than the limit',()=>{
 for(const samples of [new Float32Array(16000).fill(NaN),new Float32Array(16000).fill(2),new Float32Array(480001)])assert.throws(()=>decodePcm(Buffer.from(samples.buffer).toString('base64')));
 assert.equal(decodePcm(Buffer.from(new Float32Array(16000).fill(.2).buffer).toString('base64')).length,16000);
});
test('Hinglish electricity note becomes an editable service receipt with the stated amount',()=>{
 const r=parseVoiceReceipt('bijli bill 400 ka aaya hai');
 assert.equal(r.title,'Electricity bill');assert.equal(r.category,'Services');assert.equal(r.amount,400);
 assert.match(r.receiptText,/₹400/);assert.match(r.receiptText,/bijli bill 400 ka aaya hai/);
 assert.match(r.receiptText,/not an original merchant invoice/);assert.equal(r.purchaseDate,undefined);
});
test('Hindi digits and common spoken hundreds are recognised',()=>{
 for(const phrase of ['बिजली बिल ४०० का आया है','बिजली बिल चार सौ का आया है','bijli bill chaar sau ka aaya hai','electricity bill four hundred rupees'])assert.equal(parseVoiceReceipt(phrase).amount,400,phrase);
 assert.equal(parseVoiceReceipt('internet bill one thousand two hundred and fifty rupees').amount,1250);
 assert.equal(parseVoiceReceipt('gas bill ₹1,250.50').amount,1250.5);
 assert.equal(parseVoiceReceipt('बिजली का बिल चार सो रुपी आया है').amount,400);
 assert.equal(parseVoiceReceipt('चार सो गए').amount,null);
});
test('ambiguous amounts, dates, negative values and absent amounts are not guessed',()=>{
 for(const phrase of ['bijli bill 400 ka aur 200 ka','electricity bill 14 September 2026','water bill 14/09/2026','bijli bill -400 ka','electricity bill has arrived','phone number 9876543210'])assert.equal(parseVoiceReceipt(phrase).amount,null,phrase);
});
test('unrecognised items preserve the original words and use a neutral title',()=>{
 const r=parseVoiceReceipt('picked up something for the kitchen');assert.equal(r.title,'Voice receipt');assert.equal(r.category,'Other');assert.ok(r.receiptText.includes(r.transcript));
});
