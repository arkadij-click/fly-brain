(function(root){
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hz=n=>440*Math.pow(2,(n-69)/12);
const chords=[[57,60,64,69],[53,57,60,65],[48,52,55,64],[55,59,62,67]];
const melody=[0,2,3,2,1,2,0,1,2,3,2,1,0,2,1,0];
function score(step){const chord=chords[Math.floor(step/16)%4],beat=60/78/2;
 const notes=[];
 if(step%16===0){chord.forEach(n=>notes.push({midi:n,duration:beat*15,level:.032,type:'sine',attack:.8,pan:0}));notes.push({midi:chord[0]-12,duration:beat*7,level:.09,type:'sine',attack:.025,pan:0});}
 if(step%2===0)notes.push({midi:chord[melody[Math.floor(step/2)%16]]+12,duration:beat*2.3,level:.10,type:'triangle',attack:.014,pan:Math.sin(step*.27)*.45});
 if(step%8===4)notes.push({midi:chord[2]-12,duration:beat*3,level:.045,type:'sine',attack:.015,pan:-.15});
 return notes;
}
class KitchenAudio{
 constructor(){this.context=null;this.enabled=false;this.music=true;this.effects=true;this.musicVolume=.45;this.effectsVolume=.55;this.running=true;this.previous=null;this.step=0;this.next=0;this.voices=new Set();}
 async enable(){if(!this.context){const C=root.AudioContext||root.webkitAudioContext;if(!C)throw new Error('This browser does not support audio');this.context=new C();this.build();}await this.context.resume();this.enabled=true;this.next=this.context.currentTime+.08;this.step=0;this.mix();}
 build(){const c=this.context;this.master=c.createGain();this.master.gain.value=0;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-15;limiter.knee.value=12;limiter.ratio.value=6;this.master.connect(limiter).connect(c.destination);
  this.musicBus=c.createGain();this.effectsBus=c.createGain();this.musicBus.connect(this.master);this.effectsBus.connect(this.master);
  this.delay=c.createDelay(1);this.delay.delayTime.value=60/78*.75;const feedback=c.createGain();feedback.gain.value=.23;this.wet=c.createGain();this.wet.gain.value=.16;this.musicBus.connect(this.delay);this.delay.connect(feedback).connect(this.delay);this.delay.connect(this.wet).connect(this.master);
  this.buzz=c.createOscillator();this.buzz.type='sawtooth';this.buzz.frequency.value=210;this.buzzFilter=c.createBiquadFilter();this.buzzFilter.type='lowpass';this.buzzFilter.frequency.value=650;this.buzzLevel=c.createGain();this.buzzLevel.gain.value=0;this.buzzPan=c.createStereoPanner();this.buzz.connect(this.buzzFilter).connect(this.buzzLevel).connect(this.buzzPan).connect(this.effectsBus);this.buzz.start();
  const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);let seed=783;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296)*2-1;}this.noiseBuffer=buffer;const room=c.createBufferSource();room.buffer=buffer;room.loop=true;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=190;this.roomLevel=c.createGain();this.roomLevel.gain.value=.022;room.connect(filter).connect(this.roomLevel).connect(this.effectsBus);room.start();
  this.timer=setInterval(()=>this.schedule(),80);
 }
 mix(){if(!this.context)return;const t=this.context.currentTime;this.master.gain.setTargetAtTime(this.enabled&&this.running?.65:0,t,.045);this.musicBus.gain.setTargetAtTime(this.music?this.musicVolume:0,t,.035);this.wet.gain.setTargetAtTime(this.music?.16:0,t,.035);this.effectsBus.gain.setTargetAtTime(this.effects?this.effectsVolume:0,t,.035);}
 disable(){this.enabled=false;this.stopVoices();this.mix();}
 stopVoices(){if(!this.context)return;const t=this.context.currentTime;for(const voice of this.voices){voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(0,t,.012);try{voice.source.stop(t+.07);}catch{}}this.voices.clear();}
 setRunning(value){if(this.running===value)return;this.running=value;if(!value)this.stopVoices();else if(this.context){this.next=this.context.currentTime+.08;}this.mix();}
 tone(note,at,bus=this.musicBus,slide){const c=this.context,o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();o.type=note.type||'sine';o.frequency.setValueAtTime(hz(note.midi),at);if(slide)o.frequency.exponentialRampToValueAtTime(hz(slide),at+note.duration*.8);p.pan.value=note.pan||0;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(note.level,at+Math.min(note.attack||.012,note.duration*.3));g.gain.exponentialRampToValueAtTime(.0001,at+note.duration);o.connect(g).connect(p).connect(bus);const voice={source:o,gain:g};this.voices.add(voice);o.onended=()=>{this.voices.delete(voice);o.disconnect();g.disconnect();p.disconnect();};o.start(at);o.stop(at+note.duration+.02);}
 schedule(){if(!this.context||!this.enabled||!this.running||!this.music)return;const t=this.context.currentTime;if(this.next<t)this.next=t+.02;while(this.next<t+.18){score(this.step).forEach(n=>this.tone(n,this.next));this.step=(this.step+1)%64;this.next+=60/78/2;}}
 noise(duration,level,pan,cutoff=1800,attack=.012,delay=0){const c=this.context,t=c.currentTime+.005+delay,o=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter(),p=c.createStereoPanner();o.buffer=this.noiseBuffer;f.type='bandpass';f.frequency.value=cutoff;f.Q.value=.7;p.pan.value=pan;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(f).connect(g).connect(p).connect(this.effectsBus);const voice={source:o,gain:g};this.voices.add(voice);o.onended=()=>{this.voices.delete(voice);o.disconnect();g.disconnect();f.disconnect();p.disconnect();};o.start(t);o.stop(t+duration+.02);}
 event(kind,pan=0){if(!this.context||!this.enabled||!this.running||!this.effects)return;const t=this.context.currentTime+.005;const note=(midi,duration,level=.12,offset=0,slide)=>this.tone({midi,duration,level,pan,type:'sine'},t+offset,this.effectsBus,slide);
  if(kind==='takeoff'){note(55,.20,.10,0,78);this.noise(.15,.065,pan,900);}
  if(kind==='land'){note(47,.11,.18,0,35);this.noise(.055,.09,pan,1600);}
  if(kind==='scare'){this.noise(.3,.14,pan,2400);note(69,.26,.10,0,88);}
  if(kind==='clap'){
   // Palm impact: fast broadband crack, short low body, quiet room reflections.
   this.noise(.075,.95,pan,3200,.001,.045);
   this.noise(.055,.42,pan,700,.0015,.045);
   note(43,.055,.22,.045,30);
   this.noise(.055,.14,pan*.6,2400,.002,.077);
   this.noise(.07,.055,-pan*.4,1700,.003,.113);
  }
  if(kind==='feed'){note(83,.10,.05);note(88,.12,.04,.15);}
  if(kind==='groom')this.noise(.3,.035,pan,3200);
  if(kind==='food'){note(76,.22,.10);note(83,.3,.07,.12);}
 }
 update(sim,paused){this.setRunning(!paused);const current={mode:sim.mode,escape:sim.escape,time:sim.time,foods:sim.foods.length};const previous=this.previous;
  if(this.context){const t=this.context.currentTime,pan=clamp(sim.x*2-1,-.9,.9),flight=sim.mode==='flight'&&!paused;this.buzzLevel.gain.setTargetAtTime(flight?.024+Math.hypot(sim.vx,sim.vy)*.03:0,t,.08);this.buzz.frequency.setTargetAtTime(195+Math.hypot(sim.vx,sim.vy)*210+Math.sin(sim.time*27)*9,t,.03);this.buzzPan.pan.setTargetAtTime(pan,t,.08);this.roomLevel.gain.setTargetAtTime(.015+sim.wind*.025,t,.15);
   if(previous&&current.time>=previous.time&&!paused){if(current.escape>previous.escape+.2)this.event('scare',pan);else if(current.mode!==previous.mode){if(current.mode==='flight')this.event('takeoff',pan);if(current.mode==='walking')this.event('land',pan);if(current.mode==='feeding')this.event('feed',pan);if(current.mode==='grooming')this.event('groom',pan);}if(current.foods>previous.foods)this.event('food',pan);}
  }this.previous=current;
 }
}
const api={KitchenAudio,score,hz};if(typeof module!=='undefined')module.exports=api;else root.FlySound=api;
})(typeof globalThis!=='undefined'?globalThis:this);
