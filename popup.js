const panel=document.getElementById('panel');
const summaryTitle=document.getElementById('summaryTitle');
const summaryMeta=document.getElementById('summaryMeta');
const geoSelect=document.getElementById('geoSelect');
const refreshBtn=document.getElementById('refreshBtn');
const pulseBtn=document.getElementById('pulseBtn');
const scanBtn=document.getElementById('scanBtn');
const scanStatus=document.getElementById('scanStatus');
const notifyToggle=document.getElementById('notifyToggle');
const soundToggle=document.getElementById('soundToggle');
const searchInput=document.getElementById('searchInput');
const searchBtn=document.getElementById('searchBtn');
const tabs=[...document.querySelectorAll('[data-tab]')];
const upgradeBtn=document.getElementById('upgradeBtn');
const proBadge=document.getElementById('proBadge');
const emailInput=document.getElementById('emailInput');
const saveEmailBtn=document.getElementById('saveEmailBtn');

const BACKEND_URL = 'https://trendnow-public-1vc0b3utk-flextors-projects.vercel.app'; // Production URL

let tab='trends';
let items=[];
let tracked=[];
let historyByName={};
let notifications=[];
let state={scanNumber:0,lastScanAt:0,boomCount:0,hottest:null,trackedCount:0,unreadCount:0,isPro:false};
let selectedGeo='IN';
let searchMode=false;
let searchTerm='';
let keywordResults=[];
let keywordSource='trends';
let settings={desktop:true,sound:true};

const GEO_NAMES={
  IN:'India',US:'United States',GB:'United Kingdom',AU:'Australia',BR:'Brazil',CA:'Canada',DE:'Germany',ES:'Spain',
  FR:'France',ID:'Indonesia',IT:'Italy',JP:'Japan',KR:'South Korea',MX:'Mexico',NG:'Nigeria',NL:'Netherlands',
  PH:'Philippines',PK:'Pakistan',SA:'Saudi Arabia',SG:'Singapore',TR:'Turkey',TW:'Taiwan',UA:'Ukraine',VN:'Vietnam',
  ZA:'South Africa','':'Worldwide'
};

const esc=s=>(s||'').replace(/[&<>"]/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m]));
const num=g=>parseInt(String(g||'').replace(/\D/g,''),10)||0;
const mins=ts=>ts?Math.max(1,Math.round((Date.now()-ts)/60000)):0;
const timeLabel=ts=>ts?`${mins(ts)}m ago`:'just now';
const geoKey=geo=>geo||'WORLDWIDE';
const geoName=geo=>GEO_NAMES[geo]||geo||'Worldwide';

function spark(x,i){
  const score=x.score||num(x.growth);
  const fresh=(x.appearances||0)<=1||(x.consecutive||0)<=1;
  const explosive=x.boomSoon||score>=80||String(x.growth||'').toLowerCase()==='breakout';
  if(explosive) return 'm 0 34 c 18 0 28 -2 42 -4 s 18 -2 30 -2 s 16 4 28 3 s 18 -6 28 -16 s 12 -14 22 -13 s 22 10 50 -16';
  if(fresh) return 'm 0 35 c 22 0 34 0 48 -1 s 22 -1 34 -2 s 18 -2 30 -2 s 20 -3 34 -8 s 20 -8 54 -10';
  return ['m 0 28 c 18 -2 28 -2 44 -1 s 22 2 38 1 s 24 -4 40 -3 s 20 2 38 1','m 0 30 c 16 1 28 1 44 0 s 24 -3 40 -2 s 22 3 38 2 s 20 -2 38 -1','m 0 29 c 16 -1 28 0 44 0 s 22 3 38 2 s 24 -3 40 -2 s 20 1 38 0'][i%3];
}

const getStore=keys=>new Promise(resolve=>chrome.storage.local.get(keys,resolve));
const setStore=value=>new Promise(resolve=>chrome.storage.local.set(value,resolve));
const sendMsg=msg=>new Promise(resolve=>{
  chrome.runtime.sendMessage(msg,res=>{
    if(chrome.runtime.lastError) resolve({ok:0,data:[],state:null});
    else resolve(res||{ok:0,data:[],state:null});
  });
});

function currentList(){ return searchMode?keywordResults:items; }
function isTracked(name){ return tracked.includes(name); }
function applySettings(){
  notifyToggle.checked=settings.desktop;
  soundToggle.checked=settings.sound;
  soundToggle.disabled=!settings.desktop;
}

async function toggleTrack(name){
  const limit = state.isPro ? 100 : 5;
  if(!state.isPro && !isTracked(name) && tracked.length >= limit){
    alert("Free limit reached (5 items). Upgrade to Pro for unlimited tracking.");
    window.open(`${BACKEND_URL}/upgrade`);
    return;
  }
  tracked=isTracked(name)?tracked.filter(x=>x!==name):[name,...tracked].slice(0,limit);
  await setStore({tracked});
  render();
}

function proof(x){
  return `<div class="tr-proof"><span>Score ${x.score||0}</span><span>Seen ${x.appearances||0}x</span><span>Streak ${x.consecutive||0}</span><span>${timeLabel(x.lastSeenAt)}</span></div>`;
}

function card(x,i){
  const trackedNow=isTracked(x.name);
  return `
    <article class="tr-card ${x.status||'RISING'}">
      <div class="tr-card-top">
        <div class="tr-card-copy">
          <a class="tr-card-name" href="https://www.youtube.com/results?search_query=${encodeURIComponent(x.name)}" target="_blank" rel="noreferrer">${esc(x.name)}</a>
          <div class="tr-card-sub">${esc(x.idea||'YouTube: '+x.name)}</div>
        </div>
        <div class="tr-card-side">
          <div class="tr-card-growth">${esc(x.growth||'+0%')}</div>
          <div class="tr-pill ${x.status||'RISING'}">${x.boomSoon?'BOOM':(x.status||'RISING')}</div>
        </div>
      </div>
      ${proof(x)}
      <div class="tr-spark ${x.status||'RISING'}"><svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true"><path d="${spark(x,i)}" style="animation-duration:${7+i%3}s"></path></svg></div>
      <div class="tr-card-actions">
        <button class="tr-track-btn ${trackedNow?'tr-track-btn-on':''}" data-track="${esc(x.name)}" type="button">${trackedNow?'Tracked':'Track'}</button>
        <a class="tr-ghost-link" href="https://www.youtube.com/results?search_query=${encodeURIComponent(x.name)}" target="_blank" rel="noreferrer">Open</a>
      </div>
    </article>`;
}

function monitorStrip(){
  return `<div class="tr-monitor"><div class="tr-monitor-item"><strong>${state.scanNumber||0}</strong><span>Scans</span></div><div class="tr-monitor-item"><strong>${state.boomCount||0}</strong><span>Boom Soon</span></div><div class="tr-monitor-item"><strong>${state.unreadCount||0}</strong><span>New Alerts</span></div><div class="tr-monitor-item"><strong>${tracked.length}</strong><span>Tracked</span></div></div>`;
}

function renderTrends(){
  const visible=currentList();
  summaryTitle.textContent='Top Trends';
  summaryMeta.textContent=searchMode?`${geoName(selectedGeo)} | ${visible.length} rising for "${searchTerm}"`:`${geoName(selectedGeo)} | ${visible.length} live topics`;
  panel.innerHTML=monitorStrip()+(visible.map(card).join('')||`<div class="tr-empty">${searchMode?'No keyword results':'No data'}</div>`);
}

function renderAlerts(){
  const alerts=currentList().filter(x=>x.boomSoon||x.status==='EARLY'||num(x.growth)>=300);
  summaryTitle.textContent='Alerts';
  summaryMeta.textContent=searchMode?`${geoName(selectedGeo)} | ${alerts.length} keyword triggers`:`${geoName(selectedGeo)} | ${alerts.length} active triggers`;
  
  if(!state.isPro && alerts.length > 3) {
    const freeAlerts = alerts.slice(0, 3);
    panel.innerHTML = monitorStrip() + freeAlerts.map(card).join('') + `
      <div class="tr-locked-feature">
        <div class="tr-locked-overlay">
          <div class="tr-locked-title">Lock Early Signals</div>
          <div class="tr-locked-reason">Unlock unlimited alerts and real-time breakout detection with Pro.</div>
          <button class="tr-upgrade-now" onclick="window.open('${BACKEND_URL}/upgrade')">Upgrade for $9.99</button>
        </div>
      </div>
    `;
  } else {
    panel.innerHTML=monitorStrip()+(alerts.length?alerts.map(card).join(''):'<div class="tr-empty">No active alerts</div>');
  }
}

function renderSignals(){
  if(!state.isPro) {
    summaryTitle.textContent='Signals';
    summaryMeta.textContent='Advanced Proof';
    panel.innerHTML=`
      <div class="tr-locked-feature" style="min-height: 300px;">
        <div class="tr-locked-overlay">
          <div class="tr-locked-title">Advanced Momentum Proof</div>
          <div class="tr-locked-reason">Get the exact growth proof, score history, and viral probability for every trend.</div>
          <button class="tr-upgrade-now" onclick="window.open('${BACKEND_URL}/upgrade')">Unlock Signals</button>
        </div>
      </div>
    `;
    return;
  }
  const top=[...currentList()].sort((a,b)=>(b.score||0)-(a.score||0));
  const hottest=top[0];
  summaryTitle.textContent='Signals';
  summaryMeta.textContent=searchMode?`${geoName(selectedGeo)} | Keyword momentum`:`${geoName(selectedGeo)} | Viral proof`;
  panel.innerHTML=`
    <div class="tr-metrics">
      <div class="tr-metric"><strong>${state.scanNumber||0}</strong><span>Total Scans</span></div>
      <div class="tr-metric"><strong>${state.boomCount||0}</strong><span>Boom Soon</span></div>
      <div class="tr-metric"><strong>${hottest?hottest.score:0}</strong><span>Top Score</span></div>
    </div>
    ${hottest?`<div class="tr-proof-card ${hottest.status}"><div class="tr-proof-head"><div><div class="tr-proof-title">${searchMode?'Keyword Rising':'About To Boom'}</div><div class="tr-proof-name">${esc(hottest.name)}</div></div><div class="tr-proof-score">${hottest.score||0}</div></div><div class="tr-proof-grid"><div><strong>${esc(hottest.growth||'+0%')}</strong><span>Growth</span></div><div><strong>${hottest.appearances||0}</strong><span>Appearances</span></div><div><strong>${hottest.consecutive||0}</strong><span>Streak</span></div><div><strong>${timeLabel(hottest.firstSeenAt)}</strong><span>First Seen</span></div></div><div class="tr-proof-reason">${searchMode?`Derived from Google Trends related rising queries for "${esc(searchTerm)}".`:(hottest.boomSoon?'Flagged from repeated scans plus strong momentum.':'Heating up from repeated scan appearances.')}</div></div>`:'<div class="tr-empty">No signal proof yet</div>'}
    <div class="tr-signal-stack">${top.slice(0,3).map((x,i)=>`<div class="tr-signal-row"><div class="tr-signal-rank">0${i+1}</div><div class="tr-signal-copy"><div class="tr-signal-name">${esc(x.name)}</div><div class="tr-signal-sub">Score ${x.score||0} | Seen ${x.appearances||0}x | Streak ${x.consecutive||0}</div></div><div class="tr-signal-side"><div class="tr-card-growth">${esc(x.growth||'+0%')}</div><div class="tr-pill ${x.status||'RISING'}">${x.boomSoon?'BOOM':'LIVE'}</div></div></div>`).join('')}</div>`;
}

function renderTrack(){
  const trackedItems=tracked.map(name=>historyByName[name]||items.find(x=>x.name===name)||{name,growth:'+0%',status:'RISING',idea:'Saved trend',score:0,appearances:0,consecutive:0,lastSeenAt:0}).filter(x=>!searchMode||(x.name||'').toLowerCase().includes(searchTerm.toLowerCase())).sort((a,b)=>(b.score||0)-(a.score||0));
  summaryTitle.textContent='Tracking';
  summaryMeta.textContent=`${geoName(selectedGeo)} | ${trackedItems.length} monitored trends`;
  panel.innerHTML=monitorStrip()+(trackedItems.length?trackedItems.map(card).join(''):'<div class="tr-empty">Track trends to pin and monitor them here</div>');
}

function renderNotify(){
  summaryTitle.textContent='Notifications';
  summaryMeta.textContent=`${geoName(selectedGeo)} | ${notifications.length} alerts`;
  const list=notifications.length
    ? notifications.map(n=>`
        <article class="tr-card ${n.status||'RISING'}">
          <div class="tr-card-top">
            <div class="tr-card-copy">
              <div class="tr-card-name">${esc(n.name)}</div>
              <div class="tr-card-sub">${esc(n.message||'New topic detected')}</div>
            </div>
            <div class="tr-card-side">
              <div class="tr-card-growth">${esc(n.growth||'+0%')}</div>
              <div class="tr-pill ${n.status||'RISING'}">${n.read?'READ':'NEW'}</div>
            </div>
          </div>
          <div class="tr-proof">
            <span>${timeLabel(n.at)}</span>
            <span>${esc(n.geo||selectedGeo)}</span>
          </div>
          <div class="tr-card-actions">
            <button class="tr-track-btn ${isTracked(n.name)?'tr-track-btn-on':''}" data-track="${esc(n.name)}" type="button">${isTracked(n.name)?'Tracked':'Track'}</button>
            <a class="tr-ghost-link" href="https://www.youtube.com/results?search_query=${encodeURIComponent(n.name)}" target="_blank" rel="noreferrer">Open</a>
          </div>
        </article>
      `).join('')
    : '<div class="tr-empty">No notifications yet</div>';
  panel.innerHTML=`
    <div class="tr-card-actions">
      <button class="tr-track-btn" id="markReadBtn" type="button">Mark Read</button>
      <button class="tr-ghost-link" id="clearNotifyBtn" type="button">Clear</button>
    </div>
    ${list}`;
}

function render(){
  tabs.forEach(x=>x.classList.toggle('tr-dock-item-active',x.dataset.tab===tab));
  upgradeBtn.style.display=state.isPro?'none':'block';
  proBadge.style.display=state.isPro?'block':'none';
  if(tab==='trends') renderTrends();
  if(tab==='alerts') renderAlerts();
  if(tab==='signals') renderSignals();
  if(tab==='track') renderTrack();
  if(tab==='notify') renderNotify();
}

async function syncHistory(){
  const store=await getStore(['scanStatesByGeo']);
  historyByName=((store.scanStatesByGeo||{})[geoKey(selectedGeo)]||{}).itemsByName||{};
}

async function syncNotifications(){
  const res=await sendMsg({type:'get-notifications',geo:selectedGeo});
  notifications=(res?.data||[]).slice(0,50);
}

async function checkProStatus(){
  try{
    const store = await getStore(['proEmail']);
    if(!store.proEmail) return false;
    
    // Call backend to verify
    const res = await fetch(`${BACKEND_URL}/api/verify?token=${encodeURIComponent(store.proEmail)}`);
    const data = await res.json();
    return data.isPro;
  }catch(e){
    return false;
  }
}

async function load(force){
  refreshBtn.disabled=true;
  scanBtn.disabled=true;
  refreshBtn.textContent='...';
  scanBtn.textContent='Scanning';
  scanStatus.textContent=force?'Live scan running':'Loading';
  const store=await getStore(['tracked','selectedGeo', 'proEmail']);
  tracked=Array.isArray(store.tracked)?store.tracked:[];
  selectedGeo=typeof store.selectedGeo==='string'?store.selectedGeo:'IN';
  if(store.proEmail) emailInput.value = store.proEmail;
  geoSelect.value=selectedGeo;
  let res=await sendMsg({type:force?'force-scan':'get-trends',geo:selectedGeo});
  if(!(res?.data||[]).length) res=await sendMsg({type:'force-scan',geo:selectedGeo});
  items=(res?.data||[]).slice(0,12);
  await syncHistory();
  await syncNotifications();
  const settingsRes=await sendMsg({type:'get-settings'});
  settings=settingsRes?.settings||settings;
  applySettings();
  const stateRes=force&&res?.state?res:await sendMsg({type:'get-monitor-state',geo:selectedGeo});
  state=stateRes?.state||state;
  state.isPro = await checkProStatus();
  refreshBtn.disabled=false;
  scanBtn.disabled=false;
  refreshBtn.textContent='RF';
  scanBtn.textContent='Scan Now';
  scanStatus.textContent=`Last scan ${timeLabel(state.lastScanAt)}`;
  if(!searchInput.value.trim()){
    searchMode=false;
    searchTerm='';
    keywordResults=[];
    keywordSource='trends';
  }
  render();
}

async function runKeywordSearch(){
  const keyword=(searchInput.value||'').trim();
  if(!keyword){
    searchMode=false;
    searchTerm='';
    keywordResults=[];
    keywordSource='trends';
    render();
    return;
  }
  searchMode=true;
  searchTerm=keyword;
  searchBtn.disabled=true;
  searchBtn.textContent='...';
  scanStatus.textContent=`Scanning "${keyword}"`;
  const res=await sendMsg({type:'search-keyword',keyword,geo:selectedGeo});
  keywordResults=(res?.data||[]).slice(0,12);
  keywordSource=keywordResults[0]?.source||'trends';
  searchBtn.disabled=false;
  searchBtn.textContent='Search';
  if(res?.ok&&keywordResults.length){
    scanStatus.textContent=keywordSource==='fallback'
      ? `Live fallback results ready for "${keyword}"`
      : `Keyword scan ready for "${keyword}"`;
  }else{
    scanStatus.textContent='No keyword matches yet';
  }
  render();
}

tabs.forEach(x=>x.addEventListener('click',async()=>{
  tab=x.dataset.tab;
  if(tab==='notify'){
    await syncNotifications();
    state=(await sendMsg({type:'get-monitor-state',geo:selectedGeo}))?.state||state;
  }
  render();
}));

panel.addEventListener('click',async e=>{
  const trackBtn=e.target.closest('[data-track]');
  if(trackBtn){
    await toggleTrack(trackBtn.dataset.track);
    return;
  }
  if(e.target.id==='markReadBtn'){
    await sendMsg({type:'mark-notifications-read',geo:selectedGeo});
    await syncNotifications();
    state=(await sendMsg({type:'get-monitor-state',geo:selectedGeo}))?.state||state;
    render();
  }
  if(e.target.id==='clearNotifyBtn'){
    await sendMsg({type:'clear-notifications',geo:selectedGeo});
    await syncNotifications();
    state=(await sendMsg({type:'get-monitor-state',geo:selectedGeo}))?.state||state;
    render();
  }
});

refreshBtn.addEventListener('click',()=>load(true));
scanBtn.addEventListener('click',()=>load(true));
searchBtn.addEventListener('click',runKeywordSearch);
searchInput.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); runKeywordSearch(); } });
pulseBtn.addEventListener('click',()=>{ tab='signals'; render(); });
upgradeBtn.addEventListener('click',()=>window.open(`${BACKEND_URL}/upgrade`));

saveEmailBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  saveEmailBtn.textContent = '...';
  await setStore({proEmail: email});
  await load(true);
  saveEmailBtn.textContent = 'Save';
});

geoSelect.addEventListener('change',async()=>{
  selectedGeo=geoSelect.value;
  refreshBtn.disabled=true;
  scanBtn.disabled=true;
  refreshBtn.textContent='...';
  scanBtn.textContent='Scanning';
  scanStatus.textContent='Switching region';
  
  if(!state.isPro && selectedGeo !== 'IN' && selectedGeo !== '') {
    scanStatus.textContent='Pro Feature: Multi-region';
    panel.innerHTML=`
      <div class="tr-locked-feature" style="min-height: 300px;">
        <div class="tr-locked-overlay">
          <div class="tr-locked-title">International Trends</div>
          <div class="tr-locked-reason">Free version is limited to India. Unlock 20+ countries and Worldwide tracking with Pro.</div>
          <button class="tr-upgrade-now" onclick="window.open('${BACKEND_URL}/upgrade')">Unlock High Yield Geos</button>
        </div>
      </div>
    `;
    refreshBtn.disabled=false;
    scanBtn.disabled=false;
    refreshBtn.textContent='RF';
    scanBtn.textContent='Scan Now';
    return;
  }

  let res=await sendMsg({type:'set-geo',geo:selectedGeo});
  if(!(res?.data||[]).length) res=await sendMsg({type:'force-scan',geo:selectedGeo});
  items=(res?.data||[]).slice(0,12);
  await syncHistory();
  await syncNotifications();
  state=res?.state||(await sendMsg({type:'get-monitor-state',geo:selectedGeo}))?.state||state;
  refreshBtn.disabled=false;
  scanBtn.disabled=false;
  refreshBtn.textContent='RF';
  scanBtn.textContent='Scan Now';
  scanStatus.textContent=`Last scan ${timeLabel(state.lastScanAt)}`;
  if(searchMode&&searchTerm) await runKeywordSearch();
  else render();
});

searchInput.addEventListener('input',()=>{
  if(!searchInput.value.trim()){
    searchMode=false;
    searchTerm='';
    keywordResults=[];
    keywordSource='trends';
    render();
  }
});
notifyToggle.addEventListener('change',async()=>{
  settings.desktop=notifyToggle.checked;
  if(!settings.desktop) settings.sound=false;
  const res=await sendMsg({type:'set-settings',settings});
  settings=res?.settings||settings;
  applySettings();
});
soundToggle.addEventListener('change',async()=>{
  settings.sound=soundToggle.checked&&settings.desktop;
  const res=await sendMsg({type:'set-settings',settings});
  settings=res?.settings||settings;
  applySettings();
});

load(false);
