const assert=require('node:assert/strict');
const {Simulation}=require('./simulation');
const {pose,interpolate}=require('./flight-art');
const s=new Simulation();let maxTurn=0,maxBank=0,takeoffs=0,landings=0;
for(let i=0;i<60*180;i++){
 const before=pose(s);s.step(1/60);const after=pose(s);
 for(const key of ['x','y','z','heading','turnRate','bank','verticalSpeed'])assert(Number.isFinite(s[key]),key);
 assert(Math.abs(s.turnRate)<=6+1e-6);assert(Math.abs(s.bank)<=.65+1e-6);assert(s.z>=0&&s.z<.25);
 maxTurn=Math.max(maxTurn,Math.abs(s.turnRate));maxBank=Math.max(maxBank,Math.abs(s.bank));
 if(before.mode!==after.mode){if(after.mode==='flight'){takeoffs++;assert.equal(after.z,0,'takeoff does not teleport upward');}if(after.mode==='walking')landings++;}
 const mid=interpolate(before,after,.5);assert(Math.abs(mid.x-(before.x+after.x)/2)<1e-10);assert(Math.abs(mid.z-(before.z+after.z)/2)<1e-10);
}
assert(takeoffs>=2&&landings>=2);assert(maxTurn>1&&maxBank>.15,'turning produces a bank');
s.mode='flight';s.z=.1;s.heading=.8;const before=pose(s);s.scare();assert.equal(s.z,before.z,'airborne scare keeps altitude');assert.equal(s.heading,before.heading,'escape begins without an instantaneous rotation');s.step(1/60);assert(Math.abs(s.heading-before.heading)<.11);
const wrapped=interpolate({...pose(s),heading:Math.PI-.1},{...pose(s),heading:-Math.PI+.1},.5);assert(Math.abs(wrapped.heading-Math.PI)<1e-10,'heading interpolation takes the shortest turn');
console.log(JSON.stringify({passed:true,takeoffs,landings,maxBank,maxTurn}));
