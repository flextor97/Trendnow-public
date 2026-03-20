const esc=s=>(s||'').replace(/[&<>"]/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m]));

if(!document.getElementById('trendaradar')){
  chrome.runtime.sendMessage({type:'get-trends'},res=>{
    const x=res?.data?.[0];
    if(!x) return;
    const box=document.createElement('div');
    box.id='trendaradar';
    box.className='tr-box';
    box.innerHTML=`
      <div class="tr-overlay-label">
        <span class="tr-overlay-brand"><img class="tr-overlay-logo" src="${chrome.runtime.getURL('logo.svg')}" alt=""><span>HOT SIGNAL</span></span>
        <button class="tr-close" type="button" aria-label="Close">x</button>
      </div>
      <div class="tr-overlay-main">
        <div>
          <a class="tr-name" href="https://www.youtube.com/results?search_query=${encodeURIComponent(x.name)}" target="_blank" rel="noreferrer">${esc(x.name)}</a>
          <div class="tr-idea">${esc(x.idea)}</div>
        </div>
        <div class="tr-growth">${esc(x.growth)}</div>
      </div>
      <div class="tr-overlay-bottom">
        <span class="tr-pill ${x.status}">${x.status}</span>
        <a class="tr-action" href="https://www.youtube.com/results?search_query=${encodeURIComponent(x.name)}" target="_blank" rel="noreferrer">Analyze</a>
      </div>
      <div class="tr-overlay-credit">Made by Flextor</div>
    `;
    box.querySelector('.tr-close').addEventListener('click',()=>box.remove(),{once:true});
    document.documentElement.appendChild(box);
  });
}
