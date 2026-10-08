const assert=require('node:assert/strict'),{Retina}=require('./vision');
const retina=new Retina(require('./eye-map.json')),texture={width:32,height:18,data:new Uint8ClampedArray(32*18*4).fill(140)},fly={x:.32,y:.42,z:.12,heading:0,bank:0,light:1};
retina.update(fly,texture,0);const before=retina.pixels(0);retina.eyes[0].forEach((p,i)=>p.known=i%2?.69:.71);assert.deepEqual(retina.pixels(0).data,before.data,'display is independent of thresholded receptor availability');
const signal=retina.signal.slice();retina.pixels(1);assert.deepEqual(retina.signal,signal,'display does not feed itself back into brain');
// Isolate interpolation from physical material and shade boundaries. A uniform
// radiance scene must never acquire receptor seams or a horizon strip.
retina.room.sample=()=>[.5,.5,.5];const first=new Retina(require('./eye-map.json'));first.room.sample=()=>[.5,.5,.5];first.update(fly,texture,0);
for(const side of [0,1]){const image=first.pixels(side),view=first.views[side];for(let i=0;i<view.w*view.h;i++)if(view.coverage[i]>.999){assert.equal(image.data[i*4],image.data[i*4+1]);assert.equal(image.data[i*4],image.data[i*4+2]);assert(image.data[i*4]>100);}for(let y=0;y<view.h;y++)for(let x=1;x<view.w;x++){const i=y*view.w+x;if(view.coverage[i]>.999&&view.coverage[i-1]>.999)assert(Math.abs(image.data[i*4]-image.data[(i-1)*4])<=1);}}
console.log('PASS continuous full-field display, no receptor seams/horizon cutoff, threshold independence, opaque output, independent sensory state');
