"use strict";
// CONFIGURACIÓN BÁSICA: modifica el total solo después de añadir nuevas imágenes y fichas JSON.
const TOTAL = 42;
const $ = (id) => document.getElementById(id);
const card=$('card'), cardArt=$('cardArt'), cardName=$('cardName'), cardNumber=$('cardNumber'), logoReserve=$('logoReserve');
const status=$('status'), mainBtn=$('mainBtn'), shuffleBtn=$('shuffleBtn'), descriptionBtn=$('descriptionBtn');
const modal=$('descriptionModal'), descriptionTitle=$('descriptionTitle'), descriptionText=$('descriptionText'), closeBtn=$('closeDescriptionBtn');
let materials={}, images=new Map(), deck=[], position=-1, currentCard=0;
let playing=false, finished=false, ready=false, loading=true, changing=false, modalOpen=false;
let activeMode='lottery', descriptionTrigger=null, randomLocked=false;
const CATEGORIES = {1:'Medición volumétrica',2:'Sujeción y soporte',3:'Calentamiento',4:'Contención y reacción',5:'Separación y destilación',6:'Medición de propiedades',7:'Manipulación y transferencia',8:'Almacenamiento y cierre',9:'Limpieza'};
function syncButtons(){mainBtn.disabled=loading||changing||modalOpen||randomLocked;shuffleBtn.disabled=loading||changing||modalOpen||randomLocked;descriptionBtn.disabled=loading||changing||modalOpen||randomLocked||currentCard===0||!materials[currentCard]?.descripcion;$('studyMode').disabled=loading||changing||modalOpen||randomLocked;$('lotteryMode').disabled=changing||modalOpen||randomLocked;$('randomMode').disabled=loading||changing||modalOpen;}
// Una sola plantilla lógica para lotería y estudio libre.
function populateCard(element,id){
 const m=materials[id]||{}, art=element.querySelector('.card-art'), name=element.querySelector('.card-name');
 element.classList.toggle('cover',id===0);
 element.style.setProperty('--outer',id===0?'#a65add':m.marco||'#54cdbc');
 art.src=images.get(id)?.src||`cartas/${id}.webp`;
 art.alt=id===0?'Ilustración de portada del laboratorio':m.nombre||`Material ${id}`;
 element.querySelector('.card-number').textContent=id;
 name.textContent=id===0?'LOTERÍA DE MATERIAL DEL LABORATORIO':m.nombre||`Material ${id}`;
 name.classList.toggle('long',id!==0&&(m.nombre||'').length>20);
 name.classList.toggle('very-long',id!==0&&(m.nombre||'').length>31);
}
function renderCard(id){
 currentCard=id;
 populateCard(card,id);
 logoReserve.classList.toggle('hidden',id!==0);
 card.setAttribute('aria-label',id===0?'Portada':`Carta ${id}, ${materials[id].nombre}`);
 card.classList.remove('pop');void card.offsetWidth;card.classList.add('pop');syncButtons();
}
async function loadApp(){
 try{
  const r=await fetch('materiales.json?v=2',{cache:'no-cache'});
  if(!r.ok)throw new Error('materiales.json');materials=await r.json();
  for(let id=1;id<=TOTAL;id++){
   const m=materials[id];
   if(!m?.nombre||!m.descripcion||![1,2,3].includes(m.nivel)||!Array.isArray(m.categorias)||!m.categorias.length||m.categorias.some(c=>!Object.hasOwn(CATEGORIES,c)))throw new Error(`ficha ${id} incompleta`);
  }
  // Precarga escalonada: evita solicitar más de seis imágenes a la vez.
  let loaded=0, next=0;
  async function worker(){while(next<=TOTAL){let id=next++;let image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error(`cartas/${id}.webp`));image.src=`cartas/${id}.webp`;if(image.complete)image.naturalWidth?resolve():reject(new Error(`cartas/${id}.webp`));});
    images.set(id,image);loaded++;status.textContent=`Preparando cartas: ${loaded} de ${TOTAL+1}…`;
   }}
  await Promise.all(Array.from({length:6},worker));
  loading=false;renderCard(0);status.textContent=`${TOTAL} cartas · Material de laboratorio`;
  mainBtn.textContent='BARAJAR Y COMENZAR';syncButtons();
 }catch(e){status.textContent=`Error al cargar ${e.message}. Comprueba los archivos y recarga.`;mainBtn.textContent='ERROR DE CARGA';}
}
function shuffled(ids){const result=[...ids];for(let i=result.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function eligibleIds(level,category=0){return Object.keys(materials).map(Number).filter(id=>id>0&&materials[id].nivel<=level&&(!category||materials[id].categorias.includes(category))).sort((a,b)=>a-b);}
function shuffleDeck(){if(loading||changing||modalOpen||randomLocked)return;
 deck=shuffled(Array.from({length:TOTAL},(_,i)=>i+1));
 position=-1;playing=false;finished=false;ready=true;renderCard(0);
 status.textContent=`Mazo barajado · ${TOTAL} cartas`;mainBtn.textContent='COMENZAR';shuffleBtn.classList.remove('hidden');syncButtons();}
function startGame(){if(loading||changing||modalOpen)return;if(!ready)shuffleDeck();playing=true;ready=false;finished=false;mainBtn.textContent='ECHAR CARTA';drawNext();}
function drawNext(){if(!playing||finished||loading||changing||modalOpen)return;
 if(position+1>=deck.length){endGame();return;}
 changing=true;position++;renderCard(deck[position]);status.textContent=`Carta ${position+1} de ${TOTAL}`;
 if(position===deck.length-1)mainBtn.textContent='TERMINAR';
 requestAnimationFrame(()=>requestAnimationFrame(()=>{changing=false;syncButtons();}));}
function endGame(){finished=true;playing=false;ready=false;status.innerHTML=`<span class="finished">¡LOTERÍA!</span><br>Se han echado las ${TOTAL} cartas.`;mainBtn.textContent='BARAJAR DE NUEVO';shuffleBtn.classList.add('hidden');syncButtons();}
function openDescription(id=currentCard,trigger=document.activeElement){if(id===0||!materials[id]||loading||changing||modalOpen)return;
 $('randomRating').classList.add('hidden');$('randomFeedback').classList.add('hidden');closeBtn.disabled=false;closeBtn.classList.remove('hidden');
 descriptionTitle.textContent=materials[id].nombre;descriptionText.textContent=materials[id].descripcion;
 descriptionTrigger=trigger;modalOpen=true;modal.classList.remove('hidden');$('app').inert=true;document.body.classList.add('modal-open');syncButtons();closeBtn.focus({preventScroll:true});}
function closeDescription(){if(!modalOpen||closeBtn.disabled)return;modalOpen=false;modal.classList.add('hidden');$('app').inert=false;document.body.classList.remove('modal-open');syncButtons();descriptionTrigger?.focus({preventScroll:true});descriptionTrigger=null;if(activeMode==='random')afterRandomDescription();}
mainBtn.addEventListener('click',()=>{if(finished){shuffleDeck();return;}if(!playing){startGame();return;}drawNext();});
shuffleBtn.addEventListener('click',()=>{if(!playing||confirm('¿Barajar de nuevo? Se reiniciará la partida actual.'))shuffleDeck();});
descriptionBtn.addEventListener('click',()=>openDescription(currentCard,descriptionBtn));closeBtn.addEventListener('click',closeDescription);
document.addEventListener('keydown',e=>{if(modalOpen){if(e.code==='Escape'){e.preventDefault();closeDescription();}else if(e.key==='Tab'){e.preventDefault();const buttons=[...modal.querySelectorAll('button')].filter(b=>!b.disabled&&!b.closest('.hidden'));const i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus({preventScroll:true});}return;}
 if(activeMode==='lottery'&&(e.code==='Space'||e.code==='ArrowRight')&&playing&&!finished&&!e.target.closest('input,select,textarea,.mode-nav')){e.preventDefault();if(!e.repeat)drawNext();}});
function revealLotteryCard(){if(activeMode!=='lottery'||loading||changing||modalOpen)return;if(currentCard!==0){openDescription(currentCard,card);return;}
 $('randomRating').classList.add('hidden');$('randomFeedback').classList.add('hidden');
 descriptionTitle.textContent='¿Comenzamos la lotería?';descriptionText.textContent='';
 $('startCoverBtn').classList.remove('hidden');closeBtn.textContent='CANCELAR';closeBtn.disabled=false;closeBtn.classList.remove('hidden');
 descriptionTrigger=card;modalOpen=true;modal.classList.add('cover-dialog');modal.classList.remove('hidden');$('app').inert=true;document.body.classList.add('modal-open');syncButtons();$('startCoverBtn').focus();}
card.addEventListener('click',revealLotteryCard);card.addEventListener('keydown',e=>{
  if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();revealLotteryCard();}});
$('startCoverBtn').addEventListener('click',()=>{if(!modalOpen||!modal.classList.contains('cover-dialog'))return;closeDescription();startGame();});
loadApp();
