"use strict";
// Estado independiente del modo lotería. No modifica deck, position ni currentCard.
const studyGrid=$('studyGrid'), studySearch=$('studySearch'), studyLevel=$('studyLevel');
let selectedCategory=0, studyInitialized=false, studyScroll=0;
const normalizeSearch = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

function getStudyIds(){
 const query=normalizeSearch(studySearch.value), level=Number(studyLevel.value);
 return Object.keys(materials).map(Number).filter(id=>id>0).sort((a,b)=>a-b).filter(id=>{
  const m=materials[id];
  return m.nivel<=level && (!selectedCategory||m.categorias.includes(selectedCategory)) && normalizeSearch(m.nombre).includes(query);
 });
}
function renderStudyGrid(){
 const ids=getStudyIds(), fragment=document.createDocumentFragment();
 for(const id of ids){
  const tile=$('studyCardTemplate').content.firstElementChild.cloneNode(true);
  tile.dataset.id=id;
  tile.setAttribute('aria-label',`Carta ${id}: ${materials[id].nombre}. Ver descripción`);
  populateCard(tile.querySelector('.card'),id);
  fragment.append(tile);
 }
 studyGrid.replaceChildren(fragment);
 $('studyCount').textContent=`${ids.length} ${ids.length===1?'material encontrado':'materiales encontrados'}`;
 $('emptyStudy').classList.toggle('hidden',ids.length!==0);
}
function initStudy(){
 if(studyInitialized)return;
 for(const [id,label] of [[0,'Todos'],...Object.entries(CATEGORIES)]){
  const button=document.createElement('button');
  button.type='button';button.dataset.category=id;button.textContent=label;
  button.setAttribute('aria-pressed',String(Number(id)===selectedCategory));
  $('categoryFilters').append(button);
 }
 studyInitialized=true;renderStudyGrid();
}
function switchMode(mode){
 if(loading||changing||modalOpen||mode===activeMode)return;
 if(activeMode==='study')studyScroll=window.scrollY;
 activeMode=mode;
 const studying=mode==='study';
 $('lotteryPanel').classList.toggle('hidden',studying);
 $('studyPanel').classList.toggle('hidden',!studying);
 $('app').classList.toggle('study-active',studying);
 document.body.classList.toggle('study-active',studying);
 $('pageTitle').textContent=studying?'Estudio libre · Material de laboratorio':'Lotería de material del laboratorio';
 $('lotteryMode').setAttribute('aria-pressed',String(!studying));
 $('studyMode').setAttribute('aria-pressed',String(studying));
 if(studying)initStudy();
 window.scrollTo(0,studying?studyScroll:0);
}
$('lotteryMode').addEventListener('click',()=>switchMode('lottery'));
$('studyMode').addEventListener('click',()=>switchMode('study'));
studySearch.addEventListener('input',renderStudyGrid);
studyLevel.addEventListener('change',renderStudyGrid);
$('categoryFilters').addEventListener('click',event=>{
 const button=event.target.closest('button[data-category]');if(!button)return;
 selectedCategory=Number(button.dataset.category);
 for(const item of $('categoryFilters').querySelectorAll('button'))item.setAttribute('aria-pressed',String(Number(item.dataset.category)===selectedCategory));
 renderStudyGrid();
});
studyGrid.addEventListener('click',event=>{
 const tile=event.target.closest('button[data-id]');if(tile)openDescription(Number(tile.dataset.id),tile);
});
