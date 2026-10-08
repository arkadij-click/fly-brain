const assert=require('node:assert/strict');
const {Retina,Room,direction,rotate}=require('./vision');
const {Simulation}=require('./simulation');
const map=require('./eye-map.json'),rad=Math.PI/180,room=new Room();
assert.deepEqual(map.eyes.map(x=>x.length),[857,852]);
const retina=new Retina(map);
for(const eye of retina.eyes){const eq=eye.filter(p=>Math.abs(p.el)<5*rad);assert(eq.some(p=>Math.abs(p.az)>130*rad));assert(!eq.some(p=>Math.abs(p.az)>170*rad));assert(eye.some(p=>p.el>80*rad));for(const p of eye)assert(Math.abs(Math.hypot(...p.v)-1)<1e-6);}
let rays=0;const materials=new Set();
for(const xy of [[.02,.09],[.32,.42],[.14,.53],[.70,.456],[.515,.43],[.535,.966],[.98,.985]])for(const z of [0,.06,.2,.37])for(const heading of [-3,-1,0,1,3])for(const bank of [-.65,0,.65]){
 const pose={x:xy[0],y:xy[1],z,heading,bank},o=room.pose(pose);for(let az=-180;az<180;az+=15)for(let el=-90;el<=90;el+=15){const hit=room.trace(o,rotate(direction(az*rad,el*rad),pose));assert(hit&&Number.isFinite(hit.t)&&hit.t>0,'closed room covers all angular directions');assert(hit.point.every(Number.isFinite));materials.add(hit.material);rays++;}
}
for(const material of ['ceiling','floor','back','front','left','window','anchor','object'])assert(materials.has(material),'ray sweep visits '+material);
const o=[.355,.51*.5625,.40],hit=room.trace(o,[0,0,-1]);assert.equal(hit.id,'cooking-pot','nearest vessel occludes counter');assert(hit.t<.14);
const p={x:.32,y:.42,z:.12,heading:0,bank:0,light:1},texture={width:64,height:36,data:new Uint8ClampedArray(64*36*4)};for(let y=0;y<36;y++)for(let x=0;x<64;x++)texture.data.set([x*4,y*7,80,255],(y*64+x)*4);
retina.update(p,texture,0);const initial=retina.eyes.map(e=>e.map(p=>p.value));retina.update(p,texture,1/60);assert(retina.eyes.flat().every(p=>Math.abs(p.change)<1e-8),'static textured room has zero temporal change');
retina.update({...p,heading:1},texture,1/60);assert(retina.eyes[0].some((q,i)=>Math.abs(q.value-initial[0][i])>.01),'rotation changes visible room');
const rotated=retina.eyes[0].map(q=>q.value);retina.update({...p,x:.75,z:.02},texture,1/60);assert(retina.eyes[0].some((q,i)=>Math.abs(q.value-rotated[i])>.01),'translation and altitude change visible geometry');
assert(retina.eyes.flat().every(q=>q.known===1),'all measured rays have authored scene capture');
const sim=new Simulation();sim.visualSignal=retina.signal.slice();sim.sense();assert.deepEqual(sim.inputs.slice(2,4),retina.signal);
console.log('PASS measured axes and blind field, '+rays+' closed-room rays across pose/height/bank, floor/walls/ceiling, appliance occlusion, viewpoint changes, static input, brain integration');
