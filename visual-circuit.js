(function(root){
'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
// Interpolate a dense transfer table instead of evaluating powers for every ray.
const transfer=new Float64Array(4097);for(let i=0;i<=4096;i++){const s=i/4096;transfer[i]=s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}
const linear=byte=>{const x=clamp(byte/255)*4096,i=Math.min(4095,Math.floor(x));return transfer[i]+(transfer[i+1]-transfer[i])*(x-i);};
const encode=x=>x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055;
const correlate=(da,a,db,b)=>da*b-a*db;
const parameters={
 angularFwhmDegrees:{value:8.23,unit:'degrees FWHM',status:'empirical nearly dark-adapted R1–R6',source:'Gonzalez-Bellido 2011; supplied review p22'},
 photoSeconds:{value:[.012,.030],unit:'seconds',status:'engineering light-dependent range',source:'review p22 prototype; not fitted'},
 backgroundSeconds:{value:.6,unit:'seconds',status:'engineering',source:'review p22 adaptation prototype'},
 delaySeconds:{value:{rest:.035,walking:.027,flight:.018},unit:'seconds',status:'engineering context dependence',source:'review p23 correlation prototype; not fitted T4/T5'},
 relativeRegularizer:{value:.02,unit:'relative linear RGB capture',status:'engineering',source:'review p22 q0'},
 broadbandWeights:{value:[.1,.55,.35],unit:'linear RGB relative capture weights',status:'engineering visible-band proxy; not measured Rh1 spectrum',source:'RGB source limitation; review p21–22'},
 angularQuadrature:{value:{center:1,ring:8,ringSigma:1.7},unit:'normalized cone samples, ring radius in sigma',status:'engineering numerical approximation',source:'review p22 angular integration'},
 displayInterpolation:{value:{nearest:6,sigmaDegrees:4},unit:'columns and degrees',status:'engineering continuous visualization',source:'human display only'},
 mosaic:{value:.3,unit:'fraction pale',status:'seeded population approximation',source:'review p24–25'},
 geometry:{value:'room width = 1',unit:'room-width units; angles radians',status:'authored approximate geometry, not measured reconstruction',source:'photo surface anchors'},
 solver:{value:.001,unit:'seconds maximum neural substep',status:'software setting',source:'review p27; convergence tested'},
 display:{value:30,unit:'Hz target refresh',status:'software setting, not fly FPS',source:'app render loop'}
};
const profile={name:'closed-room-relative-vision-v2',species:'Drosophila melanogaster',stage:'adult',sex:'female optical map',angularFwhmDegrees:8.23,parameters,mosaicSeed:783,paleFraction:.3,absolutePhotons:false,uvAvailable:false,polarizationAvailable:false,retinalMotion:'disabled baseline',depthToController:false,outerChannel:'pooled R1–R6 proxy; no six-cell superposition reconstruction'};
function neighbours(eye){return eye.map((p,i)=>{const az=[-Math.sin(p.az),Math.cos(p.az),0],el=[-Math.sin(p.el)*Math.cos(p.az),-Math.sin(p.el)*Math.sin(p.az),Math.cos(p.el)],found=Array(4).fill(-1),score=Array(4).fill(Infinity);
 for(let j=0;j<eye.length;j++){if(i===j)continue;const q=eye[j],dot=clamp(p.v[0]*q.v[0]+p.v[1]*q.v[1]+p.v[2]*q.v[2],-1,1),angle=Math.acos(dot);if(angle<.035||angle>.23)continue;const length=Math.sin(angle),x=(q.v[0]*az[0]+q.v[1]*az[1]+q.v[2]*az[2])/length,y=(q.v[0]*el[0]+q.v[1]*el[1]+q.v[2]*el[2])/length;[x,-x,y,-y].forEach((align,d)=>{if(align<.75)return;const cost=angle/align**4;if(cost<score[d]){score[d]=cost;found[d]=j;}});}
 return found;});}
class Circuit{
 constructor(eye,side=0){this.eye=eye;this.neighbours=neighbours(eye);const n=eye.length;for(const name of ['background','contrast','delayed','on','off','delayedOn','delayedOff','energy','r8','previousInput','input'])this[name]=new Float64Array(n);this.initialized=new Uint8Array(n);this.motion=Array.from({length:4},()=>new Float64Array(n));this.motionOn=Array.from({length:4},()=>new Float64Array(n));this.motionOff=Array.from({length:4},()=>new Float64Array(n));let seed=783+side;this.mosaic=eye.map(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296<.3?'pale':'yellow';});this.uv=null;this.polarization=null;this.mean=.1;this.meanBackground=.1;this.meanMotion=0;}
 step(dt,state='rest'){
  const steps=Math.max(1,Math.ceil(Math.max(0,dt)/.001)),h=Math.max(0,dt)/steps,ba=1-Math.exp(-h/.6),da=1-Math.exp(-h/(parameters.delaySeconds.value[state]||.035)),n=this.eye.length;
  for(let i=0;i<n;i++)if(!this.initialized[i]){const p=this.eye[i];this.background[i]=this.previousInput[i]=p.value;this.initialized[i]=1;}
  for(let s=0;s<steps;s++){
   let sum=0,bsum=0,energy=0;
   for(let i=0;i<n;i++){const p=this.eye[i],u=this.previousInput[i]+(p.value-this.previousInput[i])*(s+1)/steps;this.input[i]=u;this.contrast[i]=clamp(Math.log((u+.02)/(this.background[i]+.02)),-2,2);this.on[i]=Math.max(0,this.contrast[i]);this.off[i]=Math.max(0,-this.contrast[i]);this.r8[i]=this.mosaic[i]==='pale'?(p.linearRGB?.[2]??linear(p.rgb[2]*255)):(p.linearRGB?.[1]??linear(p.rgb[1]*255));this.energy[i]=0;sum+=u;}
   for(let i=0;i<n;i++)for(let d=0;d<4;d++){const j=this.neighbours[i][d],raw=j<0?0:correlate(this.delayed[i],this.contrast[i],this.delayed[j],this.contrast[j]);this.motion[d][i]=raw;this.motionOn[d][i]=j<0?0:Math.max(0,correlate(this.delayedOn[i],this.on[i],this.delayedOn[j],this.on[j]));this.motionOff[d][i]=j<0?0:Math.max(0,correlate(this.delayedOff[i],this.off[i],this.delayedOff[j],this.off[j]));this.energy[i]+=Math.abs(raw)/4;}
   for(let i=0;i<n;i++){this.background[i]+=ba*(this.input[i]-this.background[i]);this.delayed[i]+=da*(this.contrast[i]-this.delayed[i]);this.delayedOn[i]+=da*(this.on[i]-this.delayedOn[i]);this.delayedOff[i]+=da*(this.off[i]-this.delayedOff[i]);bsum+=this.background[i];energy+=this.energy[i];}
   this.mean=sum/n;this.meanBackground=bsum/n;this.meanMotion=energy/n;
  }
  for(let i=0;i<n;i++)this.previousInput[i]=this.eye[i].value;
 }
}
const api={Circuit,profile,parameters,linear,encode,correlate,neighbours};if(typeof module!=='undefined')module.exports=api;else root.FlyVisualCircuit=api;
})(typeof globalThis!=='undefined'?globalThis:this);
