(function(root){
'use strict';
const room=typeof module!=='undefined'?require('./room-details'):root.RoomDetails;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*.5625);
const foodTypes={apple:{name:'Apple piece',icon:'🍎',strength:1.3,feedRate:.11},banana:{name:'Banana peel',icon:'🍌',strength:1.8,feedRate:.09},berry:{name:'Strawberry',icon:'🍓',strength:1.5,feedRate:.12},crumbs:{name:'Bread crumbs',icon:'🍞',strength:.65,feedRate:.07},juice:{name:'Juice drop',icon:'🧃',strength:1.7,feedRate:.13}};
// Hand-traced against the 4032 × 2268 kitchen photo, in normalized image coordinates.
// Front edges stop at the horizontal surface, not the appliance faces below it.
const surfaces=[
 {name:'Counter',poly:[[0,.566],[.283,.490],[.575,.460],[.576,.496],[0,.704]]},
 {name:'Window ledge',poly:[[.554,.430],[1,.569],[1,.610],[.554,.466]]},
 {name:'Table',poly:[[.321,1],[.359,.921],[.415,.842],[.488,.814],[.532,.809],[.640,.838],[.718,.890],[.806,1]]}
];
surfaces.push(room.appleSurface);
function inside(p,poly){let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;}
class Simulation{
 constructor(seed=783){this.seed=seed;this.time=0;this.energy=.8;this.hunger=.7;this.alert=0;this.x=.32;this.y=.42;this.z=.12;this.vx=.04;this.vy=0;this.heading=0;this.mode='flight';this.age=0;this.airtime=0;this.landings=0;this.meals=0;this.travel=0;this.sinceMeal=0;this.events=[];this.trail=[];this.foods=[{name:'Fruit on the counter',x:.140,y:.530,strength:1},{...room.apple},{name:'Crumbs on the plate',x:.535,y:.966,strength:.9}];this.target=this.foods[0];this.destination={...this.target};this.inputs=Array(7).fill(0);this.outputs=[0,0];this.light=.7;this.wind=.15;this.escape=0;this.layAt=2;this.onLay=null;this.note('A new fly enters the kitchen.');}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 note(message){this.events.unshift({time:this.time,message});this.events.length=Math.min(3,this.events.length);}
 transition(mode){this.mode=mode;this.age=0;}
 choose(){let best=-Infinity;for(const f of this.foods){const score=f.strength/(.12+distance(this,f))*(this.hunger+.1)+this.random()*.18;if(score>best){best=score;this.target=f;}}this.destination={...this.target};if(this.hunger<.28&&this.random()<.75){const x=.58+this.random()*.32;this.destination={x,y:.448+(x-.554)*.317};this.target=null;}}
 addFood(x,y,kind='apple'){const type=foodTypes[kind],p={x,y};if(!type||!Number.isFinite(x)||!Number.isFinite(y)||x<.02||x>.98||y<.02||y>.99||!surfaces.some(s=>inside(p,s.poly))||this.foods.length>=23)return false;this.foods.push({...p,...type,kind,placed:true,id:'food-'+this.time+'-'+this.foods.length});this.choose();if(this.mode!=='flight')this.takeoff();this.note(type.name+' placed — a new scent.');return true;}
 removeFood(food){const index=this.foods.indexOf(food);if(index<0||!food.placed)return false;this.foods.splice(index,1);if(this.target===food){this.choose();if(this.mode!=='flight')this.takeoff();}this.note(food.name+' removed.');return true;}
 undoFood(){return this.removeFood([...this.foods].reverse().find(f=>f.placed));}
 takeoff(){const airborne=this.mode==='flight';this.transition('flight');if(!airborne){this.vx=Math.cos(this.heading)*.008;this.vy=Math.sin(this.heading)*.008;this.verticalSpeed=0;}this.landingBlend=0;}
 scare(x=this.x,y=this.y){const dx=this.x-x,dy=(this.y-y)*.5625;this.escapeHeading=Math.hypot(dx,dy)<.005?this.heading+(this.random()<.5?-1:1)*(1.1+this.random()):Math.atan2(dy,dx);this.alert=1;this.escape=1.5;this.takeoff();this.note('Startled — a fast escape turn.');}
 smell(x,y){return clamp(this.foods.reduce((v,f)=>v+f.strength*Math.exp(-distance({x,y},f)*6)*.4,0));}
 sense(){const side={x:-Math.sin(this.heading)*.022,y:Math.cos(this.heading)*.022/.5625};const l=this.smell(this.x+side.x,this.y+side.y),r=this.smell(this.x-side.x,this.y-side.y);const left=this.visualSignal?.[0]??clamp(this.light*(.15+.7*this.x)+this.alert*.5),right=this.visualSignal?.[1]??clamp(this.light*(.15+.7*(1-this.x))+this.alert*.5);const touch=this.mode==='flight'?this.wind*.2:.55;this.inputs=[l,r,left,right,clamp(touch+this.alert*.6),clamp(touch+this.alert*.6),this.mode==='feeding'?1:0];return this.inputs;}
 step(dt){dt=Math.min(dt,.05);this.time+=dt;this.age+=dt;this.sinceMeal+=dt;this.alert=Math.max(0,this.alert-dt*.38);this.escape=Math.max(0,this.escape-dt);this.hunger=clamp(this.hunger+dt*.004);const previous={x:this.x,y:this.y};
 if(this.mode==='flight'){
  this.airtime+=dt;this.energy=clamp(this.energy-dt*.009);
  let dx=this.destination.x-this.x,dy=(this.destination.y-this.y)*.5625,d=Math.hypot(dx,dy);
  let desired=Math.atan2(dy,dx);if(this.escape>0)desired=this.escapeHeading??this.heading;
  const turn=Math.atan2(Math.sin(desired-this.heading),Math.cos(desired-this.heading));
  const neural=clamp((this.outputs[1]-this.outputs[0])*5,-.35,.35);
  const weave=d>.065&&this.escape===0?Math.sin(this.time*3.7)*.28+Math.sin(this.time*8.1)*.12:0;
  const turnLimit=this.escape>0?6:3.8;
  this.turnRate=(this.turnRate||0)+(clamp(turn*5+neural+weave,-turnLimit,turnLimit)-(this.turnRate||0))*(1-Math.exp(-dt*12));
  this.heading+=this.turnRate*dt;
  this.bank=(this.bank||0)+(clamp(this.turnRate*.16,-.65,.65)-(this.bank||0))*(1-Math.exp(-dt*9));
  const launch=clamp(this.age/.45),speed=(this.escape>0?.32:Math.min(.14,Math.max(.008,d*.85)))*(.2+.8*launch);
  const desiredVx=Math.cos(this.heading)*speed+Math.sin(this.time*.8)*this.wind*.015,desiredVy=Math.sin(this.heading)*speed;
  this.vx+=(desiredVx-this.vx)*(1-Math.exp(-dt*7));this.vy+=(desiredVy-this.vy)*(1-Math.exp(-dt*7));
  this.x+=this.vx*dt;this.y+=this.vy*dt/.5625;
  const bob=d>.07?.0025*Math.sin(this.time*11)+.0015*Math.sin(this.time*17):0;
  let altitude=this.escape>0?.15:Math.min(.105,d*.45)+bob;
  this.verticalSpeed=(this.verticalSpeed||0)+(altitude-this.z)*36*dt-(this.verticalSpeed||0)*10*dt;
  this.z=Math.max(0,this.z+this.verticalSpeed*dt);
  this.landingBlend=this.escape>0?0:clamp(1-d/.055);
  this.flightStage=this.escape>0?'escape':this.age<.45?'takeoff':this.landingBlend>.3?'landing':'cruise';
  if(this.x<.02||this.x>.98||this.y<.08||this.y>.985){const wallX=this.x<.02||this.x>.98;this.x=clamp(this.x,.02,.98);this.y=clamp(this.y,.08,.985);if(wallX)this.vx*=.2;else this.vy*=.2;this.escapeHeading=wallX?Math.PI-this.heading:-this.heading;this.escape=.35;}
  if(d<.008&&this.escape===0&&this.z<.006&&Math.hypot(this.vx,this.vy)<.03){this.x=this.destination.x;this.y=this.destination.y;this.z=0;this.vx=this.vy=this.verticalSpeed=0;this.landings++;this.touchdown=1;this.transition('walking');this.note('Landed on '+(this.target?this.target.name.toLowerCase():'the window ledge')+'.');}
 }else{
  this.energy=clamp(this.energy+dt*.02);this.z=0;this.bank=(this.bank||0)*Math.exp(-dt*10);this.turnRate=(this.turnRate||0)*Math.exp(-dt*10);this.touchdown=Math.max(0,(this.touchdown||0)-dt*4);
  if(this.mode==='walking'){this.heading+=Math.sin(this.time*5)*dt;const nx=this.x+Math.cos(this.heading)*.006*dt,ny=this.y+Math.sin(this.heading)*.006*dt/.5625;if(surfaces.some(s=>inside({x:nx,y:ny},s.poly))){this.x=nx;this.y=ny;}else this.heading+=Math.PI*dt;if(this.age>2){this.transition(this.target&&this.hunger>.25?'feeding':'grooming');if(this.mode==='feeding'){this.meals++;this.sinceMeal=0;this.note('Tasting and feeding.');}}}
  if(this.mode==='feeding'){this.hunger=clamp(this.hunger-dt*(this.target?.feedRate||.11));if(this.age>5.5){if(this.meals>=this.layAt){this.layAt=this.meals+2+Math.floor(this.random()*2);this.readyToLay=true;}this.transition('grooming');if(this.readyToLay){this.readyToLay=false;this.onLay&&this.onLay(this.x,this.y);}}}
  if(this.mode==='grooming'&&this.age>3.2)this.transition('resting');
  if(this.mode==='resting'&&this.age>3.5){this.choose();this.takeoff();this.note(this.target?'Taking off toward '+this.target.name.toLowerCase()+'.':'Exploring the window.');}
 }
 this.travel+=distance(this,previous);this.sense();if(!this.trail.length||this.time-this.trail[this.trail.length-1].t>.12){this.trail.push({x:this.x,y:this.y-this.z,t:this.time});if(this.trail.length>450)this.trail.shift();}
 }
}
if(typeof module!=='undefined')module.exports={Simulation,surfaces,inside,distance,foodTypes};else root.Kitchen={Simulation,surfaces,inside,distance,foodTypes};
})(typeof globalThis!=='undefined'?globalThis:this);

