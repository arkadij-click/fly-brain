(function(root){
'use strict';
// The two playable scenes. A scene owns its photograph, its surface map, its
// photographed apple, its wall clock position and its start point - so games
// in different kitchens stay separate (saves are keyed per scene too).
function applePatch(a){return Array.from({length:12},(_,i)=>{const ang=i*Math.PI/6;return [a.x+Math.cos(ang)*.0105,a.y+Math.sin(ang)*.021];});}
function surface(name,poly,extra){return Object.assign({name,poly},extra||{});}
const SCENES={
 kitchen:{
  id:'kitchen',title:'Classic kitchen',photo:'kitchen-classic.jpg',windowExterior:true,start:{x:.32,y:.42},
  clock:{tl:[.4015,.1840],tr:[.4375,.1826],bl:[.4027,.2151]},
  apple:{x:.688,y:.453,name:'Apple by the window'},
  foods:[
   {name:'Fruit on the counter',x:.14,y:.53,strength:1},
   {name:'Apple by the window',x:.688,y:.453,strength:.95,feedRate:.11,kind:'apple',photographed:true},
   {name:'Crumbs on the plate',x:.535,y:.966,strength:.9}
  ],
  surfaces:[
   surface('Counter',[[0,.56],[.283,.488],[.57,.455],[.555,.497],[.44,.531],[.24,.587],[0,.686]]),
   surface('Window ledge',[[.554,.395],[1,.505],[1,.592],[.554,.482]]),
   surface('Radiator top',[[.60,.574],[.815,.655],[.815,.695],[.60,.614]]),
   surface('Radiator',[[.60,.614],[.612,.758],[.668,.758],[.668,.64],[.815,.695],[.85,.703],[.85,1],[.60,1]],{food:false}),
   surface('Top shelf',[[0,.205],[.52,.222],[.52,.242],[0,.225]]),
   surface('Freezer top',[[.435,.55],[.60,.50],[.615,.532],[.445,.588]]),
   surface('Trolley',[[.553,.708],[.668,.702],[.668,.75],[.553,.756]]),
   surface('Table',[[.321,1],[.36,.921],[.415,.842],[.488,.814],[.532,.809],[.66,.833],[.71,.857],[.76,.887],[.805,.925],[.84,1]]),
   surface('Apple skin',applePatch({x:.688,y:.453}))
  ]
 },
 loft:{
  id:'loft',title:'Loft kitchen',photo:'kitchen.jpg',windowExterior:false,start:{x:.25,y:.48},
  clock:{tl:[.4635,.1915],tr:[.4915,.1902],bl:[.4645,.2245]},
  apple:{x:.227,y:.525,name:'Apple on the counter'},
  foods:[
   {name:'Fruit on the counter',x:.14,y:.53,strength:1},
   {name:'Apple on the counter',x:.227,y:.525,strength:.95,feedRate:.11,kind:'apple',photographed:true},
   {name:'Crumbs on the plate',x:.50,y:.88,strength:.9}
  ],
  surfaces:[
   surface('Counter',[[0,.455],[.15,.465],[.30,.478],[.43,.495],[.43,.57],[.28,.556],[.14,.568],[0,.582]]),
   surface('Window sill',[[.70,.478],[.98,.504],[.98,.564],[.70,.545]]),
   surface('Radiator top',[[.72,.615],[.87,.65],[.87,.685],[.72,.655]]),
   surface('Radiator',[[.72,.655],[.87,.685],[.87,.93],[.72,.90]],{food:false}),
   surface('Top shelf',[[.005,.10],[.52,.105],[.52,.148],[.005,.148]]),
   surface('Freezer top',[[.452,.525],[.56,.548],[.56,.588],[.452,.562]]),
   surface('Table',[[.34,.655],[.44,.60],[.55,.597],[.655,.645],[.675,.73],[.63,.86],[.50,.945],[.38,.92],[.325,.80],[.32,.73]]),
   surface('Apple skin',applePatch({x:.227,y:.525}))
  ]
 }
};
let active='loft';
function forScene(id){return SCENES[id]||SCENES.loft;}
function surfacesFor(id){return forScene(id).surfaces;}
function activeScene(){return forScene(active);}
const api={SCENES,forScene,surfacesFor,activeScene,get active(){return active;},set active(id){active=forScene(id).id;}};
if(typeof module!=='undefined')module.exports=api;else root.KitchenScenes=api;
})(typeof globalThis!=='undefined'?globalThis:this);
