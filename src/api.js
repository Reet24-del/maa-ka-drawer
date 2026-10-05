export async function request(url, options={}) {
  const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || 'Could not reach the drawer. Please try again.');
  return data;
}
export function niceDate(value) {
  if(!value) return 'Date not recorded';
  return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));
}
