(function(root){
'use strict';
class AsyncRetina{
 constructor(map){
  this.signal=[0,0];this.views=[{w:160,h:128},{w:160,h:128}];this.frames=this.views.map(v=>{const data=new Uint8ClampedArray(v.w*v.h*4);for(let i=3;i<data.length;i+=4)data[i]=255;return {data,width:v.w,height:v.h};});
  this.worker=new Worker('vision-worker.js?v=fast-room-31');this.pending=null;this.busy=false;this.initialized=false;this.sentTexture=null;
  this.ready=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject;});
  this.worker.onmessage=({data})=>{
   if(data.type==='error'){this.error=new Error(data.message);this.rejectReady(this.error);console.error('Vision worker:',data.message);return;}
   if(data.type==='ready'){this.initialized=true;this.resolveReady();}
   else{this.frames=data.frames;this.signal=data.signal;this.computeMs=data.computeMs;this.busy=false;}
   this.flush();
  };
  this.worker.onerror=error=>{this.error=error;this.rejectReady(error);console.error('Vision worker failed:',error.message);};
  this.worker.postMessage({type:'init',map});
 }
 update(pose,texture,dt){
  // One request in flight, one latest pending pose. Preserve elapsed simulation
  // time for the 1 ms neural solver, without building an unbounded stale queue.
  const elapsed=(this.pending?.dt||0)+Math.max(0,dt);
  this.pending={pose:{x:pose.x,y:pose.y,z:pose.z,heading:pose.heading,bank:pose.bank,light:pose.light,mode:pose.mode,foods:pose.foods},texture,dt:elapsed};this.flush();
 }
 flush(){if(!this.initialized||this.busy||!this.pending||this.error)return;const next=this.pending;this.pending=null;this.busy=true;
  const changed=next.texture!==this.sentTexture;this.sentTexture=next.texture;
  this.worker.postMessage({type:'update',pose:next.pose,dt:next.dt,texture:changed?next.texture:undefined});
 }
 pixels(side){return this.frames[side];}
 dispose(){this.worker.terminate();this.pending=null;}
}
root.FlyVision.AsyncRetina=AsyncRetina;
})(globalThis);
