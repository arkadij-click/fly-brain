/* Geometry, receptor dynamics and eye rendering run off the UI thread. */
importScripts('room-geometry.js?v=fast-room-31','visual-circuit.js?v=fast-room-31','vision.js?v=fast-room-31');
let retina,texture;
onmessage=({data})=>{
 try{
  if(data.type==='init'){retina=new FlyVision.Retina(data.map);postMessage({type:'ready'});return;}
  if(data.texture)texture=data.texture;
  const start=performance.now();retina.update(data.pose,texture,data.dt);
  const frames=[retina.pixels(0),retina.pixels(1)];
  postMessage({type:'frame',signal:retina.signal,frames,computeMs:performance.now()-start},frames.map(f=>f.data.buffer));
 }catch(error){postMessage({type:'error',message:error.message});}
};
