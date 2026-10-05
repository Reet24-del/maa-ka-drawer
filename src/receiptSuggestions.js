const types=[
 ['Electricity bill','Services',/electricity|electric\s+bill|बिजली|bijli|विद्युत/i],
 ['Water purifier service','Services',/water\s+purifier|\bro\s+(?:service|filter)|प्यूरिफायर/i],
 ['Water bill','Services',/water\s+bill|पानी\s+का\s+बिल/i],
 ['Gas bill','Services',/\blpg\b|gas\s+(?:bill|cylinder)|गैस/i],
 ['Internet bill','Services',/broadband|internet\s+bill|wifi/i],
 ['Washing machine','Appliances',/washing\s+machine|वॉशिंग/i],
 ['Refrigerator','Appliances',/refrigerator|fridge|फ्रिज/i],
 ['Mixer grinder','Appliances',/mixer|grinder|मिक्सर/i],
 ['Electric kettle','Appliances',/(?:electric\s+)?kettle|केतली/i],
 ['Microwave','Appliances',/microwave|माइक्रोवेव/i],
 ['Ceiling fan','Appliances',/ceiling\s+fan|पंखा/i],
];
export function suggestReceiptDetails(text) {
  const matches=types.filter(([, ,pattern])=>pattern.test(text));
  if(matches.length!==1)return {title:'',category:'Other'};
  return {title:matches[0][0],category:matches[0][1]};
}
