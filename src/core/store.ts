import { validDecorations } from '../shared/living';
import { validCultivation } from '../shared/garden';
import fs from 'node:fs';
import path from 'node:path';
import { freshState } from './timer';
import type { SavedState } from '../shared/types';
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const integer=(x:unknown,min:number,max:number)=>finite(x)&&Number.isInteger(x)&&x>=min&&x<=max;
export function validState(value:unknown):value is SavedState {
  if(!value||typeof value!=='object') return false;
  const v=value as SavedState,s=v.session,p=v.preferences;
  return validDecorations(v) && (v.cultivation===undefined||validCultivation(v.cultivation,v.totalSessions)) && v.version===1 && !!s && !!p && ['focus','break'].includes(s.phase) && ['idle','running','paused','completed'].includes(s.status)
    && finite(s.durationMs)&&s.durationMs>0&&s.durationMs<=7200000
    && finite(s.remainingMs)&&s.remainingMs>=0&&s.remainingMs<=s.durationMs
    && (s.deadline===null||finite(s.deadline)) && typeof s.label==='string'&&s.label.length<=80 && typeof s.demo==='boolean'
    && [null,'manual','sleep','reopened'].includes(s.pauseReason)
    && integer(p.focusMinutes,1,120)&&integer(p.breakMinutes,1,30)&&typeof p.alwaysOnTop==='boolean'&&typeof p.sound==='boolean'
    && integer(v.totalSessions,0,Number.MAX_SAFE_INTEGER)&&finite(v.totalMinutes)&&v.totalMinutes>=0
    && Array.isArray(v.history)&&v.history.length<=1000&&v.history.every(h=>h&&finite(h.at)&&typeof h.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(h.day)&&integer(h.minutes,1,120)&&typeof h.label==='string'&&h.label.length<=80)
    && (v.position===null||(!!v.position&&finite(v.position.x)&&finite(v.position.y)));
}
export class StateStore {
  notice:string|null=null;
  constructor(readonly file:string) {}
  load():SavedState {
    try {
      const parsed:unknown=JSON.parse(fs.readFileSync(this.file,'utf8'));
      if(!validState(parsed)) throw new Error('Invalid saved state');
      return parsed;
    } catch(error) {
      if((error as NodeJS.ErrnoException).code==='ENOENT') return freshState();
      // Preserve damaged data for recovery instead of overwriting it silently.
      if(fs.existsSync(this.file)) {
        try { fs.copyFileSync(this.file,`${this.file}.backup-${Date.now()}`); }
        catch { this.notice='Saved progress could not be read or backed up. Changes will not be saved.'; return freshState(); }
      }
      this.notice='Saved progress could not be read. A backup was kept; Moss is starting fresh.';
      return freshState();
    }
  }
  save(state:SavedState):void {
    if(this.notice?.includes('will not be saved')) return;
    fs.mkdirSync(path.dirname(this.file),{recursive:true});
    const temporary=`${this.file}.tmp`;
    fs.writeFileSync(temporary,JSON.stringify(state,null,2),{mode:0o600});
    fs.renameSync(temporary,this.file);
  }
}
