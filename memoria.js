"use strict";
/* Memorama v4.0. Un mismo material aparece exactamente dos veces; sin filtro por categorías. */
let memoryGame=null;
let memoryRound=0;
let memoryTimeout=null;
let memoryTick=null;
let memoryPendingDescription=false;

function memoryView(view){
 for(const id of ['memorySetup','memorySession','memoryResults'])$(id).classList.toggle('hidden',id!==view);
}
function initMemory(){
 // La configuración permanece intacta al abandonar el modo antes de comenzar.
 $('memoryStart').disabled=loading||Object.keys(materials).filter(id=>Number(id)>0).length<12;
}
function memoryDuration(game){
 return game.elapsed+(game.runningSince===null?0:performance.now()-game.runningSince);
}
function memoryStartClock(){
 const g=memoryGame;
 if(!g||g.runningSince!==null||memoryPendingDescription||document.hidden||g.done)return;
 g.runningSince=performance.now();
}
function memoryStopClock(){
 const g=memoryGame;
 if(g&&g.runningSince!==null){g.elapsed+=performance.now()-g.runningSince;g.runningSince=null;}
}
function formatMemoryTime(ms){
 const sec=Math.floor(ms/1000);
 return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
}
function updateMemoryStats(){
 const g=memoryGame;if(!g)return;
 $('memoryPairsStatus').textContent=`Parejas: ${g.matches} de ${g.pairs}`;
 $('memoryErrorsStatus').textContent=`Errores: ${g.errors}`;
 $('memoryTimeStatus').textContent=`Tiempo: ${formatMemoryTime(memoryDuration(g))}`;
}
function startMemory(){
 if(activeMode!=='memory'||loading||modalOpen||memoryLocked)return;
 const pairs=Number(document.querySelector('input[name="memoryPairs"]:checked')?.value||6);
 if(![4,6,12].includes(pairs))return;
 const candidates=Object.keys(materials).map(Number).filter(id=>id>0&&materials[id]?.nombre);
 if(candidates.length<pairs){alert('No hay suficientes materiales para iniciar.');return;}
 const ids=shuffled(candidates).slice(0,pairs);
 const cards=shuffled(ids.flatMap(id=>[{id,unique:`${id}-a`},{id,unique:`${id}-b`}]));
 memoryRound++;
 memoryGame={pairs,cards,matches:0,errors:0,matched:new Set(),open:[],busy:false,elapsed:0,runningSince:null,done:false};
 memoryPendingDescription=false;memoryLocked=true;
 const fragment=document.createDocumentFragment();
 cards.forEach((entry,i)=>{
  const tile=document.createElement('button');tile.type='button';tile.className='memory-tile';
  tile.dataset.index=i;tile.dataset.id=entry.id;tile.setAttribute('aria-label',`Carta boca abajo, posición ${i+1}`);
  const back=document.createElement('span');back.className='memory-back';back.textContent='?';back.setAttribute('aria-hidden','true');
  const front=document.createElement('span');front.className='memory-front';front.style.setProperty('--outer',materials[entry.id].marco||'#54cdbc');
  const inner=document.createElement('span');inner.className='memory-front-inner';
  const num=document.createElement('span');num.className='memory-front-number';num.textContent=entry.id;
  const art=document.createElement('img');art.className='memory-front-img';art.alt='';art.loading='eager';art.src=images.get(entry.id)?.src||`cartas/${entry.id}.webp?v=4`;
  const name=document.createElement('span');name.className='memory-front-name';name.textContent=materials[entry.id].nombre;
  inner.append(num,art,name);front.append(inner);tile.append(back,front);fragment.append(tile);
 });
 $('memoryGrid').replaceChildren(fragment);
 $('memoryTimeStatus').classList.toggle('hidden',!$('memoryShowClock').checked);
 memoryView('memorySession');syncButtons();updateMemoryStats();
 memoryStartClock();
 clearInterval(memoryTick);memoryTick=setInterval(updateMemoryStats,250);
 $('memoryGrid').querySelector('button')?.focus({preventScroll:true});
}
function memoryTile(index){return $('memoryGrid').querySelector(`[data-index="${index}"]`);}
function flipMemory(index,flipped){
 const g=memoryGame;if(!g)return;
 const tile=memoryTile(index);if(!tile)return;
 tile.classList.toggle('is-flipped',flipped);
 const id=g.cards[index].id;
 tile.setAttribute('aria-label',flipped?`Carta ${id}, ${materials[id].nombre}`:`Carta boca abajo, posición ${index+1}`);
 tile.setAttribute('aria-pressed',String(flipped));
}
function selectMemory(index){
 const g=memoryGame;
 if(activeMode!=='memory'||!memoryLocked||!g||g.busy||modalOpen||g.done||g.matched.has(index)||g.open.includes(index))return;
 if(!Number.isInteger(index)||index<0||index>=g.cards.length)return;
 flipMemory(index,true);g.open.push(index);
 if(g.open.length<2)return;
 g.busy=true;
 const [first,second]=g.open;
 const round=memoryRound;
 if(g.cards[first].id!==g.cards[second].id){
  g.errors++;updateMemoryStats();
  clearTimeout(memoryTimeout);
  memoryTimeout=setTimeout(()=>{
   if(round!==memoryRound||!memoryGame)return;
   flipMemory(first,false);flipMemory(second,false);g.open=[];g.busy=false;
  },950);
  return;
 }
 g.matches++;
 g.matched.add(first);g.matched.add(second);
 for(const i of [first,second]){
  const tile=memoryTile(i);
  tile.classList.add('is-matched');tile.disabled=true;
  tile.setAttribute('aria-label',`Pareja encontrada: ${materials[g.cards[i].id].nombre}`);
 }
 g.open=[];updateMemoryStats();memoryStopClock();memoryPendingDescription=true;
 // Esperar un instante para que la pareja acertada sea visible antes de abrir la ficha.
 clearTimeout(memoryTimeout);
 memoryTimeout=setTimeout(()=>{
  if(round!==memoryRound||!memoryGame)return;
  const id=g.cards[first].id;
  openDescription(id,memoryTile(first));
  if(!modalOpen){memoryPendingDescription=false;g.busy=false;memoryStartClock();}
  else{$('randomRating').classList.add('hidden');$('randomFeedback').classList.add('hidden');closeBtn.textContent='ENTENDIDO';}
 },450);
}
function afterMemoryDescription(){
 const g=memoryGame;
 if(!g||!memoryPendingDescription)return;
 memoryPendingDescription=false;g.busy=false;
 if(g.matches===g.pairs)finishMemory();
 else memoryStartClock();
}
function finishMemory(){
 const g=memoryGame;if(!g||g.done)return;
 memoryStopClock();g.done=true;memoryLocked=false;
 clearInterval(memoryTick);memoryTick=null;
 memoryView('memoryResults');syncButtons();
 $('memoryResultsSummary').textContent=`¡Encontraste las ${g.pairs} parejas!`;
 const stats=$('memoryResultsStats');stats.replaceChildren();
 const attempts=g.matches+g.errors;
 const accuracy=attempts?100*g.matches/attempts:0;
 for(const [label,value] of [['Parejas encontradas',`${g.matches} de ${g.pairs}`],['Intentos correctos',g.matches],['Errores',g.errors],['Precisión',`${accuracy.toLocaleString('es-MX',{maximumFractionDigits:1})}%`],['Tiempo de juego',formatMemoryTime(g.elapsed)]]){
  const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;stats.append(dt,dd);
 }
 $('memoryResults').focus({preventScroll:true});
}
function resetMemory(){
 clearTimeout(memoryTimeout);clearInterval(memoryTick);memoryTimeout=null;memoryTick=null;
 memoryStopClock();memoryRound++;memoryGame=null;memoryPendingDescription=false;memoryLocked=false;
 memoryView('memorySetup');syncButtons();initMemory();$('memoryStart').focus({preventScroll:true});
}
$('memoryMode').addEventListener('click',()=>switchMode('memory'));
$('memoryStart').addEventListener('click',startMemory);
$('memoryAgain').addEventListener('click',resetMemory);
$('memoryGrid').addEventListener('click',e=>{
 const tile=e.target.closest('.memory-tile');
 if(tile)selectMemory(Number(tile.dataset.index));
});
$('memoryAbandon').addEventListener('click',()=>{
 if(memoryLocked&&!modalOpen&&confirm('¿Abandonar la partida? Perderás los resultados de esta sesión.'))resetMemory();
});
document.addEventListener('visibilitychange',()=>{
 if(!memoryGame||memoryGame.done)return;
 if(document.hidden)memoryStopClock();else memoryStartClock();
});
