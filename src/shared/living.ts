import type { DecorationKind, SavedState } from './types';
export const decorations: {kind:DecorationKind;name:string;at:number}[]=[{kind:'lantern',name:'Lantern',at:3},{kind:'bench',name:'Bench',at:5},{kind:'pond',name:'Pond',at:10},{kind:'cottage',name:'Tiny cottage',at:20}];
export function placeDecoration(s:SavedState,kind:DecorationKind,to:number|null){
  const item=decorations.find(d=>d.kind===kind);
  if(!item||s.totalSessions<item.at)throw new Error('This decoration has not unlocked yet.');
  if(to!==null&&(!Number.isInteger(to)||to<0||to>3))throw new Error('Choose a decoration spot.');
  const positions=s.decorations??={};
  const from=positions[kind];
  if(to===null){delete positions[kind];return;}
  const other=decorations.find(d=>d.kind!==kind&&positions[d.kind]===to);
  if(other){if(from===undefined)delete positions[other.kind];else positions[other.kind]=from;}
  positions[kind]=to;
}
export function validDecorations(s:SavedState){
  if(s.preferences?.gardenStyle!==undefined&&!['simple','living'].includes(s.preferences.gardenStyle))return false;
  if(s.decorations===undefined)return true;
  if(!s.decorations||typeof s.decorations!=='object'||Array.isArray(s.decorations))return false;
  const used=new Set<number>();
  return Object.entries(s.decorations).every(([kind,slot])=>{
    const item=decorations.find(d=>d.kind===kind);
    if(!item||s.totalSessions<item.at||!Number.isInteger(slot)||slot<0||slot>3||used.has(slot))return false;
    used.add(slot);return true;
  });
}
