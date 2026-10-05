import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {transcribe,disposeTranscriber} from '../server/transcription.js';
import {parseVoiceReceipt} from '../src/voiceReceipt.js';
const results=[];
try{
 for(const [name,language,voice,prompt] of [
  ['hindi','hi-IN','Murf Shweta','बिजली का बिल चार सौ रुपये आया है।'],
  ['english','en-IN','Murf Isha','The electricity bill is four hundred rupees.']
 ]){
  const bytes=await readFile(`tests/fixtures/voice-${name}.pcm`);
  const audio=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  const started=performance.now();const result=await transcribe(audio,language);const parsed=parseVoiceReceipt(result.text);
  assert.equal(parsed.title,'Electricity bill');assert.equal(parsed.amount,400);assert.equal(parsed.category,'Services');
  results.push({language,voice,prompt,audio:'Synthetic speech, mono 16 kHz float32 PCM',sha256:createHash('sha256').update(bytes).digest('hex'),transcript:result.text,title:parsed.title,amount:parsed.amount,model:result.model,elapsedMs:Math.round(performance.now()-started)});
 }
 const report={verifiedAt:new Date().toISOString(),results,note:'Two synthetic development fixtures, not a general accuracy benchmark. Hindi parser normalization was adjusted using these fixtures. No mother feedback or recording is included.'};
 await writeFile('docs/VOICE-VERIFICATION.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await disposeTranscriber();}
