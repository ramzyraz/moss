import type { Cultivation, PlantKind, SeedKind } from './types';
export const seedKinds:SeedKind[]=['daisy','sunflower','lavender'];
export const seedNames:Record<PlantKind,string>={classic:'Original flower',daisy:'Daisy',sunflower:'Sunflower',lavender:'Lavender'};
export function freshCultivation():Cultivation{return {selectedSeed:'daisy',activeSeed:'classic',species:{},positions:{}};}
export function plotCount(total:number):number{return Math.ceil((total+1)/12)*12;}
export function plantAt(total:number,c:Cultivation,slot:number):number|null{
  for(const [id,position] of Object.entries(c.positions))if(position===slot)return Number(id);
  return slot<total && c.positions[String(slot)]===undefined?slot:null;
}
export function movePlant(total:number,c:Cultivation,id:number,to:number):void{
  if(!Number.isSafeInteger(id)||id<0||id>=total||!Number.isSafeInteger(to)||to<0||to>=plotCount(total))throw new Error('Choose a flower and a valid garden plot.');
  const from=c.positions[String(id)]??id,other=plantAt(total,c,to);
  if(from===to)return;
  const place=(plant:number,slot:number)=>{if(plant===slot)delete c.positions[String(plant)];else c.positions[String(plant)]=slot;};
  place(id,to);if(other!==null)place(other,from);
}
export function validCultivation(value:unknown,total:number):value is Cultivation{
  if(!value||typeof value!=='object')return false;
  const c=value as Cultivation;
  if(!seedKinds.includes(c.selectedSeed)||!['classic',...seedKinds].includes(c.activeSeed))return false;
  const record=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v);
  if(!record(c.species)||!record(c.positions))return false;
  const validID=(key:string)=>/^(0|[1-9]\d*)$/.test(key)&&Number.isSafeInteger(Number(key))&&Number(key)<total;
  if(!Object.entries(c.species).every(([id,kind])=>validID(id)&&seedKinds.includes(kind)))return false;
  const entries=Object.entries(c.positions),destinations=new Set<number>();
  for(const [id,slot] of entries){
    if(!validID(id)||!Number.isSafeInteger(slot)||slot<0||slot>=plotCount(total)||destinations.has(slot))return false;
    if(slot<total&&slot!==Number(id)&&c.positions[String(slot)]===undefined)return false;
    destinations.add(slot);
  }
  return true;
}
