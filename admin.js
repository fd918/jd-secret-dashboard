import {readAdminCatalogs} from './admin-model.js?v=20261102-loading-v2';
const $=id=>document.getElementById(id);
let password='',catalogs=null,signatures=null,pending=false,generation=0;
const emit=()=>window.dispatchEvent(new CustomEvent('promotion-admin-change',{detail:catalogs?{jd:[...catalogs.jd.entries],taobao:[...catalogs.taobao.entries],speed:catalogs.speed?.speed||null,speedError:catalogs.speedError||'',jdOwners:catalogs.jd.owners||{},jdGift:catalogs.jd.gift||null,jdThemes:catalogs.jd.themes||null,jdAlliances:catalogs.jd.alliances||{},jdOwnersUpdatedAt:catalogs.jd.ownersUpdatedAt||'',jdOwnersError:catalogs.jd.ownersError||''}:null}));
const readCatalogs=code=>readAdminCatalogs({code,catalogs,signatures});
function show(){if(catalogs)return;generation++;$('adminPassword').value='';$('adminError').textContent='';$('adminDialog').showModal();}
$('adminLogo').onclick=show;$('closeAdmin').onclick=()=>$('adminDialog').close();
$('adminDialog').addEventListener('close',()=>{$('adminPassword').value='';generation++;$('adminLogo').focus();});
$('adminForm').onsubmit=async event=>{
 event.preventDefault();if(pending)return;pending=true;const current=generation,code=$('adminPassword').value;$('unlockAdmin').disabled=true;$('unlockAdmin').textContent='正在读取并解密…';$('adminError').textContent='';
 try{
  const result=await readCatalogs(code);if(current!==generation||!$('adminDialog').open)return;
  password=code;catalogs=result.catalogs;signatures=result.signatures;emit();$('adminBanner').hidden=false;$('adminStatus').textContent='管理员总览 · 只读 · 京东 '+catalogs.jd.entries.length+' 个密令 / 淘宝 '+catalogs.taobao.entries.length+' 个推广位';$('adminDialog').close();
 }catch(error){if(current===generation)$('adminError').textContent=error.message||'总览解锁失败，请重试。';}finally{pending=false;$('unlockAdmin').disabled=false;$('unlockAdmin').textContent='解锁总览';$('adminPassword').value='';}
};
$('exitAdmin').onclick=()=>{generation++;password='';catalogs=null;signatures=null;emit();$('adminBanner').hidden=true;$('adminLogo').focus();};
if(window.YunzhanDashboardPageRefresh)window.YunzhanDashboardPageRefresh.create({intervalMs:60000,canPoll:()=>Boolean(catalogs)&&!pending&&!document.querySelector('dialog[open],#datePickerLayer:not([hidden]) .range-picker'),read:async()=>{const current=generation;return {...(await readCatalogs(password)),generation:current};},key:value=>JSON.stringify(value.signatures),apply:value=>{if(value.generation!==generation||!catalogs||JSON.stringify(value.signatures)===JSON.stringify(signatures))return;catalogs=value.catalogs;signatures=value.signatures;emit();$('adminStatus').textContent='管理员总览 · 只读 · 京东 '+catalogs.jd.entries.length+' 个密令 / 淘宝 '+catalogs.taobao.entries.length+' 个推广位';},onError:()=>{if(catalogs)$('adminStatus').textContent='管理员总览 · 目录更新未完成，保留上次列表';}}).start();
