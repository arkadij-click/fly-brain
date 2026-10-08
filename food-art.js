(function(root){
'use strict';
const sprites=new Map(), widths={apple:1.12,banana:1.65,berry:.82,crumbs:.85,juice:1.35};
let loading;
function load(){
 return loading||(loading=Promise.all(Object.keys(widths).map(async kind=>{
  const image=new Image();image.src='assets/food/'+kind+'-photo.png';await image.decode();
  const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
  const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,source.width,source.height);
  let left=source.width,top=source.height,right=0,bottom=0;
  // Remove faint matte haze, retaining the photographic subject's soft edges.
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
   const i=(y*source.width+x)*4,a=pixels.data[i+3];
   pixels.data[i+3]=a<75?0:Math.round(255*(a-75)/180);
   if(a>110){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  }
  ctx.putImageData(pixels,0,0);
  const pad=12,sx=Math.max(0,left-pad),sy=Math.max(0,top-pad),sw=Math.min(source.width,right+pad)-sx,sh=Math.min(source.height,bottom+pad)-sy;
  const sprite=document.createElement('canvas');sprite.width=512;sprite.height=Math.round(512*sh/sw);
  const s=sprite.getContext('2d');s.drawImage(source,sx,sy,sw,sh,0,0,sprite.width,sprite.height);
  const shade=document.createElement('canvas');shade.width=sprite.width;shade.height=sprite.height;
  const dark=shade.getContext('2d');dark.drawImage(sprite,0,0);dark.globalCompositeOperation='source-in';dark.fillStyle='#10140e';dark.fillRect(0,0,shade.width,shade.height);
  sprites.set(kind,{sprite,shade});
 })));
}
function draw(c,kind,x,y,size=18,alpha=1,options={}){
 const art=sprites.get(kind);if(!art||!Number.isFinite(size)||size<=0)return;
 const seed=Math.abs(Math.sin((options.seed||0)*12.9898)*43758.5453)%1;
 const w=size*widths[kind]*(.94+seed*.12),h=w*art.sprite.height/art.sprite.width;
 c.save();c.translate(x,y);c.rotate((seed-.5)*.13);
 if(kind!=='juice'){
  c.globalAlpha=alpha*.20;c.fillStyle='#201b13';c.filter='blur('+Math.max(.5,size*.045)+'px)';
  c.beginPath();c.ellipse(w*.025,h*.31,w*.43,Math.max(size*.045,h*.07),0,0,Math.PI*2);c.fill();c.filter='none';
 }
 c.globalAlpha=alpha*(kind==='juice'?.38:1);
 c.filter='brightness(.88) saturate(.85)';
 c.drawImage(art.sprite,-w/2,-h*.56,w,h);
 c.filter='none';
 if(options.light!==undefined&&options.light<1){c.globalAlpha=alpha*(1-options.light)*.24;c.drawImage(art.shade,-w/2,-h*.56,w,h);}
 c.restore();
}
root.FoodArt={draw,load};
})(typeof globalThis!=='undefined'?globalThis:this);
