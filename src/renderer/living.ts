import { decorations } from '../shared/living.js';
import type { Snapshot, Command, DecorationKind } from '../shared/types';
const art:Record<DecorationKind,string>={
 lantern:'<path fill="#70583c" d="M29 14h6v45h-6zM18 59h28v5H18z"/><path fill="#c99a58" d="M20 10h24v27H20z"/><path fill="#ffe4a0" d="M24 15h16v17H24z"/><path fill="#534b38" d="M17 7h30v7H17z"/>',
 bench:'<path fill="#ad8055" d="M7 24h50v8H7zm0 11h50v7H7zM4 46h56v7H4z"/><path fill="#65523e" d="M10 20h5v43h-5zm39 0h5v43h-5z"/>',
 pond:'<path fill="#879d78" d="M9 27h43v6h8v23h-9v7H13v-6H4V35h5z"/><path fill="#649d9c" d="M13 33h35v5h7v14h-9v5H17v-5H9V39h4z"/><path fill="#a5d6cd" d="M16 41h16v3H16zm16 9h12v3H32z"/><path fill="#b4c780" d="M37 33h11v8H37z"/>',
 cottage:'<path fill="#cbb28b" d="M12 30h40v32H12z"/><path fill="#72865b" d="M5 30 32 7l27 23v5H5z"/><path fill="#71553e" d="M27 43h12v19H27z"/><path fill="#ffe0a0" d="M17 39h7v9h-7zm25 0h7v9h-7z"/><path fill="#a48c6b" d="M43 10h7v16h-7z"/>'
};
export const decorationArt=(kind:DecorationKind)=>`<svg viewBox="0 0 64 72" aria-hidden="true">${art[kind]}</svg>`;
export function setupLiving(send:(command:Command)=>void){
 const area=document.getElementById('living-tools')!, world=document.getElementById('garden-world')!, walker=document.getElementById('garden-walker')!;
 let selected:DecorationKind|null=null,last='',snapshot:Snapshot|undefined,elapsed=0,previous=performance.now(),moving=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 area.innerHTML=`<p class="living-intro">A little home, grown one session at a time.</p><div class="decoration-shelf">${decorations.map(d=>`<button data-decoration="${d.kind}" aria-pressed="false">${decorationArt(d.kind)}<span>${d.name}</span><small></small></button>`).join('')}</div><p id="decoration-help" role="status"></p><button id="put-away" class="arrange-button" hidden>Put away selected decoration</button>`;
 document.getElementById('decoration-spots')!.innerHTML=Array.from({length:4},(_,i)=>`<button data-spot="${i}" aria-label="Decoration spot ${i+1}"><span>＋</span></button>`).join('');
 area.addEventListener('click',e=>{const b=(e.target as Element).closest<HTMLButtonElement>('[data-decoration]');if(b&&!b.disabled){selected=selected===b.dataset.decoration?null:b.dataset.decoration as DecorationKind;if(snapshot)update(snapshot,false);}});
 document.getElementById('decoration-spots')!.addEventListener('click',e=>{const b=(e.target as Element).closest<HTMLButtonElement>('[data-spot]');if(!b||!snapshot)return;if(selected){send({type:'decoration',kind:selected,to:Number(b.dataset.spot)});}else{selected=decorations.find(d=>snapshot!.decorations?.[d.kind]===Number(b.dataset.spot))?.kind??null;if(snapshot)update(snapshot,false);}});
 document.getElementById('put-away')!.addEventListener('click',()=>{if(selected)send({type:'decoration',kind:selected,to:null});});
 function update(s:Snapshot,arranging:boolean){
  snapshot=s;const living=s.preferences.gardenStyle==='living';
  area.hidden=!living;world.classList.toggle('living',living);document.getElementById('decoration-spots')!.hidden=!living;walker.hidden=!living;
  const now=performance.now(),active=living&&s.garden.tending&&!arranging&&!selected&&!document.hidden&&!reduced.matches;
  if(active&&moving)elapsed+=Math.min(now-previous,1000);previous=now;moving=active;
  if(!living){selected=null;return;}
  for(const d of decorations){const b=area.querySelector<HTMLButtonElement>(`[data-decoration="${d.kind}"]`)!;b.disabled=s.totalSessions<d.at;b.setAttribute('aria-pressed',String(selected===d.kind));b.querySelector('small')!.textContent=b.disabled?`${s.totalSessions}/${d.at} sessions`:s.decorations?.[d.kind]!==undefined?'Placed':'Unlocked';}
  const key=JSON.stringify(s.decorations??{});if(last!==key){for(let i=0;i<4;i++){const b=world.querySelector<HTMLButtonElement>(`[data-spot="${i}"]`)!,d=decorations.find(d=>s.decorations?.[d.kind]===i);b.innerHTML=d?decorationArt(d.kind):'<span>＋</span>';b.setAttribute('aria-label',`${d?.name??'Empty decoration spot'} ${i+1}`);}last=key;}
  document.getElementById('decoration-help')!.textContent=selected?`Choose a spot for your ${decorations.find(d=>d.kind===selected)!.name.toLowerCase()}. Occupied decorations swap or return to the shelf.`:'Decorations have four spots beside the flowers. Select an unlocked item to place it.';
  document.getElementById('put-away')!.hidden=!selected||s.decorations?.[selected]===undefined;
  const flowers=Array.from(world.querySelectorAll<HTMLElement>('.garden-slot')).filter(b=>b.querySelector('.plant-art'));
  const cycle=Math.floor(elapsed/12000),phase=Math.floor(elapsed/3000)%4;
  const target=flowers.length?flowers[cycle%flowers.length]:world.querySelector<HTMLElement>('.garden-slot');
  if(target){const r=target.getBoundingClientRect(),w=world.getBoundingClientRect();walker.style.left=`${r.left-w.left+r.width/2-24}px`;walker.style.top=`${r.top-w.top+r.height-40}px`;}
  const action=active&&flowers.length?['walking','watering','weeding','resting'][phase]:'resting';
  walker.dataset.action=action;walker.setAttribute('aria-label',`Moss is ${action}`);
  world.classList.toggle('quiet',!active);
 }
 return update;
}
