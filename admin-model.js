import {snapshotResult} from './snapshot.js';
import {normalizeKeyword,FIELDS,totalMetrics} from './model.js';
import {cleanSpeed} from './speed-model.js?v=20261031-speed-v2';
import {normalizePid} from './taobao-model.js';

export const ADMIN_ITERATIONS=600000;
export const ADMIN_FILES={jd:'data/admin-jd.json',taobao:'data/admin-taobao.json',speed:'data/admin-speed.json'};
export const allianceLabel=ids=>(ids||[]).map(id=>({'1002114292':'非密令','1000187928':'密令'}[id]||'联盟 '+id)).join(' / ');
const encoder=new TextEncoder(),decoder=new TextDecoder();
const encode=bytes=>btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(''));
const decode=(value,max=3000000)=>{if(typeof value!=='string'||value.length>max||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('总览目录格式异常。');return Uint8Array.from(atob(value),char=>char.charCodeAt(0));};
export function adminCatalog(platform,entries,info={}){
 if(!Object.hasOwn(ADMIN_FILES,platform)||!Array.isArray(entries)||entries.length>20000)throw Error('总览目录格式异常。');
 const normalize=platform==='jd'?normalizeKeyword:platform==='speed'?(v=>{if(typeof v!=='string'||!/^\d{1,20}$/.test(v))throw Error('极速版账号格式异常。');return v;}):normalizePid;
 const result={schemaVersion:1,platform,entries:[...new Set(entries.map(entry=>{if(normalize(entry)!==entry)throw Error('总览目录身份异常。');return entry;}))].sort()};
 if(Object.hasOwn(info,'speed')){if(platform!=='speed')throw Error('极速版数据平台异常。');result.speed=cleanSpeed(info.speed);}
 if(Object.hasOwn(info,'owners')){
  if(platform!=='jd'||!info.owners||Array.isArray(info.owners)||typeof info.owners!=='object')throw Error('用户资料格式异常。');
  const clean=(value,max)=>{if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f]/.test(value))throw Error('用户资料格式异常。');return value;};
  result.owners=Object.fromEntries(result.entries.map(word=>{const value=Object.hasOwn(info.owners,word)?info.owners[word]:{status:'unmatched',users:[]};if(!['assigned','multiple','unassigned','inactive','recalled','unmatched'].includes(value?.status)||!Array.isArray(value.users)||value.users.length>20)throw Error('用户关联状态异常。');const users=value.users.map(user=>{if(!/^[1-9]\d{0,19}$/.test(user?.id))throw Error('小B身份异常。');return {id:user.id,name:clean(user.name,120),phone:clean(user.phone,40),version:clean(user.version,80)};});if(new Set(users.map(u=>u.id)).size!==users.length||(value.status==='assigned'?users.length!==1:value.status==='multiple'?users.length<2:users.length!==0))throw Error('用户关联数量异常。');return [word,{status:value.status,users}];}));
  result.ownersUpdatedAt=clean(info.ownersUpdatedAt||'',40);if(result.ownersUpdatedAt&&!Number.isFinite(Date.parse(result.ownersUpdatedAt)))throw Error('用户资料时间异常。');result.ownersError=clean(info.ownersError||'',150);
 }
 if(Object.hasOwn(info,'alliances')){
  if(platform!=='jd'||!info.alliances||Array.isArray(info.alliances)||typeof info.alliances!=='object')throw Error('联盟归属格式异常。');
  result.alliances=Object.fromEntries(result.entries.map(word=>{const ids=Object.hasOwn(info.alliances,word)?info.alliances[word]:[];if(!Array.isArray(ids)||ids.length>20||ids.some(id=>typeof id!=='string'||!(/^[1-9]\d{0,19}$/).test(id)))throw Error('联盟归属格式异常。');return [word,[...new Set(ids)].sort()];}));
 }
 if(Object.hasOwn(info,'themes')){if(platform!=='jd')throw Error('主题数据平台异常。');result.themes=cleanThemes(info.themes);}
 if(Object.hasOwn(info,'gift')){if(platform!=='jd')throw Error('全部红包数据平台异常。');result.gift=cleanGift(info.gift);}
 return result;
}
export function cleanGift(value){
 if(!value||typeof value.days!=='object'||!value.days||Array.isArray(value.days)||Object.keys(value.days).length>1000||typeof (value.error||'')!=='string'||(value.error||'').length>150)throw Error('全部红包数据格式异常。');
 const days=Object.fromEntries(Object.entries(value.days).map(([date,day])=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||!Array.isArray(day?.accounts)||day.accounts.length>2)throw Error('全部红包日期异常。');const accounts=day.accounts.map(a=>{if(!['1000187928','1002114292'].includes(a?.unionId)||!Number.isSafeInteger(a.giveNum)||a.giveNum<0||typeof a.updatedAt!=='string'||!Number.isFinite(Date.parse(a.updatedAt)))throw Error('全部红包账号数据异常。');return {unionId:a.unionId,giveNum:a.giveNum,updatedAt:a.updatedAt};});if(new Set(accounts.map(a=>a.unionId)).size!==accounts.length)throw Error('全部红包账号重复。');return [date,{accounts}];}));return {days,error:value.error||''};
}
export function giftRange(value,dates){
 const accounts=['1000187928','1002114292'].map(unionId=>{const rows=dates.map(d=>value?.days?.[d]?.accounts.find(a=>a.unionId===unionId)),complete=rows.length>0&&rows.every(Boolean),times=rows.map(r=>r?.updatedAt).filter(Boolean).sort((a,b)=>Date.parse(a)-Date.parse(b));return {unionId,giveNum:complete?rows.reduce((s,r)=>s+r.giveNum,0):null,updatedAt:times[0]||''};}),complete=accounts.every(a=>a.giveNum!==null),total=complete?accounts.reduce((s,a)=>s+a.giveNum,0):null;
 return {total,accounts,availableDays:dates.filter(d=>value?.days?.[d]?.accounts.length===2).length,totalDays:dates.length,error:value?.error||''};
}
async function derive(password,salt,crypto){
 if(typeof password!=='string'||!password||password.length>256)throw Error('请输入管理员口令。');
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ADMIN_ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function sealAdminCatalog(catalog,password,crypto=globalThis.crypto){
 const value=adminCatalog(catalog.platform,catalog.entries,catalog),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await derive(password,salt,crypto);
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(value.platform)},key,encoder.encode(JSON.stringify(value)));
 return {schemaVersion:1,platform:value.platform,kdf:'PBKDF2-SHA256',iterations:ADMIN_ITERATIONS,cipher:'AES-256-GCM',salt:encode(salt),iv:encode(iv),data:encode(new Uint8Array(data))};
}
export function sanitizeAdminEnvelope(envelope,platform){
 if(envelope?.schemaVersion!==1||envelope.platform!==platform||envelope.kdf!=='PBKDF2-SHA256'||envelope.iterations!==ADMIN_ITERATIONS||envelope.cipher!=='AES-256-GCM')throw Error('总览目录格式异常。');
 const salt=decode(envelope.salt),iv=decode(envelope.iv),data=decode(envelope.data,platform==='speed'?16000000:3000000);if(salt.length!==16||iv.length!==12||data.length<16)throw Error('总览目录格式异常。');
 return {schemaVersion:1,platform,kdf:envelope.kdf,iterations:ADMIN_ITERATIONS,cipher:envelope.cipher,salt:envelope.salt,iv:envelope.iv,data:envelope.data};
}
export async function openAdminCatalog(envelope,password,platform,crypto=globalThis.crypto){
 envelope=sanitizeAdminEnvelope(envelope,platform);const salt=decode(envelope.salt),iv=decode(envelope.iv),data=decode(envelope.data,platform==='speed'?16000000:3000000);
 try{const key=await derive(password,salt,crypto),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:encoder.encode(platform)},key,data),value=JSON.parse(decoder.decode(plain));if(value.schemaVersion!==1||value.platform!==platform)throw Error();return adminCatalog(platform,value.entries,value);}catch{throw Error('口令不正确，无法解锁总览。');}
}
export function sortedRows(entries,{field='identity',direction='asc',valueOf}={}){
 const rows=entries.map((value,index)=>({value,index})),read=row=>field==='identity'?row.value:valueOf?.(row.value,field),sign=direction==='asc'?1:-1,text=['identity','user','alliance'].includes(field);
 return rows.sort((a,b)=>{const x=read(a),y=read(b),validX=text?typeof x==='string'&&Boolean(x):Number.isFinite(x),validY=text?typeof y==='string'&&Boolean(y):Number.isFinite(y);if(!validX||!validY)return validX?-1:validY?1:a.index-b.index;const delta=text?x.localeCompare(y,'zh-CN',{numeric:true}):x-y;return delta*sign||a.index-b.index;});
}
export function bindTableSorting(root,sort,onChange){
 const buttons=[...root.querySelectorAll('button[data-sort]')];
 for(const button of buttons)button.onclick=()=>{const field=button.dataset.sort;sort.direction=sort.field===field?(sort.direction==='desc'?'asc':'desc'):(['identity','user','alliance'].includes(field)?'asc':'desc');sort.field=field;onChange();};
 return ()=>{for(const button of buttons){const active=sort.field===button.dataset.sort,next=active&&sort.direction==='desc'?'升序':'降序',current=sort.direction==='desc'?'降序':'升序';button.closest('th').setAttribute('aria-sort',active?(sort.direction==='desc'?'descending':'ascending'):'none');button.querySelector('.sort-indicator').textContent=active?(sort.direction==='desc'?'↓':'↑'):'↕';button.setAttribute('aria-label',button.dataset.label+'，'+(active?'当前'+current+'，':'')+'点击'+(active?next:['identity','user','alliance'].includes(button.dataset.sort)?'升序':'降序')+'排列');}};
}
export function adminPage(entries,query='',page=1,size=50,sort=null){
 const term=query.trim().toLocaleLowerCase(),matched=(sort?sortedRows(entries,sort):entries.map((value,index)=>({value,index}))).filter(row=>(row.value+' '+(sort?.searchText?.(row.value)||'')).toLocaleLowerCase().includes(term)),pages=Math.max(1,Math.ceil(matched.length/size)),current=Math.max(1,Math.min(pages,page));
 return {rows:matched.slice((current-1)*size,current*size),page:current,pages,total:matched.length};
}

export function cleanThemes(value){
 const fail=()=>{throw Error('密令主题数据格式异常。');},text=(v,max)=>{if(typeof v!=='string'||v.length>max||/[\u0000-\u001f\u007f]/.test(v))fail();return v;};
 if(!value||!Array.isArray(value.words)||value.words.length>20000||new Set(value.words).size!==value.words.length||value.words.some(w=>normalizeKeyword(w)!==w)||!Array.isArray(value.items)||value.items.length>1000||!value.days||typeof value.days!=='object'||Array.isArray(value.days)||Object.keys(value.days).length>1000)fail();
 const ids=new Set(),items=value.items.map(i=>{if(typeof i?.id!=='string'||!/^(\d{1,20}|unknown)$/.test(i.id)||ids.has(i.id)||!Array.isArray(i.words)||new Set(i.words).size!==i.words.length||i.words.some(n=>!Number.isInteger(n)||n<0||n>=value.words.length))fail();ids.add(i.id);return {id:i.id,name:text(i.name,200),words:[...i.words]};}),members=items.map(i=>new Set(i.words));
 const days=Object.fromEntries(Object.entries(value.days).map(([date,day])=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||!Array.isArray(day?.rows)||day.rows.length>20000||!Number.isFinite(Date.parse(day.updatedAt)))fail();const seen=new Set(),rows=day.rows.map(row=>{if(!Array.isArray(row)||row.length!==8||!Number.isInteger(row[0])||!Number.isInteger(row[1])||!members[row[0]]?.has(row[1])||row.slice(2).some(n=>n!==null&&!Number.isFinite(n)))fail();const key=row[0]+':'+row[1];if(seen.has(key))fail();seen.add(key);return [...row];});return [date,{updatedAt:text(day.updatedAt,40),rows}];}));return {words:[...value.words],items,days,error:text(value.error||'',150)};
}
const themeIndexes=new WeakMap();
function themeIndex(themes){if(!themes)return null;let value=themeIndexes.get(themes);if(!value){value={words:new Map(themes.words.map((word,index)=>[word,index])),items:new Map(themes.items.map((item,index)=>[item.id,{...item,index}])),days:new Map(Object.entries(themes.days).map(([date,day])=>[date,{...day,rows:new Map(day.rows.map(row=>[row[0]+':'+row[1],row.slice(2)]))}]))};themeIndexes.set(themes,value);}return value;}
export function themeWords(themes,id,entries){if(!id)return entries;const item=themeIndex(themes)?.items.get(id);return item?item.words.map(index=>themes.words[index]).filter(word=>entries.includes(word)):[];}
export function themeWordResult(themes,id,entries,word,range){
 const index=themeIndex(themes),item=index?.items.get(id),wi=index?.words.get(word),found=entries.includes(word)&&wi!==undefined&&(!id||item?.words.includes(wi)),days={};
 if(found)for(const date of range.dates){const day=index.days.get(date);if(!day)continue;const rows=(id?[day.rows.get(item.index+':'+wi)]:[...index.items.values()].map(i=>day.rows.get(i.index+':'+wi))).filter(Boolean);days[date]={updatedAt:day.updatedAt,recordCount:rows.length,totals:rows.length?totalMetrics(rows.map(numbers=>Object.fromEntries(FIELDS.map((f,i)=>[f,numbers[i]])))):Object.fromEntries(FIELDS.map(f=>[f,0]))};}
 return snapshotResult({schemaVersion:1,words:found?Object.fromEntries([[word,{days}]]) :{}},word,word,range);
}
