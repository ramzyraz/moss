import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen, powerMonitor, Notification, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { FocusTimer } from './core/timer';
import { StateStore } from './core/store';
import type { Command } from './shared/types';

const smoke=process.argv.includes('--smoke-test');
app.setName('Moss');
if(smoke) app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'moss-smoke-')));
let pet:BrowserWindow, panel:BrowserWindow, tray:Tray;
let clock:number|undefined=smoke?Date.now():undefined;
let timer:FocusTimer,store:StateStore;
let notice:string|null=null, quitting=false;
let drag:ReturnType<typeof setInterval>|null=null;
const page=path.join(__dirname,'renderer/index.html');
const pageURL=pathToFileURL(page).href;
let tickInterval:ReturnType<typeof setInterval>|undefined;
let saveInterval:ReturnType<typeof setInterval>|undefined;
type OverlayState={allSpaces:boolean;fullScreenAuxiliary:boolean;hidesOnDeactivate:boolean;nonActivating:boolean;joinsOtherApps:boolean;stageManagerSupported:boolean};
const overlay: {configure(handle:Buffer,enabled:boolean):OverlayState;inspect(handle:Buffer):OverlayState}|null = process.platform==='darwin' ? require('./native/overlay.node') : null;
function applyVisibility(){
  const enabled=timer.state.preferences.alwaysOnTop;
  pet.setAlwaysOnTop(enabled,'floating');
  if(process.platform==='darwin'){
    // Do not transform the whole app's activation policy when configuring one pet.
    pet.setVisibleOnAllWorkspaces(enabled,{visibleOnFullScreen:enabled,skipTransformProcessType:true});
    overlay!.configure(pet.getNativeWindowHandle(),enabled);
  }else pet.setVisibleOnAllWorkspaces(enabled);
}
function save(){try{store.save(timer.checkpoint());if(notice?.startsWith('Could not save'))notice=null;}catch{notice='Could not save progress. Keep Moss open and check available disk space.';}}
function snapshot(){return {...timer.snapshot(notice??store.notice),compact:!panel?.isVisible()};}
function collapsePanel(){panel.hide();pet.showInactive();emit();refreshTray();}
function emit(){const state=snapshot();for(const w of [pet,panel])if(w&&!w.isDestroyed())w.webContents.send('moss:update',state);}
function finished(){
  save();
  if(timer.state.preferences.sound)pet.webContents.send('moss:chime');
  if(!smoke && Notification.isSupported())new Notification({title:timer.state.session.phase==='focus'?'A little focus, a little growth.':'Ready when you are.',body:timer.state.session.demo?'Demo complete. Your real progress is unchanged.':timer.state.session.phase==='focus'?'Moss is proud of you. Time for a stretch?':'Your break is over. Start your next session whenever you like.',silent:true}).show();
  refreshTray();
}
function tick(){if(timer.tick())finished();emit();}
function clampPosition(x:number,y:number){const area=screen.getDisplayNearestPoint({x:Math.round(x+120),y:Math.round(y+135)}).workArea;return{x:Math.max(area.x,Math.min(Math.round(x),area.x+area.width-240)),y:Math.max(area.y,Math.min(Math.round(y),area.y+area.height-270))};}
function savePosition(){if(!pet||pet.isDestroyed())return;const [x,y]=pet.getPosition();timer.state.position={x,y};save();}
function stopDrag(){if(drag){clearInterval(drag);drag=null;savePosition();}}
function showPanel(){
  if(panel.isDestroyed())return;
  const b=pet.getBounds(),a=screen.getDisplayMatching(b).workArea;
  const size=panel.getBounds();
  panel.setPosition(Math.round(Math.max(a.x,Math.min(b.x-160,a.x+a.width-size.width))),Math.round(Math.max(a.y,Math.min(b.y-350,a.y+a.height-size.height))));
  stopDrag();pet.hide();panel.show();panel.focus();emit();refreshTray();
}
function showPet(){collapsePanel();}
function refreshTray(){if(!tray)return;const s=timer.state.session;tray.setToolTip(`Moss · ${s.status==='running'?s.phase==='focus'?'Focusing':'Taking a break':'Your focus companion'}`);tray.setContextMenu(Menu.buildFromTemplate([
  {label:'Open Moss',click:showPanel},
  {label:pet?.isVisible()?'Hide creature':'Show creature',click:()=>{pet.isVisible()?pet.hide():showPet();refreshTray();}},
  ...(s.status==='running'||s.status==='paused'?[{label:s.status==='running'?'Pause session':'Resume session',click:()=>{timer.dispatch({type:s.status==='running'?'pause':'resume'});save();emit();refreshTray();}}]:[]),
  {type:'separator' as const},{label:'Quit Moss',accelerator:'CommandOrControl+Q',click:()=>app.quit()},
]));}
function icon(){
  const size=32,buffer=Buffer.alloc(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const leaf=((x-17)/10)**2+((y-13)/12)**2<1&&x+y>13;
    const stem=Math.abs(x-(26-y*.45))<1.2&&y>12&&y<30;
    if(leaf||stem){const i=(y*size+x)*4;buffer[i]=buffer[i+1]=buffer[i+2]=0;buffer[i+3]=255;}
  }
  const image=nativeImage.createFromBitmap(buffer,{width:size,height:size,scaleFactor:2});image.setTemplateImage(true);return image;
}
function trust(event:Electron.IpcMainEvent|Electron.IpcMainInvokeEvent){
  return [pet,panel].some(w=>w&&!w.isDestroyed()&&w.webContents===event.sender)&&event.senderFrame===event.sender.mainFrame&&event.senderFrame?.url.split('?')[0]===pageURL;
}
function registerIPC(){
  ipcMain.handle('moss:state',e=>{if(!trust(e))throw new Error('Untrusted window');tick();return snapshot();});
  ipcMain.handle('moss:command',(e,value:Command)=>{
    if(!trust(e))throw new Error('Untrusted window');
    if(!value||typeof value!=='object'||typeof value.type!=='string')throw new Error('Invalid action');
    if(timer.tick())finished();
    const previous=timer.state.preferences.alwaysOnTop;
    timer.dispatch(value);
    if(previous!==timer.state.preferences.alwaysOnTop)applyVisibility();
    save();emit();refreshTray();return snapshot();
  });
  const on=(name:string,fn:(e:Electron.IpcMainEvent,v:unknown)=>void)=>ipcMain.on(name,(e,v)=>{if(trust(e))fn(e,v);});
  on('moss:open-panel',()=>showPanel());on('moss:hide-panel',collapsePanel);
  on('moss:hide-pet',()=>{pet.hide();panel.hide();refreshTray();});on('moss:quit',()=>app.quit());
  on('moss:pointer',(e,value)=>{if(e.sender===pet.webContents&&typeof value==='boolean'&&!drag)pet.setIgnoreMouseEvents(!value,{forward:true});});
  on('moss:drag-start',(e)=>{
    if(e.sender!==pet.webContents)return;stopDrag();pet.setIgnoreMouseEvents(false);
    const origin=screen.getCursorScreenPoint(),bounds=pet.getBounds();
    drag=setInterval(()=>{const cursor=screen.getCursorScreenPoint();const p=clampPosition(bounds.x+cursor.x-origin.x,bounds.y+cursor.y-origin.y);pet.setPosition(p.x,p.y);},16);
  });
  on('moss:drag-end',()=>stopDrag());
}
async function createWindows(){
  const area=screen.getPrimaryDisplay().workArea;
  const pos=timer.state.position??{x:area.x+area.width-260,y:area.y+area.height-285};
  const bounded=clampPosition(pos.x,pos.y);
  const webPreferences={preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required' as const};
  pet=new BrowserWindow({width:240,height:270,...bounded,focusable:false,acceptFirstMouse:true,transparent:true,backgroundColor:'#00000000',frame:false,hasShadow:false,resizable:false,maximizable:false,minimizable:false,fullscreenable:false,skipTaskbar:true,alwaysOnTop:timer.state.preferences.alwaysOnTop,show:false,title:'Moss companion',webPreferences});
  applyVisibility();
  panel=new BrowserWindow({width:400,height:Math.min(790,area.height-30),minWidth:360,minHeight:540,frame:false,transparent:false,backgroundColor:'#17211e',resizable:true,show:false,title:'Moss · Focus companion',webPreferences});
  panel.on('show',()=>{if(panel.isVisible()){pet.hide();emit();refreshTray();}});
  panel.on('restore',()=>{if(panel.isVisible()){pet.hide();emit();refreshTray();}});
  panel.on('close',e=>{if(!quitting){e.preventDefault();collapsePanel();}});
  pet.on('close',e=>{if(!quitting){e.preventDefault();pet.hide();refreshTray();}});
  pet.on('moved',()=>{if(!drag)savePosition();});pet.on('blur',stopDrag);
  for(const w of [pet,panel]){
    w.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    w.webContents.on('will-navigate',e=>e.preventDefault());
    w.webContents.on('will-attach-webview',e=>e.preventDefault());
    w.webContents.on('render-process-gone',()=>{notice='The companion display stopped. Reopen Moss to restore your saved session.';save();});
  }
  registerIPC();
  await Promise.all([pet.loadFile(page,{query:{view:'pet'}}),panel.loadFile(page,{query:{view:'panel'}})]);
  showPanel();
  tray=new Tray(icon());tray.on('click',()=>showPanel());refreshTray();
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Moss',submenu:[{label:'Show creature',click:showPet},{label:'Open focus controls',click:showPanel},{type:'separator'},{role:'quit'}]},{role:'editMenu'},{label:'View',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]}]));
}
async function smokeTest(){
  const out=path.join(app.isPackaged?app.getPath('userData'):app.getAppPath(),'artifacts');fs.mkdirSync(out,{recursive:true});
  const js=(s:string)=>panel.webContents.executeJavaScript(s);
  const waitFor=async(expression:string)=>{for(let i=0;i<100;i++){if(await js(expression))return;await new Promise(r=>setTimeout(r,30));}throw new Error(`UI condition failed: ${expression}`);};
  try {
    // Hosted Macs may enable Reduce Motion; test both modes explicitly.
    panel.webContents.debugger.attach('1.3');
    await panel.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    await waitFor('!!document.querySelector("#start") && !document.querySelector("#start").disabled');
    assert.equal(panel.isVisible(),true);assert.equal(pet.isVisible(),false);
    assert.equal(pet.isAlwaysOnTop(),true);assert.equal(pet.getBounds().width,240);
    if(overlay){
      const flags=overlay.inspect(pet.getNativeWindowHandle());
      assert.equal(flags.allSpaces,true);assert.equal(flags.fullScreenAuxiliary,true);
      assert.equal(flags.hidesOnDeactivate,false);assert.equal(pet.isFocusable(),false);
      if(flags.stageManagerSupported)assert.equal(flags.joinsOtherApps,true);
    }
    const isolated=await js('({node:typeof require,api:typeof window.moss.command})');assert.equal(isolated.node,'undefined');assert.equal(isolated.api,'function');
    await js('document.querySelector("#intention").value="Write the first chapter";document.querySelector("#start").click()');
    await waitFor('document.body.dataset.status === "running"');assert.equal(timer.state.session.label,'Write the first chapter');
    const deadlineBeforeCompact=timer.state.session.deadline;
    await js('document.querySelector("#minimize").click()');
    await waitFor('window.moss.getState().then(s=>s.compact)');
    assert.equal(panel.isVisible(),false);assert.equal(pet.isVisible(),true);
    const petJS=(s:string)=>pet.webContents.executeJavaScript(s);
    for(let i=0;i<100 && !(await petJS('document.body.classList.contains("avatar-only")'));i++)await new Promise(r=>setTimeout(r,30));
    assert.deepEqual(await petJS('([".pet-hit",".pet-pill",".drag-grip"].map(s=>getComputedStyle(document.querySelector(s)).display))'),['block','none','none']);
    assert.equal(timer.state.session.status,'running');assert.equal(timer.state.session.deadline,deadlineBeforeCompact);
    fs.writeFileSync(path.join(out,'moss-compact.png'),(await pet.webContents.capturePage()).toPNG());
    await petJS('document.querySelector("#pet-open").click()');
    await waitFor('window.moss.getState().then(s=>!s.compact)');
    assert.equal(panel.isVisible(),true);assert.equal(pet.isVisible(),false);assert.equal(timer.state.session.deadline,deadlineBeforeCompact);
    await js('document.querySelector("#close").click()');await waitFor('window.moss.getState().then(s=>s.compact)');
    assert.equal(pet.isVisible(),true);showPanel();assert.equal(pet.isVisible(),false);
    await waitFor('document.querySelector(".garden-spade").getAnimations().length > 0');
    for(const [name,time] of [['digging',1100],['watering',5200]] as const){
      await js(`Promise.all(document.getAnimations().map(async a=>{a.pause();await a.ready;a.currentTime=${time};}))`);
      await new Promise(r=>setTimeout(r,50));
      const part=name==='digging'?'.garden-spade':'.garden-tool';
      assert.equal(await js(`getComputedStyle(document.querySelector('${part}')).opacity`),'1');
      assert.notEqual(await js(`getComputedStyle(document.querySelector('${part}')).display`),'none');
      fs.writeFileSync(path.join(out,`moss-action-${name}.png`),(await panel.webContents.capturePage()).toPNG());
    }
    await panel.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await js('getComputedStyle(document.querySelector(".garden-spade")).animationName'),'none');
    await panel.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    panel.webContents.debugger.detach();
    clock!+=30000;tick();const before=timer.remaining();
    await js('document.querySelector("#pause").click()');await waitFor('document.body.dataset.status === "paused"');
    assert.equal(await js('getComputedStyle(document.querySelector(".garden-tool")).opacity'),'0');
    assert.equal(await js('getComputedStyle(document.querySelector(".garden-spade")).animationName'),'none');
    clock!+=90000;tick();assert.equal(timer.remaining(),before);
    await js('document.querySelector("#resume").click()');await waitFor('document.body.dataset.status === "running"');
    timer.pause('sleep');save();emit();await waitFor('document.body.dataset.status === "paused"');assert.equal(timer.state.session.pauseReason,'sleep');
    await js('document.querySelector("#resume").click()');await waitFor('document.body.dataset.status === "running"');
    clock!+=timer.remaining()+1;tick();await waitFor('document.body.dataset.status === "completed"');assert.equal(timer.state.totalSessions,1);
    tick();assert.equal(timer.state.totalSessions,1);
    const loaded=store.load();assert.equal(loaded.totalSessions,1);
    await new Promise(r=>setTimeout(r,150));
    fs.writeFileSync(path.join(out,'moss-completed.png'),(await panel.webContents.capturePage()).toPNG());
    fs.writeFileSync(path.join(out,'moss-pet.png'),(await pet.webContents.capturePage()).toPNG());
    await js('document.querySelector("#rest").click()');await waitFor('document.body.dataset.phase === "break" && document.body.dataset.status === "running"');
    clock!+=timer.remaining()+1;tick();assert.equal(timer.state.totalSessions,1);
    await js('document.querySelector("#new-session").click()');await waitFor('document.body.dataset.status === "idle"');
    await js('document.querySelector("#demo").click()');await waitFor('document.body.dataset.status === "running"');assert.equal(timer.state.session.demo,true);
    for(const [advance,stage] of [[0,0],[5000,1],[8000,2],[7000,3]]){
      clock!+=advance;tick();await waitFor(`document.body.dataset.stage === "${stage}"`);
      assert.equal(await pet.webContents.executeJavaScript('Number(document.body.dataset.stage)'),stage);
      await new Promise(r=>setTimeout(r,100));
      fs.writeFileSync(path.join(out,`garden-stage-${stage}.png`),(await panel.webContents.capturePage()).toPNG());
    }
    assert.equal(timer.state.totalSessions,1);
    assert.equal(await js('document.querySelectorAll("#saved-garden .plant-art").length'),1);

    await js('document.querySelector("#new-session").click()');await waitFor('document.body.dataset.status === "idle"');
    await js('document.querySelector("#pinned").click()');await waitFor('!document.querySelector("#pinned").checked');assert.equal(pet.isAlwaysOnTop(),false);
    assert.equal(pet.isVisibleOnAllWorkspaces(),false);
    if(overlay){const flags=overlay.inspect(pet.getNativeWindowHandle());assert.equal(flags.allSpaces,false);assert.equal(flags.fullScreenAuxiliary,false);assert.equal(flags.joinsOtherApps,false);}
    assert.equal(store.load().preferences.alwaysOnTop,false);
    await js('document.querySelector("#pinned").click()');await waitFor('document.querySelector("#pinned").checked');
    assert.equal(pet.isAlwaysOnTop(),true);assert.equal(pet.isVisibleOnAllWorkspaces(),true);
    if(overlay){const flags=overlay.inspect(pet.getNativeWindowHandle());assert.equal(flags.fullScreenAuxiliary,true);if(flags.stageManagerSupported)assert.equal(flags.joinsOtherApps,true);}
    assert.equal(store.load().preferences.alwaysOnTop,true);
    await assert.rejects(()=>js('window.moss.command({type:"start",minutes:-1,label:""})'));
    assert.equal(timer.state.session.status,'idle');
    await new Promise(r=>setTimeout(r,500));
    fs.writeFileSync(path.join(out,'moss-controls.png'),(await panel.webContents.capturePage()).toPNG());
    const metrics=await js('({width:innerWidth,scroll:document.documentElement.scrollWidth,image:getComputedStyle(document.querySelector(".creature")).backgroundImage})');
    assert.ok(metrics.scroll<=metrics.width);assert.ok(metrics.image.includes('moss-sprites.png'));
    // Small displays legitimately scroll: verify controls remain reachable and usable.
    for(const [width,height] of [[400,790],[360,540]]){
      panel.setSize(width,height);
      await waitFor(`innerWidth === ${width}`);
      await js('document.querySelector("#demo").scrollIntoView({block:"center"})');
      await waitFor('(()=>{const r=document.querySelector("#demo").getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight && document.documentElement.scrollWidth<=innerWidth;})()');
      fs.writeFileSync(path.join(out,`moss-layout-${width}x${height}.png`),(await panel.webContents.capturePage()).toPNG());
      await js('document.querySelector("#demo").click()');await waitFor('document.body.dataset.status === "running"');
      assert.equal(timer.state.session.demo,true);
      await js('window.moss.command({type:"end"})');await waitFor('document.body.dataset.status === "idle"');
    }
    const image=await js('new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);image.onerror=reject;image.src="../assets/moss-sprites.png";})');
    assert.deepEqual(image,[2172,724]);
    assert.equal((await pet.webContents.capturePage()).toBitmap()[3],0);
    fs.writeFileSync(path.join(out,'smoke-result.json'),JSON.stringify({passed:true,checks:['minimize to avatar and click to restore without interrupting timer','native floating window','renderer isolation','start via controls','pause/resume','sleep pause','one-time completion credit','saved progress','break cycle','demo exclusion','follow option on/off','native full-screen and Stage Manager membership','visibility preference persistence','invalid IPC input','layout width'],metrics},null,2));
    console.log('MOSS_SMOKE_PASSED');quitting=true;panel.destroy();pet.destroy();app.exit(0);
  } catch(e) {console.error(e);quitting=true;panel.destroy();pet.destroy();app.exit(1);}
}
if(!app.requestSingleInstanceLock()){app.quit();}else{
  app.on('second-instance',()=>{if(pet){showPanel();}});
  app.whenReady().then(async()=>{
    store=new StateStore(path.join(app.getPath('userData'),'progress.json'));timer=new FocusTimer(store.load(),()=>clock??Date.now());
    session.defaultSession.setPermissionRequestHandler((_w,_p,cb)=>cb(false));session.defaultSession.setPermissionCheckHandler(()=>false);
    await createWindows();
    powerMonitor.on('suspend',()=>{timer.pause('sleep');save();emit();refreshTray();});
    powerMonitor.on('resume',()=>{emit();refreshTray();});
    screen.on('display-removed',()=>{const [x,y]=pet.getPosition(),p=clampPosition(x,y);pet.setPosition(p.x,p.y);savePosition();});
    tickInterval=setInterval(tick,500);saveInterval=setInterval(save,30000);
    app.on('activate',()=>{showPanel();});
    if(smoke)void smokeTest();
  }).catch(e=>{console.error(e);app.exit(1);});
}
app.on('window-all-closed',()=>{});
app.on('before-quit',()=>{quitting=true;if(tickInterval)clearInterval(tickInterval);if(saveInterval)clearInterval(saveInterval);stopDrag();if(timer){timer.pause('reopened');save();}});
