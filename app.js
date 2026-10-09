'use strict';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d'),lens=$('closeup').getContext('2d'),brainCtx=$('brain').getContext('2d');
let sim=new Kitchen.Simulation(),model,photo=new Image(),paused=false,showTrail=false,showMap=false,placing=false,last=null,accumulator=0,brainTime=0,history=[],activity=[];
let flyView=false;
let following=true,texture,eyeTime=0,retina,eyeMap;
// The compound-eye pipeline is the heaviest part of the sim, so it sleeps
// until the user asks for it (the ◉ button, or Fly view).
let eyeViews=false;
let wallClockText=RoomDetails.actualTime(),wallClockMinute=-1;
let foodKind=null,removing=false,pointerWorld=null,textureCanvas;
const camera=new FlyCamera.FollowCamera();
let colony=new FlyLifecycle.Colony(),followTarget='main',followSig='';
let colonyPrevious=new Map(),visibleColony=new Map();
const clamp01=v=>Math.max(0,Math.min(1,v));
let autoSave=0,brainVisible=false,brainCompute=0,brainDraw=1;
const soundtrack=new FlySound.KitchenAudio();
let previousPose=FlightArt.pose(sim),visiblePose=FlightArt.pose(sim);
const log=(message)=>{$('hint').textContent=message;};
function resize(c,maxDpr=2){let r=c.getBoundingClientRect(),d=Math.min(maxDpr,devicePixelRatio||1);if(c.width!==Math.round(r.width*d)||c.height!==Math.round(r.height*d)){c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);}return [r.width,r.height,d];}
function ellipse(c,x,y,rx,ry,color,angle=0,stroke){c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.6;c.stroke();}}
function fly(c,x,y,size,angle,time,mode,pose={}){FlightArt.draw(c,x,y,size,angle,time,mode,pose);}
function sceneCenter(w,h){return [w<=480?w*.53:w/2,w<=480?h*.24:h/2];}
// The canvas always matches the photograph's 16:9 shape exactly, centered in
// the space left of the panel: no letterbox bars inside the map, and the view
// simply stops at the photo's edge.
// Painted layers live in caches: the photographed background only changes with
// the clock or the weather, and the food layer only when food or light change.
let sceneBg=null,sceneBgKey='',foodLayer=null,foodLayerKey='';
function sceneBackground(w,h,d){const key=w+'x'+h+'x'+d+'/'+wallClockMinute+'/'+Daylight.mode;if(sceneBgKey!==key||!sceneBg){sceneBg=document.createElement('canvas');sceneBg.width=Math.round(w*d);sceneBg.height=Math.round(h*d);const b=sceneBg.getContext('2d');b.scale(d,d);Daylight.drawPhoto(b,w,h);RoomDetails.drawClock(b,w,h,wallClockText);sceneBgKey=key;}return sceneBg;}
function foodsLayer(w,h,d){const key=sim.foodsVersion+'/'+sim.light.toFixed(2)+'x'+w;if(foodLayerKey!==key||!foodLayer||foodLayer.width!==Math.round(w*d)){foodLayer=document.createElement('canvas');foodLayer.width=Math.round(w*d);foodLayer.height=Math.round(h*d);const f=foodLayer.getContext('2d');f.scale(d,d);for(const food of sim.foods)if(food.placed)FoodArt.draw(f,food.kind,food.x*w,food.y*h,w*.023,1,{seed:food.x*8192+food.y*16384,light:sim.light});foodLayerKey=key;}return foodLayer;}
let sceneViewW=.4,sceneViewH=.4;function renderScene(){const [cw,ch,d]=resize(canvas),w=Math.max(cw,ch*16/9),h=w*9/16;sceneViewW=cw/(camera.zoom*w);sceneViewH=ch/(camera.zoom*h);ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle='#090f0c';ctx.fillRect(0,0,cw,ch);ctx.save();ctx.beginPath();ctx.rect(0,0,cw,ch);ctx.clip();ctx.translate(...sceneCenter(cw,ch));ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x*w,-camera.y*h);ctx.drawImage(sceneBackground(w,h,d),0,0,w,h);ctx.fillStyle=`rgba(8,16,18,${(1-sim.light)*.28})`;ctx.fillRect(0,0,w,h);
 if(sim.foods.some(f=>f.placed))ctx.drawImage(foodsLayer(w,h,d),0,0,w,h);
 if(showMap){for(const s of Kitchen.surfaces){ctx.beginPath();s.poly.forEach((p,i)=>i?ctx.lineTo(p[0]*w,p[1]*h):ctx.moveTo(p[0]*w,p[1]*h));ctx.closePath();ctx.fillStyle='#b5e2c418';ctx.fill();ctx.strokeStyle='#d2f0b680';ctx.lineWidth=1;ctx.stroke();}for(const f of sim.foods){ctx.strokeStyle='#d5efb8';ctx.lineWidth=1;ctx.beginPath();ctx.arc(f.x*w,f.y*h,8,0,Math.PI*2);ctx.stroke();ctx.font='11px system-ui';let tw=ctx.measureText(f.name).width;let tx=Math.min(w-tw-12,Math.max(12,f.x*w+13)),ty=f.y*h>h-35?f.y*h-15:f.y*h;ctx.fillStyle='#101c18dd';ctx.fillRect(tx-4,ty-12,tw+8,19);ctx.fillStyle='#e1f2d8';ctx.fillText(f.name,tx,ty+1);}}
 if(showTrail){ctx.lineWidth=1.3;for(let i=1;i<sim.trail.length;i++){let a=sim.trail[i-1],b=sim.trail[i];ctx.strokeStyle=`rgba(230,255,200,${i/sim.trail.length*.6})`;ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.stroke();}}
 if(placing&&pointerWorld){const p=pointerWorld,valid=Kitchen.surfaces.some(s=>Kitchen.inside(p,s.poly));if(foodKind)FoodArt.draw(ctx,foodKind,p.x*w,p.y*h,w*.023,.65,{seed:0,light:sim.light});ctx.strokeStyle=valid?'#d7f4a9':'#e6a598';ctx.lineWidth=1/camera.zoom;ctx.beginPath();ctx.arc(p.x*w,p.y*h,10/camera.zoom,0,Math.PI*2);ctx.stroke();}
 for(const e of colony.eggs)FlyLifecycle.drawEggs(ctx,e.x*w,e.y*h,Math.max(7,w*.009),sim.time,e.x*8191+e.y*16381);
 for(const pu of colony.pupae)FlyLifecycle.drawPupa(ctx,pu.x*w,pu.y*h,Math.max(10,w*.013));
 for(const cp of visibleColony.values()){
  if(cp.kind==='maggot')FlyLifecycle.drawMaggot(ctx,cp.x*w,cp.y*h,Math.max(9,w*.013)*(.45+.55*cp.size),cp.heading,sim.time,cp.size);
  else if(cp.kind==='adult'){const body=Math.max(12,w*.014)*(.85+cp.y*.35)*(.45+.55*cp.maturity);fly(ctx,cp.x*w,(cp.y-cp.z)*h,body,cp.heading,cp.time,cp.mode,cp);}}
 if(!placing&&followTarget!=='main'){const sel=visibleColony.get(followTarget);if(sel){ctx.strokeStyle='#ffe9a8cc';ctx.lineWidth=1.4/camera.zoom;ctx.beginPath();ctx.ellipse(sel.x*w,(sel.y-sel.z)*h,10/camera.zoom,5/camera.zoom,0,0,Math.PI*2);ctx.stroke();}}
 const p=visiblePose,x=p.x*w,y=(p.y-p.z)*h,body=Math.max(12,w*.014)*(0.85+p.y*.35);ctx.save();ctx.filter=`blur(${1+p.z*24}px)`;ellipse(ctx,x+p.z*w*.025,p.y*h+3,body*(.6+p.z),body*.2,`rgba(0,0,0,${.42/(1+p.z*9)})`);ctx.restore();fly(ctx,x,y,body,p.heading,p.time,p.mode,p);
 // Keep the insect clear in flight; a faint ground marker helps locate it at rest.
 if(p.mode!=='flight'){ctx.strokeStyle='#eeffdb40';ctx.lineWidth=1/camera.zoom;ctx.beginPath();ctx.arc(x,y,body*1.2,0,Math.PI*.8);ctx.stroke();}ctx.restore();
}
function renderMiniroom(){const c=$('miniroom'),m=c.getContext('2d'),[w,h,d]=resize(c);m.setTransform(d,0,0,d,0,0);Daylight.drawPhoto(m,w,h);RoomDetails.drawClock(m,w,h,wallClockText);m.fillStyle='#0d171a55';m.fillRect(0,0,w,h);const r=canvas.getBoundingClientRect(),baseW=Math.max(r.width,r.height*16/9),baseH=baseW*9/16,bw=Math.min(1,r.width/baseW/camera.zoom),bh=Math.min(1,r.height/baseH/camera.zoom),b={x:camera.x-sceneCenter(r.width,r.height)[0]/baseW/camera.zoom,y:camera.y-sceneCenter(r.width,r.height)[1]/baseH/camera.zoom,width:bw,height:bh};m.strokeStyle='#d8f4bb';m.lineWidth=1;if(!flyView)m.strokeRect(b.x*w,b.y*h,b.width*w,b.height*h);ellipse(m,sim.x*w,(sim.y-sim.z)*h,flyView?4:2.5,flyView?4:2.5,'#edffbb');m.strokeStyle='#edffbb';m.beginPath();m.moveTo(sim.x*w,(sim.y-sim.z)*h);m.lineTo(sim.x*w+Math.cos(sim.heading)*8,(sim.y-sim.z)*h+Math.sin(sim.heading)*8);m.stroke();for(const mg of colony.larvae)ellipse(m,mg.x*w,mg.y*h,1.5,1.5,'#e6d49e');for(const pu of colony.pupae)ellipse(m,pu.x*w,pu.y*h,1.7,1.7,'#9a6a3a');for(const ad of colony.adults)ellipse(m,ad.x*w,(ad.y-ad.z)*h,flyView?3:2,flyView?3:2,'#d6f0b4');if(followTarget!=='main'){const s=colony.find(followTarget);if(s){m.strokeStyle='#ffe9a8';m.lineWidth=1;m.beginPath();m.arc(s.x*w,(s.y-(s.z||0))*h,4,0,Math.PI*2);m.stroke();}}$('camera-badge').textContent=placing?'PLACEMENT VIEW':following?'FOLLOW CAMERA · '+camera.zoom.toFixed(1)+'×':'ROOM OVERVIEW';}
const eyeBuffers={};
function renderEye(id,side){
 if(!retina)return;const c=$(id),e=c.getContext('2d'),[w,h,d]=resize(c),index=side<0?0:1,view=retina.views[index];
 if(!eyeBuffers[id])eyeBuffers[id]=document.createElement('canvas');const buffer=eyeBuffers[id];if(buffer.width!==view.w||buffer.height!==view.h){buffer.width=view.w;buffer.height=view.h;}
 const pixels=retina.pixels(index,'unified',{...visiblePose,light:sim.light});buffer.getContext('2d').putImageData(new ImageData(pixels.data,pixels.width,pixels.height),0,0);
 e.setTransform(d,0,0,d,0,0);e.imageSmoothingEnabled=true;
 // Permanently show the complete measured elevation field (+90 to -70).
 e.drawImage(buffer,0,0,view.w,view.h,0,0,w,h);
 e.fillStyle='#08120ccc';e.fillRect(0,h-22,w,22);e.font='11px system-ui';e.fillStyle='#edf0e7';e.fillText(side<0?'−155° ← · → 0°':'0° ← · → +155°',6,h-6);
}
function renderEyes(){renderEye('eye-left',-1);renderEye('eye-right',1);}
function sampleVision(dt){if(!retina||!texture)return;if(!eyeViews&&!flyView)return;const t=instrumentTarget();retina.update(t===sim?sim:{x:t.x,y:t.y,z:t.z,heading:t.heading,bank:t.bank||0,light:sim.light,mode:t.mode,foods:sim.foods},texture,dt);sim.visualSignal=t===sim?retina.signal.slice():undefined;if(t===sim)sim.sense();}function refreshFoodTexture(){if(!photo.complete||!photo.naturalWidth)return;if(!textureCanvas){textureCanvas=document.createElement('canvas');textureCanvas.width=1024;textureCanvas.height=576;}const t=textureCanvas.getContext('2d',{willReadFrequently:true});Daylight.drawPhoto(t,1024,576);RoomDetails.drawClock(t,1024,576,wallClockText);for(const f of sim.foods)if(f.placed)FoodArt.draw(t,f.kind,f.x*1024,f.y*576,1024*.023,1,{seed:f.x*8192+f.y*16384,light:sim.light});texture=t.getImageData(0,0,1024,576);sampleVision(0);const count=sim.foods.filter(f=>f.placed).length;$('food-count').textContent=count+' placed';$('undo-food').disabled=count===0;}
function selectTool(kind=null,erase=false){foodKind=kind;removing=erase;placing=Boolean(kind||erase);document.body.classList.toggle('placing',placing);pointerWorld=null;previousPointer=null;canvas.style.cursor=placing?'crosshair':'default';$('observe').textContent=placing?'✕':'↖';$('observe').setAttribute('aria-label',placing?'Finish placing food · Escape':'Normal cursor');document.querySelectorAll('[data-food]').forEach(b=>{const active=b.dataset.food===kind;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});for(const [id,active] of [['observe',!placing],['erase',erase]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));}$('food').classList.toggle('active',placing);$('food').textContent=placing?'Finish placing':'Place food';}
document.querySelectorAll('[data-food]').forEach(b=>{const name=Kitchen.foodTypes[b.dataset.food].name;b.title='Place '+name;b.setAttribute('aria-label','Place '+name);b.onclick=()=>selectTool(foodKind===b.dataset.food?null:b.dataset.food);});$('observe').onclick=()=>selectTool();$('erase').onclick=()=>selectTool(null,!removing);$('undo-food').onclick=()=>{if(sim.undoFood()){refreshFoodTexture();}};
function renderLens(){const [w,h,d]=resize($('closeup'));lens.setTransform(d,0,0,d,0,0);lens.clearRect(0,0,w,h);const size=Math.min(84,h*.65,w*.5);ellipse(lens,w/2,h*.7,size*.3,size*.08,'#00000035');fly(lens,w/2,h*.5,size,-Math.PI/2,visiblePose.time,visiblePose.mode,visiblePose);}
function wireLaying(){
 sim.onLay=(x,y)=>{const n=colony.layClutch(x,y,sim.time);sim.note(n?'Laid a clutch of '+n+' eggs.':'A clutch is ready, but the colony is at capacity.');};
 colony.onClutch=(fly,n)=>sim.note(fly.name+' ♀ laid a clutch of '+n+' eggs near the '+((fly.target&&fly.target.name)||'food').toLowerCase()+'.');
}
wireLaying();
// The kitchen keeps one save slot in localStorage: auto-saved while playing,
// restored on load. Personality traits come back exactly from each fly's seed.
function saveGame(announce=true){
 try{
  const state=FlyStorage.capture(sim,colony);
  state.view={followTarget,showTrail,showMap,following,zoom:Number($('zoom').value),speed:Number($('speed').value),daylight:Daylight.mode,eyes:eyeViews};
  FlyStorage.save(localStorage,state);
  if(announce)log('Game saved ✓');
  return true;
 }catch(e){log('Save failed: '+e.message);return false;}
}
function loadGame(){
 const state=FlyStorage.read(localStorage);
 if(!state||!FlyStorage.restore(state,sim,colony))return false;
 sim.foodsVersion=(sim.foodsVersion||0)+1;
 const view=state.view||{};
 followTarget=(view.followTarget==='main'||colony.find(view.followTarget))?view.followTarget:'main';
 showTrail=!!view.showTrail;$('trail').classList.toggle('active',showTrail);
 showMap=!!view.showMap;$('map').classList.toggle('active',showMap);
 eyeViews=!!view.eyes;syncEyeToggle();
 following=view.following!==false;$('follow').classList.toggle('active',following);$('follow').setAttribute('aria-pressed',String(following));
 if(view.zoom)$('zoom').value=view.zoom;
 if(view.speed)$('speed').value=view.speed;
 if(view.daylight&&view.daylight!=='auto'){
  Daylight.setMode(view.daylight);
  document.querySelectorAll('[data-outside]').forEach(b=>{const active=b.dataset.outside===view.daylight;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 }
 $('follow-target').value=followTarget;
 refreshFoodTexture();previousPose=FlightArt.pose(sim);colonyPrevious.clear();snapshotColony();
 return true;
}
// Phones start with a clean map; the Panel button (or P) opens the instruments sheet.
if(matchMedia('(max-width:760px)').matches){document.body.classList.add('panel-hidden');$('panel-toggle').classList.add('active');$('panel-toggle').setAttribute('aria-pressed','true');}
// Whichever adult is followed becomes the observed specimen: its senses feed the
// connectome model and its vitals fill the panel. Maggots keep the main-fly view.
function instrumentTarget(){if(followTarget==='main')return sim;const m=colony.find(followTarget);return m&&m.senseInputs?m:sim;}
function setFollowTarget(id){followTarget=id;$('follow-target').value=id;if(!following&&!flyView)$('follow').click();previousPointer=null;}
function pickMember(p){
 // A tight hit box: clicking a fly means "follow it", landing merely NEAR one
 // falls through to the shoo behavior below.
 let best=null,bd=Math.hypot(p.x-sim.x,(p.y-(sim.y-sim.z))*.5625);if(bd<.05)best='main';else bd=Infinity;
 const consider=(m,r)=>{const d=Kitchen.distance(p,m);if(d<r&&d<bd){bd=d;best=m.id;}};
 for(const a of colony.adults)consider(a,.055);
 for(const m of colony.larvae)consider(m,.035);
 return best;}
function snapshotColony(){for(const m of colony.larvae)colonyPrevious.set(m.id,{kind:'maggot',x:m.x,y:m.y,heading:m.heading});for(const f of colony.adults)colonyPrevious.set(f.id,f.pose());for(const id of colonyPrevious.keys())if(!colony.find(id))colonyPrevious.delete(id);}
function collectColony(t){const out=new Map();
 for(const p of colony.pupae)out.set(p.id,{kind:'pupa',x:p.x,y:p.y,z:0});
 for(const m of colony.larvae){const prev=colonyPrevious.get(m.id);if(!prev){out.set(m.id,{kind:'maggot',x:m.x,y:m.y,z:0,heading:m.heading,size:m.size});continue;}const turn=Math.atan2(Math.sin(m.heading-prev.heading),Math.cos(m.heading-prev.heading));out.set(m.id,{kind:'maggot',x:prev.x+(m.x-prev.x)*t,y:prev.y+(m.y-prev.y)*t,z:0,heading:prev.heading+turn*t,size:m.size});}
 for(const f of colony.adults){const prev=colonyPrevious.get(f.id),curr=FlightArt.pose(f);out.set(f.id,{kind:'adult',maturity:f.maturity,...(prev?FlightArt.interpolate(prev,curr,t):curr)});}
 return out;}
function dot(row,u){let sum=0;for(let j=0;j<7;j++)sum+=row[j]*u[j];return sum;}
// The fly only steers on two output neurons (672 flops); the 640-cell map is
// decoration, recomputed lazily at ~4 Hz and only while its panel is on screen.
function neuralStep(){history.unshift(sim.inputs.slice());if(history.length>model.kernel.length)history.pop();sim.outputs=model.output_kernel[0].map((_,n)=>history.reduce((v,u,k)=>v+dot(model.output_kernel[k][n],u),0));}
function decorateBrain(){activity=model.cells.map((_,n)=>history.reduce((v,u,k)=>v+dot(model.kernel[k][n],u),0));}
let brainPoints=[];
function renderBrain(){let [w,h,d]=resize($('brain'));brainCtx.setTransform(d,0,0,d,0,0);brainCtx.clearRect(0,0,w,h);for(let i=0;i<brainPoints.length;i++){let a=Math.min(1,Math.abs(activity[i]||0)*1.5),p=brainPoints[i];brainCtx.globalAlpha=.15+a*.85;ellipse(brainCtx,10+p[0]*(w-20),6+p[1]*(h-24),.7+a*1.2,.7+a*1.2,(activity[i]||0)<0?'#db9eac':'#b5e2c4');}brainCtx.globalAlpha=1;}
const labels={flight:'Following a scent',walking:'Exploring the surface',feeding:'A little meal',grooming:'Cleaning wings and legs',resting:'Resting on the surface'};
function ui(){const w=instrumentTarget();$('outside-status').textContent=Daylight.status(); $('behavior').textContent=w.escape>0?'A sudden escape':labels[w.mode];$('state').textContent=w.mode.toUpperCase();$('target').textContent=w.target?w.target.name:'Window ledge / exploration';$('clock').textContent=wallClockText+' Berlin · '+$('speed').value+'×';$('clock').title='Real time in Europe/Berlin. Simulation elapsed: '+Math.floor(sim.time)+' seconds.';$('mode').textContent=paused?'Paused / observation':'Autonomous / live';$('airtime').innerHTML=Math.floor(w.airtime||0)+' <em>s</em>';$('landings').textContent=w.landings||0;$('meals').textContent=w.meals||0;$('distance').innerHTML=(w.travel||0).toFixed(2)+' <em>room widths</em>';for(const key of ['energy','hunger','alert']){$(key).style.width=(w[key]||0)*100+'%';$(key+'-label').textContent=Math.round((w[key]||0)*100)+'%';}sim.inputs.forEach((v,i)=>$('sense'+i).style.width=v*100+'%');$('events').textContent=sim.events.map(e=>Math.floor(e.time)+'s — '+e.message).join('\n');$('events').style.whiteSpace='pre-line';
 const members=colony.selectable(),sig='main|'+members.map(mm=>mm.id+':'+mm.name).join(',');
 if(sig!==followSig){followSig=sig;const sel=$('follow-target');sel.innerHTML='<option value="main">Main fly ♀</option>'+colony.larvae.map(mm=>'<option value="'+mm.id+'">'+mm.name+'</option>').join('')+colony.adults.map(f=>'<option value="'+f.id+'">'+f.name+' '+(f.sex==='female'?'♀':'♂')+(f.maturity<.999?' · growing':'')+'</option>').join('');}
 $('follow-target').value=followTarget;
 const plural=(n,s,p)=>n+' '+(n===1?s:(p||s+'s')),c=colony.counts();
 $('colony-status').textContent='Colony: '+plural(c.eggs,'egg')+' · '+plural(c.larvae,'maggot')+' · '+plural(c.pupae,'pupa','pupae')+' · '+plural(c.adults,'adult')+(c.eggs+c.larvae+c.pupae+c.adults===0?' — let the main fly eat well and she will lay eggs':'');}
function audio(){soundtrack.update(sim,paused);document.querySelector('.audio-dock summary').classList.toggle('audio-on',soundtrack.enabled);if(soundtrack.enabled){const channels=[soundtrack.music?'music':null,soundtrack.effects?'buzzing and kitchen sounds':null].filter(Boolean);$('sound-status').textContent=paused?'Audio paused':channels.length?'Playing: '+channels.join(' + '):'Channels muted';}}
let uiTime=0;
function frame(now){const minute=Math.floor(Date.now()/60000);if(minute!==wallClockMinute){wallClockMinute=minute;wallClockText=RoomDetails.actualTime();refreshFoodTexture();}const elapsed=last===null?0:Math.min(.1,(now-last)/1000);last=now;if(!paused){accumulator+=elapsed*Number($('speed').value);while(accumulator>=1/60){previousPose=FlightArt.pose(sim);snapshotColony();sim.step(1/60);for(const message of colony.update(1/60,{foods:sim.foods,main:sim},sim.time))sim.note(message);const instrument=instrumentTarget();if(instrument!==sim)sim.inputs=instrument.senseInputs({foods:sim.foods});sampleVision(1/60);brainTime+=1/60;if(brainTime>=.05){brainTime-=.05;neuralStep();}accumulator-=1/60;}}visiblePose=paused?FlightArt.pose(sim):FlightArt.interpolate(previousPose,FlightArt.pose(sim),accumulator*60);visibleColony=collectColony(clamp01(accumulator*60));if(followTarget!=='main'&&!colony.find(followTarget)){followTarget='main';$('follow-target').value='main';}const followed=followTarget==='main'?visiblePose:visibleColony.get(followTarget);camera.update(placing?{x:camera.x,y:camera.y,z:0}:followed??visiblePose,elapsed,following,Number($('zoom').value),sceneViewW,sceneViewH);if(!flyView)renderScene();const panelHidden=!flyView&&document.body.classList.contains('panel-hidden');brainVisible=!panelHidden&&!flyView;if(brainVisible){brainCompute+=elapsed;if(brainCompute>=.25){brainCompute=0;decorateBrain();}}eyeTime+=elapsed;if(eyeTime>=1/30||last===now&&elapsed===0){if(panelHidden)renderMiniroom();else{if(eyeViews||flyView)renderEyes();renderMiniroom();if(!flyView){renderLens();brainDraw+=elapsed;if(brainDraw>=.2){brainDraw=0;renderBrain();}}}eyeTime=0;}uiTime+=elapsed;if(uiTime>=.1||elapsed===0){ui();uiTime=0;}audio();autoSave+=elapsed;if(autoSave>8){autoSave=0;saveGame(false);}requestAnimationFrame(frame);}
function syncEyeToggle(){$('eye-toggle').classList.toggle('active',eyeViews);$('eye-toggle').setAttribute('aria-pressed',String(eyeViews));document.querySelector('.eye-grid').style.display=eyeViews?'':'none';$('eye-off-note').hidden=eyeViews;}
syncEyeToggle();
$('eye-toggle').onclick=()=>{eyeViews=!eyeViews;syncEyeToggle();if(eyeViews)renderEyes();};
function setFlyView(enabled){
 flyView=enabled;document.body.classList.toggle('fly-view',enabled);
 $('fly-view').classList.toggle('active',enabled);$('fly-view').setAttribute('aria-pressed',String(enabled));
 $('fly-view').textContent=enabled?'Follow camera':'Fly view';
 $('fly-view').title=enabled?'Return to camera · V':'Full-screen fly vision · V';
 if(!enabled){following=true;$('follow').classList.add('active');$('follow').setAttribute('aria-pressed','true');}
 if(enabled){selectTool();settingDocks.forEach(dock=>dock.open=false);if(!eyeViews){eyeViews=true;syncEyeToggle();}}
 renderEyes();renderMiniroom();
}
$('fly-view').onclick=()=>setFlyView(!flyView);
$('follow').onclick=()=>{if(flyView){setFlyView(false);following=true;}else following=!following;if(!following)$('zoom').value=1;$('follow').classList.toggle('active',following);$('follow').setAttribute('aria-pressed',String(following));previousPointer=null;};$('follow-target').onchange=()=>setFollowTarget($('follow-target').value||'main');$('zoom').oninput=()=>previousPointer=null;
async function clap(pan){
 try{
  if(!soundtrack.context){
   soundtrack.music=false;$('music-enabled').checked=false;
   await soundtrack.enable();
   $('sound').textContent='♫ Audio';$('sound').classList.add('active');$('sound').setAttribute('aria-pressed','true');
  }
  soundtrack.event('clap',Math.max(-.9,Math.min(.9,pan)));
 }catch(e){$('sound-status').textContent=e.message;}
}
async function scareWithSound(x,y,react=true){
 if(react)sim.scare(x,y);
 // The click owns this sound; the next simulation update must not repeat it.
 if(soundtrack.previous)soundtrack.previous.escape=sim.escape;
 await clap(sim.x*2-1);
}
function shoo(){
 const member=followTarget==='main'?null:colony.find(followTarget);
 if(member&&member.scare){member.scare(member.x,member.y);clap(member.x*2-1);}
 else if(member){ // a maggot or pupa cannot flee; startle the adults around it
  colony.scare(member.x,member.y);clap(member.x*2-1);
 }
 else scareWithSound();
}
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶':'⏸';};$('scare').onclick=()=>shoo();$('trail').onclick=()=>{$('trail').classList.toggle('active',showTrail=!showTrail);};$('map').onclick=()=>{$('map').classList.toggle('active',showMap=!showMap);};$('food').onclick=()=>selectTool(placing?null:'apple');
$('panel-toggle').onclick=()=>{const hidden=document.body.classList.toggle('panel-hidden');$('panel-toggle').classList.toggle('active',hidden);$('panel-toggle').setAttribute('aria-pressed',String(!hidden));};
$('save-game').onclick=()=>saveGame(true);
$('load-game').onclick=()=>log(loadGame()?'Save loaded — welcome back.':'No save found yet.');
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame(false);});
window.addEventListener('pagehide',()=>saveGame(false));
$('reset').onclick=()=>{FlyStorage.clear(localStorage);sim=new Kitchen.Simulation();wireLaying();colony=new FlyLifecycle.Colony();wireLaying();colonyPrevious.clear();visibleColony=new Map();followTarget='main';followSig='';$('follow-target').value='main';history=[];activity=[];brainTime=accumulator=0;previousPose=visiblePose=FlightArt.pose(sim);sim.light=Number($('light').value);sim.wind=Number($('wind').value);refreshFoodTexture();selectTool();retina?.dispose();retina=new FlyVision.AsyncRetina(eyeMap);sampleVision(0);neuralStep();log('A fresh kitchen — the old save was cleared.');};$('light').oninput=()=>{sim.light=Number($('light').value);sampleVision(0);};$('wind').oninput=()=>sim.wind=Number($('wind').value);
async function toggleAudio(){
 try{
  if(soundtrack.enabled)soundtrack.disable();else await soundtrack.enable();
  $('sound').textContent=soundtrack.enabled?'♫ Audio':'Audio';$('sound').classList.toggle('active',soundtrack.enabled);$('sound').setAttribute('aria-pressed',String(soundtrack.enabled));
  $('sound-toggle').classList.toggle('active',soundtrack.enabled);$('sound-toggle').setAttribute('aria-pressed',String(soundtrack.enabled));
  if(!soundtrack.enabled)$('sound-status').textContent='Audio off';
 }catch(e){$('sound-status').textContent=e.message;}
}
$('sound').onclick=()=>toggleAudio();$('sound-toggle').onclick=()=>toggleAudio();
$('music-enabled').onchange=()=>{soundtrack.music=$('music-enabled').checked;soundtrack.mix();};$('effects-enabled').onchange=()=>{soundtrack.effects=$('effects-enabled').checked;soundtrack.mix();};$('music-volume').oninput=()=>{soundtrack.musicVolume=Number($('music-volume').value);soundtrack.mix();};$('effects-volume').oninput=()=>{soundtrack.effectsVolume=Number($('effects-volume').value);soundtrack.mix();};
function point(e){const r=canvas.getBoundingClientRect(),w=Math.max(r.width,r.height*16/9),h=w*9/16;return camera.screenToWorld((e.clientX-r.left-sceneCenter(r.width,r.height)[0])/w+.5,(e.clientY-r.top-sceneCenter(r.width,r.height)[1])/h+.5);}
// Pinch with two fingers to set the follow zoom; a pinch never counts as a tap.
const pinch={pointers:new Map(),startDist:0,startZoom:3,moved:false};
canvas.addEventListener('pointerdown',e=>{pinch.pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pinch.pointers.size===2){const [[ax,ay],[bx,by]]=[...pinch.pointers.values()];pinch.startDist=Math.hypot(ax-bx,ay-by);pinch.startZoom=Number($('zoom').value);}});
canvas.addEventListener('pointermove',e=>{if(!pinch.pointers.has(e.pointerId))return;pinch.pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pinch.pointers.size===2&&pinch.startDist>0){const [[ax,ay],[bx,by]]=[...pinch.pointers.values()];const d=Math.hypot(ax-bx,ay-by);if(d>10){$('zoom').value=Math.max(1,Math.min(6,pinch.startZoom*d/pinch.startDist));pinch.moved=true;previousPointer=null;}}});
const liftPinch=e=>{pinch.pointers.delete(e.pointerId);if(pinch.pointers.size<2)pinch.startDist=0;};
canvas.addEventListener('pointerup',liftPinch);canvas.addEventListener('pointercancel',liftPinch);
canvas.onclick=e=>{if(flyView)return;if(pinch.moved){pinch.moved=false;return;}let p=point(e);if(removing){const food=sim.foods.filter(f=>f.placed).sort((a,b)=>Kitchen.distance(p,a)-Kitchen.distance(p,b))[0];if(food&&Kitchen.distance(p,food)<.035&&sim.removeFood(food)){refreshFoodTexture();}}else if(placing){if(sim.addFood(p.x,p.y,foodKind)){refreshFoodTexture();selectTool();}}else{const picked=pickMember(p);if(picked)setFollowTarget(picked);else{colony.scare(p.x,p.y);scareWithSound(p.x,p.y,Math.hypot(p.x-sim.x,(p.y-(sim.y-sim.z))*.5625)<.10);}}};
let previousPointer=null,lastScare=-10;canvas.onpointermove=e=>{if(flyView||pinch.pointers.size>1)return;let p=point(e),now=performance.now()/1000;pointerWorld=p;if(previousPointer&&!paused&&!placing){let velocity=Math.hypot(p.x-previousPointer.x,p.y-previousPointer.y)/Math.max(.01,now-previousPointer.time);if(velocity>.65&&Math.hypot(p.x-sim.x,(p.y-(sim.y-sim.z))*.5625)<.07&&sim.time-lastScare>2){sim.scare(p.x,p.y);lastScare=sim.time;}}previousPointer={...p,time:now};};canvas.onpointerleave=()=>{previousPointer=null;pointerWorld=null;};
function clearTextSelection(){const selection=window.getSelection();if(selection&&!selection.isCollapsed)selection.removeAllRanges();}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('dialog,input[type=text],textarea,[contenteditable=true]'))clearTextSelection();});
document.addEventListener('selectstart',e=>{if(e.target instanceof Element&&!e.target.closest('dialog,input[type=text],textarea,[contenteditable=true]'))e.preventDefault();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){clearTextSelection();selectTool();if(flyView)setFlyView(false);return;}if(e.key.toLowerCase()==='v'&&!e.target.matches('input,select,textarea')){setFlyView(!flyView);return;}if(e.key.toLowerCase()==='p'&&!e.target.matches('input,select,textarea')){$('panel-toggle').click();return;}if(e.target.matches('input,select,button,summary,a'))return;if(e.code==='Space'){e.preventDefault();$('pause').click();}if(e.key.toLowerCase()==='s')$('scare').click();});
async function boot(){try{
 const restored=loadGame();
 if(restored)sim.note('Save loaded — the kitchen continues where it left off.');
 const response=await fetch('brain.json');if(!response.ok)throw new Error('Brain file could not be loaded');model=await response.json();photo.src='kitchen.jpg';await Promise.all([photo.decode(),FoodArt.load()]);await Daylight.load(photo);const sampler=document.createElement('canvas');sampler.width=1024;sampler.height=576;const sampleCtx=sampler.getContext('2d',{willReadFrequently:true});sampleCtx.drawImage(photo,0,0,1024,576);texture=sampleCtx.getImageData(0,0,1024,576);refreshFoodTexture();const xs=model.cells.map(c=>c.position[0]),zs=model.cells.map(c=>c.position[2]),xmin=Math.min(...xs),xmax=Math.max(...xs),zmin=Math.min(...zs),zmax=Math.max(...zs);brainPoints=xs.map((x,i)=>[(x-xmin)/(xmax-xmin),(zs[i]-zmin)/(zmax-zmin)]);$('senses').innerHTML=model.inputs.map((n,i)=>'<div><div class="pair"><span>'+n+'</span></div><div class="bar"><i id="sense'+i+'"></i></div></div>').join('');$('brain-info').textContent=model.neurons.toLocaleString()+' neurons · '+model.edges.toLocaleString()+' directed edges. '+model.cells.length+' sampled cells shown. Descending activity modulates turning.';eyeMap=await (await fetch('eye-map.json')).json();retina?.dispose();retina=new FlyVision.AsyncRetina(eyeMap);await retina.ready;sampleVision(0);neuralStep();$('loading').remove();requestAnimationFrame(frame);window.kitchenDebug={get simulation(){return sim;},model,get activity(){return activity;},get paused(){return paused;},camera,get following(){return following;},get colony(){return colony;},get followTarget(){return followTarget;},setFollowTarget,saveGame,loadGame,get eyeViews(){return eyeViews;}};}catch(e){$('loading').textContent='Unable to start: '+e.message+'. Launch with launch.ps1; opening this file directly cannot load the brain.';$('loading').classList.add('error');}}
// Floating panels open without moving or resizing the playfield.
const settingDocks=[...document.querySelectorAll('.room-dock,.audio-dock')];
settingDocks.forEach(dock=>dock.addEventListener('toggle',()=>{if(dock.open)settingDocks.forEach(other=>{if(other!==dock)other.open=false;});}));
document.addEventListener('pointerdown',e=>settingDocks.forEach(dock=>{if(!dock.contains(e.target))dock.open=false;}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){settingDocks.forEach(dock=>dock.open=false);}});
for(const [id,title] of [['pause','Pause / resume · Space'],['scare','Startle the followed insect · S'],['trail','Show flight trail'],['map','Show landing surfaces and scents'],['panel-toggle','Hide or show the instrument panel · P'],['save-game','Save the game now (auto-saves every few seconds)'],['load-game','Load the last save'],['sound-toggle','Music and sounds on/off'],['eye-toggle','Render the compound-eye views (heavier) · off by default'],['follow','Follow the selected insect / view full room'],['observe','Normal cursor · Done or Escape exits placement']])$(id).title=title;
$('vision-info').onclick=()=> $('vision-details').showModal();
$('vision-close').onclick=()=> $('vision-details').close();
document.querySelectorAll('[data-outside]').forEach(button=>button.onclick=()=>{Daylight.setMode(button.dataset.outside);document.querySelectorAll('[data-outside]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});refreshFoodTexture();});
boot();







