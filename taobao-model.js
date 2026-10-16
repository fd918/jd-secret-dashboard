import {dateOffset} from './model.js';
export const TAOBAO_ACTIVITY_START='2026-10-15';
export const TB_FIELDS=['give','use','cpa','reward','paidCount','paidAmount','paidCommission','settledCount','settledAmount','settledCommission'];
export const TB_LABELS=['红包发放数','红包使用次数','CPA 累计预估用户数','CPA 累计预估奖励金额','付款子订单数','付款金额','付款预估佣金','结算子订单数','结算金额','结算预估佣金'];
export const TB_MONEY=new Set(['reward','paidAmount','paidCommission','settledAmount','settledCommission']);
export const emptyTaobao=()=>Object.fromEntries(TB_FIELDS.map(k=>[k,null]));
export function normalizePid(value){const pid=typeof value==='string'?value.trim():'';if(!/^mm_[1-9]\d{0,19}_[1-9]\d{0,19}_[1-9]\d{0,19}$/.test(pid))throw Error('请输入完整推广位 PID，格式如 mm_账号ID_媒体ID_推广位ID。');return pid;}
export function normalizePids(values){if(!Array.isArray(values))return [];return [...new Set(values.map(v=>{try{return normalizePid(v);}catch{return '';}}).filter(Boolean))].slice(0,20);}
export function sumKnown(values){return !values.length||values.some(v=>v===null||!Number.isFinite(v))?null:Math.round(values.reduce((a,b)=>a+b,0)*100)/100;}
export function validateTaobaoSnapshot(value){
 if(value?.schemaVersion!==1||!value.positions||Array.isArray(value.positions)||!Number.isFinite(Date.parse(value.updatedAt)))throw Error('淘宝快照格式异常。');
 for(const [digest,record]of Object.entries(value.positions)){if(!/^[a-f0-9]{64}$/.test(digest)||!record?.days||Array.isArray(record.days))throw Error('淘宝快照身份异常。');for(const [date,day]of Object.entries(record.days)){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(day.updatedAt))||TB_FIELDS.some(k=>day.values?.[k]!==null&&(!Number.isFinite(day.values?.[k])||day.values[k]<0)))throw Error('淘宝快照指标异常。');}}
}
export function taobaoResult(snapshot,digest,range){
 if(snapshot?.schemaVersion!==1||!snapshot.positions||Array.isArray(snapshot.positions))throw Error('淘宝快照格式异常，保留已显示的数据。');
 const record=Object.hasOwn(snapshot.positions,digest)?snapshot.positions[digest]:null;
 const days=range.dates.filter(date=>date>=TAOBAO_ACTIVITY_START).map(date=>({date,values:record?.days?.[date]?.values||emptyTaobao(),updatedAt:record?.days?.[date]?.updatedAt||'',sourceTimes:record?.days?.[date]?.sourceTimes||{}}));
 for(const day of days)for(const field of TB_FIELDS)if(day.values[field]!==null&&(!Number.isFinite(day.values[field])||day.values[field]<0))throw Error('淘宝指标格式异常。');
 for(const day of days){
  const previous=day.date===TAOBAO_ACTIVITY_START?0:record?.days?.[dateOffset(day.date,-1)]?.values?.cpa;
  day.cpaNet=Number.isFinite(day.values.cpa)&&Number.isFinite(previous)&&previous>=0?day.values.cpa-previous:null;
 }
 const totals=emptyTaobao(),last=days.at(-1);
 // 红包按 biz_date 的每日值求和；CPA 是截至查询日期的活动累计，单独取截止日。
 for(const key of ['cpa','reward'])totals[key]=last?.values[key]??null;
 for(const key of ['give','use',...TB_FIELDS.slice(4)])totals[key]=sumKnown(days.map(day=>day.values[key]));
 return {found:Boolean(record),days,totals,partial:TB_FIELDS.some(k=>totals[k]===null)};
}
export function activityDates(start,end){const values=[];for(let date=start;date<=end;date=dateOffset(date,1))values.push(date);return values;}
