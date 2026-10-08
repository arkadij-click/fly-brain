(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class FollowCamera{
 constructor(){this.x=.32;this.y=.3;this.zoom=3;}
 update(fly,dt,follow=true,zoom=3){const wanted=follow?zoom:1;const alpha=1-Math.exp(-Math.max(0,dt)*7);this.zoom+=(wanted-this.zoom)*alpha;const half=.5/this.zoom;const tx=follow?clamp(fly.x,half,1-half):.5,ty=follow?clamp(fly.y-fly.z,half,1-half):.5;this.x=clamp(this.x+(tx-this.x)*alpha,half,1-half);this.y=clamp(this.y+(ty-this.y)*alpha,half,1-half);}
 worldToScreen(x,y){return {x:(x-this.x)*this.zoom+.5,y:(y-this.y)*this.zoom+.5};}
 screenToWorld(x,y){return {x:this.x+(x-.5)/this.zoom,y:this.y+(y-.5)/this.zoom};}
 get bounds(){const half=.5/this.zoom;return {x:this.x-half,y:this.y-half,width:1/this.zoom,height:1/this.zoom};}
}
const api={FollowCamera};if(typeof module!=='undefined')module.exports=api;else root.FlyCamera=api;
})(typeof globalThis!=='undefined'?globalThis:this);

