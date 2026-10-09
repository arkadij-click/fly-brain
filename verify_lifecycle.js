const assert=require('node:assert/strict');
const {Simulation}=require('./simulation');
const {Colony,Egg,Maggot,Pupa,AdultFly,EGG_DURATION,LARVA_DURATION,PUPA_DURATION,LAY_MATURITY}=require('./lifecycle');
const {pose,interpolate}=require('./flight-art');
const inside=require('./simulation').inside,surfaces=require('./simulation').surfaces;

// Egg laying is wired to completed meals: a fed female lays within a few meals.
const sim=new Simulation();let clutches=0,layCalls=0;
sim.onLay=(x,y)=>{layCalls++;assert(inside({x,y},surfaces[0].poly)||surfaces.some(s=>inside({x,y},s.poly)),'eggs are laid on a surface');clutches+=colony.layClutch(x,y,sim.time);};
const colony=new Colony();
for(let i=0;i<60*900&&layCalls===0;i++)sim.step(1/60);
assert(layCalls>=1,'a fed fly eventually lays eggs');
assert(clutches>=2,'each clutch holds at least two eggs');
assert(colony.eggs.length===clutches,'eggs start as eggs');

// Eggs hatch, maggots crawl on surfaces and grow, pupate, and emerge as adults.
const room={foods:sim.foods};let sawMaggot=sawPupa=sawAdult=false;
for(let i=0;i<60*(EGG_DURATION+LARVA_DURATION+PUPA_DURATION+240)&&colony.adults.length===0;i++){
 colony.update(1/60,room,sim.time+=1/60);
 if(colony.larvae.length){sawMaggot=true;for(const m of colony.larvae){assert(Number.isFinite(m.x)&&Number.isFinite(m.y),'maggot position stays finite');assert(m.size<=1,'maggot size is bounded');assert(surfaces.some(s=>inside({x:m.x,y:m.y},s.poly)),'maggots remain on a landing surface');}}
 if(colony.pupae.length)sawPupa=true;
 if(colony.adults.length)sawAdult=true;
 for(const f of colony.adults){const p=pose(f);for(const key of ['x','y','z','heading','time','mode','bank','verticalSpeed','landingBlend','touchdown','age'])assert(key in p,'adult pose has '+key);assert(Math.abs(p.bank)<=.65+1e-6);assert(p.z>=0&&p.z<.25);assert(f.maturity<=1);const mid=interpolate(p,pose(f),.5);assert(Math.abs(mid.x-p.x)<1e-9,'adult poses interpolate');}
}
assert(sawMaggot,'eggs hatch into maggots');
assert(sawPupa,'maggots pupate');
assert(sawAdult,'adults emerge from pupae');
assert(colony.adults.every(f=>f.mode==='flight'||f.mode==='walking'||f.mode==='feeding'||f.mode==='grooming'||f.mode==='resting'),'adults use known modes');

// Selection plumbing: find/pose resolve through the pupa stage with one stable id.
const fly=colony.adults[0];assert(colony.find(fly.id)===fly,'find resolves an adult id');
assert(colony.pose(fly.id).x===fly.x,'pose() exposes the followed insect');
assert(colony.selectable().includes(fly),'adults are selectable');
assert.equal(colony.find('missing'),null);

// A nearby clap startles colony adults; they escape, then recover.
const target=colony.adults[0];
target.mode='walking';target.z=0;
const startled=target.scare(target.x,target.y-.02);
assert(startled,'an adult near the clap is startled');
assert.equal(target.mode,'flight');
assert(target.escape>0,'the escape impulse decays over time');
for(let i=0;i<60*10;i++){colony.update(1/60,room,sim.time+=1/60);assert(Number.isFinite(target.x)&&Math.abs(target.bank)<=.65+1e-6);}
assert(target.escape===0,'escape subsides');

// Population caps keep the kitchen from collapsing under infinite clutches.
for(let i=0;i<200;i++)colony.layClutch(.3,.6,i);
assert(colony.eggs.length<=24,'egg cap holds');

// Every adult carries its own personality: gaits, weaving and appetites differ.
const one=new AdultFly(.5,.5,0,'fly-u1'),two=new AdultFly(.5,.5,0,'fly-u2');
assert(one.walkSpeed!==two.walkSpeed||one.weaveAmp!==two.weaveAmp,'colony flies are not clones');
assert(one.pose().time!==two.pose().time,'wing/leg animation phases differ');
const inputs=one.senseInputs({foods:[{x:.3,y:.5,strength:1.2}]});
assert.equal(inputs.length,7);assert(inputs.every(Number.isFinite),'senseInputs yields seven finite channels');
assert(Number.isFinite(one.energy)&&Number.isFinite(one.travel),'adults track energy and travel');

// Every fly has a sex; only mature females start clutches, and only after two meals.
assert(['female','male'].includes(one.sex),'adults have a sex');
const nursery={foods:[{x:.5,y:.5,strength:1.6,feedRate:.11,name:'test apple'}]};
const mother=new AdultFly(.5,.5,0,'fly-tf');
mother.sex='female';mother.maturity=LAY_MATURITY;mother.hunger=.9;
let femaleClutches=0;mother.onLay=()=>femaleClutches++;
mother.target=nursery.foods[0];mother.destination={x:.5,y:.5};
for(let i=0;i<60*600&&femaleClutches===0;i++)mother.update(1/60,nursery);
assert(femaleClutches>=1,'a mature female lays a clutch of her own after a couple of meals');
assert(mother.mealsSinceLay===0,'laying resets her meal counter');
const father=new AdultFly(.5,.5,0,'fly-tm');
father.sex='male';father.maturity=1;father.hunger=.9;
let maleClutches=0;father.onLay=()=>maleClutches++;
father.target=nursery.foods[0];father.destination={x:.5,y:.5};
for(let i=0;i<60*240&&father.meals<3;i++)father.update(1/60,nursery);
assert(father.meals>=2,'the male went through his meals');
assert(maleClutches===0,'males never lay');

// Nothing dies: a hatching egg waits for nursery space instead of being destroyed.
const wait=new Colony();
for(let i=0;i<12;i++){const m=new Maggot(.3+i*.001,.6,i,'m-w'+i);m.age=LARVA_DURATION*.5;wait.larvae.push(m);}
const patient=new Egg(.32,.63,0);patient.age=EGG_DURATION+1;wait.eggs.push(patient);
wait.update(1/60,nursery,1);
assert(wait.eggs.length===1,'a hatching egg waits when the nursery is full');
wait.larvae.splice(0,1);
wait.update(1/60,nursery,1.1);
assert(wait.eggs.length===0&&wait.larvae.length===12,'the waiting egg hatches once space frees');

console.log(JSON.stringify({passed:true,clutches,eggsHatched:colony.clutches,adults:colony.adults.length,femaleClutches}));
