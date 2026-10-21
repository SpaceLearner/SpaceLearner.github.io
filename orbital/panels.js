(() => {
  'use strict';
  const dialog=document.getElementById('sheet');
  const title=document.getElementById('sheet-title');
  const kicker=document.getElementById('sheet-kicker');
  const body=document.getElementById('sheet-body');
  const viewer=document.getElementById('image-viewer');
  const fullImage=document.getElementById('image-full');
  const stage=document.getElementById('image-stage');
  const scaleButton=document.getElementById('image-scale');
  const pages={news:['News','05 / NEWS'],about:['About','01 / ABOUT'],research:['Research directions','02 / RESEARCH'],projects:['Selected projects','03 / PROJECTS'],papers:['Papers','04 / PAPERS']};
  const scrollPositions=new Map();
  const scrollKey=()=>currentPage+'@'+(dialog.dataset.object||'');
  const rememberScroll=()=>{if(currentPage)scrollPositions.set(scrollKey(),body.scrollTop);};
  let previousFocus=null,imageFocus=null,currentPage='',currentProject='',historyBusy=false,closeToRoot=false,generation=0;
  const toolbar=dialog.querySelector('.focus-toolbar'),direct=document.getElementById('focus-direct'),back=document.getElementById('focus-return'),tabs=dialog.querySelector('.notebook-tabs');
  const inherited=history.state?.suite;
  const owner=inherited?.owner||String(Date.now())+Math.random().toString(36).slice(2);
  const defaultObject=id=>({about:'monitor',research:'terminal',projects:'terminal',papers:'notebook'}[id]||'');
  const route=()=>{const [path,object='']=location.hash.slice(1).split('@');const [id,project='']=path.split('/');return {object:object==='text'?'':['monitor','terminal','notebook'].includes(object)?object:defaultObject(id),id:pages[id]?id:'',project:['zerosearch','rynnbrain'].includes(project)?project:''};};
  const depth=()=>history.state?.suite?.owner===owner?history.state.suite.depth:0;
  const state=(extra={})=>({...history.state,suite:{...history.state?.suite,owner,depth:depth(),...extra}});
  const url=(id,project='',object='')=>location.pathname+location.search+(id?'#'+id+(project?'/'+project:'')+(object!==defaultObject(id)?'@'+(object||'text'):''):'');
  history.replaceState(state(),'',location.href);
  function readingChanged(){window.dispatchEvent(new CustomEvent('suite-reading-change',{detail:{active:dialog.open||viewer.open}}));}
  function push(id,project='',image=null,object=dialog.dataset.object||''){history.pushState(state({depth:depth()+1,image,object}),'',url(id,project,object));}
  function scrollProject(project){
    const target=project&&body.querySelector('[data-project="'+project+'"]');
    if(target){target.scrollIntoView({block:'start',behavior:'instant'});target.querySelector('h3').focus({preventScroll:true});}
  }

  function resetImageScale() {
    viewer.classList.remove('is-actual');
    scaleButton.setAttribute('aria-pressed','false');
    scaleButton.textContent='Actual size';
    stage.scrollTop=stage.scrollLeft=0;
  }
  function hideImage() {
    if(!viewer.open)return;
    viewer.close();
    resetImageScale();
    if(imageFocus?.isConnected)imageFocus.focus({preventScroll:true});
    readingChanged();
  }
  function closeImage(){
    if(historyBusy||!viewer.open)return;
    if(history.state?.suite?.image&&depth()>0){historyBusy=true;history.back();}
    else {hideImage();history.replaceState(state({image:null}),'',location.href);}
  }
  function openImage(trigger,record=true) {
    const thumbnail=trigger.querySelector('img');
    if(!thumbnail||historyBusy)return;
    if(record)push(currentPage,currentProject,trigger.dataset.imageTitle);
    imageFocus=trigger;
    resetImageScale();
    viewer.dataset.imageState='loading';stage.setAttribute('aria-busy','true');
    document.getElementById('image-load-status').textContent='Loading the full-resolution image…';
    const original=trigger.dataset.imageFull||thumbnail.src;
    fullImage.src=original;
    fullImage.width=Number(thumbnail.getAttribute('width'))||thumbnail.naturalWidth;
    fullImage.height=Number(thumbnail.getAttribute('height'))||thumbnail.naturalHeight;
    fullImage.alt=thumbnail.alt;
    document.getElementById('image-title').textContent=trigger.dataset.imageTitle;
    document.getElementById('image-original').href=original;
    document.getElementById('image-source').href=trigger.dataset.imageSource;
    if(!viewer.open)viewer.showModal();
    viewer.querySelector('.image-close').focus({preventScroll:true});
    readingChanged();
  }
  function show(id,trigger=null,project='',object='') {
    if(!pages[id])return;
    rememberScroll();
    window.dispatchEvent(new Event('suite-panel-open'));
    hideImage();
    const active=document.activeElement;
    const returnTarget=active&&active!==document.body&&!dialog.contains(active)?active:document.querySelector('nav [data-open="'+id+'"]');
    previousFocus=dialog.open?previousFocus:(trigger||returnTarget);
    if(currentPage!==id){
      title.textContent=pages[id][0];kicker.textContent=pages[id][1];
      body.replaceChildren(document.getElementById(id).content.cloneNode(true));
      body.scrollTop=0;
    }
    currentPage=id;currentProject=project;
    document.querySelectorAll('nav [data-open]').forEach(link=>{if(link.dataset.open===id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    const token=++generation;object=window.suiteFocus?object:'';
    dialog.dataset.object=object;dialog.removeAttribute('style');toolbar.hidden=!object;tabs.hidden=object!=='notebook';
    tabs.querySelectorAll('[data-open]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.open===id)));
    document.getElementById('focus-label').textContent=object==='monitor'?'Approaching the screen…':'Opening the notebook…';
    dialog.dataset.focusPending=String(!!object);direct.hidden=!object;
    dialog.setAttribute('aria-busy',String(!!object));
    if(!dialog.open)dialog.showModal();
    if(object)window.suiteFocus.layout();
    function ready(){
      if(token!==generation||!dialog.open)return;
      dialog.dataset.focusPending='false';dialog.setAttribute('aria-busy','false');direct.hidden=true;
      window.suiteFocus?.layout();
      document.getElementById('focus-label').textContent=object==='monitor'?'Personal terminal':object==='terminal'?'Research / Project terminal':'Research notebook';
      body.scrollTop=scrollPositions.get(scrollKey())||0;
      if(project)scrollProject(project);else (object?back:dialog.querySelector('.close')).focus({preventScroll:true});
    }
    if(object)window.suiteFocus.enter(object,{done:ready});
    else {window.suiteFocus?.leave();ready();}
    readingChanged();
  }
  function open(id,trigger=null,options={}) {
    if(!pages[id]||historyBusy)return;
    const project=trigger?.dataset.project||'';
    const object=options.focus??defaultObject(id);
    if(currentPage===id&&currentProject===project&&dialog.open&&dialog.dataset.object===object)return;
    if(currentPage!==id||currentProject!==project||!dialog.open||dialog.dataset.object!==object)push(id,project,null,object);
    show(id,trigger,project,object);
  }
  function hide(){
    rememberScroll();const token=++generation;hideImage();if(dialog.open)dialog.close();currentPage='';currentProject='';
    dialog.dataset.object='';dialog.dataset.focusPending='false';dialog.removeAttribute('style');
    document.querySelectorAll('nav [aria-current]').forEach(link=>link.removeAttribute('aria-current'));
    const restoreFocus=()=>{if(token===generation&&previousFocus?.isConnected){const visible=previousFocus.getClientRects().length&&getComputedStyle(previousFocus).visibility!=='hidden';(visible?previousFocus:document.querySelector('#cabin-menu summary')||returnTarget).focus({preventScroll:true});}};
    if(window.suiteFocus)window.suiteFocus.leave({done:restoreFocus});else restoreFocus();
    readingChanged();
  }
  function close() {
    if(historyBusy)return;
    if(depth()>0){historyBusy=true;closeToRoot=true;history.go(-depth());}
    else {history.replaceState(state({image:null}),'',url(''));hide();}
  }
  function restore(){
    historyBusy=false;
    if(closeToRoot){closeToRoot=false;history.replaceState(state({image:null}),'',url(''));}
    const {id,project,object}=route();
    if(!id){hide();return;}
    const image=history.state?.suite?.image;
    if(currentPage!==id||currentProject!==project||!dialog.open||dialog.dataset.object!==(object))show(id,null,project,object);
    if(image){const trigger=[...body.querySelectorAll('.figure-open')].find(el=>el.dataset.imageTitle===image);if(trigger&&!viewer.open)openImage(trigger,false);}
    else hideImage();
  }
  document.addEventListener('click',event=>{
    const imageTrigger=event.target.closest('.figure-open');
    if(imageTrigger){event.preventDefault();openImage(imageTrigger);return;}
    const target=event.target.closest('[data-open]');
    if(target){event.preventDefault();open(target.dataset.open,target,{focus:event.shiftKey?'':target.dataset.focus||defaultObject(target.dataset.open)});}
  });
  scaleButton.addEventListener('click',()=>{
    const actual=viewer.classList.toggle('is-actual');
    scaleButton.setAttribute('aria-pressed',String(actual));
    scaleButton.textContent=actual?'Fit to window':'Actual size';
    stage.scrollTop=stage.scrollLeft=0;
  });
  fullImage.addEventListener('load',()=>{stage.scrollTop=stage.scrollLeft=0;viewer.dataset.imageState='ready';stage.setAttribute('aria-busy','false');document.getElementById('image-load-status').textContent='';});
  fullImage.addEventListener('error',()=>{viewer.dataset.imageState='error';stage.setAttribute('aria-busy','false');document.getElementById('image-load-status').textContent='The image could not be loaded. Try the original image or project source.';});
  viewer.querySelector('.image-close').addEventListener('click',closeImage);
  viewer.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const stops=[...viewer.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')].filter(el=>!el.hidden&&el.getClientRects().length);
    if(!stops.length)return;
    const current=stops.indexOf(document.activeElement);
    event.preventDefault();
    stops[(current+(event.shiftKey?-1:1)+stops.length)%stops.length].focus({preventScroll:true});
  });
  viewer.addEventListener('cancel',event=>{event.preventDefault();closeImage();});
  dialog.querySelector('.close').addEventListener('click',close);
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const stops=[...dialog.querySelectorAll('button:not([disabled]),a[href],summary,[tabindex="0"]')].filter(el=>!el.hidden&&el.getClientRects().length);
    if(!stops.length)return;
    const current=stops.indexOf(document.activeElement);
    const next=current<0?(event.shiftKey?stops.length-1:0):(current+(event.shiftKey?-1:1)+stops.length)%stops.length;
    event.preventDefault();stops[next].focus({preventScroll:true});
  });
  direct.addEventListener('click',()=>window.suiteFocus?.finish());
  back.addEventListener('click',close);
  window.addEventListener('suite-focus-ready',()=>{const r=route();if(r.id)show(r.id,null,r.project,r.object);});
  window.addEventListener('suite-focus-unavailable',()=>{if(dialog.open)show(currentPage,null,currentProject);});
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(viewer.open)closeImage();else close();});
  // Only a click outside a dialog's rectangle dismisses its backdrop.
  for(const [element,dismiss]of [[dialog,close],[viewer,closeImage]])element.addEventListener('click',event=>{
    if(event.target!==element)return;
    const r=element.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dismiss();
  });
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();if(dialog.open)close();});
  if(['ready','failed'].includes(document.body.dataset.startup))restore();
  window.addEventListener('suite-startup-unavailable',restore);
  window.suiteOpen=open;
  window.addEventListener('popstate',()=>{if(['ready','failed'].includes(document.body.dataset.startup))restore();});
  window.addEventListener('hashchange',()=>{if(['ready','failed'].includes(document.body.dataset.startup))restore();});
})();
