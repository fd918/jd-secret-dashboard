export const SPEED_FIELDS=['claims','paidCount','paidAmount','paidIncome','payers','validCount','validAmount','validIncome','settledCount','settledAmount','settledIncome'];
export const SPEED_LABELS=['有效红包领取数','付款笔数','付款金额','付款预估收入','付款人数','有效付款笔数','有效付款金额','有效付款预估收入','结算笔数','结算金额','结算预估收入'];
export const SPEED_MONEY=new Set(['paidAmount','paidIncome','validAmount','validIncome','settledAmount','settledIncome']);
export const SPEED_START='2026-10-31';
export function cleanSpeed(value){
 const fail=()=>{throw Error('极速版数据格式异常，保留上次结果。');};
 if(value?.schemaVersion!==1||!value.days||Array.isArray(value.days)||typeof value.days!=='object'||Object.keys(value.days).length>366)fail();
 const days={};for(const [date,day]of Object.entries(value.days)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||!Array.isArray(day?.rows)||day.rows.length>20000||!Number.isFinite(Date.parse(day.updatedAt))||typeof day.sourceThrough!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(day.sourceThrough)||day.sourceThrough.slice(0,10)!==date||!Number.isFinite(Date.parse(day.sourceThrough.replace(' ','T')+'+08:00')))fail();
  const ids=new Set();const rows=day.rows.map(row=>{if(!/^\d{1,20}$/.test(row?.id)||ids.has(row.id)||typeof row.nick!=='string'||row.nick.length>120||/[\u0000-\u001f\u007f]/.test(row.nick))fail();ids.add(row.id);const values={};for(const key of SPEED_FIELDS){const v=row.values?.[key];if(v!==null&&(!Number.isFinite(v)||v<0||(!SPEED_MONEY.has(key)&&!Number.isSafeInteger(v))))fail();values[key]=v;}return {id:row.id,nick:row.nick,values};});
  days[date]={updatedAt:day.updatedAt,sourceThrough:day.sourceThrough,rows};
 }
 return {schemaVersion:1,days};
}
export function speedTotal(rows,key){if(rows.some(r=>r.values[key]===null))return null;const scale=SPEED_MONEY.has(key)?10000:1;return rows.reduce((sum,r)=>sum+Math.round(r.values[key]*scale),0)/scale;}
export function speedRange(value,dates){
 const available=dates.filter(date=>value?.days[date]),map=new Map();
 for(const date of available)for(const row of value.days[date].rows){let item=map.get(row.id);if(!item){item={id:row.id,nick:row.nick,values:Object.fromEntries(SPEED_FIELDS.map(key=>[key,0]))};map.set(row.id,item);}item.nick=row.nick;for(const key of SPEED_FIELDS){const v=row.values[key];item.values[key]=item.values[key]===null||v===null?null:item.values[key]+v;}}
 const rows=[...map.values()],totals=Object.fromEntries(SPEED_FIELDS.map(key=>[key,available.length?speedTotal(rows,key):null]));
 // Payment users are distinct within the original report's range. Daily UVs cannot yield range UVs.
 if(dates.length>1){totals.payers=null;for(const row of rows)row.values.payers=null;}
 const stamps=available.map(date=>value.days[date].updatedAt).sort();return {rows,totals,availableDays:available.length,totalDays:dates.length,updatedAt:stamps.at(-1)||'',sourceThrough:available.map(date=>value.days[date].sourceThrough).sort().at(-1)||''};
}
