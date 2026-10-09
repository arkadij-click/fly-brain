(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class FollowCamera{
 constructor(){this.x=.32;this.y=.3;this.zoom=3;}
 update(fly,dt,follow=true,zoom=3,viewW=(1/zoom),viewH=(1/zoom)){const wanted=follow?zoom:1;const alpha=1-Math.exp(-Math.max(0,dt)*7);this.zoom+=(wanted-this.zoom)*alpha;const halfX=Math.min(.5,viewW/2),halfY=Math.min(.5,viewH/2);const tx=follow?clamp(fly.x,halfX,1-halfX):.5,ty=follow?clamp(fly.y-fly.z,halfY,1-halfY):.5;this.x=clamp(this.x+(tx-this.x)*alpha,halfX,1-halfX);this.y=clamp(this.y+(ty-this.y)*alpha,halfY,1-halfY);}
 worldToScreen(x,y){return {x:(x-this.x)*this.zoom+.5,y:(y-this.y)*this.zoom+.5};}
 screenToWorld(x,y){return {x:this.x+(x-.5)/this.zoom,y:this.y+(y-.5)/this.zoom};}
 get bounds(){const half=.5/this.zoom;return {x:this.x-half,y:this.y-half,width:1/this.zoom,height:1/this.zoom};}
}
const api={FollowCamera};if(typeof module!=='undefined')module.exports=api;else root.FlyCamera=api;
})(typeof globalThis!=='undefined'?globalThis:this);

