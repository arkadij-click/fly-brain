const assert=require('node:assert/strict');
const {FollowCamera}=require('./camera');
const camera=new FollowCamera();
const fly={x:.64,y:.72,z:.1,heading:.2};
for(let i=0;i<180;i++)camera.update(fly,1/60,true,3);
let screen=camera.worldToScreen(fly.x,fly.y-fly.z);
assert(Math.abs(screen.x-.5)<1e-6);assert(Math.abs(screen.y-.5)<1e-6);
for(const zoom of [1,1.5,3,6])for(const x of [.02,.5,.98])for(const y of [.08,.5,.985]){
 for(let i=0;i<160;i++)camera.update({x,y,z:0},1/60,zoom!==1,zoom);
 const b=camera.bounds;assert(b.x>=-1e-10&&b.y>=-1e-10);assert(b.x+b.width<=1+1e-10&&b.y+b.height<=1+1e-10);
 const p=camera.worldToScreen(x,y),q=camera.screenToWorld(p.x,p.y);assert(Math.abs(q.x-x)<1e-12&&Math.abs(q.y-y)<1e-12,'food / pointer coordinates round trip');
}
console.log('Camera tracking, bounded crops, and pointer mapping passed.');
