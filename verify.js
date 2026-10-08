const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Simulation,surfaces,inside}=require('./simulation');
const brain=JSON.parse(fs.readFileSync(__dirname+'/brain.json','utf8'));
assert.equal(brain.inputs.length,7);assert.equal(brain.kernel.length,48);assert.equal(brain.cells.length,640);
assert(brain.input_root_ids.every(g=>g.length>0));assert(brain.output_root_ids.every(g=>g.length>0));
const sim=new Simulation(),history=[];let tick=0,modes=new Set(),maxAlert=0;
for(const food of sim.foods)assert(surfaces.some(s=>inside(food,s.poly)),food.name+' is on a landing surface');
function run(seconds){for(let i=0;i<seconds*60;i++){sim.step(1/60);if(++tick%3===0){history.unshift(sim.inputs.slice());if(history.length>48)history.pop();sim.outputs=[0,1].map(n=>history.reduce((sum,u,k)=>sum+brain.output_kernel[k][n].reduce((v,c,j)=>v+c*u[j],0),0));}for(const key of ['x','y','z','energy','hunger','alert'])assert(Number.isFinite(sim[key]),key);assert(sim.x>=.02&&sim.x<=.98);assert(sim.y>=.08&&sim.y<=.985);assert(sim.energy>=0&&sim.energy<=1);modes.add(sim.mode);maxAlert=Math.max(maxAlert,sim.alert);}}
run(120);assert(sim.landings>=2,'autonomous landings');assert(sim.meals>=1,'autonomous feeding');for(const mode of ['flight','walking','feeding','grooming','resting'])assert(modes.has(mode),mode);
assert.equal(sim.addFood(.5,.2),false,'reject food on wall');assert(sim.addFood(.5,.93),'accept food on table');sim.scare();assert.equal(sim.mode,'flight');assert.equal(sim.alert,1);run(60);assert(maxAlert>.9);assert(sim.z>=0);
const a=new Simulation(),b=new Simulation();for(let i=0;i<600;i++){a.step(1/60);b.step(1/60);}assert.equal(a.x,b.x);assert.equal(a.y,b.y);
assert(fs.readFileSync(__dirname+'/kitchen.jpg').length>100000);
console.log(JSON.stringify({passed:true,seconds:sim.time,landings:sim.landings,meals:sim.meals,modes:[...modes],brainNeurons:brain.neurons,edges:brain.edges}));
