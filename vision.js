(function(root){
'use strict';
const rad=Math.PI/180,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const neural=typeof module!=='undefined'?require('./visual-circuit'):root.FlyVisualCircuit;
const geometry=typeof module!=='undefined'?require('./room-geometry'):root.FlyRoom;
const direction=(az,el)=>[Math.cos(el)*Math.cos(az),Math.cos(el)*Math.sin(az),Math.sin(el)];
function rotate(v,pose){const c=Math.cos(pose.heading||0),s=Math.sin(pose.heading||0),cb=Math.cos(pose.bank||0),sb=Math.sin(pose.bank||0),y=v[1]*cb-v[2]*sb,z=v[1]*sb+v[2]*cb;return [v[0]*c-y*s,v[0]*s+y*c,z];}
// Scene geometry and capture are independent of the human display. Depth never
// enters the visual brain input; it only decides visible surface and occlusion.
class Retina{
 constructor(map){
  this.room=new geometry.Room();this.time=0;this.signal=[0,0];
  const sigma=neural.profile.angularFwhmDegrees/2.354820045*rad;
  this.eyes=map.eyes.map(points=>points.map(([az,el],id)=>{
   const v=direction(az,el),a=[-Math.sin(az),Math.cos(az),0],b=[-Math.sin(el)*Math.cos(az),-Math.sin(el)*Math.sin(az),Math.cos(el)];
   // Normalized equal-solid-angle cone quadrature; no latitude-grid bias.
   const taps=[{v,w:1}];for(let j=0;j<8;j++){const angle=j*Math.PI/4,r=sigma*1.7;taps.push({v:v.map((x,k)=>x*Math.cos(r)+(a[k]*Math.cos(angle)+b[k]*Math.sin(angle))*Math.sin(r)),w:Math.exp(-(1.7**2)/2)});}
   return {id,az,el,v,taps,known:1,initialized:false,value:0,rgb:[0,0,0],linearRGB:[0,0,0],capture:[0,0,0],tapWeight:taps.reduce((sum,t)=>sum+t.w,0),change:0};
  }));
  this.circuits=this.eyes.map((eye,i)=>new neural.Circuit(eye,i));this.views=this.eyes.map((eye,i)=>this.makeView(eye,i));
 }
 makeView(eye,side){
  const w=160,h=128,start=side===0?-165:-10,end=side===0?10:165,n=w*h,coverage=new Float32Array(n),indices=new Uint16Array(n*6),weights=new Float32Array(n*6),rays=new Float32Array(n*3);
  // Smooth spherical interpolation only for visualization. No thresholded
  // receptor bins, missing-plane strips, artificial facet borders or tiling.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const v=direction((start+(end-start)*(x+.5)/w)*rad,(90-160*(y+.5)/h)*rad),i=y*w+x; rays.set(v,i*3);
   const best=[];for(let j=0;j<eye.length;j++){const p=eye[j],d=p.v[0]*v[0]+p.v[1]*v[1]+p.v[2]*v[2];if(best.length<6||d>best[5][0]){best.push([d,j]);best.sort((a,b)=>b[0]-a[0]);if(best.length>6)best.pop();}}
   const distance=Math.acos(clamp(best[0][0],-1,1))/rad;coverage[i]=clamp((9-distance)/4);let total=0;
   for(let k=0;k<6;k++){const a=Math.acos(clamp(best[k][0],-1,1))/rad,weight=Math.exp(-a*a/(2*4*4));indices[i*6+k]=best[k][1];weights[i*6+k]=weight;total+=weight;}for(let k=0;k<6;k++)weights[i*6+k]/=total||1;
  }
  return {w,h,start,end,coverage,indices,weights,rays};
 }
 update(pose,texture,dt){
  if(!texture)return;this.fly={...pose};this.texture=texture;this.room.setFoods(pose.foods);const origin=this.room.pose(pose),tau=.012+.018*(1-clamp(pose.light??1)),alpha=dt>0?1-Math.exp(-dt/tau):0;this.time+=Math.max(0,dt);
  const captureKey=[...origin,pose.heading||0,pose.bank||0,pose.light??1,this.room.foodKey].join('|'),reuse=this.captureKey===captureKey&&this.captureTexture===texture;
  const c=Math.cos(pose.heading||0),s=Math.sin(pose.heading||0),cb=Math.cos(pose.bank||0),sb=Math.sin(pose.bank||0),ray=[0,0,0],sample=[0,0,0];
  this.captureKey=captureKey;this.captureTexture=texture;
  for(let side=0;side<2;side++){
   for(const p of this.eyes[side]){
    const rgb=p.capture;
    if(!reuse){rgb.fill(0);for(const tap of p.taps){const v=tap.v,y=v[1]*cb-v[2]*sb;ray[0]=v[0]*c-y*s;ray[1]=v[0]*s+y*c;ray[2]=v[1]*sb+v[2]*cb;const hit=this.room.trace(origin,ray);if(!hit)throw new Error('Closed room ray escaped');const sampled=this.room.sample(hit,texture,1,sample);for(let k=0;k<3;k++)rgb[k]+=neural.linear(sampled[k]*255)*(pose.light??1)*tap.w;}for(let k=0;k<3;k++)rgb[k]/=p.tapWeight;}
    for(let k=0;k<3;k++){const target=rgb[k];p.linearRGB[k]=p.initialized?p.linearRGB[k]+alpha*(target-p.linearRGB[k]):target;p.rgb[k]=neural.encode(p.linearRGB[k]);}
    const old=p.value;p.value=.1*p.linearRGB[0]+.55*p.linearRGB[1]+.35*p.linearRGB[2];p.change=p.initialized&&dt>0?(p.value-old)/dt:0;p.initialized=true;p.known=1;
   }
   const circuit=this.circuits[side];circuit.step(dt,pose.mode==='flight'?'flight':pose.mode==='walking'?'walking':'rest');this.signal[side]=clamp(.7*circuit.mean+.3*circuit.meanMotion);
  }
 }
 pixels(side,mode='unified'){
  const view=this.views[side],eye=this.eyes[side],circuit=this.circuits[side],data=new Uint8ClampedArray(view.w*view.h*4);
  for(let i=0;i<view.w*view.h;i++){
   let value=0,blue=0,green=0,blueWeight=0,greenWeight=0,motion=0,background=0;
   for(let k=0;k<6;k++){const j=view.indices[i*6+k],weight=view.weights[i*6+k],p=eye[j];value+=p.value*weight;background+=circuit.background[j]*weight;if(circuit.mosaic[j]==='pale'){blue+=circuit.r8[j]*weight;blueWeight+=weight;}else{green+=circuit.r8[j]*weight;greenWeight+=weight;}motion+=circuit.energy[j]*weight;}
   // Interpolate available colour samples across the mosaic, never synthesize
   // both inner receptor types in each column or a red-to-UV substitution.
   blue=blueWeight>.03?blue/blueWeight:value;green=greenWeight>.03?green/greenWeight:value;
   const tonic=clamp(Math.log1p(value/(.035+circuit.meanBackground))/Math.log(3.5)),contrast=Math.log((value+.02)/(background+.02)),opponent=clamp((blue-green)/(blue+green+.04),-1,1),base=24+205*tonic+clamp(contrast,-1,1)*10+clamp(motion*5)*12,cov=view.coverage[i];
   const color=[base*(1-.12*Math.max(0,opponent)),base,base*(1-.12*Math.max(0,-opponent))];
   for(let k=0;k<3;k++)data[i*4+k]=color[k]*cov+10*(1-cov);data[i*4+3]=255;
  }
  return {data,width:view.w,height:view.h};
 }
}
const api={Retina,rotate,direction,Room:geometry.Room};if(typeof module!=='undefined')module.exports=api;else root.FlyVision=api;
})(typeof globalThis!=='undefined'?globalThis:this);
