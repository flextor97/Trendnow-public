chrome.runtime.onMessage.addListener(msg=>{
  if(msg?.type!=='play-notify-sound') return;
  const ctx=new AudioContext();
  const osc=ctx.createOscillator();
  const gain=ctx.createGain();
  osc.type='sine';
  osc.frequency.value=880;
  gain.gain.setValueAtTime(0.0001,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08,ctx.currentTime+0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime+0.36);
  osc.onended=()=>ctx.close();
});
