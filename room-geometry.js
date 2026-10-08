(function(root){
'use strict';
// Authored closed room in room-width units. Photo coordinates are landing anchors,
// not a recovered camera calibration. +X is photo right, +Y photo down, +Z up.
const R=.5625,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const patches=[
 {id:'counter',height:.22,poly:[[0,.566],[.283,.490],[.575,.460],[.576,.496],[0,.704]]},
 {id:'window-ledge',height:.26,poly:[[.554,.430],[1,.569],[1,.610],[.554,.466]]},
 {id:'table',height:.14,poly:[[.321,1],[.359,.921],[.415,.842],[.488,.814],[.532,.809],[.640,.838],[.718,.890],[.806,1]]}
];
function inside(x,y,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function triangle(o,d,a,b,c){const e1=sub(b,a),e2=sub(c,a),p=cross(d,e2),det=dot(e1,p);if(Math.abs(det)<1e-9)return Infinity;const s=sub(o,a),u=dot(s,p)/det;if(u<0||u>1)return Infinity;const q=cross(s,e1),v=dot(d,q)/det;if(v<0||u+v>1)return Infinity;const t=dot(e2,q)/det;return t>1e-6?t:Infinity;}
class Room{
 constructor(){
  this.faces=[];this.objects=[];this.foodKey='';
  // Closed shell: no ray can escape at the horizon, zenith or rear.
  this.quad('floor',[[0,0,0],[1,0,0],[1,R,0],[0,R,0]],'floor');
  this.quad('ceiling',[[0,0,.62],[0,R,.62],[1,R,.62],[1,0,.62]],'ceiling');
  this.quad('back-wall',[[0,0,0],[0,0,.62],[1,0,.62],[1,0,0]],'back');
  this.quad('front-wall',[[0,R,0],[1,R,0],[1,R,.62],[0,R,.62]],'front');
  this.quad('left-wall',[[0,0,0],[0,R,0],[0,R,.62],[0,0,.62]],'left');
  this.quad('window-wall',[[1,0,0],[1,0,.62],[1,R,.62],[1,R,0]],'window');
  for(const p of patches){const v=p.poly.map(([x,y])=>[x,y*R,p.height]);for(let i=1;i<v.length-1;i++)this.face(p.id,[v[0],v[i],v[i+1]],'anchor');for(let i=0;i<v.length;i++){const a=v[i],b=v[(i+1)%v.length];this.quad(p.id+'-front',[a,b,[b[0],b[1],0],[a[0],a[1],0]],p.id==='table'?'wood':'cabinet');}}
  // Occluding appliances and vessels, centered on photographed landmarks.
  this.objects=[
   {id:'ceiling-light',center:[.46,.27,.605],radius:[.075,.055,.015],uv:[.30,.32],tint:[1,.97,.82],emission:true},
   {id:'cooking-pot',center:[.355,.51*R,.265],radius:[.045,.025,.050],uv:[.355,.46],tint:[.72,.76,.78]},
   {id:'rice-cooker',center:[.515,.43*R,.270],radius:[.042,.022,.064],uv:[.515,.39],tint:[.72,.73,.69]},
   {id:'kettle',center:[.459,.18*R,.27],radius:[.034,.018,.057],uv:[.46,.16],tint:[.7,.74,.75]},
   {id:'counter-fruit',center:[.14,.53*R,.236],radius:[.027,.021,.023],uv:[.14,.51],tint:[.72,.58,.25]},
   {id:'window-apple',center:[.70,.456*R,.274],radius:[.014,.012,.014],uv:[.70,.444],tint:[.8,.28,.14]}
  ];
 }
 face(id,v,material){const e1=sub(v[1],v[0]),e2=sub(v[2],v[0]),normal=cross(e1,e2),aa=dot(e1,e1),ab=dot(e1,e2),bb=dot(e2,e2);this.faces.push({id,v,material,e1,e2,normal,aa,ab,bb,denom:aa*bb-ab*ab});}
 quad(id,v,material){this.face(id,[v[0],v[1],v[2]],material);this.face(id,[v[0],v[2],v[3]],material);}
 surfaceHeight(x,y){let h=.20;for(const p of patches)if(inside(x,y,p.poly))h=Math.max(h===.20?0:h,p.height);return h;}
 pose(fly){let z=this.surfaceHeight(fly.x,fly.y)+Math.max(0,fly.z)+.006;const o=[clamp(fly.x,.002,.998),clamp(fly.y*R,.002,R-.002),clamp(z,.008,.61)];
  // A photograph anchor may lie inside an authored vessel. Keep the eye above it.
  for(const b of this.objects){const q=((o[0]-b.center[0])/b.radius[0])**2+((o[1]-b.center[1])/b.radius[1])**2;if(q<1)o[2]=Math.max(o[2],b.center[2]+b.radius[2]*Math.sqrt(1-q)+.004);}
  return o;
 }
 setFoods(foods=[]){const key=foods.filter(f=>f.placed).map(f=>f.id).join('|');if(key===this.foodKey)return;this.foodKey=key;this.objects=this.objects.filter(o=>!o.food);for(const f of foods)if(f.placed){const h=this.surfaceHeight(f.x,f.y),flat=f.kind==='banana'||f.kind==='crumbs'||f.kind==='juice';this.objects.push({id:f.id,food:true,center:[f.x,f.y*R,h+.006],radius:[.012,.009,flat?.004:.009],uv:[f.x,f.y],tint:f.kind==='berry'?[.8,.16,.12]:f.kind==='banana'?[.8,.65,.2]:f.kind==='juice'?[.75,.48,.24]:[.78,.5,.25]});}}
 trace(o,d){let t=Infinity,material='',id='';const bounds=[1,R,.62],positive=['window','front','ceiling'],negative=['left','back','floor'];for(let k=0;k<3;k++)if(Math.abs(d[k])>1e-10){const a=((d[k]>0?bounds[k]:0)-o[k])/d[k];if(a>1e-6&&a<t){t=a;material=d[k]>0?positive[k]:negative[k];id=material==='window'?'window-wall':material==='back'?'back-wall':material==='front'?'front-wall':material==='left'?'left-wall':material;}}
  let best={id,material,t,point:[o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t]};
  for(let fi=12;fi<this.faces.length;fi++){const f=this.faces[fi],den=dot(d,f.normal);if(Math.abs(den)<1e-10)continue;const a=((f.v[0][0]-o[0])*f.normal[0]+(f.v[0][1]-o[1])*f.normal[1]+(f.v[0][2]-o[2])*f.normal[2])/den;if(a<=1e-6||a>=t)continue;const px=o[0]+d[0]*a-f.v[0][0],py=o[1]+d[1]*a-f.v[0][1],pz=o[2]+d[2]*a-f.v[0][2],pa=px*f.e1[0]+py*f.e1[1]+pz*f.e1[2],pb=px*f.e2[0]+py*f.e2[1]+pz*f.e2[2],u=(pa*f.bb-pb*f.ab)/f.denom,v=(pb*f.aa-pa*f.ab)/f.denom;if(u< -1e-7||v< -1e-7||u+v>1.0000001)continue;t=a;best={id:f.id,material:f.material,t,point:[o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t]};}
  for(const b of this.objects){const px=(o[0]-b.center[0])/b.radius[0],py=(o[1]-b.center[1])/b.radius[1],pz=(o[2]-b.center[2])/b.radius[2],vx=d[0]/b.radius[0],vy=d[1]/b.radius[1],vz=d[2]/b.radius[2],a=vx*vx+vy*vy+vz*vz,bb=px*vx+py*vy+pz*vz,cc=px*px+py*py+pz*pz-1,disc=bb*bb-a*cc;if(disc<0)continue;let hit=(-bb-Math.sqrt(disc))/a;if(hit<=1e-6)hit=(-bb+Math.sqrt(disc))/a;if(hit>1e-6&&hit<t){t=hit;const point=[o[0]+d[0]*hit,o[1]+d[1]*hit,o[2]+d[2]*hit],normal=[(point[0]-b.center[0])/(b.radius[0]*b.radius[0]),(point[1]-b.center[1])/(b.radius[1]*b.radius[1]),(point[2]-b.center[2])/(b.radius[2]*b.radius[2])];const len=Math.hypot(...normal);best={id:b.id,material:'object',t,point,object:b,normal:normal.map(v=>v/len)};}}
  return best;
 }
 uv(hit){const [x,y,z]=hit.point;
  switch(hit.material){
   case 'anchor':return [x,y/R];
   case 'back':return [x*.61,.44*(1-z/.62)];
   case 'window':return [.59+.40*y/R,.02+.57*(1-z/.62)];
   case 'left':return [.02+.28*y/R,.12+.6*(1-z/.62)];
   case 'front':return [.18+.65*x,.61+.38*(1-z/.62)];
   case 'floor':return [.32+.45*x,.82+.17*y/R];
   case 'ceiling':return [.28+.12*x,.28+.075*y/R];
   case 'wood':return [.43+.12*x,.87+.08*z/.22];
   case 'cabinet':return [.42+.14*x,.63+.12*(1-z/.26)];
   case 'object':return hit.object.uv;
  }
 }
 sample(hit,texture,light=1,out){const uv=this.uv(hit),xx=clamp(uv[0])*(texture.width-1),yy=clamp(uv[1])*(texture.height-1),ix=Math.floor(xx),iy=Math.floor(yy),fx=xx-ix,fy=yy-iy;
  const color=out||[0,0,0],data=texture.data,x1=Math.min(ix+1,texture.width-1),y1=Math.min(iy+1,texture.height-1),a=(iy*texture.width+ix)*4,b=(iy*texture.width+x1)*4,c=(y1*texture.width+ix)*4,d=(y1*texture.width+x1)*4,wa=(1-fx)*(1-fy)/255,wb=fx*(1-fy)/255,wc=(1-fx)*fy/255,wd=fx*fy/255;for(let k=0;k<3;k++)color[k]=data[a+k]*wa+data[b+k]*wb+data[c+k]*wc+data[d+k]*wd;
  let shade=1;if(hit.material==='ceiling'){const avg=(color[0]+color[1]+color[2])/3,[x,y]=hit.point,edge=Math.min(x,1-x,y,R-y),seam=.045*Math.exp(-edge*70),illumination=.075*Math.exp(-((x-.46)**2+(y-.27)**2)*9);for(let k=0;k<3;k++)color[k]=.67+.17*avg+illumination-seam;}else if(hit.material==='object'){shade=.56+.44*Math.max(0,dot(hit.normal,[-.3,-.3,.905]));if(hit.object.emission){shade=1;for(let k=0;k<3;k++)color[k]=hit.object.tint[k];}else if(hit.object.food)for(let k=0;k<3;k++)color[k]=.5*color[k]+.5*hit.object.tint[k];}else if(hit.material==='cabinet')shade=.8;else if(hit.material==='floor')shade=.7;
  for(let k=0;k<3;k++)color[k]=clamp(color[k]*shade*light);return color;
 }
}
const api={Room,patches,ratio:R,triangle};if(typeof module!=='undefined')module.exports=api;else root.FlyRoom=api;
})(typeof globalThis!=='undefined'?globalThis:this);
