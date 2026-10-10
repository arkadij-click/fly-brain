const assert=require('node:assert/strict');
const {Simulation,foodTypes}=require('./simulation');
const s=new Simulation(),initial=s.foods.length;
assert.equal(s.addFood(.5,.2,'apple'),false,'wall rejects food');assert.equal(s.addFood(.5,.93,'unknown'),false);assert.equal(s.addFood(NaN,.93),false);assert.equal(s.addFood(-10,.93),false);
for(const [kind,type] of Object.entries(foodTypes)){
 if(type.strength<=0){assert.equal(s.addFood(.5,.93,kind),false,kind+' is placed through the colony, not as food');continue;}
 assert(s.addFood(.5,.93,kind));const f=s.foods.at(-1);assert.equal(f.kind,kind);assert.equal(f.name,type.name);assert.equal(f.strength,type.strength);assert(f.placed);}
const item=s.foods.at(-1);s.target=item;s.destination={...item};s.mode='feeding';assert(s.removeFood(item));assert(s.target!==item&&s.foods.includes(s.target),'removed target is replaced');assert.equal(s.mode,'flight');assert(s.undoFood());assert.equal(s.foods.length,initial+3);assert.equal(s.removeFood(s.foods[0]),false,'original photo sources are retained');
for(let i=0;i<200;i++)assert(s.addFood(.5,.93,'apple'),'food is unlimited');
assert.equal(s.foods.length,initial+203,'every placement is kept');
while(s.undoFood()){}assert.equal(s.foods.length,initial);
const a=new Simulation(),b=new Simulation();a.addFood(.5,.93,'apple');b.addFood(.5,.93,'banana');assert(b.smell(.5,.93)>a.smell(.5,.93),'food types have different scent strengths');
console.log('Typed food placement, scent strengths, invalid surfaces, removal, undo, and capacity checks passed.');
