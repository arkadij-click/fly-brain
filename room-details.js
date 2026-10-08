(function(root){
'use strict';
const timezone='Europe/Berlin';
const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const apple={name:'Apple by the window',x:.688,y:.453,strength:.95,feedRate:.11,kind:'apple',photographed:true};
const appleSurface={name:'Apple skin',poly:Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return [apple.x+Math.cos(a)*.0105,apple.y+Math.sin(a)*.021];})};
function actualTime(date=new Date()){return formatter.format(date);}
const digits={0:'ab cdef'.replace(/ /g,''),1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abfgcd'};
const segments={a:[3,2,13,2],b:[15,4,15,14],c:[15,18,15,28],d:[3,30,13,30],e:[1,18,1,28],f:[1,4,1,14],g:[3,16,13,16]};
function drawClock(c,w,h,text=actualTime()){
 // Cover only the blue time display; keep the case and temperature readout.
 const tl=[.4015,.1840],tr=[.4375,.1826],bl=[.4027,.2151];
 c.save();c.transform((tr[0]-tl[0])*w/100,(tr[1]-tl[1])*h/100,(bl[0]-tl[0])*w/42,(bl[1]-tl[1])*h/42,tl[0]*w,tl[1]*h);
 const screen=c.createLinearGradient(0,0,100,42);screen.addColorStop(0,'#34405b');screen.addColorStop(.55,'#26324b');screen.addColorStop(1,'#222b3a');c.fillStyle=screen;c.fillRect(0,0,100,42);
 const drawDigit=(value,x)=>{c.save();c.translate(x,5);c.lineWidth=2.2;c.lineCap='round';for(const [key,line] of Object.entries(segments)){const on=(digits[value]||'').includes(key);c.strokeStyle=on?'#72a1ff':'#6989c221';c.shadowColor='#588aff';c.shadowBlur=on?1.6:0;c.beginPath();c.moveTo(line[0],line[1]);c.lineTo(line[2],line[3]);c.stroke();}c.restore();};
 drawDigit(text[0],6);drawDigit(text[1],27);drawDigit(text[3],57);drawDigit(text[4],78);c.fillStyle='#72a1ff';for(const y of [15,27]){c.beginPath();c.arc(50,y,1.4,0,Math.PI*2);c.fill();}c.restore();
}
const api={timezone,apple,appleSurface,actualTime,drawClock};if(typeof module!=='undefined')module.exports=api;else root.RoomDetails=api;
})(typeof globalThis!=='undefined'?globalThis:this);
