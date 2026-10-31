import {ADMIN_FILES,openAdminCatalog} from './admin-model.js?v=20261031-speed-v1';
const $=id=>document.getElementById(id);
let password='',catalogs=null,signatures=null,pending=false,generation=0;
const emit=()=>window.dispatchEvent(new CustomEvent('promotion-admin-change',{detail:catalogs?{jd:[...catalogs.jd.entries],taobao:[...catalogs.taobao.entries],speed:catalogs.speed?.speed||null,speedError:catalogs.speedError||'',jdOwners:catalogs.jd.owners||{},jdGift:catalogs.jd.gift||null,jdThemes:catalogs.jd.themes||null,jdAlliances:catalogs.jd.alliances||{},jdOwnersUpdatedAt:catalogs.jd.ownersUpdatedAt||'',jdOwnersError:catalogs.jd.ownersError||''}:null}));
async function readCatalogs(code){
 const results=await Promise.all(Object.entries(ADMIN_FILES).filter(([platform])=>platform!=='speed').map(async([platform,file])=>{
  let response;try{response=await fetch('./'+file,{cache:'no-cache',credentials:'omit',signal:AbortSignal.timeout(20000)});}catch{throw Error('总览目录暂时无法读取，请稍后重试。');}
  if(!response.ok)throw Error('管理员目录尚未同步，请稍后重试。');
  const envelope=await response.json(),signature=JSON.stringify(envelope),catalog=signature===signatures?.[platform]?catalogs[platform]:await openAdminCatalog(envelope,code,platform);
  return {platform,signature,catalog};
 }));
 const values=Object.fromEntries(results.map(row=>[row.platform,row.catalog])),hashes=Object.fromEntries(results.map(row=>[row.platform,row.signature]));
 try{const response=await fetch('./'+ADMIN_FILES.speed,{cache:'no-cache',credentials:'omit',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();const envelope=await response.json(),signature=JSON.stringify(envelope);values.speed=signature===signatures?.speed?catalogs.speed:await openAdminCatalog(envelope,code,'speed');hashes.speed=signature;}catch{values.speed=catalogs?.speed||null;values.speedError='极速版数据读取未完成，'+(values.speed?'保留上次结果。':'尚无可展示数据。');hashes.speed=signatures?.speed||'';}
 hashes.speedError=values.speedError||'';
 return {catalogs:values,signatures:hashes};
}
function show(){if(catalogs)return;generation++;$('adminPassword').value='';$('adminError').textContent='';$('adminDialog').showModal();}
$('adminLogo').onclick=show;$('closeAdmin').onclick=()=>$('adminDialog').close();
$('adminDialog').addEventListener('close',()=>{$('adminPassword').value='';generation++;$('adminLogo').focus();});
$('adminForm').onsubmit=async event=>{
 event.preventDefault();if(pending)return;pending=true;const current=generation,code=$('adminPassword').value;$('unlockAdmin').disabled=true;$('adminError').textContent='';
 try{
  const result=await readCatalogs(code);if(current!==generation||!$('adminDialog').open)return;
  password=code;catalogs=result.catalogs;signatures=result.signatures;emit();$('adminBanner').hidden=false;$('adminStatus').textContent='管理员总览 · 只读 · 京东 '+catalogs.jd.entries.length+' 个密令 / 淘宝 '+catalogs.taobao.entries.length+' 个推广位';$('adminDialog').close();
 }catch(error){if(current===generation)$('adminError').textContent=error.message||'总览解锁失败，请重试。';}finally{pending=false;$('unlockAdmin').disabled=false;$('adminPassword').value='';}
};
$('exitAdmin').onclick=()=>{generation++;password='';catalogs=null;signatures=null;emit();$('adminBanner').hidden=true;$('adminLogo').focus();};
if(window.YunzhanDashboardPageRefresh)window.YunzhanDashboardPageRefresh.create({intervalMs:60000,canPoll:()=>Boolean(catalogs)&&!pending&&!document.querySelector('dialog[open],#datePickerLayer:not([hidden]) .range-picker'),read:async()=>{const current=generation;return {...(await readCatalogs(password)),generation:current};},key:value=>JSON.stringify(value.signatures),apply:value=>{if(value.generation!==generation||!catalogs||JSON.stringify(value.signatures)===JSON.stringify(signatures))return;catalogs=value.catalogs;signatures=value.signatures;emit();$('adminStatus').textContent='管理员总览 · 只读 · 京东 '+catalogs.jd.entries.length+' 个密令 / 淘宝 '+catalogs.taobao.entries.length+' 个推广位';},onError:()=>{if(catalogs)$('adminStatus').textContent='管理员总览 · 目录更新未完成，保留上次列表';}}).start();
