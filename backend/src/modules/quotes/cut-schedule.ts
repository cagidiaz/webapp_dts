const parts = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Madrid', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
/** Último viernes a las 18:00 civiles de Madrid, incluso tras un reinicio. */
export function lastWeeklyCut(now: Date): Date {
  const p=parts(now);
  const civil=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),18));
  let days=(civil.getUTCDay()+2)%7;
  if(days===0 && Number(p.hour)<18) days=7;
  civil.setUTCDate(civil.getUTCDate()-days);
  let instant=civil.getTime();
  for(let i=0;i<3;i++) {
    const candidate=parts(new Date(instant));
    const shown=Date.UTC(Number(candidate.year),Number(candidate.month)-1,Number(candidate.day),Number(candidate.hour),Number(candidate.minute));
    instant+=civil.getTime()-shown;
  }
  return new Date(instant);
}
