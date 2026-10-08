'use strict';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d'),lens=$('closeup').getContext('2d'),brainCtx=$('brain').getContext('2d');
let sim=new Kitchen.Simulation(),model,photo=new Image(),paused=false,showTrail=false,showMap=false,placing=false,last=null,accumulator=0,brainTime=0,history=[],activity=[];
let flyView=false;
let following=true,texture,eyeTime=0,retina,eyeMap;
let wallClockText=RoomDetails.actualTime(),wallClockMinute=-1;
let foodKind=null,removing=false,pointerWorld=null,textureCanvas;
const camera=new FlyCamera.FollowCamera();
const soundtrack=new FlySound.KitchenAudio();
let previousPose=FlightArt.pose(sim),visiblePose=FlightArt.pose(sim);
const log=(message)=>{$('hint').textContent=message;};
function resize(c){let r=c.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);if(c.width!==Math.round(r.width*d)||c.height!==Math.round(r.height*d)){c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);}return [r.width,r.height,d];}
function ellipse(c,x,y,rx,ry,color,angle=0,stroke){c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.6;c.stroke();}}
function fly(c,x,y,size,angle,time,mode,pose={}){FlightArt.draw(c,x,y,size,angle,time,mode,pose);}
function sceneCenter(w,h){return [w<=480?w*.53:w/2,w<=480?h*.24:h/2];}
function renderScene(){const [cw,ch,d]=resize(canvas),w=(following?Math.max:Math.min)(cw,ch*16/9),h=w*9/16;ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle='#090f0c';ctx.fillRect(0,0,cw,ch);ctx.save();ctx.beginPath();ctx.rect(0,0,cw,ch);ctx.clip();ctx.translate(...sceneCenter(cw,ch));ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x*w,-camera.y*h);Daylight.drawPhoto(ctx,w,h);RoomDetails.drawClock(ctx,w,h,wallClockText);ctx.fillStyle=`rgba(8,16,18,${(1-sim.light)*.28})`;ctx.fillRect(0,0,w,h);
 for(const food of sim.foods)if(food.placed)FoodArt.draw(ctx,food.kind,food.x*w,food.y*h,w*.023,1,{seed:food.x*8192+food.y*16384,light:sim.light});
 if(showMap){for(const s of Kitchen.surfaces){ctx.beginPath();s.poly.forEach((p,i)=>i?ctx.lineTo(p[0]*w,p[1]*h):ctx.moveTo(p[0]*w,p[1]*h));ctx.closePath();ctx.fillStyle='#b5e2c418';ctx.fill();ctx.strokeStyle='#d2f0b680';ctx.lineWidth=1;ctx.stroke();}for(const f of sim.foods){ctx.strokeStyle='#d5efb8';ctx.lineWidth=1;ctx.beginPath();ctx.arc(f.x*w,f.y*h,8,0,Math.PI*2);ctx.stroke();ctx.font='11px system-ui';let tw=ctx.measureText(f.name).width;let tx=Math.min(w-tw-12,Math.max(12,f.x*w+13)),ty=f.y*h>h-35?f.y*h-15:f.y*h;ctx.fillStyle='#101c18dd';ctx.fillRect(tx-4,ty-12,tw+8,19);ctx.fillStyle='#e1f2d8';ctx.fillText(f.name,tx,ty+1);}}
 if(showTrail){ctx.lineWidth=1.3;for(let i=1;i<sim.trail.length;i++){let a=sim.trail[i-1],b=sim.trail[i];ctx.strokeStyle=`rgba(230,255,200,${i/sim.trail.length*.6})`;ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.stroke();}}
 if(placing&&pointerWorld){const p=pointerWorld,valid=Kitchen.surfaces.some(s=>Kitchen.inside(p,s.poly));if(foodKind)FoodArt.draw(ctx,foodKind,p.x*w,p.y*h,w*.023,.65,{seed:0,light:sim.light});ctx.strokeStyle=valid?'#d7f4a9':'#e6a598';ctx.lineWidth=1/camera.zoom;ctx.beginPath();ctx.arc(p.x*w,p.y*h,10/camera.zoom,0,Math.PI*2);ctx.stroke();}
 const p=visiblePose,x=p.x*w,y=(p.y-p.z)*h,body=Math.max(12,w*.014)*(0.85+p.y*.35);ctx.save();ctx.filter=`blur(${1+p.z*24}px)`;ellipse(ctx,x+p.z*w*.025,p.y*h+3,body*(.6+p.z),body*.2,`rgba(0,0,0,${.42/(1+p.z*9)})`);ctx.restore();fly(ctx,x,y,body,p.heading,p.time,p.mode,p);
 // Keep the insect clear in flight; a faint ground marker helps locate it at rest.
 if(p.mode!=='flight'){ctx.strokeStyle='#eeffdb40';ctx.lineWidth=1/camera.zoom;ctx.beginPath();ctx.arc(x,y,body*1.2,0,Math.PI*.8);ctx.stroke();}ctx.restore();
}
function renderMiniroom(){const c=$('miniroom'),m=c.getContext('2d'),[w,h,d]=resize(c);m.setTransform(d,0,0,d,0,0);Daylight.drawPhoto(m,w,h);RoomDetails.drawClock(m,w,h,wallClockText);m.fillStyle='#0d171a55';m.fillRect(0,0,w,h);const r=canvas.getBoundingClientRect(),baseW=(following?Math.max:Math.min)(r.width,r.height*16/9),baseH=baseW*9/16,bw=Math.min(1,r.width/baseW/camera.zoom),bh=Math.min(1,r.height/baseH/camera.zoom),b={x:camera.x-sceneCenter(r.width,r.height)[0]/baseW/camera.zoom,y:camera.y-sceneCenter(r.width,r.height)[1]/baseH/camera.zoom,width:bw,height:bh};m.strokeStyle='#d8f4bb';m.lineWidth=1;if(!flyView)m.strokeRect(b.x*w,b.y*h,b.width*w,b.height*h);ellipse(m,sim.x*w,(sim.y-sim.z)*h,flyView?4:2.5,flyView?4:2.5,'#edffbb');m.strokeStyle='#edffbb';m.beginPath();m.moveTo(sim.x*w,(sim.y-sim.z)*h);m.lineTo(sim.x*w+Math.cos(sim.heading)*8,(sim.y-sim.z)*h+Math.sin(sim.heading)*8);m.stroke();$('camera-badge').textContent=placing?'PLACEMENT VIEW':following?'FOLLOW CAMERA · '+camera.zoom.toFixed(1)+'×':'ROOM OVERVIEW';}
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
function sampleVision(dt){if(retina&&texture){retina.update(sim,texture,dt);sim.visualSignal=retina.signal.slice();sim.sense();}}function refreshFoodTexture(){if(!photo.complete||!photo.naturalWidth)return;if(!textureCanvas){textureCanvas=document.createElement('canvas');textureCanvas.width=1024;textureCanvas.height=576;}const t=textureCanvas.getContext('2d',{willReadFrequently:true});Daylight.drawPhoto(t,1024,576);RoomDetails.drawClock(t,1024,576,wallClockText);for(const f of sim.foods)if(f.placed)FoodArt.draw(t,f.kind,f.x*1024,f.y*576,1024*.023,1,{seed:f.x*8192+f.y*16384,light:sim.light});texture=t.getImageData(0,0,1024,576);sampleVision(0);const count=sim.foods.filter(f=>f.placed).length;$('food-count').textContent=count+' / 20 placed';$('undo-food').disabled=count===0;}
function selectTool(kind=null,erase=false){foodKind=kind;removing=erase;placing=Boolean(kind||erase);document.body.classList.toggle('placing',placing);pointerWorld=null;previousPointer=null;canvas.style.cursor=placing?'crosshair':'default';$('observe').textContent=placing?'Done':'Cursor';$('observe').setAttribute('aria-label',placing?'Finish placing food · Escape':'Normal cursor');document.querySelectorAll('[data-food]').forEach(b=>{const active=b.dataset.food===kind;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});for(const [id,active] of [['observe',!placing],['erase',erase]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));}$('food').classList.toggle('active',placing);$('food').textContent=placing?'Finish placing':'Place food';}
document.querySelectorAll('[data-food]').forEach(b=>{const name=Kitchen.foodTypes[b.dataset.food].name;b.title='Place '+name;b.setAttribute('aria-label','Place '+name);b.onclick=()=>selectTool(foodKind===b.dataset.food?null:b.dataset.food);});$('observe').onclick=()=>selectTool();$('erase').onclick=()=>selectTool(null,!removing);$('undo-food').onclick=()=>{if(sim.undoFood()){refreshFoodTexture();}};
function renderLens(){const [w,h,d]=resize($('closeup'));lens.setTransform(d,0,0,d,0,0);lens.clearRect(0,0,w,h);const size=Math.min(84,h*.65,w*.5);ellipse(lens,w/2,h*.7,size*.3,size*.08,'#00000035');fly(lens,w/2,h*.5,size,-Math.PI/2,visiblePose.time,visiblePose.mode,visiblePose);}
function dot(row,u){let sum=0;for(let j=0;j<7;j++)sum+=row[j]*u[j];return sum;}
function neuralStep(){history.unshift(sim.inputs.slice());if(history.length>model.kernel.length)history.pop();sim.outputs=model.output_kernel[0].map((_,n)=>history.reduce((v,u,k)=>v+dot(model.output_kernel[k][n],u),0));activity=model.cells.map((_,n)=>history.reduce((v,u,k)=>v+dot(model.kernel[k][n],u),0));}
let brainPoints=[];
function renderBrain(){let [w,h,d]=resize($('brain'));brainCtx.setTransform(d,0,0,d,0,0);brainCtx.clearRect(0,0,w,h);for(let i=0;i<brainPoints.length;i++){let a=Math.min(1,Math.abs(activity[i]||0)*1.5),p=brainPoints[i];brainCtx.globalAlpha=.15+a*.85;ellipse(brainCtx,10+p[0]*(w-20),6+p[1]*(h-24),.7+a*1.2,.7+a*1.2,(activity[i]||0)<0?'#db9eac':'#b5e2c4');}brainCtx.globalAlpha=1;}
const labels={flight:'Following a scent',walking:'Exploring the surface',feeding:'A little meal',grooming:'Cleaning wings and legs',resting:'Resting on the surface'};
function ui(){ $('outside-status').textContent=Daylight.status(); $('behavior').textContent=sim.escape>0?'A sudden escape':labels[sim.mode];$('state').textContent=sim.mode.toUpperCase();$('target').textContent=sim.target?sim.target.name:'Window ledge / exploration';$('clock').textContent=wallClockText+' Berlin · '+$('speed').value+'×';$('clock').title='Real time in Europe/Berlin. Simulation elapsed: '+Math.floor(sim.time)+' seconds.';$('mode').textContent=paused?'Paused / observation':'Autonomous / live';$('airtime').innerHTML=Math.floor(sim.airtime)+' <em>s</em>';$('landings').textContent=sim.landings;$('meals').textContent=sim.meals;$('distance').innerHTML=sim.travel.toFixed(2)+' <em>room widths</em>';for(const key of ['energy','hunger','alert']){$(key).style.width=sim[key]*100+'%';$(key+'-label').textContent=Math.round(sim[key]*100)+'%';}sim.inputs.forEach((v,i)=>$('sense'+i).style.width=v*100+'%');$('events').textContent=sim.events.map(e=>Math.floor(e.time)+'s — '+e.message).join('\n');$('events').style.whiteSpace='pre-line';}
function audio(){soundtrack.update(sim,paused);document.querySelector('.audio-dock summary').classList.toggle('audio-on',soundtrack.enabled);if(soundtrack.enabled){const channels=[soundtrack.music?'music':null,soundtrack.effects?'buzzing and kitchen sounds':null].filter(Boolean);$('sound-status').textContent=paused?'Audio paused':channels.length?'Playing: '+channels.join(' + '):'Channels muted';}}
let uiTime=0;
function frame(now){const minute=Math.floor(Date.now()/60000);if(minute!==wallClockMinute){wallClockMinute=minute;wallClockText=RoomDetails.actualTime();refreshFoodTexture();}const elapsed=last===null?0:Math.min(.1,(now-last)/1000);last=now;if(!paused){accumulator+=elapsed*Number($('speed').value);while(accumulator>=1/60){previousPose=FlightArt.pose(sim);sim.step(1/60);sampleVision(1/60);brainTime+=1/60;if(brainTime>=.05){brainTime-=.05;neuralStep();}accumulator-=1/60;}}visiblePose=paused?FlightArt.pose(sim):FlightArt.interpolate(previousPose,FlightArt.pose(sim),accumulator*60);camera.update(placing?{x:camera.x,y:camera.y,z:0}:visiblePose,elapsed,following,Number($('zoom').value));if(!flyView)renderScene();eyeTime+=elapsed;if(eyeTime>=1/30||last===now&&elapsed===0){renderEyes();renderMiniroom();if(!flyView){renderLens();renderBrain();}eyeTime=0;}uiTime+=elapsed;if(uiTime>=.1||elapsed===0){ui();uiTime=0;}audio();requestAnimationFrame(frame);}
function setFlyView(enabled){
 flyView=enabled;document.body.classList.toggle('fly-view',enabled);
 $('fly-view').classList.toggle('active',enabled);$('fly-view').setAttribute('aria-pressed',String(enabled));
 $('fly-view').textContent=enabled?'Follow camera':'Fly view';
 $('fly-view').title=enabled?'Return to camera · V':'Full-screen fly vision · V';
 if(!enabled){following=true;$('follow').classList.add('active');$('follow').setAttribute('aria-pressed','true');}
 if(enabled){selectTool();settingDocks.forEach(dock=>dock.open=false);}
 renderEyes();renderMiniroom();
}
$('fly-view').onclick=()=>setFlyView(!flyView);
$('follow').onclick=()=>{if(flyView){setFlyView(false);following=true;}else following=!following;$('follow').classList.toggle('active',following);$('follow').setAttribute('aria-pressed',String(following));previousPointer=null;};$('zoom').oninput=()=>previousPointer=null;
async function scareWithSound(x,y,react=true){
 if(react)sim.scare(x,y);
 // The click owns this sound; the next simulation update must not repeat it.
 if(soundtrack.previous)soundtrack.previous.escape=sim.escape;
 try{
  if(!soundtrack.context){
   soundtrack.music=false;$('music-enabled').checked=false;
   await soundtrack.enable();
   $('sound').textContent='♫ Audio';$('sound').classList.add('active');$('sound').setAttribute('aria-pressed','true');
  }
  soundtrack.event('clap',Math.max(-.9,Math.min(.9,sim.x*2-1)));
 }catch(e){$('sound-status').textContent=e.message;}
}
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';};$('scare').onclick=()=>scareWithSound();$('trail').onclick=()=>{$('trail').classList.toggle('active',showTrail=!showTrail);};$('map').onclick=()=>{$('map').classList.toggle('active',showMap=!showMap);};$('food').onclick=()=>selectTool(placing?null:'apple');
$('reset').onclick=()=>{sim=new Kitchen.Simulation();history=[];activity=[];brainTime=accumulator=0;previousPose=visiblePose=FlightArt.pose(sim);sim.light=Number($('light').value);sim.wind=Number($('wind').value);refreshFoodTexture();selectTool();retina?.dispose();retina=new FlyVision.AsyncRetina(eyeMap);sampleVision(0);neuralStep();};$('light').oninput=()=>{sim.light=Number($('light').value);sampleVision(0);};$('wind').oninput=()=>sim.wind=Number($('wind').value);
$('sound').onclick=async()=>{try{if(soundtrack.enabled)soundtrack.disable();else await soundtrack.enable();$('sound').textContent=soundtrack.enabled?'♫ Audio':'Audio';$('sound').classList.toggle('active',soundtrack.enabled);$('sound').setAttribute('aria-pressed',String(soundtrack.enabled));if(!soundtrack.enabled)$('sound-status').textContent='Audio off';}catch(e){$('sound-status').textContent=e.message;}};
$('music-enabled').onchange=()=>{soundtrack.music=$('music-enabled').checked;soundtrack.mix();};$('effects-enabled').onchange=()=>{soundtrack.effects=$('effects-enabled').checked;soundtrack.mix();};$('music-volume').oninput=()=>{soundtrack.musicVolume=Number($('music-volume').value);soundtrack.mix();};$('effects-volume').oninput=()=>{soundtrack.effectsVolume=Number($('effects-volume').value);soundtrack.mix();};
function point(e){const r=canvas.getBoundingClientRect(),w=(following?Math.max:Math.min)(r.width,r.height*16/9),h=w*9/16;return camera.screenToWorld((e.clientX-r.left-sceneCenter(r.width,r.height)[0])/w+.5,(e.clientY-r.top-sceneCenter(r.width,r.height)[1])/h+.5);}
canvas.onclick=e=>{if(flyView)return;let p=point(e);if(removing){const food=sim.foods.filter(f=>f.placed).sort((a,b)=>Kitchen.distance(p,a)-Kitchen.distance(p,b))[0];if(food&&Kitchen.distance(p,food)<.035&&sim.removeFood(food)){refreshFoodTexture();}}else if(placing){if(sim.addFood(p.x,p.y,foodKind)){refreshFoodTexture();selectTool();}}else scareWithSound(p.x,p.y,Math.hypot(p.x-sim.x,(p.y-(sim.y-sim.z))*.5625)<.10);};
let previousPointer=null,lastScare=-10;canvas.onpointermove=e=>{if(flyView)return;let p=point(e),now=performance.now()/1000;pointerWorld=p;if(previousPointer&&!paused&&!placing){let velocity=Math.hypot(p.x-previousPointer.x,p.y-previousPointer.y)/Math.max(.01,now-previousPointer.time);if(velocity>.65&&Math.hypot(p.x-sim.x,(p.y-(sim.y-sim.z))*.5625)<.07&&sim.time-lastScare>2){sim.scare(p.x,p.y);lastScare=sim.time;}}previousPointer={...p,time:now};};canvas.onpointerleave=()=>{previousPointer=null;pointerWorld=null;};
function clearTextSelection(){const selection=window.getSelection();if(selection&&!selection.isCollapsed)selection.removeAllRanges();}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('dialog,input[type=text],textarea,[contenteditable=true]'))clearTextSelection();});
document.addEventListener('selectstart',e=>{if(e.target instanceof Element&&!e.target.closest('dialog,input[type=text],textarea,[contenteditable=true]'))e.preventDefault();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){clearTextSelection();selectTool();if(flyView)setFlyView(false);return;}if(e.key.toLowerCase()==='v'&&!e.target.matches('input,select,textarea')){setFlyView(!flyView);return;}if(e.target.matches('input,select,button,summary,a'))return;if(e.code==='Space'){e.preventDefault();$('pause').click();}if(e.key.toLowerCase()==='s')$('scare').click();});
async function boot(){try{const response=await fetch('brain.json');if(!response.ok)throw new Error('Brain file could not be loaded');model=await response.json();photo.src='kitchen.jpg';await Promise.all([photo.decode(),FoodArt.load()]);await Daylight.load(photo);const sampler=document.createElement('canvas');sampler.width=1024;sampler.height=576;const sampleCtx=sampler.getContext('2d',{willReadFrequently:true});sampleCtx.drawImage(photo,0,0,1024,576);texture=sampleCtx.getImageData(0,0,1024,576);refreshFoodTexture();const xs=model.cells.map(c=>c.position[0]),zs=model.cells.map(c=>c.position[2]),xmin=Math.min(...xs),xmax=Math.max(...xs),zmin=Math.min(...zs),zmax=Math.max(...zs);brainPoints=xs.map((x,i)=>[(x-xmin)/(xmax-xmin),(zs[i]-zmin)/(zmax-zmin)]);$('senses').innerHTML=model.inputs.map((n,i)=>'<div><div class="pair"><span>'+n+'</span></div><div class="bar"><i id="sense'+i+'"></i></div></div>').join('');$('brain-info').textContent=model.neurons.toLocaleString()+' neurons · '+model.edges.toLocaleString()+' directed edges. '+model.cells.length+' sampled cells shown. Descending activity modulates turning.';eyeMap=await (await fetch('eye-map.json')).json();retina?.dispose();retina=new FlyVision.AsyncRetina(eyeMap);await retina.ready;sampleVision(0);neuralStep();$('loading').remove();requestAnimationFrame(frame);window.kitchenDebug={get simulation(){return sim;},model,get activity(){return activity;},get paused(){return paused;},camera,get following(){return following;}};}catch(e){$('loading').textContent='Unable to start: '+e.message+'. Launch with launch.ps1; opening this file directly cannot load the brain.';$('loading').classList.add('error');}}
// Floating panels open without moving or resizing the playfield.
const settingDocks=[...document.querySelectorAll('.room-dock,.audio-dock')];
settingDocks.forEach(dock=>dock.addEventListener('toggle',()=>{if(dock.open)settingDocks.forEach(other=>{if(other!==dock)other.open=false;});}));
document.addEventListener('pointerdown',e=>settingDocks.forEach(dock=>{if(!dock.contains(e.target))dock.open=false;}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){settingDocks.forEach(dock=>dock.open=false);}});
for(const [id,title] of [['pause','Pause / resume · Space'],['scare','Startle the fly · S'],['trail','Show flight trail'],['map','Show landing surfaces and scents'],['follow','Follow the fly / view full room'],['observe','Normal cursor · Done or Escape exits placement']])$(id).title=title;
  $('expand-eyes').onclick=()=>{const expanded=document.querySelector('.eyes-panel').classList.toggle('expanded');$('expand-eyes').setAttribute('aria-pressed',String(expanded));$('expand-eyes').title=expanded?'Collapse eye views':'Expand eye views';renderEyes();};
$('vision-info').onclick=()=> $('vision-details').showModal();
$('vision-close').onclick=()=> $('vision-details').close();
document.querySelectorAll('[data-outside]').forEach(button=>button.onclick=()=>{Daylight.setMode(button.dataset.outside);document.querySelectorAll('[data-outside]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});refreshFoodTexture();});
boot();







