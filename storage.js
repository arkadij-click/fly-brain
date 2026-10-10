(function(root){
'use strict';
const lifecycle=typeof module!=='undefined'?require('./lifecycle'):root.FlyLifecycle;
const {Egg,Maggot,Pupa,AdultFly}=lifecycle;
const KEY='fly-brain-kitchen-save-v1',VERSION=1;
// One save slot in whatever storage the host provides (localStorage in the
// browser, any get/set/remove object in tests). Everything here is plain data:
// the main fly, her foods and the whole colony, keyed by stable ids.
function capture(sim,colony){
 return {version:VERSION,
  sim:{
   seed:sim.seed,time:sim.time,energy:sim.energy,hunger:sim.hunger,alert:sim.alert,
   x:sim.x,y:sim.y,z:sim.z,vx:sim.vx,vy:sim.vy,heading:sim.heading,mode:sim.mode,age:sim.age,
   airtime:sim.airtime,landings:sim.landings,meals:sim.meals,travel:sim.travel,sinceMeal:sim.sinceMeal,
   escape:sim.escape,escapeHeading:sim.escapeHeading,turnRate:sim.turnRate||0,bank:sim.bank||0,
   verticalSpeed:sim.verticalSpeed||0,landingBlend:sim.landingBlend||0,touchdown:sim.touchdown||0,
   layAt:sim.layAt,light:sim.light,wind:sim.wind,
   targetIndex:sim.foods.indexOf(sim.target),destination:{...sim.destination},
   trail:sim.trail.slice(-450),events:sim.events.slice(0,3)
  },
  foods:sim.foods.map(f=>({name:f.name,x:f.x,y:f.y,strength:f.strength,feedRate:f.feedRate,kind:f.kind,placed:f.placed,id:f.id})),
  colony:{
   counter:colony.counter,clutches:colony.clutches,time:colony.time,
   eggs:colony.eggs.map(e=>({x:e.x,y:e.y,born:e.born,age:e.age,mutant:e.mutant})),
   larvae:colony.larvae.map(m=>({id:m.id,name:m.name,x:m.x,y:m.y,born:m.born,age:m.age,heading:m.heading,size:m.size,seed:m.seed,mutant:m.mutant})),
   dirts:colony.dirts.map(d=>({x:d.x,y:d.y})),
   pupae:colony.pupae.map(p=>({id:p.id,x:p.x,y:p.y,born:p.born,age:p.age})),
   adults:colony.adults.map(f=>({id:f.id,name:f.name,mutant:f.mutant,seed:f.seed,sex:f.sex,mealsSinceLay:f.mealsSinceLay,
    x:f.x,y:f.y,z:f.z,vx:f.vx,vy:f.vy,heading:f.heading,time:f.time,age:f.age,maturity:f.maturity,mode:f.mode,
    hunger:f.hunger,energy:f.energy,alert:f.alert,escape:f.escape,escapeHeading:f.escapeHeading,
    bank:f.bank,turnRate:f.turnRate,verticalSpeed:f.verticalSpeed,landingBlend:f.landingBlend,touchdown:f.touchdown,
    airtime:f.airtime,landings:f.landings,meals:f.meals,sinceMeal:f.sinceMeal,travel:f.travel,
    targetIndex:sim.foods.indexOf(f.target),destination:{...f.destination}}))
  }};
}
function restore(state,sim,colony){
 if(!state||state.version!==VERSION)return false;
 const s=state.sim||{};
 const numbers=['seed','time','energy','hunger','alert','x','y','z','vx','vy','heading','mode','age','airtime','landings','meals','travel','sinceMeal','escape','escapeHeading','turnRate','bank','verticalSpeed','landingBlend','touchdown','layAt','light','wind'];
 for(const k of numbers)if(s[k]!==undefined)sim[k]=s[k];
 sim.foods=(state.foods||[]).map(f=>({...f}));
 sim.target=(s.targetIndex>=0&&sim.foods[s.targetIndex])||null;
 sim.destination=s.destination?{...s.destination}:{...(sim.target||{x:sim.x,y:sim.y})};
 sim.trail=(s.trail||[]).slice(-450);
 sim.events=(s.events||[]).slice(0,3);
 const c=state.colony||{};
 colony.counter=c.counter||0;colony.clutches=c.clutches||0;colony.time=c.time||s.time||0;colony.dirts=(c.dirts||[]).map(d=>({...d}));
 colony.eggs=(c.eggs||[]).map(e=>{const egg=new Egg(e.x,e.y,e.born,e.mutant);egg.age=e.age||0;return egg;});
 colony.larvae=(c.larvae||[]).map(m=>{const mag=new Maggot(m.x,m.y,m.born,m.id);mag.setSeed(m.seed??mag.seed);
  Object.assign(mag,{name:m.name||mag.name,mutant:!!m.mutant,age:m.age||0,heading:m.heading??mag.heading,size:m.size??.22,x:m.x,y:m.y});return mag;});
 colony.pupae=(c.pupae||[]).map(p=>{const pu=new Pupa(p.x,p.y,p.born,p.id);pu.age=p.age||0;return pu;});
 colony.adults=(c.adults||[]).map(a=>{
  const fly=new AdultFly(a.x,a.y,a.time,a.id,a.name,!!a.mutant);
  fly.setSeed(a.seed??fly.seed);fly.sex=a.sex==='male'?'male':'female';fly.mealsSinceLay=a.mealsSinceLay||0;
  fly.onLay=(x,y)=>{const n=colony.layClutch(x,y,colony.time);if(n&&colony.onClutch)colony.onClutch(fly,n);};
  Object.assign(fly,{x:a.x,y:a.y,z:a.z||0,vx:a.vx||0,vy:a.vy||0,heading:a.heading??fly.heading,time:a.time||0,
   age:a.age||0,maturity:a.maturity??.5,mode:a.mode||'flight',hunger:a.hunger??.65,energy:a.energy??.75,
   alert:a.alert||0,escape:a.escape||0,escapeHeading:a.escapeHeading??0,bank:a.bank||0,turnRate:a.turnRate||0,
   verticalSpeed:a.verticalSpeed||0,landingBlend:a.landingBlend||0,touchdown:a.touchdown||0,
   name:a.name||fly.name,airtime:a.airtime||0,landings:a.landings||0,meals:a.meals||0,sinceMeal:a.sinceMeal||0,travel:a.travel||0,
   target:(a.targetIndex>=0&&sim.foods[a.targetIndex])||null,
   destination:a.destination?{...a.destination}:{...fly.destination}});
  return fly;});
 return true;
}
function save(store,state){store.setItem(KEY,JSON.stringify(state));}
function read(store){
 try{const raw=store&&store.getItem(KEY);if(!raw)return null;const state=JSON.parse(raw);return state&&state.version===VERSION?state:null;}
 catch(e){return null;}
}
function clear(store){if(store)store.removeItem(KEY);}
const api={KEY,VERSION,capture,restore,save,read,clear};
if(typeof module!=='undefined')module.exports=api;else root.FlyStorage=api;
})(typeof globalThis!=='undefined'?globalThis:this);
