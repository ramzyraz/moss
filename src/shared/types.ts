export type Phase = 'focus' | 'break';
export type Status = 'idle' | 'running' | 'paused' | 'completed';
export type PauseReason = 'manual' | 'sleep' | 'reopened' | null;
export interface Session {
  phase: Phase; status: Status; durationMs: number; remainingMs: number;
  deadline: number | null; label: string; demo: boolean; pauseReason: PauseReason;
}
export interface CompletedSession { at: number; day: string; minutes: number; label: string }
export interface Preferences { focusMinutes: number; breakMinutes: number; alwaysOnTop: boolean; sound: boolean }
export interface SavedState {
  version: 1; session: Session; preferences: Preferences;
  totalSessions: number; totalMinutes: number; history: CompletedSession[];
  position: { x: number; y: number } | null;
}
export interface Snapshot extends SavedState {
  garden: { stage: 0|1|2|3; planted: number; tending: boolean };
  compact?: boolean; // Transient desktop presentation; never stored with progress.
  todaySessions: number; todayMinutes: number; notice: string | null;
}
export type Command =
 | { type: 'start'; minutes: number; label: string }
 | { type: 'demo' } | { type: 'pause' } | { type: 'resume' }
 | { type: 'rest' } | { type: 'end' }
 | { type: 'preferences'; values: Partial<Preferences> };
export interface MossAPI {
  getState(): Promise<Snapshot>;
  command(value: Command): Promise<Snapshot>;
  onState(callback: (state: Snapshot) => void): () => void;
  onChime(callback: () => void): () => void;
  openPanel(): void; hidePanel(): void; hidePet(): void; quit(): void;
  dragStart(): void; dragEnd(): void;
  pointer(interactive: boolean): void;
}
