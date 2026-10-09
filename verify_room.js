const assert=require('node:assert/strict');
const room=require('./room-details');
const {Simulation,surfaces,inside,distance}=require('./simulation');
assert.equal(room.actualTime(new Date('2026-01-07T20:10:00Z')),'21:10');
assert.equal(room.actualTime(new Date('2026-10-07T20:10:00Z')),'22:10');
assert.equal(room.actualTime(new Date('2026-10-07T22:10:00Z')),'00:10');
assert.equal(room.actualTime(new Date('2026-03-29T01:10:00Z')),'03:10');
const s=new Simulation(),apple=s.foods.find(f=>f.photographed&&f.kind==='apple');
assert(apple,'photographed apple is present without placing food');assert.equal(apple.x,.688);assert.equal(apple.y,.453);assert(surfaces.some(surface=>inside(apple,surface.poly)),'apple has a real landing patch');
s.x=.72;s.y=.41;s.z=.04;s.hunger=.8;s.choose();assert.equal(s.target,apple,'the apple attracts a nearby hungry fly');let feeding=false;
for(let i=0;i<30*60;i++){s.step(1/60);if(s.mode==='feeding'&&s.target===apple){feeding=true;assert(distance(s,apple)<.025,'feeding happens on the fruit');break;}}
assert(feeding,'fly lands and feeds on the photographed apple');
console.log('Berlin time, midnight/DST, photographed apple scent, landing surface, and feeding checks passed.');

// Photo calibration: reject the fronts beneath the counter/ledge and empty space beside the table.
const calibrated=new Simulation();
for(const p of [[.52,.55],[.70,.58],[.90,.63],[.55,.805]])assert.equal(calibrated.addFood(...p,'apple'),false,'vertical face or outside tabletop rejects placement');
for(const p of [[.50,.50],[.78,.515],[.50,.93]])assert(calibrated.addFood(...p,'apple'),'horizontal photographed surface accepts placement');
calibrated.hunger=.1;let rests=0;
for(let i=0;i<60;i++){calibrated.choose();if(!calibrated.target){rests++;assert(inside(calibrated.destination,surfaces.find(s=>s.name==='Window ledge').poly),'exploration lands on the ledge instead of the wall below it');}}
assert(rests>0);
console.log('Photo-aligned counter, ledge, table, placement rejection, and resting destinations passed.');
