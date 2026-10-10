(function(root){
'use strict';
const kitchen=typeof module!=='undefined'?require('./simulation'):root.Kitchen;
const inside=kitchen.inside,surfaces=kitchen.surfaces,distance=kitchen.distance;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
// Realistic fruit-fly development runs on days; this kitchen compresses one
// generation into a few simulated minutes so the whole cycle stays watchable.
const EGG_DURATION=40,LARVA_DURATION=75,PUPA_DURATION=25,MATURATION=120;
const CLUTCH_MIN=2,CLUTCH_MAX=4,MAX_EGGS=800,MAX_LARVAE=400,MAX_ADULTS=1000;
// Every hatchling gets a name of its own, derived from its personality seed
// so saves restore it exactly. Boys are a touch more common than girls.
const NAME_A=['Bu','Zi','Mi','Ko','Lu','Fu','Ra','Ni','Go','Pe','Dzi','Ta'];
const NAME_B=['zik','ba','mila','sha','rik','nka','bo','zik','za','lya','funya','sya'];
function makeName(seed){return NAME_A[Math.floor(seed*977)%NAME_A.length]+NAME_B[Math.floor(seed*331)%NAME_B.length];}
// A female starts laying once her body is this developed (and after a couple of meals).
const LAY_MATURITY=.8;
function containingSurface(p){for(const s of surfaces)if(inside(p,s.poly))return s;return null;}
// Eggs are laid where the fly stands; nudge strays back onto the nearest surface.
function onSurface(p){let s=containingSurface(p);if(s)return p;let best=null,bestD=Infinity;for(const c of surfaces){const cx=c.poly.reduce((v,q)=>v+q[0],0)/c.poly.length,cy=c.poly.reduce((v,q)=>v+q[1],0)/c.poly.length,d=Math.hypot(p.x-cx,(p.y-cy)*.5625);if(d<bestD){bestD=d;best={x:cx,y:cy};}}for(let i=0;i<24&&!containingSurface(p);i++){p.x+=(best.x-p.x)*.3;p.y+=(best.y-p.y)*.3;}return p;}
class Egg{
 constructor(x,y,time,mutant){Object.assign(this,onSurface({x,y}));this.born=time;this.age=0;this.mutant=!!mutant;}
 update(dt){this.age+=dt;return this.age>=EGG_DURATION?'hatch':null;}
}
class Maggot{
 constructor(x,y,time,id){Object.assign(this,onSurface({x,y}));this.id=id;this.born=time;this.age=0;this.heading=Math.random()*Math.PI*2;this.size=.22;this.setSeed(Math.random());this.name=makeName(this.seed);}
 // Each larva gets its own pace, wiggle and sense of a comfortable feeding spot.
 // The whole personality follows from the seed, so a save can restore it exactly.
 setSeed(seed){this.seed=seed;this.bias=(seed-.5)*1.6;this.comfort=.012+seed*.05;this.speedFactor=.8+seed*.5;this.wiggleFreq=4.5+seed*4;this.name=makeName(seed);}
 // Larvae burrow toward the strongest scent, flexing side to side as they go,
 // but once close enough they stop shoving into the crowd and wander instead.
 update(dt,room){
  this.age+=dt;this.size=clamp(.22+this.age/LARVA_DURATION*.78);
  // A dirt pile within reach outpulls any food: larvae love burrowing into
  // soil, and the ones that make it inside come out mutated.
  let dirt=null,dirtD=Infinity;
  for(const d of room.dirts||[]){const dd=distance(this,d);if(dd<.25&&dd<dirtD){dirt=d;dirtD=dd;}}
  let best=null,bestScore=-Infinity;
  if(!dirt)for(const f of room.foods){const score=f.strength/(.12+distance(this,f));if(score>bestScore){bestScore=score;best=f;}}
  let steer=0;
  if(dirt){
   if(dirtD>=.028){
    const desired=Math.atan2((dirt.y-this.y)*.5625,dirt.x-this.x);
    steer=clamp(Math.atan2(Math.sin(desired-this.heading),Math.cos(desired-this.heading))*5,-2.4,2.4);
   }else steer=Math.sin(this.born)*1.1;
   if(dirtD<.03)this.mutant=true;
  }else if(best){
   if(distance(this,best)>=this.comfort){
    const desired=Math.atan2((best.y-this.y)*.5625,best.x-this.x);
    steer=clamp(Math.atan2(Math.sin(desired-this.heading),Math.cos(desired-this.heading))*5,-1.6,1.6);
   }else steer=Math.sin(this.born)*1.1;
  }
  this.heading+=(steer+this.bias+Math.sin(this.age*this.wiggleFreq+this.born)*2.4)*dt;
  const speed=(.004+.010*this.size)*this.speedFactor,nx=this.x+Math.cos(this.heading)*speed*dt,ny=this.y+Math.sin(this.heading)*speed*dt/.5625;
  if(containingSurface({x:nx,y:ny})){this.x=nx;this.y=ny;}else this.heading+=Math.PI*.7*dt;
  return this.age>=LARVA_DURATION?'pupate':null;
 }
}
class Pupa{
 constructor(x,y,time,id,name,mutant){Object.assign(this,onSurface({x,y}));this.id=id;this.name=name||('Pupa '+id.split('-').pop());this.born=time;this.age=0;this.mutant=!!mutant;}
 update(dt){this.age+=dt;return this.age>=PUPA_DURATION?'emerge':null;}
}
// A colony adult keeps the same pose contract as the main Simulation fly, so
// the follow camera and FlightArt draw it without any special casing. Each one
// also carries a personality seed: no two flies move or decide quite alike.
class AdultFly{
 constructor(x,y,time,id,name){
  this.id=id;
  this.sex=Math.random()<.4?'female':'male';
  this.mealsSinceLay=0;
  this.x=x;this.y=y;this.z=0;this.vx=0;this.vy=0;this.heading=Math.random()*Math.PI*2;this.time=time;this.age=0;this.maturity=0;this.mode='flight';this.hunger=.65;this.energy=.75;this.alert=0;this.escape=0;this.bank=0;this.turnRate=0;this.verticalSpeed=0;this.landingBlend=0;this.touchdown=0;this.airtime=0;this.landings=0;this.meals=0;this.sinceMeal=0;this.travel=0;this.target=null;this.destination={x,y:y-.06};this.escapeHeading=0;
  this.setSeed(Math.random());
  this.name=name||makeName(this.seed);
  this.maturity=.35+.25*this.seed;
 }
 // Personality is a pure function of the seed: saves restore it exactly.
 setSeed(seed){
  this.seed=seed;this.phase=seed*97;
  this.walkSpeed=.004+seed*.0045;
  this.speedFactor=.85+seed*.35;
  this.weaveAmp=.12+((seed*7.31)%1)*.3;
  this.weaveFreq=2.9+((seed*13.7)%1)*1.8;
  this.turnGain=4.2+((seed*23.7)%1)*1.8;
  this.feedDuration=3.8+((seed*3.13)%1)*3.4;
  this.groomDuration=2.1+((seed*5.91)%1)*2;
  this.restDuration=1.8+((seed*11.37)%1)*3.4;
  this.wanderChance=.35+seed*.3;
  this.landingRing=.012+((seed*17.93)%1)*.024;this.landingAngle=seed*Math.PI*2;
 }
 pose(){return {x:this.x,y:this.y,z:this.z,heading:this.heading,time:this.time+this.phase,mode:this.mode,bank:this.bank,verticalSpeed:this.verticalSpeed,landingBlend:this.landingBlend,touchdown:this.touchdown,age:this.age,maturity:this.maturity};}
 smellOf(x,y,room){return clamp(room.foods.reduce((v,f)=>v+f.strength*Math.exp(-distance({x,y},f)*6)*.4,0));}
 // The same seven sensory channels the main fly feeds to the connectome model.
 senseInputs(room){
  const side={x:-Math.sin(this.heading)*.022,y:Math.cos(this.heading)*.022/.5625};
  const l=this.smellOf(this.x+side.x,this.y+side.y,room),r=this.smellOf(this.x-side.x,this.y-side.y,room);
  const left=clamp(.55*(.15+.7*this.x)+this.alert*.5),right=clamp(.55*(.15+.7*(1-this.x))+this.alert*.5);
  const touch=this.mode==='flight'?.15*.2:.55;
  return [l,r,left,right,clamp(touch+this.alert*.6),clamp(touch+this.alert*.6),this.mode==='feeding'?1:0];
 }
 choose(room){
  // Bored, well-fed flies roam to a random spot instead of another meal.
  if(this.hunger<.4&&Math.random()<this.wanderChance){
   // Wander to horizontal spots only: nobody idles on a vertical face. Big
   // surfaces get proportionally more idlers, and every fly keeps a little
   // personal space instead of piling into one corner.
   const pool=surfaces.filter(s=>s.food!==false),areas=pool.map(s=>{const p=s.poly;let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return Math.abs(a)/2;}),total=areas.reduce((v,a)=>v+a,0);
   for(let tries=0;tries<24;tries++){
    let pick=Math.random()*total,poly=pool[pool.length-1].poly;
    for(let i=0;i<pool.length;i++){pick-=areas[i];if(pick<=0){poly=pool[i].poly;break;}}
    const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
    const x=Math.min(...xs)+Math.random()*(Math.max(...xs)-Math.min(...xs)),y=Math.min(...ys)+Math.random()*(Math.max(...ys)-Math.min(...ys));
    if(!inside({x,y},poly))continue;
    if((room.flies||[]).some(o=>o!==this&&distance({x,y},o)<.05))continue;
    this.destination={x,y};this.target=null;return;
   }
  }
  // Crowding: a food already mobbed by others loses its appeal, and so does
  // the dish this fly just finished - rotate instead of repeating yourself.
  const crowd=new Map();
  for(const other of room.flies||[])if(other!==this&&other.target&&distance(this,other)<.18){const i=room.foods.indexOf(other.target);if(i>=0)crowd.set(i,(crowd.get(i)||0)+1);}
  let best=-Infinity,bestIndex=-1,fallback=-Infinity,fallbackIndex=-1;
  for(let i=0;i<room.foods.length;i++){
   const f=room.foods[i];
   const taste=1+Math.sin(this.seed*555+i*1723)*.9;
   const bored=f===this.target?3:1;
   const score=f.strength/(.12+distance(this,f))*(this.hunger+.1)*taste*bored/(1+(crowd.get(i)||0)*4)+Math.random()*.18;
   if((crowd.get(i)||0)>0){if(score>fallback){fallback=score;fallbackIndex=i;}}
   else if(score>best){best=score;bestIndex=i;}
  }
  if(bestIndex<0){bestIndex=fallbackIndex;best=fallback;}
  if(bestIndex>=0){this.target=room.foods[bestIndex]; // ring around the food instead of one shared landing point
   this.destination={x:this.target.x+Math.cos(this.landingAngle)*this.landingRing,y:this.target.y+Math.sin(this.landingAngle)*this.landingRing};
  }else{const x=.58+Math.random()*.32;this.destination={x,y:.448+(x-.554)*.317};}
 }
 scare(x,y){const dx=this.x-x,dy=(this.y-y)*.5625;if(Math.hypot(dx,dy)>.12)return false;this.escapeHeading=Math.hypot(dx,dy)<.005?this.heading+(Math.random()<.5?-1:1)*(1.1+this.seed):Math.atan2(dy,dx)+(this.seed-.5)*2;this.alert=1;this.escape=1.5;this.poke=1;if(this.mode!=='flight'){this.mode='flight';this.age=0;this.vx=Math.cos(this.heading)*.008;this.vy=Math.sin(this.heading)*.008;this.verticalSpeed=0;this.z=0;}this.landingBlend=0;return true;}
 update(dt,room){
  dt=Math.min(dt,.05);const previous={x:this.x,y:this.y};
  this.time+=dt;this.age+=dt;this.sinceMeal+=dt;this.maturity=clamp(this.maturity+dt/MATURATION);this.alert=Math.max(0,this.alert-dt*.38);this.escape=Math.max(0,this.escape-dt);this.hunger=clamp(this.hunger+dt*.004);this.poke=Math.max(0,(this.poke||0)-dt*1.2);
  if(this.mode==='flight'){
   this.airtime+=dt;this.energy=clamp(this.energy-dt*.009);
   const dx=this.destination.x-this.x,dy=(this.destination.y-this.y)*.5625,d=Math.hypot(dx,dy);
   let desired=Math.atan2(dy,dx);if(this.escape>0)desired=this.escapeHeading;
   const turn=Math.atan2(Math.sin(desired-this.heading),Math.cos(desired-this.heading));
   const weave=d>.065&&this.escape===0?Math.sin(this.time*this.weaveFreq)*this.weaveAmp:0;
   const turnLimit=this.escape>0?6:3.8;
   this.turnRate+=(clamp(turn*this.turnGain+weave,-turnLimit,turnLimit)-this.turnRate)*(1-Math.exp(-dt*12));
   this.heading+=this.turnRate*dt;
   this.bank+=(clamp(this.turnRate*.16,-.65,.65)-this.bank)*(1-Math.exp(-dt*9));
   const speed=(this.escape>0?.30:Math.min(.13,Math.max(.008,d*.85))*this.speedFactor)*(.2+.8*clamp(this.age/.45));
   const desiredVx=Math.cos(this.heading)*speed+Math.sin(this.time*.8+this.phase)*.15*.015,desiredVy=Math.sin(this.heading)*speed;
   this.vx+=(desiredVx-this.vx)*(1-Math.exp(-dt*7));this.vy+=(desiredVy-this.vy)*(1-Math.exp(-dt*7));
   this.x+=this.vx*dt;this.y+=this.vy*dt/.5625;
   const bob=d>.07?.0025*Math.sin(this.time*11+this.phase*3):0;
   const altitude=this.escape>0?.15:(Math.min(.10,d*.45)+bob)*(.75+.35*this.seed);
   this.verticalSpeed+=(altitude-this.z)*36*dt-this.verticalSpeed*10*dt;
   this.z=Math.max(0,this.z+this.verticalSpeed*dt);
   this.landingBlend=this.escape>0?0:clamp(1-d/.055);
   if(this.x<.02||this.x>.98||this.y<.08||this.y>.985){const wallX=this.x<.02||this.x>.98;this.x=clamp(this.x,.02,.98);this.y=clamp(this.y,.08,.985);if(wallX)this.vx*=.2;else this.vy*=.2;this.escapeHeading=wallX?Math.PI-this.heading:-this.heading;this.escape=.35;}
   if(d<.008&&this.escape===0&&this.z<.006&&Math.hypot(this.vx,this.vy)<.03){this.x=this.destination.x;this.y=this.destination.y;this.z=0;this.vx=this.vy=this.verticalSpeed=0;this.landings++;this.touchdown=1;this.mode='walking';this.age=0;}
  }else{
   this.energy=clamp(this.energy+dt*.02);this.z=0;this.bank*=Math.exp(-dt*10);this.turnRate*=Math.exp(-dt*10);this.touchdown=Math.max(0,this.touchdown-dt*4);
   if(this.mode==='walking'){this.heading+=Math.sin(this.time*5+this.phase)*dt;const nx=this.x+Math.cos(this.heading)*this.walkSpeed*dt,ny=this.y+Math.sin(this.heading)*this.walkSpeed*dt/.5625;if(containingSurface({x:nx,y:ny})){this.x=nx;this.y=ny;}else this.heading+=Math.PI*dt;if(this.age>2){this.mode=this.target&&this.hunger>.18?'feeding':'grooming';this.age=0;if(this.mode==='feeding'){this.meals++;this.mealsSinceLay++;this.sinceMeal=0;}}}
   else if(this.mode==='feeding'){
    this.hunger=clamp(this.hunger-dt*(this.target?.feedRate||.11));
    if(this.age>this.feedDuration){
     this.mode='grooming';this.age=0;
     // A mature female with a couple of good meals behind her starts the next generation.
     if(this.sex==='female'&&this.maturity>=LAY_MATURITY&&this.mealsSinceLay>=2&&this.onLay){
      this.mealsSinceLay=0;this.energy=clamp(this.energy-.22);this.onLay(this.x,this.y);
     }
    }
   }
   else if(this.mode==='grooming'&&this.age>this.groomDuration){this.mode='resting';this.age=0;}
   else if(this.mode==='resting'&&this.age>this.restDuration){this.choose(room);this.mode='flight';this.age=0;this.landingBlend=0;}
  }
  this.travel+=distance(this,previous);
 }
}
class Colony{
 constructor(){this.eggs=[];this.larvae=[];this.pupae=[];this.adults=[];this.dirts=[];this.counter=0;this.clutches=0;this.time=0;}
 addDirt(x,y){if(this.dirts.length>=8)return false;const p=onSurface({x,y});this.dirts.push({x:p.x,y:p.y});return true;}
 nextId(prefix){return prefix+'-'+(++this.counter);}
 layClutch(x,y,time,mutant){if(this.adults.length>=MAX_ADULTS||this.eggs.length>=MAX_EGGS)return 0;
const n=CLUTCH_MIN+Math.floor(Math.random()*(CLUTCH_MAX-CLUTCH_MIN+1)),count=Math.min(n,MAX_EGGS-this.eggs.length);for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,r=.004+Math.random()*.014;this.eggs.push(new Egg(x+Math.cos(a)*r,y+Math.sin(a)*r/.5625,time,mutant));}this.clutches++;return count;}
 layEgg(x,y,time){if(this.eggs.length>=MAX_EGGS)return false;this.eggs.push(new Egg(x,y,time));return true;}
 layEgg(x,y,time){if(this.eggs.length>=MAX_EGGS)return false;this.eggs.push(new Egg(x,y,time));return true;}
 update(dt,room,time){this.time=(time??this.time+dt);
  const env={foods:room.foods||[],dirts:this.dirts,flies:[...(room.flies||[]),...this.adults,...(room.main?[room.main]:[])]};
  const events=[];
  for(let i=this.eggs.length-1;i>=0;i--){if(this.larvae.length>=MAX_LARVAE)break;if(this.eggs[i].update(dt)==='hatch'){const egg=this.eggs.splice(i,1)[0];const m=new Maggot(egg.x,egg.y,this.time,this.nextId('maggot'),egg.mutant);m.mutantSeen=m.mutant;this.larvae.push(m);events.push((m.mutant?'🧬 ':'🥁 ')+m.name+' ('+(m.seed<.4?'♀':'♂')+') hatched from an egg — a tiny worm with a big appetite.');}}
  for(let i=this.larvae.length-1;i>=0;i--){const m=this.larvae[i];m.update(dt,env);if(m.mutant&&!m.mutantSeen){m.mutantSeen=true;events.push('🧬 '+m.name+' crawled into the dirt and mutated — blue eyes incoming.');}if(m.age>=LARVA_DURATION){this.larvae.splice(i,1);this.pupae.push(new Pupa(m.x,m.y,this.time,m.id,m.name,m.mutant));events.push(m.name+' pupated — the metamorphosis begins.');}}
  for(let i=this.pupae.length-1;i>=0;i--){const p=this.pupae[i];if(p.update(dt)==='emerge'){this.pupae.splice(i,1);const fly=new AdultFly(p.x,p.y,this.time,p.id,p.name);fly.mutant=!!p.mutant;
   // Nothing in this kitchen dies: a mature female simply starts a clutch of her own.
   fly.onLay=(x,y)=>{const n=this.layClutch(x,y,this.time,fly.mutant);if(n&&this.onClutch)this.onClutch(fly,n);};
   this.adults.push(fly);events.push((fly.mutant?'🧬 ':'')+fly.name+' ('+(fly.sex==='female'?'♀':'♂')+') emerged from the pupa and took off!');}}
  for(const fly of this.adults)fly.update(dt,env);
  return events;
 }
 selectable(){return [...this.larvae,...this.adults];}
 followable(){return [...this.larvae,...this.pupae,...this.adults];}
 find(id){return this.followable().find(m=>m.id===id)||null;}
 pose(id){const m=this.find(id);return m?(m.pose?m.pose():{...m,z:0}):null;}
 scare(x,y){let hit=false;for(const fly of this.adults)hit=fly.scare(x,y)||hit;return hit;}
 counts(){return {eggs:this.eggs.length,larvae:this.larvae.length,pupae:this.pupae.length,adults:this.adults.length};}
}
// --- Rendering for the pre-adult stages; adults reuse FlightArt. ---
function pearl(c,x,y,rx,ry,angle){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.fillStyle='#f2ecd9';c.fill();c.strokeStyle='#c9c0a4';c.lineWidth=.5;c.stroke();c.beginPath();c.ellipse(-rx*.3,-ry*.3,rx*.35,ry*.3,0,0,Math.PI*2);c.fillStyle='#ffffffcc';c.fill();c.restore();}
function drawEggs(c,x,y,size,time,seed=0,mutant=false){const count=3+Math.floor(Math.abs(Math.sin(seed)) *2.9);for(let i=0;i<count;i++){const a=seed*7+i*2.4,r=size*.55*Math.sqrt((i+1)/count);c.save();if(mutant){c.filter='hue-rotate(160deg)';}pearl(c,x+Math.cos(a+i)*r,y+Math.sin(a+i)*r*.6,size*.34,size*.22,a+i);c.restore();}}
let mLod=1;const mSprites={};const M_SPR=140;
function maggotSprite(mutant){
 const key=mutant?'m':'n';
 if(mSprites[key])return mSprites[key];
 const cv=document.createElement('canvas');cv.width=M_SPR;cv.height=M_SPR;
 const g=cv.getContext('2d');g.translate(M_SPR/2,M_SPR/2);
 drawMaggotDetailed(g,M_SPR/2,M_SPR/2,M_SPR/3.4,-Math.PI/2,1.7,1,mutant);
 mSprites[key]=cv;return cv;
}
function drawMaggot(c,x,y,size,heading,time,progress=1,mutant=false){
 if(size*(mLod||1)<22&&typeof document!=='undefined'){
  const spr=maggotSprite(mutant),k=size/(M_SPR/3.4);
  c.save();c.translate(x,y);c.rotate(heading);c.drawImage(spr,-M_SPR/2*k,-M_SPR/2*k,M_SPR*k,M_SPR*k);c.restore();
  return;
 }
 drawMaggotDetailed(c,x,y,size,heading,time,progress,mutant);
}
function drawMaggotDetailed(c,x,y,size,heading,time,progress=1,mutant=false){
 c.save();c.translate(x,y);c.rotate(heading);c.scale(size/40,size/40);
 const flex=Math.sin(time*6)*4*(.3+progress*.7);
 c.lineCap='round';
 // A tapered chain of segments, fattest toward the tail, with a dark mouth hook.
 const segments=6;
 for(let i=segments;i>=0;i--){
  const t=i/segments,wob=Math.sin(time*6-i*.9)*(4*(1-Math.abs(i/segments-.5)*.6));
  const px=-18+i*7,py=wob*(1-progress*.3),r=(3.4+5.2*Math.sin(Math.PI*(1-t*.82)))*(.5+.5*progress);
  c.beginPath();c.ellipse(px,py,r*.86,r,0,0,Math.PI*2);c.fillStyle=(i%2?(mutant?'#c3d4f2':'#efe5c4'):(mutant?'#aec3ec':'#e4d7ae'));c.fill();
 }
 c.strokeStyle='#d3c298';c.lineWidth=.7;for(let i=1;i<segments;i++){const t=i/segments,wob=Math.sin(time*6-i*.9)*3;c.beginPath();c.moveTo(-18+i*7-2,wob);c.lineTo(-18+i*7+2,wob);c.stroke();}
 const headWob=Math.sin(time*6)*3;c.strokeStyle='#4a3d28';c.lineWidth=1.4;c.beginPath();c.moveTo(24,headWob-1);c.lineTo(29,headWob-3);c.moveTo(24,headWob+1);c.lineTo(29,headWob+3);c.stroke();
 c.fillStyle='#2e2a1e';c.beginPath();c.arc(30,headWob,1.1,0,Math.PI*2);c.fill();
 c.restore();
}
function drawDirt(c,x,y,size){
 c.save();c.translate(x,y);
 c.fillStyle='#6b4a2b';c.beginPath();c.ellipse(0,0,size*.5,size*.32,0,0,Math.PI*2);c.fill();
 c.fillStyle='#7d5a35';c.beginPath();c.ellipse(-size*.12,-size*.09,size*.36,size*.24,-.2,0,Math.PI*2);c.fill();
 c.fillStyle='#8f6a41';for(let i=0;i<8;i++){const a=i*.85+size,rr=size*(.12+((i*37)%10)/26);c.beginPath();c.arc(Math.cos(a)*rr,Math.sin(a)*rr*.55,size*.055,0,Math.PI*2);c.fill();}
 c.restore();
}
function drawPupa(c,x,y,size,angle=0){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(size/40,size/40);
 const grad=c.createLinearGradient(-16,0,16,0);grad.addColorStop(0,'#5d3a1f');grad.addColorStop(.45,'#8a5a30');grad.addColorStop(1,'#4a2c16');
 c.beginPath();c.ellipse(0,0,17,8,0,0,Math.PI*2);c.fillStyle=grad;c.fill();
 c.strokeStyle='#3a2110';c.lineWidth=.8;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*6,-6.4);c.quadraticCurveTo(i*6+1.5,0,i*6,6.4);c.stroke();}
 c.beginPath();c.ellipse(-13,0,4,5,0,0,Math.PI*2);c.fillStyle='#6d4423';c.fill();
 c.beginPath();c.ellipse(2,-2,7,3,0,0,Math.PI*2);c.fillStyle='#ffffff14';c.fill();
 c.restore();
}
const api={Colony,Egg,Maggot,Pupa,AdultFly,drawEggs,drawMaggot,drawMaggotDetailed,drawPupa,drawDirt,setLod:v=>{mLod=v;},EGG_DURATION,LARVA_DURATION,PUPA_DURATION,LAY_MATURITY,MAX_LARVAE};
if(typeof module!=='undefined')module.exports=api;else root.FlyLifecycle=api;
})(typeof globalThis!=='undefined'?globalThis:this);
