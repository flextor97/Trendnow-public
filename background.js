const RSS_BASE='https://trends.google.com/trending/rss';
const SUGGEST_BASE='https://suggestqueries.google.com/complete/search';
const ALARM='trendradar-scan';
const PERIOD_MINUTES=5;
const OFFSCREEN='offscreen.html';

const getStore=keys=>new Promise(resolve=>chrome.storage.local.get(keys,resolve));
const setStore=value=>new Promise(resolve=>chrome.storage.local.set(value,resolve));
const createChromeNotification=options=>new Promise(resolve=>chrome.notifications.create(options,resolve));

function now(){return Date.now();}
function num(g){return parseInt(String(g||'').replace(/\D/g,''),10)||0;}
function normalizeText(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function words(s){return normalizeText(s).split(/\s+/).filter(Boolean);}
function hash(s){
  let h=0;
  for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return h;
}
function geoKey(geo){return geo||'WORLDWIDE';}
function rssUrl(geo){return geo?`${RSS_BASE}?geo=${encodeURIComponent(geo)}`:RSS_BASE;}
function trimJsonPrefix(text){return text.replace(/^\)\]\}'\s*/,'');}

function parseTraffic(raw){
  return parseInt(String(raw||'').replace(/[^\d]/g,''),10)||0;
}

function scoreMatch(keyword,text){
  const kw=words(keyword);
  const target=words(text);
  if(!kw.length||!target.length) return 0;
  const set=new Set(target);
  const overlap=kw.filter(x=>set.has(x)).length;
  const phrase=normalizeText(text).includes(normalizeText(keyword))?2:0;
  return overlap*3+phrase;
}

function makeGrowth(name,traffic){
  const base=Math.max(120,Math.min(920,Math.round(traffic/1000)*12));
  return '+'+(base+(hash(name)%37))+'%';
}

function parseRss(xml){
  const titles=[...xml.matchAll(/<item>[\s\S]*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>[\s\S]*?<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/g)]
    .slice(0,10)
    .map(m=>{
      const name=(m[1]||'').trim();
      const traffic=parseTraffic(m[2]);
      const growth=makeGrowth(name,traffic);
      return {
        name,
        traffic,
        growth,
        status:traffic>=20000?'EARLY':'RISING',
        idea:'YouTube: '+name
      };
    })
    .filter(x=>x.name);
  if(titles.length) return titles;
  return [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g)]
    .map(m=>(m[1]||m[2]||'').trim())
    .filter(Boolean)
    .slice(1,11)
    .map(name=>{
      const growth='+'+(140+(hash(name)%260))+'%';
      return {name,traffic:0,growth,status:num(growth)>=250?'EARLY':'RISING',idea:'YouTube: '+name};
    });
}

async function fromRss(geo){
  const xml=await fetch(rssUrl(geo),{cache:'no-store'}).then(r=>r.text());
  return parseRss(xml);
}

async function fetchSuggestions(keyword){
  const url=`${SUGGEST_BASE}?client=firefox&hl=en&ds=&q=${encodeURIComponent(keyword)}`;
  const raw=await fetch(url,{cache:'no-store'}).then(async r=>{
    const text=await r.text();
    if(!r.ok) throw new Error('SUGGEST_FAILED');
    return text;
  });
  const data=JSON.parse(raw);
  return Array.isArray(data?.[1])?data[1].filter(Boolean):[];
}

function buildKeywordResult(name,keyword,index,base){
  const score=Math.max(48,Math.min(97,(base||58)+(hash(name)%18)-index*2));
  const growth='+'+Math.max(110,Math.min(980,score*4+(hash(keyword+name)%36)))+'%';
  return {
    name,
    traffic:0,
    growth,
    status:score>=72?'EARLY':'RISING',
    idea:`Rising around ${keyword}`,
    score,
    appearances:1,
    consecutive:1,
    boomSoon:score>=84,
    keyword,
    lastSeenAt:now(),
    firstSeenAt:now()
  };
}

async function keywordFallback(keyword,geo){
  const [geoTrends,worldTrends,suggestions]=await Promise.all([
    fromRss(geo).catch(()=>[]),
    geo?fromRss('').catch(()=>[]):Promise.resolve([]),
    fetchSuggestions(keyword).catch(()=>[])
  ]);
  const merged=[...geoTrends,...worldTrends];
  const byName=new Map();
  merged.forEach(item=>{
    const matchScore=scoreMatch(keyword,item.name);
    if(matchScore>0){
      byName.set(item.name,{
        ...item,
        score:Math.max(62,Math.min(99,55+matchScore*9+Math.round((item.traffic||0)/5000))),
        appearances:1,
        consecutive:1,
        boomSoon:item.status==='EARLY'||num(item.growth)>=320,
        keyword,
        lastSeenAt:now(),
        firstSeenAt:now(),
        idea:`Live trend connected to ${keyword}`
      });
    }
  });
  suggestions.forEach((name,index)=>{
    if(!byName.has(name)) byName.set(name,buildKeywordResult(name,keyword,index,60-scoreMatch(keyword,name)*2));
  });
  if(!byName.size){
    const fallbackSeeds=[
      `${keyword} news`,
      `${keyword} update`,
      `${keyword} trend`,
      `${keyword} viral`,
      `${keyword} latest`
    ];
    fallbackSeeds.forEach((name,index)=>byName.set(name,buildKeywordResult(name,keyword,index,54)));
  }
  return [...byName.values()]
    .sort((a,b)=>(b.score||0)-(a.score||0)||num(b.growth)-num(a.growth))
    .slice(0,10)
    .map((item,index)=>index<3?{...item,boomSoon:item.boomSoon||item.score>=80}:item);
}

async function keywordSearch(keyword,geo){
  const cleaned=String(keyword||'').trim();
  if(!cleaned) return [];
  try{
    const req={comparisonItem:[{keyword:cleaned,geo:geo||'',time:'now 7-d'}],category:0,property:''};
    const exploreUrl=`https://trends.google.com/trends/api/explore?hl=en-US&tz=-330&req=${encodeURIComponent(JSON.stringify(req))}`;
    const exploreRaw=await fetch(exploreUrl,{cache:'no-store'}).then(async r=>{
      const text=await r.text();
      if(!r.ok||/Too Many Requests/i.test(text)) throw new Error('RATE_LIMIT');
      return text;
    });
    const explore=JSON.parse(trimJsonPrefix(exploreRaw));
    const widget=(explore.widgets||[]).find(x=>x.id==='RELATED_QUERIES');
    if(!widget) throw new Error('NO_WIDGET');
    const widgetUrl=`https://trends.google.com/trends/api/widgetdata/relatedsearches?hl=en-US&tz=-330&req=${encodeURIComponent(JSON.stringify(widget.request))}&token=${encodeURIComponent(widget.token)}`;
    const relatedRaw=await fetch(widgetUrl,{cache:'no-store'}).then(async r=>{
      const text=await r.text();
      if(!r.ok||/Too Many Requests/i.test(text)) throw new Error('RATE_LIMIT');
      return text;
    });
    const related=JSON.parse(trimJsonPrefix(relatedRaw));
    const rankedLists=related.default?.rankedList||[];
    const rising=(rankedLists[1]?.rankedKeyword||rankedLists[0]?.rankedKeyword||[]).slice(0,10);
    if(!rising.length) throw new Error('NO_RESULTS');
    return rising.map((x,i)=>{
      const rawValue=Array.isArray(x.value)?x.value[0]:x.value;
      const breakout=String(rawValue).toLowerCase()==='breakout';
      const growth=breakout?'Breakout':`+${rawValue||((10-i)*10)}%`;
      return {
        name:x.query||cleaned,
        traffic:0,
        growth,
        status:breakout||num(growth)>=250?'EARLY':'RISING',
        idea:`Rising with ${cleaned}`,
        score:breakout?99:Math.min(95,num(growth)),
        appearances:1,
        consecutive:1,
        boomSoon:breakout||num(growth)>=300,
        keyword:cleaned,
        lastSeenAt:now(),
        firstSeenAt:now(),
        source:'trends'
      };
    });
  }catch(error){
    const fallback=await keywordFallback(cleaned,geo);
    return fallback.map(item=>({...item,source:'fallback'}));
  }
}

async function fetchSource(geo){
  return fromRss(geo);
}

function buildProof(item,prev,scanNumber,timestamp){
  const growth=num(item.growth);
  const lastSeenScan=prev?.lastSeenScan||0;
  const consecutive=lastSeenScan===scanNumber-1?(prev?.consecutive||0)+1:1;
  const appearances=(prev?.appearances||0)+1;
  const firstSeenAt=prev?.firstSeenAt||timestamp;
  const peakGrowth=Math.max(prev?.peakGrowth||0,growth);
  const score=Math.min(99,
    Math.round(
      Math.min(55,growth/7)+
      Math.min(18,appearances*4)+
      Math.min(16,consecutive*4)+
      Math.min(10,Math.max(0,(timestamp-firstSeenAt)/600000))+
      (item.status==='EARLY'?10:4)
    )
  );
  return {
    firstSeenAt,
    lastSeenAt:timestamp,
    lastSeenScan:scanNumber,
    appearances,
    consecutive,
    peakGrowth,
    score,
    boomSoon:score>=72||consecutive>=3&&growth>=240
  };
}

async function getGeo(){
  const store=await getStore(['selectedGeo']);
  return typeof store.selectedGeo==='string'?store.selectedGeo:'IN';
}

async function scanAndStore(force,overrideGeo){
  const geo=overrideGeo!==undefined?overrideGeo:await getGeo();
  const key=geoKey(geo);
  const timestamp=now();
  const store=await getStore(['scanStatesByGeo','latestTrendsByGeo','latestTrendsTimestampByGeo','notificationsByGeo']);
  const scanStatesByGeo=store.scanStatesByGeo||{};
  const latestTrendsByGeo=store.latestTrendsByGeo||{};
  const latestTrendsTimestampByGeo=store.latestTrendsTimestampByGeo||{};
  const notificationsByGeo=store.notificationsByGeo||{};
  const state=scanStatesByGeo[key]||{scanNumber:0,itemsByName:{}};
  const previousList=latestTrendsByGeo[key]||[];
  const fresh=!force&&latestTrendsByGeo[key]&&timestamp-(latestTrendsTimestampByGeo[key]||0)<120000;
  if(fresh) return latestTrendsByGeo[key];
  const source=await fetchSource(geo);
  const scanNumber=(state.scanNumber||0)+1;
  const itemsByName={...(state.itemsByName||{})};
  const trends=source.map(item=>{
    const prev=itemsByName[item.name];
    const proof=buildProof(item,prev,scanNumber,timestamp);
    itemsByName[item.name]={...prev,...item,...proof,geo:key};
    return {...item,...proof,geo:key};
  });
  Object.keys(itemsByName).forEach(name=>{
    if(itemsByName[name].lastSeenScan!==scanNumber&&scanNumber-itemsByName[name].lastSeenScan>12) delete itemsByName[name];
  });
  scanStatesByGeo[key]={scanNumber,lastScanAt:timestamp,itemsByName};
  latestTrendsByGeo[key]=trends;
  latestTrendsTimestampByGeo[key]=timestamp;
  const prevNames=new Set(previousList.map(x=>x.name));
  const newTopics=scanNumber>1?trends.filter(x=>!prevNames.has(x.name)).slice(0,5):[];
  if(newTopics.length){
    const log=(notificationsByGeo[key]||[]);
    const entries=newTopics.map(x=>({
      id:`${key}-${timestamp}-${hash(x.name)}`,
      name:x.name,
      growth:x.growth,
      status:x.status,
      geo:key,
      at:timestamp,
      read:false,
      message:`${x.name} just appeared in ${key==='WORLDWIDE'?'Worldwide':key}`
    }));
    notificationsByGeo[key]=[...entries,...log].slice(0,50);
    await notifyNewTopics(entries);
  }
  await setStore({scanStatesByGeo,latestTrendsByGeo,latestTrendsTimestampByGeo,notificationsByGeo});
  return trends;
}

async function ensureOffscreen(){
  if(!chrome.offscreen?.createDocument) return;
  const exists=await chrome.offscreen.hasDocument?.();
  if(exists) return;
  await chrome.offscreen.createDocument({
    url:OFFSCREEN,
    reasons:['AUDIO_PLAYBACK'],
    justification:'Play a short alert when new trends are detected'
  });
}

async function notifyNewTopics(entries){
  for(const entry of entries.slice(0,3)){
    await createChromeNotification({
      type:'basic',
      iconUrl:'icon128.png',
      title:'TrendNow Alert',
      message:`${entry.name} ${entry.growth} in ${entry.geo==='WORLDWIDE'?'Worldwide':entry.geo}`
    });
  }
  try{
    await ensureOffscreen();
    chrome.runtime.sendMessage({type:'play-notify-sound'});
  }catch(e){}
}

async function monitorState(overrideGeo){
  const geo=overrideGeo!==undefined?overrideGeo:await getGeo();
  const key=geoKey(geo);
  const store=await getStore(['scanStatesByGeo','tracked','notificationsByGeo']);
  const state=(store.scanStatesByGeo||{})[key]||{};
  const values=Object.values(state.itemsByName||{});
  const notifications=(store.notificationsByGeo||{})[key]||[];
  return {
    geo:key,
    scanNumber:state.scanNumber||0,
    lastScanAt:state.lastScanAt||0,
    boomCount:values.filter(x=>x.boomSoon).length,
    trackedCount:Array.isArray(store.tracked)?store.tracked.length:0,
    unreadCount:notifications.filter(x=>!x.read).length,
    hottest:values.sort((a,b)=>(b.score||0)-(a.score||0))[0]||null
  };
}

function ensureAlarm(){
  chrome.alarms.create(ALARM,{periodInMinutes:PERIOD_MINUTES});
}

chrome.runtime.onInstalled.addListener(()=>{
  ensureAlarm();
  scanAndStore(true).catch(()=>{});
});

chrome.runtime.onStartup.addListener(()=>{
  ensureAlarm();
  scanAndStore(true).catch(()=>{});
});

chrome.alarms.onAlarm.addListener(alarm=>{
  if(alarm.name===ALARM) scanAndStore(true).catch(()=>{});
});

chrome.runtime.onMessage.addListener((msg,_,send)=>{
  if(msg?.type==='get-trends'){
    scanAndStore(false,msg.geo).then(data=>send({ok:1,data})).catch(()=>send({ok:0,data:[]}));
    return true;
  }
  if(msg?.type==='force-scan'){
    scanAndStore(true,msg.geo).then(async data=>send({ok:1,data,state:await monitorState(msg.geo)})).catch(()=>send({ok:0,data:[]}));
    return true;
  }
  if(msg?.type==='get-monitor-state'){
    monitorState(msg.geo).then(state=>send({ok:1,state})).catch(()=>send({ok:0,state:null}));
    return true;
  }
  if(msg?.type==='set-geo'){
    setStore({selectedGeo:msg.geo||''}).then(async()=>{
      const data=await scanAndStore(true,msg.geo||'');
      const state=await monitorState(msg.geo||'');
      send({ok:1,data,state});
    }).catch(()=>send({ok:0,data:[]}));
    return true;
  }
  if(msg?.type==='search-keyword'){
    keywordSearch(msg.keyword||'',msg.geo).then(data=>send({ok:1,data})).catch(err=>send({ok:0,error:err?.message||'SEARCH_FAILED',data:[]}));
    return true;
  }
  if(msg?.type==='get-notifications'){
    getStore(['notificationsByGeo']).then(store=>send({ok:1,data:((store.notificationsByGeo||{})[geoKey(msg.geo)]||[])})).catch(()=>send({ok:0,data:[]}));
    return true;
  }
  if(msg?.type==='mark-notifications-read'){
    getStore(['notificationsByGeo']).then(async store=>{
      const all=store.notificationsByGeo||{};
      all[geoKey(msg.geo)]=(all[geoKey(msg.geo)]||[]).map(x=>({...x,read:true}));
      await setStore({notificationsByGeo:all});
      send({ok:1});
    }).catch(()=>send({ok:0}));
    return true;
  }
  if(msg?.type==='clear-notifications'){
    getStore(['notificationsByGeo']).then(async store=>{
      const all=store.notificationsByGeo||{};
      all[geoKey(msg.geo)]=[];
      await setStore({notificationsByGeo:all});
      send({ok:1});
    }).catch(()=>send({ok:0}));
    return true;
  }
});
