import { freshCultivation, seedKinds, plantAt, movePlant } from '../shared/garden';
import type { Command, SavedState, Session, Snapshot } from '../shared/types';
const MINUTE = 60000;
export function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function freshState(): SavedState {
  return { version:1, session:{phase:'focus',status:'idle',durationMs:25*MINUTE,remainingMs:25*MINUTE,deadline:null,label:'',demo:false,pauseReason:null},
    preferences:{focusMinutes:25,breakMinutes:5,alwaysOnTop:true,sound:false},totalSessions:0,totalMinutes:0,history:[],position:null };
}
export class FocusTimer {
  public state: SavedState;
  constructor(state: SavedState = freshState(), private now: () => number = Date.now) {
    this.state = structuredClone(state);
    this.state.cultivation ??= freshCultivation();
    // Offline time never silently turns into earned focus time.
    if (this.state.session.status === 'running') {
      this.state.session.status = 'paused'; this.state.session.deadline = null;
      this.state.session.pauseReason = 'reopened';
    }
  }
  remaining(now=this.now()): number {
    const s=this.state.session;
    return s.status==='running' ? Math.max(0,Math.min(s.durationMs,(s.deadline ?? now)-now)) : s.remainingMs;
  }
  tick(): boolean {
    const s=this.state.session;
    if(s.status!=='running' || this.remaining()>0) return false;
    s.status='completed'; s.remainingMs=0; s.deadline=null; s.pauseReason=null;
    if(s.phase==='focus' && !s.demo) {
      const c=this.state.cultivation!,id=this.state.totalSessions;
      let slot=0;while(plantAt(id,c,slot)!==null)slot++;
      if(c.activeSeed!=='classic')c.species[String(id)]=c.activeSeed;
      if(slot!==id)c.positions[String(id)]=slot;
      this.state.totalSessions++;
      this.state.totalMinutes+=s.durationMs/MINUTE;
      const now=this.now();
      this.state.history.push({at:now,day:dayKey(now),minutes:s.durationMs/MINUTE,label:s.label});
      this.state.history=this.state.history.slice(-1000);
    }
    return true;
  }
  pause(reason: 'manual'|'sleep'|'reopened'='manual'): void {
    this.tick();
    const s=this.state.session;
    if(s.status!=='running') return;
    s.remainingMs=this.remaining(); s.status='paused'; s.deadline=null; s.pauseReason=reason;
  }
  private start(phase:'focus'|'break',durationMs:number,label:string,demo:boolean): void {
    if(phase==='focus')this.state.cultivation!.activeSeed=this.state.cultivation!.selectedSeed;
    this.state.session={phase,status:'running',durationMs,remainingMs:durationMs,deadline:this.now()+durationMs,label,demo,pauseReason:null};
  }
  dispatch(command:Command): void {
    this.tick();
    const s=this.state.session;
    switch(command.type) {
      case 'seed':
        if(s.status==='running'||s.status==='paused')throw new Error('Choose your next seed after this session.');
        if(!seedKinds.includes(command.seed))throw new Error('Choose daisy, sunflower, or lavender.');
        this.state.cultivation!.selectedSeed=command.seed;break;
      case 'movePlant':movePlant(this.state.totalSessions,this.state.cultivation!,command.plant,command.to);break;
      case 'start':
        if(s.status==='running'||s.status==='paused') throw new Error('End the current session before starting another.');
        if(!Number.isInteger(command.minutes)||command.minutes<1||command.minutes>120) throw new Error('Choose 1–120 whole minutes.');
        if(typeof command.label!=='string'||command.label.length>80) throw new Error('Keep the intention under 80 characters.');
        this.state.preferences.focusMinutes=command.minutes;
        this.start('focus',command.minutes*MINUTE,command.label.trim(),false); break;
      case 'demo':
        if(s.status==='running'||s.status==='paused') throw new Error('End your current session before trying the demo.');
        this.start('focus',20000,'A little practice',true); break;
      case 'pause': this.pause(); break;
      case 'resume':
        if(s.status!=='paused') return;
        s.deadline=this.now()+s.remainingMs; s.status='running'; s.pauseReason=null; break;
      case 'rest':
        if(s.status==='running'||s.status==='paused') throw new Error('End your current session before taking a break.');
        this.start('break',s.demo?10000:this.state.preferences.breakMinutes*MINUTE,'Time to stretch',s.demo); break;
      case 'end': {
        const duration=this.state.preferences.focusMinutes*MINUTE;
        this.state.session={phase:'focus',status:'idle',durationMs:duration,remainingMs:duration,deadline:null,label:'',demo:false,pauseReason:null}; break;
      }
      case 'preferences': {
        const v=command.values;
        if(!v||typeof v!=='object') throw new Error('Invalid settings.');
        const next={...this.state.preferences};
        if(v.focusMinutes!==undefined) {
          if(!Number.isInteger(v.focusMinutes)||v.focusMinutes<1||v.focusMinutes>120) throw new Error('Choose 1–120 focus minutes.');
          next.focusMinutes=v.focusMinutes;
        }
        if(v.breakMinutes!==undefined) {
          if(!Number.isInteger(v.breakMinutes)||v.breakMinutes<1||v.breakMinutes>30) throw new Error('Choose 1–30 break minutes.');
          next.breakMinutes=v.breakMinutes;
        }
        if(v.alwaysOnTop!==undefined) {
          if(typeof v.alwaysOnTop!=='boolean') throw new Error('Invalid pin setting.');
          next.alwaysOnTop=v.alwaysOnTop;
        }
        if(v.sound!==undefined) {
          if(typeof v.sound!=='boolean') throw new Error('Invalid sound setting.');
          next.sound=v.sound;
        }
        this.state.preferences=next;
        break;
      }
      default: throw new Error('Unknown action.');
    }
  }
  snapshot(notice:string|null=null):Snapshot {
    const state=structuredClone(this.state);
    state.session.remainingMs=this.remaining();
    const today=state.history.filter(h=>h.day===dayKey(this.now()));
    const progress=state.session.phase==='focus'&&state.session.status!=='idle'?1-state.session.remainingMs/state.session.durationMs:0;
    const stage:0|1|2|3=progress>=1?3:progress>=.65?2:progress>=.25?1:0;
    return {...state,garden:{stage,planted:state.totalSessions,tending:state.session.phase==='focus'&&state.session.status==='running'},todaySessions:today.length,todayMinutes:today.reduce((n,h)=>n+h.minutes,0),notice};
  }
  checkpoint():SavedState {
    const s=structuredClone(this.state); s.session.remainingMs=this.remaining(); return s;
  }
}
