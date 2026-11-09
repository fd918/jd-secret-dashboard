import {readAdminCatalogs} from './admin-model.js?v=20261109-header-refresh-v1';
const $=id=>document.getElementById(id);
let password='',catalogs=null,signatures=null,pending=false,generation=0,manual=null,poll;
const emit=(extra={})=>window.dispatchEvent(new CustomEvent('promotion-admin-change',{detail:catalogs?{jd:[...catalogs.jd.entries],taobao:[...catalogs.taobao.entries],speed:catalogs.speed?.speed||null,speedError:catalogs.speedError||'',jdOwners:catalogs.jd.owners||{},jdGift:catalogs.jd.gift||null,jdThemes:catalogs.jd.themes||null,jdAlliances:catalogs.jd.alliances||{},jdOwnersUpdatedAt:catalogs.jd.ownersUpdatedAt||'',jdOwnersError:catalogs.jd.ownersError||'',...extra}:null}));
const readCatalogs=(code,only)=>readAdminCatalogs({code,catalogs,signatures,only});
const activePlatform=()=>document.querySelector('[data-platform][aria-selected=true]')?.dataset.platform;
const names={jd:'京东密令效果',taobao:'淘宝推广位效果',speed:'极速版红包效果'};
const feedback=new Map();
function paintRefresh(){
 const button=$('adminRefresh'),status=$('adminRefreshFeedback'),platform=activePlatform();
 button.hidden=!catalogs;button.disabled=Boolean(manual);button.textContent=manual?'正在刷新…':'刷新当前看板';
 const message=manual?{text:'正在刷新'+names[manual.platform]+'，当前显示上次结果。'}:feedback.get(platform);
 status.hidden=!catalogs||!message;status.textContent=message?.text||'';status.dataset.error=String(Boolean(message?.error));
}
function paintAdminStatus(){$('adminStatus').textContent='管理员总览 · 只读 · 京东 '+catalogs.jd.entries.length+' 个密令 / 淘宝 '+catalogs.taobao.entries.length+' 个推广位';}
window.addEventListener('promotion-platform-change',paintRefresh);
$('adminRefresh').onclick=async()=>{
 const platform=activePlatform();if(!catalogs||manual||!Object.hasOwn(names,platform))return;
 const run={platform,generation};manual=run;poll?.invalidate();paintRefresh();
 try{
  const [result,tb]=await Promise.all([readCatalogs(password,platform),platform==='taobao'?import('./taobao.js?v=20261109-header-refresh-v1').then(m=>m.readTaobaoRefreshSnapshot()):null]);
  if(run.generation!==generation)return;
  const snapshot=platform==='jd'&&!result.catalogs.jd.themes?await import('./app.js?v=20261109-header-refresh-v1').then(m=>m.readJdRefreshSnapshot(result.catalogs.jd.entries)):tb;
  if(run.generation!==generation)return;
  const changed=result.signatures[platform]!==signatures[platform]||result.signatures.speedError!==signatures.speedError||snapshot?.changed;
  if(changed){catalogs=result.catalogs;signatures=result.signatures;emit({platform,...snapshot});}
  paintAdminStatus();
  feedback.set(platform,{text:changed?'已读取最新发布的数据。':'已检查，当前数据已是最新发布版本。'});
 }catch{if(run.generation===generation)feedback.set(platform,{text:'刷新未完成，已保留原有显示。请重试。',error:true});}
 finally{if(manual===run){manual=null;paintRefresh();}}
};
function show(){if(catalogs)return;generation++;$('adminPassword').value='';$('adminError').textContent='';$('adminDialog').showModal();}
$('adminLogo').onclick=show;$('closeAdmin').onclick=()=>$('adminDialog').close();
$('adminDialog').addEventListener('close',()=>{$('adminPassword').value='';generation++;$('adminLogo').focus();});
$('adminForm').onsubmit=async event=>{
 event.preventDefault();if(pending)return;pending=true;const current=generation,code=$('adminPassword').value;$('unlockAdmin').disabled=true;$('unlockAdmin').textContent='正在读取并解密…';$('adminError').textContent='';
 try{
  const result=await readCatalogs(code);if(current!==generation||!$('adminDialog').open)return;
  password=code;catalogs=result.catalogs;signatures=result.signatures;emit();$('adminBanner').hidden=false;paintAdminStatus();paintRefresh();$('adminDialog').close();
 }catch(error){if(current===generation)$('adminError').textContent=error.message||'总览解锁失败，请重试。';}finally{pending=false;$('unlockAdmin').disabled=false;$('unlockAdmin').textContent='解锁总览';$('adminPassword').value='';}
};
$('exitAdmin').onclick=()=>{generation++;password='';catalogs=null;signatures=null;manual=null;feedback.clear();emit();paintRefresh();$('adminBanner').hidden=true;$('adminLogo').focus();};
if(window.YunzhanDashboardPageRefresh){poll=window.YunzhanDashboardPageRefresh.create({intervalMs:60000,canPoll:()=>Boolean(catalogs)&&!pending&&!manual&&!document.querySelector('dialog[open],#datePickerLayer:not([hidden]) .range-picker'),read:async()=>{const current=generation;return {...(await readCatalogs(password)),generation:current};},key:value=>JSON.stringify(value.signatures),apply:value=>{if(value.generation!==generation||!catalogs||JSON.stringify(value.signatures)===JSON.stringify(signatures))return;catalogs=value.catalogs;signatures=value.signatures;emit();$('adminStatus').textContent='管理员总览 · 只读 · 京东 '+catalogs.jd.entries.length+' 个密令 / 淘宝 '+catalogs.taobao.entries.length+' 个推广位';},onError:()=>{if(catalogs)$('adminStatus').textContent='管理员总览 · 目录更新未完成，保留上次列表';}});poll.start();}
