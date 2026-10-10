const assert=require('node:assert/strict');
const room=require('./room-details');
const {Simulation,surfaces,inside,distance}=require('./simulation');
assert.equal(room.actualTime(new Date('2026-01-07T20:10:00Z')),'21:10');
assert.equal(room.actualTime(new Date('2026-10-07T20:10:00Z')),'22:10');
assert.equal(room.actualTime(new Date('2026-10-07T22:10:00Z')),'00:10');
assert.equal(room.actualTime(new Date('2026-03-29T01:10:00Z')),'03:10');
const s=new Simulation(),apple=s.foods.find(f=>f.photographed&&f.kind==='apple');
assert(apple,'photographed apple is present without placing food');assert.equal(apple.x,.227);assert.equal(apple.y,.525);assert(surfaces.some(surface=>inside(apple,surface.poly)),'apple has a real landing patch');
s.x=.35;s.y=.45;s.z=.04;s.hunger=.8;s.choose();assert.equal(s.target,apple,'the apple attracts a nearby hungry fly');let feeding=false;
for(let i=0;i<30*60;i++){s.step(1/60);if(s.mode==='feeding'&&s.target===apple){feeding=true;assert(distance(s,apple)<.025,'feeding happens on the fruit');break;}}
assert(feeding,'fly lands and feeds on the photographed apple');
console.log('Berlin time, midnight/DST, photographed apple scent, landing surface, and feeding checks passed.');

// Photo calibration: reject the fronts beneath the counter/ledge and empty space beside the table.
const calibrated=new Simulation();
for(const p of [[.30,.30],[.80,.60],[.76,.90],[.10,.75]])assert.equal(calibrated.addFood(...p,'apple'),false,'wall or vertical face rejects placement');
for(const p of [[.25,.50],[.80,.52],[.50,.70],[.25,.125]])assert(calibrated.addFood(...p,'apple'),'horizontal photographed surface accepts placement');
calibrated.hunger=.1;let rests=0;
for(let i=0;i<60;i++){calibrated.choose();if(!calibrated.target){rests++;assert(inside(calibrated.destination,surfaces.find(s=>s.name==='Window sill').poly),'exploration lands on the ledge instead of the wall below it');}}
assert(rests>0);
console.log('Photo-aligned counter, ledge, table, placement rejection, and resting destinations passed.');
