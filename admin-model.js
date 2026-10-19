import {normalizeKeyword} from './model.js';
import {normalizePid} from './taobao-model.js';

export const ADMIN_ITERATIONS=600000;
export const ADMIN_FILES={jd:'data/admin-jd.json',taobao:'data/admin-taobao.json'};
const encoder=new TextEncoder(),decoder=new TextDecoder();
const encode=bytes=>btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(''));
const decode=value=>{if(typeof value!=='string'||value.length>3000000||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('总览目录格式异常。');return Uint8Array.from(atob(value),char=>char.charCodeAt(0));};
export function adminCatalog(platform,entries){
 if(!Object.hasOwn(ADMIN_FILES,platform)||!Array.isArray(entries)||entries.length>20000)throw Error('总览目录格式异常。');
 const normalize=platform==='jd'?normalizeKeyword:normalizePid;
 return {schemaVersion:1,platform,entries:[...new Set(entries.map(entry=>{if(normalize(entry)!==entry)throw Error('总览目录身份异常。');return entry;}))].sort()};
}
async function derive(password,salt,crypto){
 if(typeof password!=='string'||!password||password.length>256)throw Error('请输入管理员口令。');
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ADMIN_ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function sealAdminCatalog(catalog,password,crypto=globalThis.crypto){
 const value=adminCatalog(catalog.platform,catalog.entries),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await derive(password,salt,crypto);
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(value.platform)},key,encoder.encode(JSON.stringify(value)));
 return {schemaVersion:1,platform:value.platform,kdf:'PBKDF2-SHA256',iterations:ADMIN_ITERATIONS,cipher:'AES-256-GCM',salt:encode(salt),iv:encode(iv),data:encode(new Uint8Array(data))};
}
export function sanitizeAdminEnvelope(envelope,platform){
 if(envelope?.schemaVersion!==1||envelope.platform!==platform||envelope.kdf!=='PBKDF2-SHA256'||envelope.iterations!==ADMIN_ITERATIONS||envelope.cipher!=='AES-256-GCM')throw Error('总览目录格式异常。');
 const salt=decode(envelope.salt),iv=decode(envelope.iv),data=decode(envelope.data);if(salt.length!==16||iv.length!==12||data.length<16)throw Error('总览目录格式异常。');
 return {schemaVersion:1,platform,kdf:envelope.kdf,iterations:ADMIN_ITERATIONS,cipher:envelope.cipher,salt:envelope.salt,iv:envelope.iv,data:envelope.data};
}
export async function openAdminCatalog(envelope,password,platform,crypto=globalThis.crypto){
 envelope=sanitizeAdminEnvelope(envelope,platform);const salt=decode(envelope.salt),iv=decode(envelope.iv),data=decode(envelope.data);
 try{const key=await derive(password,salt,crypto),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:encoder.encode(platform)},key,data),value=JSON.parse(decoder.decode(plain));if(value.schemaVersion!==1||value.platform!==platform)throw Error();return adminCatalog(platform,value.entries);}catch{throw Error('口令不正确，无法解锁总览。');}
}
export function sortedRows(entries,{field='identity',direction='asc',valueOf}={}){
 const rows=entries.map((value,index)=>({value,index})),read=row=>field==='identity'?row.value:valueOf?.(row.value,field),sign=direction==='asc'?1:-1;
 return rows.sort((a,b)=>{const x=read(a),y=read(b),validX=field==='identity'?typeof x==='string':Number.isFinite(x),validY=field==='identity'?typeof y==='string':Number.isFinite(y);if(!validX||!validY)return validX?-1:validY?1:a.index-b.index;const delta=field==='identity'?x.localeCompare(y,'zh-CN',{numeric:true}):x-y;return delta*sign||a.index-b.index;});
}
export function bindTableSorting(root,sort,onChange){
 const buttons=[...root.querySelectorAll('button[data-sort]')];
 for(const button of buttons)button.onclick=()=>{const field=button.dataset.sort;sort.direction=sort.field===field?(sort.direction==='desc'?'asc':'desc'):(field==='identity'?'asc':'desc');sort.field=field;onChange();};
 return ()=>{for(const button of buttons){const active=sort.field===button.dataset.sort,next=active&&sort.direction==='desc'?'升序':'降序',current=sort.direction==='desc'?'降序':'升序';button.closest('th').setAttribute('aria-sort',active?(sort.direction==='desc'?'descending':'ascending'):'none');button.querySelector('.sort-indicator').textContent=active?(sort.direction==='desc'?'↓':'↑'):'↕';button.setAttribute('aria-label',button.dataset.label+'，'+(active?'当前'+current+'，':'')+'点击'+(active?next:button.dataset.sort==='identity'?'升序':'降序')+'排列');}};
}
export function adminPage(entries,query='',page=1,size=50,sort=null){
 const term=query.trim().toLocaleLowerCase(),matched=(sort?sortedRows(entries,sort):entries.map((value,index)=>({value,index}))).filter(row=>row.value.toLocaleLowerCase().includes(term)),pages=Math.max(1,Math.ceil(matched.length/size)),current=Math.max(1,Math.min(pages,page));
 return {rows:matched.slice((current-1)*size,current*size),page:current,pages,total:matched.length};
}
