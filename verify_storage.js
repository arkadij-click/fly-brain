const assert=require('node:assert/strict');
const {Simulation}=require('./simulation');
const {Colony,Egg,Maggot,Pupa,AdultFly}=require('./lifecycle');
const FlyStorage=require('./storage');
const {pose}=require('./flight-art');

// A fake storage backend: same contract as localStorage.
const store={data:new Map(),getItem(k){return this.data.has(k)?this.data.get(k):null;},setItem(k,v){this.data.set(k,String(v));},removeItem(k){this.data.delete(k);}};

// Run the world for a while so there is real state to preserve.
const sim=new Simulation();const colony=new Colony();
sim.onLay=(x,y)=>colony.layClutch(x,y,sim.time);
colony.onClutch=(fly,n)=>{/* events are app-level */};
for(let i=0;i<60*240;i++){sim.step(1/60);colony.update(1/60,{foods:sim.foods},sim.time);}
sim.addFood(.5,.9,'juice');
assert(sim.foods.some(f=>f.kind==='juice'),'the test food was accepted');
const label=JSON.stringify({counts:colony.counts(),meals:sim.meals,x:+sim.x.toFixed(3)});

// Capture → save → read back → restore into a fresh world.
const state=FlyStorage.capture(sim,colony);
assert.equal(state.version,1);
FlyStorage.save(store,state);
const raw=FlyStorage.read(store);
assert(raw,'the save reads back');
const sim2=new Simulation();const colony2=new Colony();
assert.equal(FlyStorage.restore(raw,sim2,colony2),true,'restore succeeds');
assert.deepEqual(colony2.counts(),colony.counts(),'colony populations match');
assert.equal(sim2.foods.length,sim.foods.length,'placed foods survive');
assert(sim2.foods.some(f=>f.kind==='juice'&&f.placed),'the juice drop is still on the table');
assert.equal(+sim2.x.toFixed(4),+sim.x.toFixed(4),'the main fly is where she was');
assert.equal(+sim2.hunger.toFixed(4),+sim.hunger.toFixed(4),'vitals match');
assert.equal(sim2.meals,sim.meals,'meal counters match');
assert.equal(sim2.trail.length,sim.trail.length,'the trail survives');
assert.equal(sim2.events.length,sim.events.length,'recent events survive');

// Every colony member is back with the same identity and personality.
for(const f of colony.adults){
 const twin=colony2.adults.find(x=>x.id===f.id);
 assert(twin,'adult '+f.id+' is restored');
 assert.equal(twin.sex,f.sex,'sex survives');
 assert.equal(+twin.maturity.toFixed(4),+f.maturity.toFixed(4),'maturity survives');
 assert.equal(+twin.walkSpeed.toFixed(6),+f.walkSpeed.toFixed(6),'personality re-derives from the seed');
 assert.equal(+twin.feedDuration.toFixed(6),+f.feedDuration.toFixed(6),'feeding temperament survives');
 assert(typeof twin.onLay==='function','restored females can lay again');
 assert.equal(twin.target&&twin.target.name,f.target&&f.target.name,'food targets re-link');
}
for(const m of colony.larvae){
 const twin=colony2.larvae.find(x=>x.id===m.id);
 assert(twin,'larva '+m.id+' is restored');
 assert.equal(+twin.comfort.toFixed(6),+m.comfort.toFixed(6),'larva personality re-derives');
}
for(const p of colony.pupae)assert(colony2.pupae.find(x=>x.id===p.id),'pupa '+p.id+' is restored');

// The restored world keeps living.
const room={foods:sim2.foods};
for(let i=0;i<60*20;i++){sim2.step(1/60);colony2.update(1/60,room,sim2.time+=1/60);}
for(const f of colony2.adults){const p=pose(f);assert(Number.isFinite(p.x)&&Math.abs(p.bank)<=.65+1e-6,'restored adult flies normally');}
assert.equal(colony2.adults.length,colony.adults.length,'nobody dies during a restore');

// Corrupt or missing saves are ignored, clearing works.
store.setItem(FlyStorage.KEY,'{not json');
assert.equal(FlyStorage.read(store),null,'corrupt saves read as null');
assert.equal(FlyStorage.restore(null,sim2,colony2),false,'restore refuses null');
FlyStorage.clear(store);
assert.equal(FlyStorage.read(store),null,'clear removes the save');
const again=FlyStorage.capture(sim,colony);
FlyStorage.save(store,again);FlyStorage.clear(store);
assert.equal(FlyStorage.read(store),null,'clear works after a fresh save');

console.log(JSON.stringify({passed:true,counts:colony.counts(),adults:colony.adults.length,foods:sim.foods.length}));
