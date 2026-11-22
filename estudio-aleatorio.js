"use strict";
// La sesión conserva un solo ejemplar de cada ID; los repasos mueven la carta.
class RandomSession {
 constructor(ids){this.cards=shuffled(ids);this.index=0;this.known=new Set();this.first=new Map();this.attempts=0;this.reviewed=new Set();}
 get current(){return this.cards[this.index];}
 get complete(){return this.known.size===this.cards.length;}
 rate(known){
  const id=this.current;if(this.known.has(id))return false;
  if(!this.first.has(id))this.first.set(id,known);
  this.attempts++;
  if(known)this.known.add(id);
  else {this.reviewed.add(id);this.cards.splice(this.index,1);this.cards.push(id);}
  return true;
 }
 next(){if(this.index<this.cards.length-1)this.index++;else this.index=this.cards.findIndex(id=>!this.known.has(id));}
 pendingAfterReview(){if(this.known.has(this.current)||this.index===this.cards.length-1){const next=this.cards.findIndex(id=>!this.known.has(id));if(next>=0)this.index=next;}}
}
let randomSession=null, randomInitialized=false, randomRated=false, randomMoved=false;
const randomLevel=$('randomLevel'),randomCategory=$('randomCategory');
function randomIds(){return eligibleIds(Number(randomLevel.value),Number(randomCategory.value));}
function updateRandomSetup(){const n=randomIds().length;$('randomCount').textContent=`${n} materiales disponibles`;$('randomStart').disabled=!n;}
function initRandom(){if(!randomInitialized){for(const [id,label] of Object.entries(CATEGORIES)){const option=document.createElement('option');option.value=id;option.textContent=label;randomCategory.append(option);}randomInitialized=true;}updateRandomSetup();}
function randomView(view){for(const id of ['randomSetup','randomSession','randomResults'])$(id).classList.toggle('hidden',id!==view);}
function startRandom(){if(activeMode!=='random'||randomLocked||modalOpen||loading)return;const ids=randomIds();if(!ids.length)return;randomSession=new RandomSession(ids);randomLocked=true;randomView('randomSession');syncButtons();renderRandom();$('randomReveal').focus();}
function renderRandom(){const s=randomSession;if(!s||!randomLocked)return;populateCard($('randomCard'),s.current);$('randomCard').setAttribute('aria-label',materials[s.current].nombre);$('randomProgress').max=s.cards.length;$('randomProgress').value=s.known.size;$('randomStatus').textContent=`${s.known.size} de ${s.cards.length} dominados · ${s.reviewed.size} necesitaron repaso`;$('randomCardStatus').textContent=`Carta ${s.index+1} de ${s.cards.length} · ${s.known.has(s.current)?'Ya evaluada':s.reviewed.has(s.current)?'Repaso pendiente':'Por evaluar'}`;$('randomPrev').disabled=s.index===0;$('randomNext').textContent=s.index===s.cards.length-1?'IR A PENDIENTES →':'SIGUIENTE CARTA →';}
function navigateRandom(delta){if(!randomLocked||modalOpen)return;const s=randomSession;if(delta<0)s.index=Math.max(0,s.index-1);else s.next();renderRandom();}
function revealRandom(){if(!randomLocked||modalOpen)return;const s=randomSession;openDescription(s.current,$('randomReveal'));if(!modalOpen)return;randomRated=s.known.has(s.current);randomMoved=false;$('randomRating').classList.remove('hidden');$('randomKnown').disabled=randomRated;$('randomReview').disabled=randomRated;closeBtn.disabled=!randomRated;closeBtn.classList.toggle('hidden',!randomRated);if(randomRated){$('randomFeedback').textContent='Material ya evaluado. La puntuación no cambia.';$('randomFeedback').classList.remove('hidden');closeBtn.focus();}else $('randomKnown').focus();}
function rateRandom(known){if(!randomLocked||!modalOpen||randomRated||activeMode!=='random')return;if(!randomSession.rate(known))return;randomRated=true;randomMoved=!known;$('randomKnown').disabled=true;$('randomReview').disabled=true;$('randomFeedback').textContent=known?'¡Bien! Material reconocido.':'Enviado al final de la baraja para repasar.';$('randomFeedback').classList.remove('hidden');closeBtn.disabled=false;closeBtn.classList.remove('hidden');closeBtn.focus();}
function afterRandomDescription(){if(!randomLocked)return;if(randomSession.complete){finishRandom();return;}if(randomMoved){randomSession.pendingAfterReview();randomMoved=false;}renderRandom();}
function finishRandom(){const s=randomSession;randomLocked=false;syncButtons();randomView('randomResults');const hits=[...s.first.values()].filter(Boolean).length,total=s.cards.length;$('randomScore').textContent=`${(100*hits/total).toLocaleString('es-MX',{maximumFractionDigits:1})}%`;$('randomStats').replaceChildren();for(const [label,value] of [['Materiales estudiados',total],['Aciertos iniciales',`${hits} de ${total}`],['Necesitaron repaso',s.reviewed.size],['Intentos totales',s.attempts],['Dominio final según autoevaluación',`${s.known.size} de ${total}`]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('randomStats').append(dt,dd);}$('randomResults').focus();}
function resetRandom(){randomSession=null;randomLocked=false;randomRated=false;randomMoved=false;syncButtons();randomView('randomSetup');updateRandomSetup();$('randomStart').focus();}
$('randomMode').addEventListener('click',()=>switchMode('random'));
randomLevel.addEventListener('change',updateRandomSetup);randomCategory.addEventListener('change',updateRandomSetup);
$('randomStart').addEventListener('click',startRandom);$('randomPrev').addEventListener('click',()=>navigateRandom(-1));$('randomNext').addEventListener('click',()=>navigateRandom(1));$('randomReveal').addEventListener('click',revealRandom);
$('randomKnown').addEventListener('click',()=>rateRandom(true));$('randomReview').addEventListener('click',()=>rateRandom(false));$('randomAgain').addEventListener('click',resetRandom);
$('randomAbandon').addEventListener('click',()=>{if(randomLocked&&!modalOpen&&confirm('¿Abandonar la sesión? No se guardará la puntuación.'))resetRandom();});
