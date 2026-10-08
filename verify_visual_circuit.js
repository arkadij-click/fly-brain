const assert=require('node:assert/strict');
const {Circuit,correlate,linear}=require('./visual-circuit');
function eye(){return Array.from({length:135},(_,i)=>{const az=(i%15-7)*.09,el=(Math.floor(i/15)-4)*.09;return {az,el,v:[Math.cos(el)*Math.cos(az),Math.cos(el)*Math.sin(az),Math.sin(el)],known:1,initialized:true,value:.4,rgb:[.5,.5,.5]};});}
const fixed=new Circuit(eye());fixed.step(0);
for(let i=0;i<120;i++)fixed.step(1/60);
assert.equal(fixed.meanMotion,0,'stationary uniform field has no motion');
fixed.eye.forEach(p=>p.value=.8);fixed.step(1/60);
assert.equal(fixed.meanMotion,0,'uniform flash is not directional motion');
assert(fixed.meanBackground>.4&&fixed.meanBackground<.8,'background adapts gradually');
for(let i=0;i<360;i++)fixed.step(1/60);
assert(Math.abs(fixed.meanBackground-.8)<.0001,'adaptation converges');
assert(Math.abs(fixed.contrast[50])<.0001,'contrast step settles');
assert.equal(correlate(.5,0,0,.5),.25);
assert.equal(correlate(.5,0,0,-.5),-.25,'contrast-inverted second stimulus reverses signed correlation');
assert.equal(fixed.uv,null);assert.equal(fixed.polarization,null);
assert.deepEqual(fixed.mosaic,new Circuit(eye()).mosaic,'fixed seeded colour types');
assert(linear(128)<128/255,'decode sRGB before relative light calculations');
function grating(direction,dt){const c=new Circuit(eye());c.step(0);let signed=0,n=0;for(let i=1;i<=Math.round(2/dt);i++){const t=i*dt;c.eye.forEach(p=>p.value=.4+.25*Math.sin(p.az*12-direction*t*8));c.step(dt,'flight');if(t>.7){for(let j=0;j<c.eye.length;j++)if(c.neighbours[j][0]>=0){signed+=c.motion[0][j];n++;}}}return {signed:signed/n,motion:c.meanMotion,background:c.meanBackground};}
const right=grating(1,1/120),left=grating(-1,1/120),fine=grating(1,1/240);
assert(right.signed*left.signed<0,'opposite motion has opposite signed response');
assert(right.motion>0&&left.motion>0,'both directions remain perceptible');
assert(Math.abs(right.signed-fine.signed)<Math.abs(fine.signed)*.1,'motion response converges with timestep');
const millisecond=grating(1,.001),halfMillisecond=grating(1,.0005);
assert(Math.abs(millisecond.signed-halfMillisecond.signed)<Math.abs(halfMillisecond.signed)*.02,'1 ms vs 0.5 ms neurological convergence');
assert(Math.abs(millisecond.background-halfMillisecond.background)<.001,'background converges at 1 ms vs 0.5 ms');
const polarities=new Circuit(eye());polarities.step(0);for(let i=1;i<240;i++){polarities.eye.forEach(p=>p.value=.4+.25*Math.sin(p.az*12-i/120*8));polarities.step(1/120);}
assert(polarities.motionOn.flatMap(x=>[...x]).some(v=>v>0),'ON branch responds to moving positive contrast');
assert(polarities.motionOff.flatMap(x=>[...x]).some(v=>v>0),'OFF branch responds to moving negative contrast');
const {Retina}=require('./vision');const retina=new Retina(require('./eye-map.json'));
const texture={width:64,height:36,data:new Uint8ClampedArray(64*36*4)};for(let i=0;i<64*36;i++)texture.data.set([120,120,120,255],i*4);
retina.room.sample=()=>[120/255,120/255,120/255];
retina.update({x:.5,y:.5,z:0,heading:0,bank:0,light:1},texture,1/60);
const frame=retina.pixels(0,'unified'),view=retina.views[0],row=Math.floor(110/170*view.h);
for(let x=1;x<view.w;x++)if(view.coverage[row*view.w+x]>.999&&view.coverage[row*view.w+x-1]>.999)assert(Math.abs(frame.data[(row*view.w+x)*4]-frame.data[(row*view.w+x-1)*4])<=2,'uniform unified display has no receptor seams');
console.log('PASS: adaptation, static/flash rejection, signed direction, reverse-phi correlation, fixed mosaic, timestep convergence, unified display continuity');


