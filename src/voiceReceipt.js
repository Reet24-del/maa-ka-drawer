const types = [
  { pattern: /बिजली|\bbijli\b|\beejli\b|\belectricity\b|\belectric bill\b/iu, title: 'Electricity bill', category: 'Services' },
  { pattern: /पानी|\bpaani\b|\bpani\b|\bwater bill\b/iu, title: 'Water bill', category: 'Services' },
  { pattern: /गैस|सिलेंडर|\bgas\b|\blpg\b|\bcylinder\b/iu, title: 'Gas bill', category: 'Services' },
  { pattern: /इंटरनेट|ब्रॉडबैंड|\binternet\b|\bbroadband\b|\bwifi\b/iu, title: 'Internet bill', category: 'Services' },
  { pattern: /मोबाइल|फोन|रिचार्ज|\bmobile\b|\bphone\b|\brecharge\b/iu, title: 'Mobile bill', category: 'Services' },
];
const small = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,एक:1,दो:2,तीन:3,चार:4,पांच:5,पाँच:5,छह:6,सात:7,आठ:8,नौ:9,दस:10,बीस:20,तीस:30,चालीस:40,पचास:50,साठ:60,सत्तर:70,अस्सी:80,नब्बे:90,ek:1,do:2,teen:3,char:4,chaar:4,paanch:5,panch:5,chhe:6,saat:7,aath:8,nau:9};
const scale = {hundred:100,thousand:1000,sau:100,hazaar:1000,hazar:1000,सौ:100,हजार:1000,हज़ार:1000};
function numberPhrases(text) {
  const words=text.split(/\s+/);const out=[];
  for(let i=0;i<words.length;i++){
    let j=i,total=0,group=0,hasScale=false;
    while(j<words.length){const w=words[j].replace(/[,.!?]/g,'').toLowerCase();
      if(Object.hasOwn(small,w)){group+=small[w];j++;}
      else if(Object.hasOwn(scale,w)){const n=scale[w];hasScale=true;if(n===100)group=(group||1)*n;else{total+=(group||1)*n;group=0;}j++;}
      else if(w==='and'&&j>i&&Object.hasOwn(small,words[j+1]?.toLowerCase()))j++;
      else break;
    }
    if(j>i&&hasScale){out.push(String(total+group));i=j-1;}else out.push(words[i]);
  }
  return out.join(' ');
}
export function parseVoiceReceipt(raw) {
  const transcript=String(raw||'').trim().slice(0,3000);
  // A common Hindi ASR spelling is “चार सो रुपी”. Normalize the homophone
  // only inside an explicit currency phrase; retain the original transcript.
  const normalized=transcript.replace(/[०-९]/g,c=>String(c.charCodeAt(0)-0x966)).toLowerCase()
    .replace(/(एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ)\s+सो(?=\s+(?:रुपी|रुपये|रुपए|रुपया))/gu,'$1 सौ');
  const text=numberPhrases(normalized);
  const kind=types.find(t=>t.pattern.test(text))||{title:'Voice receipt',category:'Other'};
  const numbers=[...text.matchAll(/\d[\d,]*(?:\.\d{1,2})?/g)].map(m=>({value:Number(m[0].replaceAll(',','')),index:m.index,length:m[0].length}));
  const candidates=numbers.filter(n=>{
    if(text[n.index-1]==='-')return false;
    const before=text.slice(Math.max(0,n.index-15),n.index),after=text.slice(n.index+n.length,n.index+n.length+20);
    if(/^\s*(?:[/-]\s*\d|january|february|march|april|may\b|june|july|august|september|october|november|december|जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)/u.test(after))return false;
    return /(?:₹|\brs\.?|\binr|\brupees|रुपये|रुपए)\s*$/u.test(before)||/^\s*(?:rupees?\b|rs\b|रुपये|रुपए|रुपया|रुपी|का|के|की|ka\b|ke\b|ki\b)/u.test(after)||/\bbill\s*$/u.test(before)||/बिल\s*$/u.test(before);
  }).filter(n=>Number.isFinite(n.value)&&n.value>0&&n.value<=10000000);
  // Multiple amounts may be totals, arrears or dates. Keep the words; don't guess.
  const amount=candidates.length===1?candidates[0].value:null;
  const formatted=amount===null?null:new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(amount);
  return {title:kind.title,category:kind.category,amount,transcript,receiptText:`VOICE NOTE — entered by the user, not an original merchant invoice\n${kind.title}${formatted?`\nBill amount mentioned: ₹${formatted}`:''}\n\nSpoken note: ${transcript}\n\nPayment status, invoice number and dates are not inferred.`};
}
