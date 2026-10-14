import {FIELDS,totalMetrics,missingTotals,beijingDate} from './model.js';
export async function keywordDigest(word){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(word));return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');}
export function snapshotResult(snapshot,digest,keyword,range){
 if(snapshot?.schemaVersion!==1||!snapshot.words||Array.isArray(snapshot.words))throw Error('每日数据格式异常，请稍后重试。');
 const record=Object.hasOwn(snapshot.words,digest)?snapshot.words[digest]:null;
 const days=range.dates.map(date=>{const saved=record?.days?.[date];if(saved){if(!Number.isInteger(saved.recordCount)||saved.recordCount<0||!Number.isFinite(Date.parse(saved.updatedAt)))throw Error('每日数据格式异常，请稍后重试。');for(const field of FIELDS)if(saved.totals?.[field]!==null&&!Number.isFinite(saved.totals?.[field]))throw Error('每日数据格式异常，请稍后重试。');}return saved?{date,totals:saved.totals,recordCount:saved.recordCount,updatedAt:saved.updatedAt,available:true,today:date===beijingDate()}:{date,totals:missingTotals(),recordCount:null,updatedAt:'',available:false,today:date===beijingDate()};});
 const times=days.map(day=>day.updatedAt).filter(Boolean).sort();
 return {ok:true,keyword,found:Boolean(record),saved:Boolean(record),range:{preset:range.preset,startDate:range.startDate,endDate:range.endDate},days,totals:totalMetrics(days.map(day=>day.totals)),updatedAt:times[0]||'',partial:days.some(day=>!day.available),stale:false,recordCount:Math.max(0,...days.map(day=>day.recordCount||0)),error:record&&days.some(day=>!day.available)?'所选范围部分日期尚未同步，缺失值显示为 —。':''};
}
