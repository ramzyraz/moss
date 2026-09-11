import { setupLiving } from './living.js';
import { seedKinds, seedNames, plantAt, plotCount, freshCultivation } from '../shared/garden.js';
import type { PlantKind, MossAPI, Snapshot, Command } from '../shared/types';
declare global { interface Window { moss: MossAPI } }
const api=window.moss;
const isPet=new URLSearchParams(location.search).get('view')==='pet';
document.body.classList.add(isPet?'pet-window':'panel-window');
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const app=$('app');
const leaf='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4C9 3 4 7 5 13c1 6 10 7 13 0 1-3 1-6 1-9Z"/><path d="M5 21 15 10"/></svg>';
// Code-drawn garden assets stay crisp at desktop-avatar size.
function plant(stage:number,kind:PlantKind='classic',index=0){
  const stem=kind==='sunflower'?20:kind==='lavender'?24:30;
  const sprout=kind==='lavender'?'<path fill="#8eae80" d="M30 49 23 37h5l5 9 5-15h4l-6 19z"/>':'<path fill="#9dca78" d="M31 51H20V40h5v5h7zm3-9h11V31h-6v5h-5z"/>';
  let head='';
  if(stage===2)head=kind==='lavender'?'<path fill="#8d9b7a" d="M28 18h8v19h-8z"/>':`<path fill="#bbd88a" d="M26 ${stem-7}h12v14H26z"/>`;
  if(stage===3){
    if(kind==='sunflower')head='<path fill="#f2c558" d="M25 4h14v8h9v17h-9v8H25v-8h-9V12h9z"/><path fill="#79502e" d="M25 14h14v14H25z"/><path fill="#ae8245" d="M28 17h4v4h-4zM33 23h3v3h-3z"/>';
    else if(kind==='lavender')head='<path stroke="#829566" stroke-width="3" d="M25 47V26m14 22V23"/><path fill="#b9a0df" d="M29 8h6v7h-6zm-3 9h12v6H26zm2 8h9v6h-9zM21 25h7v7h-7zm-2 9h10v6H19zm17-14h7v6h-7zm-1 9h10v6H35z"/>';
    else head=`<path fill="${kind==='daisy'?'#fff0cf':['#efb0c3','#f1d180','#bcb0ef'][index%3]}" d="M25 13h14v7h7v14h-7v7H25v-7h-7V20h7z"/><path fill="#edbe53" d="M28 23h8v9h-8z"/>`;
  }
  return `<svg viewBox="0 0 64 72" aria-hidden="true" class="plant-art" data-kind="${kind}"><path fill="#443128" d="M7 62h50v6H7z"/><path fill="#896047" d="M12 59h40v5H12z"/>${stage===0?`<path fill="${kind==='sunflower'?'#b09365':kind==='lavender'?'#c1acd5':'#e4c185'}" d="M29 55h7v5h-7z"/>`:`<path stroke="#8cb86b" stroke-width="${kind==='lavender'?3:5}" fill="none" d="M32 60V${stage===1?43:stem}"/>${sprout}${head}`}</svg>`;
}
const toolsArt=`<span class="gardening-arm" aria-hidden="true"></span><span class="garden-spade" aria-hidden="true"><svg viewBox="0 0 20 48"><path stroke="#bb9665" stroke-width="6" d="M10 4v27"/><path fill="#a7b9ae" stroke="#52675c" stroke-width="2" d="M3 25h14v13l-7 8-7-8z"/></svg></span><span class="garden-tool" aria-hidden="true"><svg viewBox="0 0 60 48"><path fill="none" stroke="#9fc5b1" stroke-width="5" d="M14 21V9h19v12"/><path fill="#719d96" d="M8 18h28v24H8zM34 24l17-12 5 7-20 19z"/><path fill="#c2d7bb" d="M49 11h9v10h-9z"/></svg></span><span class="water-drops" aria-hidden="true"><i></i><i></i><i></i></span><span class="planting-seed" aria-hidden="true"></span>`;
const patch=`<span class="garden-soil"></span><span class="current-plant">${plant(0)}</span>${toolsArt}`;
let lastPlant='',gardenPage=0,lastGarden='',arranging=false,selectedPlant:number|null=null;
app.innerHTML=isPet?`
  <div class="pet-surface">
    <button class="pet-hit interactive" id="pet-open" aria-label="Open Moss focus controls. Drag to move.">${patch}<span class="creature" role="img" aria-label="Moss, your leaf-eared focus companion"></span></button>
    <button class="pet-pill interactive" id="pet-status" aria-label="Open focus controls"><span class="tiny-dot"></span><span id="pet-time">Ready when you are</span></button>
    <span class="drag-grip interactive" title="Drag to move Moss" aria-hidden="true">⠿</span>
  </div>`:`
  <main class="panel">
    <header class="titlebar"><div class="brand">${leaf}<span>moss<span class="brand-sub">a little company</span></span></div><div class="window-actions"><button id="minimize" class="icon-button" aria-label="Minimize to avatar" title="Show only Moss · click the avatar to return">−</button><button id="close" class="icon-button" aria-label="Close controls" title="Moss stays on your desktop">×</button></div></header>
    <section class="companion-section"><div class="eyebrow" id="phase-label">MAKE A LITTLE ROOM FOR FOCUS</div><div class="scene">${patch}<span class="scene-halo"></span><div class="creature" role="img" aria-label="Moss, your leaf-eared focus companion"></div></div><h1 id="greeting">Ready when you are.</h1><p id="message">A little focus. A garden that stays.</p></section>
    <section class="session-section" aria-label="Focus session">
      <div class="timer-line"><span class="timer" id="time">25:00</span><span class="timer-caption" id="timer-caption">of quiet focus</span></div>
      <div class="session-track" role="progressbar" id="session-progress" aria-label="Session progress" aria-valuemin="0" aria-valuemax="100"><span id="session-fill"></span></div>
      <p id="active-intention" class="active-intention" hidden></p>
      <div id="idle-controls"><label class="input-label" for="intention">What are we working on? <span>optional</span></label><input id="intention" type="text" maxlength="80" placeholder="One small thing to move forward…" autocomplete="off"><div class="duration-row"><label for="minutes">Focus time</label><div class="minute-input"><input id="minutes" type="number" min="1" max="120" step="1" value="25" aria-label="Focus minutes" aria-describedby="duration-help"><span>min</span></div><div class="presets" aria-label="Focus duration presets"><button data-minutes="15">15</button><button data-minutes="25" aria-pressed="true">25</button><button data-minutes="50">50</button></div></div><p id="duration-help" class="duration-help">Type any duration from 1 to 120 minutes above.</p><fieldset class="seed-picker"><legend>What shall we grow?</legend><div>${seedKinds.map(kind=>`<button type="button" class="seed-choice" data-seed="${kind}" aria-pressed="false">${plant(3,kind)}<span>${seedNames[kind]}</span></button>`).join('')}</div></fieldset><button class="primary" id="start">Let’s focus <span>↗</span></button></div>
      <div id="active-controls" hidden><button class="primary" id="pause">Pause a moment <span>Ⅱ</span></button><button class="primary" id="resume" hidden>Pick up where we left off <span>↗</span></button><button class="text-button" id="end">End this session</button></div>
      <div id="complete-controls" hidden><button class="primary" id="rest">Take a 5-minute break <span>☕</span></button><button class="text-button" id="new-session">Ready for another?</button></div>
      <p class="session-note" id="session-note">Moss will keep you company above your other apps.</p>
    </section>
    <section class="growth" aria-label="Saved focus progress"><div class="growth-title"><span>${leaf} Your little garden</span><span id="total-count">0 sessions</span></div><button id="arrange-garden" class="arrange-button" aria-pressed="false">Arrange garden</button><p id="arrange-help" class="arrange-help" role="status" hidden></p><div id="living-tools" hidden></div><div id="garden-world"><div id="decoration-spots" hidden></div><div id="saved-garden" class="saved-garden" aria-label="Your permanent flower garden"></div><div id="garden-walker" hidden role="img" aria-label="Moss resting"><span class="roaming-moss"></span><span class="roaming-can">▰</span><span class="roaming-drops">⋮</span><span class="roaming-weed">♧</span></div></div><div class="garden-navigation"><button id="garden-prev" aria-label="Previous garden patch">‹</button><span id="garden-page"></span><button id="garden-next" aria-label="Next garden patch">›</button></div><p id="growth-description">Finish a focus session to keep your first flower.</p><div class="today"><span>Today</span><strong id="today-count">0 sessions · 0 min</strong></div></section>
    <details class="preferences"><summary>Little preferences <span>⌄</span></summary><div class="settings"><label class="break-setting">Garden style <select id="garden-style"><option value="simple">Simple</option><option value="living">Living garden</option></select></label><p>Simple keeps things quiet. Living garden adds a roaming Moss and earned decorations. Switch anytime; your progress stays.</p><label class="switch-row"><span class="switch-copy">Follow me across apps<small id="follow-help">Stay visible on desktops and full-screen apps.</small></span><input aria-describedby="follow-help" id="pinned" type="checkbox" checked role="switch"></label><label class="switch-row"><span>Gentle completion chime</span><input id="sound" type="checkbox" role="switch"></label><label class="break-setting">Break length <select id="break-minutes"><option value="3">3 minutes</option><option value="5" selected>5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select></label><div class="settings-actions"><button id="hide" class="text-button">Hide creature</button><button id="quit" class="text-button">Quit Moss</button></div><p>Progress stays on this computer. Sleep pauses your session.</p></div></details>
    <footer><button id="demo" class="demo-button">Try a 20-second demo ↗</button><span>OFFLINE & YOURS</span></footer>
    <p id="error" class="error" role="alert" hidden></p><p id="notice" class="notice" role="status" hidden></p><span id="announcement" class="sr-only" role="status" aria-live="polite"></span>
  </main>
  <dialog id="end-dialog"><h2>Call it here?</h2><p>You can always come back. This unfinished session won’t count toward your progress.</p><div><button class="secondary" id="keep-going">Keep going</button><button class="primary" id="confirm-end">End session</button></div></dialog>`;
const updateLiving=isPet?null:setupLiving(command=>void send(command));
let state:Snapshot|undefined,hydrated=false,lastStatus='',busy=false;
const minutesInput=()=>Number($<HTMLInputElement>('minutes').value);
function formatTime(ms:number){const seconds=Math.ceil(Math.max(0,ms)/1000);return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;}
function messageFor(s:Snapshot){
  const a=s.session;
  if(a.status==='idle')return ['Ready when you are.','A little focus. A garden that stays.'];
  if(a.status==='paused')return ['Take your time.',a.pauseReason==='sleep'?'Your Mac rested. Your session paused with it.':a.pauseReason==='reopened'?'Welcome back. Your session is saved right here.':'A pause is part of the process.'];
  if(a.status==='completed')return a.phase==='focus'?['Look at you grow.',a.demo?'A little preview. No progress was added.':'One more flower in our little garden.']:['Feeling a little lighter?','Your next session starts when you choose.'];
  return a.phase==='focus'?['I’m right here.','You focus. I’ll tend our garden.']:['A little breather.','Stretch your legs. Rest your eyes.'];
}
function update(s:Snapshot){
  state=s;const a=s.session;const [greeting,message]=messageFor(s);
  document.body.dataset.status=a.status;document.body.dataset.phase=a.phase;
  document.body.dataset.pose=a.status==='completed'&&a.phase==='focus'?'celebrate':a.status==='paused'||a.phase==='break'?'rest':a.status==='running'?'focus':'idle';
  document.body.classList.toggle('demo',a.demo);
  document.body.dataset.stage=String(s.garden.stage);
  document.body.classList.toggle('tending',s.garden.tending);
  if(s.garden.tending)document.body.dataset.pose='idle';
  const cultivation=s.cultivation??freshCultivation();
  const kind=a.status==='idle'?cultivation.selectedSeed:cultivation.activeSeed;
  const plantKey=`${s.garden.stage}:${kind}`;
  if(plantKey!==lastPlant){document.querySelectorAll('.current-plant').forEach(el=>{el.innerHTML=plant(s.garden.stage,kind);el.setAttribute('aria-label',['Seed in the soil','Growing sprout','Flower bud','Blooming flower'][s.garden.stage]);});lastPlant=plantKey;}

  if(isPet){document.body.classList.toggle('avatar-only',!!s.compact);$('pet-time').textContent=a.status==='idle'?'Ready when you are':a.status==='completed'?a.phase==='focus'?'A little more grown ✦':'Break complete':`${a.status==='paused'?'Paused · ':a.demo?'Demo · ':''}${formatTime(a.remainingMs)}`;return;}
  if(navigator.userAgent.includes('Windows'))$('follow-help').textContent='Stay above normal windows on this desktop.';
  if(!hydrated){$<HTMLInputElement>('minutes').value=String(s.preferences.focusMinutes);$<HTMLInputElement>('intention').value=a.label;hydrated=true;}
  const idle=a.status==='idle',active=a.status==='running'||a.status==='paused',done=a.status==='completed';
  $('greeting').textContent=greeting;$('message').textContent=s.garden.tending?'Moss is planting, tending, and watering.':message;
  $('phase-label').textContent=a.demo?'A TINY PRACTICE SESSION':idle?'MAKE A LITTLE ROOM FOR FOCUS':a.phase==='break'?'REST IS PART OF THE WORK':done?'ONE SMALL PROMISE, KEPT':'IN GOOD COMPANY';
  $('time').textContent=formatTime(idle?(Number.isFinite(minutesInput())?minutesInput():25)*60000:a.remainingMs);
  $('timer-caption').textContent=done?'beautifully done':a.status==='paused'?'saved for later':a.phase==='break'?'of breathing room':'of quiet focus';
  const progress=idle?0:100*(1-a.remainingMs/a.durationMs);$('session-fill').style.width=`${progress}%`;$('session-progress').setAttribute('aria-valuenow',String(Math.round(progress)));
  $('idle-controls').hidden=!idle;$('active-controls').hidden=!active;$('complete-controls').hidden=!done;
  $('pause').hidden=a.status!=='running';$('resume').hidden=a.status!=='paused';$('rest').hidden=a.phase==='break';
  $('rest').textContent=a.demo?'Try a 10-second break ☕':`Take a ${s.preferences.breakMinutes}-minute break ☕`;
  $('new-session').textContent=a.phase==='break'?'Start a new chapter ↗':'Ready for another?';
  $('active-intention').hidden=idle||!a.label;$('active-intention').textContent=a.label;
  $('session-note').textContent=a.demo?'Demo only. Your saved progress stays the same.':idle?'Moss will keep you company above your other apps.':active?'You can pause anytime. Sleep pauses automatically.':'No rush. Moss is happy to wait.';
  $<HTMLButtonElement>('demo').disabled=active||busy;
  $('total-count').textContent=`${s.totalSessions} ${s.totalSessions===1?'session':'sessions'}`;
  document.querySelectorAll<HTMLButtonElement>('[data-seed]').forEach(el=>{el.setAttribute('aria-pressed',String(el.dataset.seed===cultivation.selectedSeed));el.disabled=active||busy;});
  const pages=plotCount(s.garden.planted)/12;gardenPage=Math.min(gardenPage,pages-1);
  const gardenKey=JSON.stringify([s.garden.planted,gardenPage,cultivation.species,cultivation.positions,arranging,selectedPlant]);
  if(gardenKey!==lastGarden){
    const focused=(document.activeElement as HTMLElement)?.dataset?.plot;
    $('saved-garden').innerHTML=Array.from({length:12},(_,i)=>{
      const slot=gardenPage*12+i,id=plantAt(s.garden.planted,cultivation,slot),species=id===null?'classic':cultivation.species[String(id)]??'classic';
      const label=id===null?`Empty plot ${slot+1}`:`${seedNames[species]}, plot ${slot+1}`;
      return `<button class="garden-slot${selectedPlant!==null&&id===selectedPlant?' selected':''}" data-plot="${slot}" aria-label="${label}${arranging?', select to move or swap':''}" aria-pressed="${id!==null&&id===selectedPlant}" title="${label}" ${!arranging?'disabled':''}>${id!==null?plant(3,species,id):'<span class="empty-soil"></span>'}</button>`;
    }).join('');
    if(focused!==undefined)$('saved-garden').querySelector<HTMLButtonElement>(`[data-plot="${focused}"]`)?.focus({preventScroll:true});
    lastGarden=gardenKey;
  }
  updateLiving?.(s,arranging);
  $<HTMLSelectElement>('garden-style').value=s.preferences.gardenStyle??'simple';
  $('arrange-garden').textContent=arranging?'Done arranging':'Arrange garden';$('arrange-garden').setAttribute('aria-pressed',String(arranging));
  $<HTMLButtonElement>('arrange-garden').disabled=s.garden.planted===0;
  $('arrange-help').hidden=!arranging;$('arrange-help').textContent=selectedPlant===null?'Choose a flower to move.':`Choose a destination plot. An occupied plot swaps flowers. Click the selected flower to cancel.`;
  $('garden-page').textContent=s.garden.planted?`Patch ${gardenPage+1} of ${pages} · ${s.garden.planted} ${s.garden.planted===1?'flower':'flowers'}`:'An empty patch. A fresh start.';
  $<HTMLButtonElement>('garden-prev').disabled=gardenPage===0;$<HTMLButtonElement>('garden-next').disabled=gardenPage>=pages-1;
  $('growth-description').textContent=a.demo?'Practice garden · demo flowers aren’t saved.':a.status==='paused'?'Your sprout is safe. Resume whenever you’re ready.':s.garden.tending?['Moss is planting a seed.','A sprout! Moss is keeping it watered.','A bud is forming. Keep it company.','Your flower is ready.'][s.garden.stage]:s.garden.planted?'Every flower is a focus session you completed.':'Finish a focus session to keep your first flower.';
  $('today-count').textContent=`${s.todaySessions} ${s.todaySessions===1?'session':'sessions'} · ${s.todayMinutes} min`;
  $<HTMLInputElement>('pinned').checked=s.preferences.alwaysOnTop;$<HTMLInputElement>('sound').checked=s.preferences.sound;
  $<HTMLSelectElement>('break-minutes').value=String(s.preferences.breakMinutes);
  $('notice').hidden=!s.notice;$('notice').textContent=s.notice??'';
  document.querySelectorAll<HTMLButtonElement>('[data-minutes]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.minutes)===minutesInput())));
  const key=`${a.status}:${a.phase}`;if(key!==lastStatus){$('announcement').textContent=`${greeting} ${message}`;lastStatus=key;}
}
async function send(command:Command){
  if(busy)return;busy=true;
  try{if(!isPet)$('error').hidden=true;update(await api.command(command));}
  catch(error){if(!isPet){$('error').textContent=(error instanceof Error?error.message:'Something went wrong. Please try again.').replace(/^Error invoking remote method '[^']+': Error: /,'');$('error').hidden=false;}}
  finally{busy=false;if(state)update(state);}
}
const on=(id:string,callback:()=>void)=>$(id).addEventListener('click',callback);
if(isPet){
  let start:{x:number;y:number}|null=null,dragged=false,interactive=false;
  $('pet-open').addEventListener('pointerdown',e=>{if(e.button!==0)return;start={x:e.screenX,y:e.screenY};dragged=false;$('pet-open').setPointerCapture(e.pointerId);});
  $('pet-open').addEventListener('pointermove',e=>{if(start&&!dragged&&Math.hypot(e.screenX-start.x,e.screenY-start.y)>4){dragged=true;api.dragStart();}});
  const stop=()=>{if(dragged)api.dragEnd();start=null;};
  $('pet-open').addEventListener('pointerup',stop);$('pet-open').addEventListener('pointercancel',stop);window.addEventListener('blur',stop);
  on('pet-open',()=>{if(!dragged)api.openPanel();dragged=false;});on('pet-status',()=>api.openPanel());
  document.addEventListener('pointermove',e=>{const hit=!!(e.target as Element).closest('.interactive');if(hit!==interactive){interactive=hit;api.pointer(hit);}});
  document.addEventListener('pointerleave',()=>{if(!start){interactive=false;api.pointer(false);}});
  api.pointer(false);
  api.onChime(()=>{try{const audio=new AudioContext();const now=audio.currentTime;[523.25,659.25].forEach((f,i)=>{const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.value=f;gain.gain.setValueAtTime(0,now+i*.17);gain.gain.linearRampToValueAtTime(.09,now+i*.17+.02);gain.gain.exponentialRampToValueAtTime(.001,now+i*.17+.5);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(now+i*.17);oscillator.stop(now+i*.17+.5);});setTimeout(()=>void audio.close(),1000);}catch{/* Sound is optional. */}});
}else{
  document.querySelectorAll<HTMLButtonElement>('[data-seed]').forEach(button=>button.addEventListener('click',()=>void send({type:'seed',seed:button.dataset.seed as 'daisy'|'sunflower'|'lavender'})));
  on('arrange-garden',()=>{arranging=!arranging;selectedPlant=null;if(state)update(state);});
  $('saved-garden').addEventListener('click',event=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('[data-plot]');if(!button||!state||!arranging||busy)return;
    const to=Number(button.dataset.plot),id=plantAt(state.totalSessions,state.cultivation??freshCultivation(),to);
    if(selectedPlant===null){if(id!==null)selectedPlant=id;update(state);return;}
    if(selectedPlant===id){selectedPlant=null;update(state);return;}
    const moving=selectedPlant;selectedPlant=null;void send({type:'movePlant',plant:moving,to});
  });
  on('garden-prev' ,()=>{gardenPage--;if(state)update(state);});on('garden-next',()=>{gardenPage++;if(state)update(state);});
  on('minimize',()=>api.hidePanel());on('close',()=>api.hidePanel());on('hide',()=>api.hidePet());on('quit',()=>api.quit());
  on('start',()=>void send({type:'start',minutes:minutesInput(),label:$<HTMLInputElement>('intention').value}));
  on('pause',()=>void send({type:'pause'}));on('resume',()=>void send({type:'resume'}));
  on('rest',()=>void send({type:'rest'}));on('new-session',()=>void send({type:'end'}));on('demo',()=>void send({type:'demo'}));
  const dialog=$<HTMLDialogElement>('end-dialog');on('end',()=>dialog.showModal());on('keep-going',()=>dialog.close());on('confirm-end',()=>{dialog.close();void send({type:'end'});});
  document.querySelectorAll<HTMLButtonElement>('[data-minutes]').forEach(button=>button.addEventListener('click',()=>{$<HTMLInputElement>('minutes').value=button.dataset.minutes!;if(state)update(state);}));
  $('minutes').addEventListener('input',()=>{if(state)update(state);});
  $('intention').addEventListener('keydown',e=>{if(e.key==='Enter'&&state?.session.status==='idle')$('start').click();});
  $('pinned').addEventListener('change',()=>void send({type:'preferences',values:{alwaysOnTop:$<HTMLInputElement>('pinned').checked}}));
  $('garden-style').addEventListener('change',()=>void send({type:'preferences',values:{gardenStyle:$<HTMLSelectElement>('garden-style').value as 'simple'|'living'}}));
  $('sound').addEventListener('change',()=>void send({type:'preferences',values:{sound:$<HTMLInputElement>('sound').checked}}));
  $('break-minutes').addEventListener('change',()=>void send({type:'preferences',values:{breakMinutes:Number($<HTMLSelectElement>('break-minutes').value)}}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open)api.hidePanel();});
}
api.onState(update);
api.getState().then(update).catch(()=>{if(!isPet){$('error').hidden=false;$('error').textContent='Moss could not load. Quit and reopen the app to try again.';}});
