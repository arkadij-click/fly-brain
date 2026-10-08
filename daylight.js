(function(root){
'use strict';
const rad=Math.PI/180,latitude=52.52*rad,longitude=13.405;
// NOAA fractional-year solar position, evaluated in UTC to avoid DST offsets.
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
function solarElevation(date=new Date()){
 const year=date.getUTCFullYear(),start=Date.UTC(year,0,1),days=(Date.UTC(year+1,0,1)-start)/86400000;
 const fraction=(date.getTime()-start)/86400000,gamma=2*Math.PI/days*(fraction-.5);
 const equation=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
 const decl=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
 const minutes=date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60;
 const angle=((minutes+equation+4*longitude)/4-180)*rad;
 return Math.asin(Math.max(-1,Math.min(1,Math.sin(latitude)*Math.sin(decl)+Math.cos(latitude)*Math.cos(decl)*Math.cos(angle))))/rad;
}
function isDay(date=new Date()){return solarElevation(date)>-.833;}
let mode='auto',dayPhoto,nightPhoto,cachedMinute=-1,cachedDay=false;
function currentDay(){if(mode!=='auto')return mode==='day';const minute=Math.floor(Date.now()/60000);if(minute!==cachedMinute){cachedMinute=minute;cachedDay=isDay();}return cachedDay;}
function setMode(value){if(!['auto','day','night'].includes(value))throw new Error('Unknown outside mode');mode=value;}
// A small affine mesh fits the source photograph into each perspective glass.
function drawPane(c,image,source,target,w,h){
 const point=(q,u,v,sw,sh)=>[(q[0][0]*(1-u)*(1-v)+q[1][0]*u*(1-v)+q[2][0]*u*v+q[3][0]*(1-u)*v)*sw,(q[0][1]*(1-u)*(1-v)+q[1][1]*u*(1-v)+q[2][1]*u*v+q[3][1]*(1-u)*v)*sh];
 const triangle=(s,d)=>{
  const [s0,s1,s2]=s,[d0,d1,d2]=d,ux=s1[0]-s0[0],uy=s1[1]-s0[1],vx=s2[0]-s0[0],vy=s2[1]-s0[1],det=ux*vy-uy*vx;
  const ax=d1[0]-d0[0],ay=d1[1]-d0[1],bx=d2[0]-d0[0],by=d2[1]-d0[1];
  const a=(ax*vy-bx*uy)/det,b=(ay*vy-by*uy)/det,cc=(bx*ux-ax*vx)/det,dd=(by*ux-ay*vx)/det;
  c.save();c.beginPath();const center=[(d0[0]+d1[0]+d2[0])/3,(d0[1]+d1[1]+d2[1])/3];
  d.forEach((p,i)=>{const dx=p[0]-center[0],dy=p[1]-center[1],length=Math.hypot(dx,dy),x=p[0]+dx/length*.7,y=p[1]+dy/length*.7;i?c.lineTo(x,y):c.moveTo(x,y);});
  c.closePath();c.clip();c.transform(a,b,cc,dd,d0[0]-a*s0[0]-cc*s0[1],d0[1]-b*s0[0]-dd*s0[1]);c.drawImage(image,0,0);c.restore();
 };
 c.save();c.beginPath();target.forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.closePath();c.clip();
 const n=12;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const uv=[[x/n,y/n],[(x+1)/n,y/n],[(x+1)/n,(y+1)/n],[x/n,(y+1)/n]],s=uv.map(([u,v])=>point(source,u,v,image.naturalWidth,image.naturalHeight)),d=uv.map(([u,v])=>point(target,u,v,w,h));
  triangle([s[0],s[1],s[2]],[d[0],d[1],d[2]]);triangle([s[0],s[2],s[3]],[d[0],d[2],d[3]]);
 }
 c.restore();
}
async function load(photo){
 nightPhoto=photo;const day=new Image();day.src='assets/window-exterior.jpg';await day.decode();
 dayPhoto=document.createElement('canvas');dayPhoto.width=photo.naturalWidth;dayPhoto.height=photo.naturalHeight;
 const c=dayPhoto.getContext('2d'),w=dayPhoto.width,h=dayPhoto.height;c.drawImage(photo,0,0);
 // Composite only the photographed glass. The original kitchen remains intact.
 const panes=[[[.613,0],[.687,0],[.676,.395],[.604,.380]],[[.698,0],[.794,0],[.770,.423],[.686,.398]],[[.852,0],[.979,0],[.947,.472],[.825,.438]]];
 c.save();c.beginPath();for(const pane of panes){pane.forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.closePath();}c.clip();
 // Lower glass panes in the user's new SnapTask photo, mapped to the old frames.
 const sources=[[[.531,.311],[.584,.299],[.586,.675],[.532,.661]],[[.595,.303],[.628,.295],[.630,.640],[.595,.635]],[[.700,.284],[.780,.267],[.781,.689],[.700,.680]]];
 const crop=[2096/4032,567/2268,1130/4032,1044/2268];
 sources.forEach((q,i)=>sources[i]=q.map(([x,y])=>[(x-crop[0])/crop[2],(y-crop[1])/crop[3]]));
 panes.forEach((pane,i)=>drawPane(c,day,sources[i],pane,w,h));c.restore();
 // Foreground milk carton (including its cap) occludes the window glass.
 const milk=[[1770,487],[1782,482],[1782,475],[1785,473],[1797,474],[1803,477],[1803,483],[1828,484],[1849,489],[1846,535],[1836,625],[1797,631],[1757,619],[1759,571],[1765,526],[1768,490]];
 c.save();c.beginPath();milk.forEach(([x,y],i)=>i?c.lineTo(x/2048*w,y/1152*h):c.moveTo(x/2048*w,y/1152*h));c.closePath();c.clip();c.drawImage(photo,0,0);c.restore();
}
function drawPhoto(c,w,h){if(nightPhoto)c.drawImage(currentDay()&&dayPhoto?dayPhoto:nightPhoto,0,0,w,h);}
function status(){return (currentDay()?'Day':'Night')+(mode==='auto'?' · Berlin auto':' · preview');}
const api={solarElevation,isDay,load,drawPhoto,setMode,status};if(typeof module!=='undefined')module.exports=api;else root.Daylight=api;
})(typeof globalThis!=='undefined'?globalThis:this);
