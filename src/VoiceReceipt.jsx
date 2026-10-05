import { useEffect, useRef, useState } from 'react';
import { Mic, Square, LoaderCircle } from 'lucide-react';
import { parseVoiceReceipt } from './voiceReceipt.js';
import { request } from './api.js';
import './voiceReceipt.css';

export default function VoiceReceipt({ open, disabled, onApply, onBusyChange }) {
  const [language,setLanguage]=useState('hi-IN');
  const [phase,setPhase]=useState('idle'),[transcript,setTranscript]=useState(''),[message,setMessage]=useState(''),[audioUrl,setAudioUrl]=useState('');
  const recorder=useRef(null),stream=useRef(null),timer=useRef(null),job=useRef(0),pending=useRef(null),preview=useRef('');
  const supported=Boolean(navigator.mediaDevices?.getUserMedia&&window.MediaRecorder)&&window.isSecureContext;
  function releaseMic(){clearTimeout(timer.current);stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;}
  function cancel(){job.current++;pending.current?.abort();pending.current=null;const r=recorder.current;recorder.current=null;if(r){r.onstop=r.ondataavailable=r.onerror=null;if(r.state!=='inactive')r.stop();}releaseMic();if(preview.current){URL.revokeObjectURL(preview.current);preview.current='';}}
  useEffect(()=>{if(!open){cancel();setPhase('idle');setTranscript('');setMessage('');setAudioUrl('');}return cancel;},[open]);
  async function recognise(blob,token){
    if(token!==job.current)return;
    setPhase('transcribing');setMessage('Transcribing on this computer… the first use downloads the open speech model.');
    if(preview.current)URL.revokeObjectURL(preview.current);preview.current=URL.createObjectURL(blob);setAudioUrl(preview.current);
    const controller=new AbortController();pending.current=controller;
    let context;
    try{
      if(blob.size>8*1024*1024)throw new Error('Choose a recording smaller than 8 MB.');
      context=new AudioContext();const decoded=await context.decodeAudioData(await blob.arrayBuffer());await context.close();context=null;
      if(decoded.duration>30.5||decoded.duration<0.1)throw new Error('Please record between 1 and 30 seconds.');
      const offline=new OfflineAudioContext(1,Math.min(480000,Math.ceil(decoded.duration*16000)),16000);
      const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
      const pcm=(await offline.startRendering()).getChannelData(0);
      const bytes=new Uint8Array(pcm.buffer,pcm.byteOffset,pcm.byteLength);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      if(token!==job.current)return;
      const result=await request('/api/transcribe',{method:'POST',signal:controller.signal,body:JSON.stringify({audio:btoa(binary),sampleRate:16000,language})});
      if(token!==job.current)return;
      setTranscript(result.text);setMessage(result.text?'Check the words and amount, then use these details.':'No clear speech was found. Try again or type your note.');
    }catch(error){if(token===job.current&&error.name!=='AbortError')setMessage(error.message||'Could not transcribe this recording. Try again or type the note.');}
    finally{if(context)await context.close().catch(()=>{});if(token===job.current){setPhase('idle');pending.current=null;}}
  }
  async function start(){
    if(!supported||disabled||phase!=='idle')return;
    const token=++job.current;setTranscript('');setMessage('Allow microphone access to record a short note.');setPhase('requesting');
    try{
      const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      if(token!==job.current){media.getTracks().forEach(track=>track.stop());return;}
      stream.current=media;const chunks=[];const r=new MediaRecorder(media);recorder.current=r;
      r.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      r.onerror=()=>{cancel();setPhase('idle');setMessage('The microphone stopped. Try again or use an audio file.');};
      r.onstop=()=>{recorder.current=null;releaseMic();if(token===job.current)recognise(new Blob(chunks,{type:r.mimeType}),token);};
      r.start();setPhase('recording');setMessage('Recording… say the item and amount. Stops after 30 seconds.');timer.current=setTimeout(()=>{if(r.state==='recording')r.stop();},30000);
    }catch(error){releaseMic();if(token===job.current){setPhase('idle');setMessage(error.name==='NotAllowedError'?'Microphone access was denied. Allow it in your browser, use an audio file, or type the note.':'No usable microphone was found. Use an audio file or type the note.');}}
  }
  function upload(event){const file=event.target.files?.[0];event.target.value='';if(!file||phase!=='idle')return;const token=++job.current;setTranscript('');recognise(file,token);}
  const busy=phase!=='idle';const parsed=transcript.trim()?parseVoiceReceipt(transcript):null;
  useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false);},[busy,onBusyChange]);
  return <section className="voice-receipt" aria-label="Speak a receipt">
    <div className="voice-top"><div><h3>Say it. Save the details.</h3><p>“Bijli bill 400 ka aaya hai.”</p></div><Mic size={24} aria-hidden="true"/></div>
    <div className="voice-controls"><label>Speaking language<select value={language} disabled={busy||disabled} onChange={e=>setLanguage(e.target.value)}><option value="hi-IN">हिन्दी / Hindi</option><option value="en-IN">English (India)</option></select></label><button type="button" className={`voice-button ${phase==='recording'?'listening':''}`} disabled={!supported||disabled||['requesting','transcribing'].includes(phase)} onClick={()=>phase==='recording'?recorder.current?.stop():start()}>{phase==='recording'?<><Square size={17}/>Stop recording</>:phase==='transcribing'?<><LoaderCircle size={18} className="spin"/>Transcribing…</>:<><Mic size={18}/>Speak receipt</>}</button></div>
    <label className="voice-upload">Or use a short audio file<input type="file" accept="audio/*" aria-label="Voice receipt audio file" disabled={busy||disabled} onChange={upload}/></label>
    <p className="voice-help">Whisper transcribes on this computer. First use downloads the open model. Only your reviewed text is saved; the recording is kept temporarily for playback here.{!supported?' Microphone recording is unavailable in this browser; upload audio or type below.':''}</p>
    <div className="voice-status" role="status" aria-live="polite">{message}</div>
    {audioUrl&&<audio className="voice-playback" controls src={audioUrl} aria-label="Recorded voice note"/>}
    {transcript&&<div className="voice-review"><label>What we heard<textarea value={transcript} disabled={busy||disabled} maxLength={3000} rows={3} onChange={e=>setTranscript(e.target.value)}/></label>{parsed&&<p className="voice-preview">{parsed.title}{parsed.amount!==null?` · ₹${new Intl.NumberFormat('en-IN').format(parsed.amount)}`:' · check the amount in your note'}</p>}<button type="button" className="quiet-button" disabled={busy||disabled||!parsed} onClick={()=>{onApply(parsed);setTranscript('');setMessage('Details added below. Check them before saving.');}}>Use these details</button></div>}
  </section>;
}
