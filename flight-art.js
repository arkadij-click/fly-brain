(function(root){
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function pose(s){return {x:s.x,y:s.y,z:s.z,heading:s.heading,time:s.time,mode:s.mode,bank:s.bank||0,verticalSpeed:s.verticalSpeed||0,landingBlend:s.landingBlend||0,touchdown:s.touchdown||0,age:s.age};}
function interpolate(a,b,t){t=clamp(t);const p={...b};for(const key of ['x','y','z','time','bank','verticalSpeed','landingBlend','touchdown'])p[key]=a[key]+(b[key]-a[key])*t;const turn=Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading));p.heading=a.heading+turn*t;return p;}
function ellipse(c,x,y,rx,ry,color,angle=0,stroke){c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.55;c.stroke();}}
function draw(c,x,y,size,angle,time,mode,p={}){
 const flying=mode==='flight',walking=mode==='walking',grooming=mode==='grooming',bank=p.bank||0,reach=flying?.23+.77*(p.landingBlend||0):1;
 c.save();c.translate(x,y);c.rotate(angle+Math.PI/2);c.scale(size/40,size/40);c.transform(1-Math.abs(bank)*.3,0,bank*.12,1,0,0);if(!flying)c.scale(1,1-(p.touchdown||0)*.08);
 // Six articulated legs tuck back in flight and reach toward the landing surface.
 c.lineCap='round';for(const side of [-1,1])for(let i=0;i<3;i++){
  const gait=walking?Math.sin(time*29+i*2.1+side*1.4)*3:0,groom=grooming&&i===0?Math.sin(time*22)*5:0;
  const y0=-7+i*7,tipX=side*(9+10*reach)+gait*.4,tipY=y0+(i-1)*10*reach+(1-reach)*13+gait+groom;
  c.strokeStyle='#27251c';c.lineWidth=1.2;c.beginPath();c.moveTo(side*4,y0);c.lineTo(side*(8+reach*4),y0-4+gait*.5);c.lineTo(tipX,tipY);c.stroke();
  c.strokeStyle='#807961';c.lineWidth=.45;c.beginPath();c.moveTo(side*(8+reach*4),y0-4+gait*.5);c.lineTo(tipX,tipY);c.stroke();
  c.strokeStyle='#302c22';c.lineWidth=.55;c.beginPath();c.moveTo(tipX,tipY);c.lineTo(tipX+side*2,tipY+2);c.stroke();
 }
 const abdomen=c.createLinearGradient(-7,0,7,0);abdomen.addColorStop(0,'#282a20');abdomen.addColorStop(.4,'#716c4f');abdomen.addColorStop(1,'#383c2b');ellipse(c,0,10,6.1,11.6,abdomen);
 for(let j=0;j<4;j++){c.strokeStyle='#24261bbf';c.lineWidth=1.2;c.beginPath();c.ellipse(0,4+j*4,5.7-j*.45,1.5,0,0,Math.PI);c.stroke();}
 // Integrate several wing positions across a shutter interval instead of a slow flap.
 for(const side of [-1,1]){
  const wing=(spread,alpha,veins)=>{c.save();c.globalAlpha=alpha;c.translate(side*4,-4);c.rotate(side*spread);ellipse(c,side*6.5,10,6.5,19,'#deead5',side*-.18,'#a5b8a8');if(veins){c.strokeStyle='#6f8d7e';c.lineWidth=.5;for(let j=0;j<3;j++){c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(side*(4+j*2),10,side*(4+j*3),24-j*2);c.stroke();}c.beginPath();c.moveTo(side*3,11);c.lineTo(side*10,15);c.moveTo(side*5,17);c.lineTo(side*9,22);c.stroke();}c.restore();};
  if(flying){for(let j=0;j<6;j++){const phase=(time-j*.0018)*Math.PI*2*185;wing(.9+Math.sin(phase)*.68,.055,false);}wing(.9+Math.sin(time*Math.PI*2*185)*.6,.20,true);}else wing(.13+.02*Math.sin(time*3),.42,true);
 }
 const thorax=c.createRadialGradient(-2,-4,1,0,-1,10);thorax.addColorStop(0,'#8d8d70');thorax.addColorStop(.6,'#535c45');thorax.addColorStop(1,'#292e24');ellipse(c,0,-1,6.8,8.6,thorax);
 c.strokeStyle='#d2cbaa45';c.lineWidth=.4;for(let i=0;i<9;i++){const a=i*2.4;c.beginPath();c.moveTo(Math.sin(a)*5,-2+Math.cos(a)*6);c.lineTo(Math.sin(a)*8,-2+Math.cos(a)*9);c.stroke();}
 ellipse(c,0,-13,6.5,5,'#34392a');for(const side of [-1,1]){ellipse(c,side*4.7,-14,3.4,4.1,'#a85231',side*.17);ellipse(c,side*5.3,-15.3,1.3,2.1,'#d88d5966');c.fillStyle='#652c2155';for(let j=0;j<5;j++)for(let k=0;k<3;k++){c.beginPath();c.arc(side*4.7+(k-1)*1.4,-17+j*1.4,.35,0,Math.PI*2);c.fill();}}
 c.strokeStyle='#6d674b';c.lineWidth=.7;for(const side of [-1,1]){c.beginPath();c.moveTo(side*2,-17);c.lineTo(side*3,-21);c.lineTo(side*5,-22+Math.sin(time*8)*.5);c.stroke();}
 if(mode==='feeding'){c.strokeStyle='#685039';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-17);c.lineTo(0,-22-Math.sin(time*12));c.stroke();ellipse(c,0,-23-Math.sin(time*12),1.8,.9,'#806048');}
 c.restore();
}
const api={draw,pose,interpolate};if(typeof module!=='undefined')module.exports=api;else root.FlightArt=api;
})(typeof globalThis!=='undefined'?globalThis:this);
