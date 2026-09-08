import { contextBridge, ipcRenderer } from 'electron';
import type { Command, MossAPI, Snapshot } from './shared/types';
const api:MossAPI={
  getState:()=>ipcRenderer.invoke('moss:state'),
  command:(value:Command)=>ipcRenderer.invoke('moss:command',value),
  onState:(callback)=>{const listener=(_event:unknown,state:Snapshot)=>callback(state);ipcRenderer.on('moss:update',listener);return()=>ipcRenderer.removeListener('moss:update',listener);},
  onChime:(callback)=>{const listener=()=>callback();ipcRenderer.on('moss:chime',listener);return()=>ipcRenderer.removeListener('moss:chime',listener);},
  openPanel:()=>ipcRenderer.send('moss:open-panel'),hidePanel:()=>ipcRenderer.send('moss:hide-panel'),hidePet:()=>ipcRenderer.send('moss:hide-pet'),quit:()=>ipcRenderer.send('moss:quit'),
  dragStart:()=>ipcRenderer.send('moss:drag-start'),dragEnd:()=>ipcRenderer.send('moss:drag-end'),
  pointer:(interactive)=>ipcRenderer.send('moss:pointer',interactive),
};
contextBridge.exposeInMainWorld('moss',api);
