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
  const pages={about:['关于我','01 / ABOUT'],research:['研究方向','02 / RESEARCH'],projects:['代表项目','03 / PROJECTS'],papers:['研究论文','04 / PAPERS']};
  let previousFocus=null,imageFocus=null,currentPage='',currentProject='',historyBusy=false,closeToRoot=false;
  const inherited=history.state?.suite;
  const owner=inherited?.owner||String(Date.now())+Math.random().toString(36).slice(2);
  const route=()=>{const [id,project='']=location.hash.slice(1).split('/');return {id:pages[id]?id:'',project:['zerosearch','rynnbrain'].includes(project)?project:''};};
  const depth=()=>history.state?.suite?.owner===owner?history.state.suite.depth:0;
  const state=(extra={})=>({...history.state,suite:{...history.state?.suite,owner,depth:depth(),...extra}});
  const url=(id,project='')=>location.pathname+location.search+(id?'#'+id+(project?'/'+project:''):'');
  history.replaceState(state(),'',location.href);
  function readingChanged(){window.dispatchEvent(new CustomEvent('suite-reading-change',{detail:{active:dialog.open||viewer.open}}));}
  function push(id,project='',image=null){history.pushState(state({depth:depth()+1,image}),'',url(id,project));}
  function scrollProject(project){
    const target=project&&body.querySelector('[data-project="'+project+'"]');
    if(target){target.scrollIntoView({block:'start',behavior:'instant'});target.querySelector('h3').focus({preventScroll:true});}
  }

  function resetImageScale() {
    viewer.classList.remove('is-actual');
    scaleButton.setAttribute('aria-pressed','false');
    scaleButton.textContent='原始尺寸';
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
    fullImage.src=thumbnail.src;
    fullImage.alt=thumbnail.alt;
    document.getElementById('image-title').textContent=trigger.dataset.imageTitle;
    document.getElementById('image-original').href=thumbnail.src;
    document.getElementById('image-source').href=trigger.dataset.imageSource;
    if(!viewer.open)viewer.showModal();
    viewer.querySelector('.image-close').focus({preventScroll:true});
    readingChanged();
  }
  function show(id,trigger=null,project='') {
    if(!pages[id])return;
    window.dispatchEvent(new Event('suite-panel-open'));
    hideImage();
    previousFocus=dialog.open?previousFocus:(trigger||document.activeElement);
    if(currentPage!==id){
      title.textContent=pages[id][0];kicker.textContent=pages[id][1];
      body.replaceChildren(document.getElementById(id).content.cloneNode(true));
      body.scrollTop=0;
    }
    currentPage=id;currentProject=project;
    if(!dialog.open)dialog.showModal();
    if(project)scrollProject(project);
    readingChanged();
  }
  function open(id,trigger=null) {
    if(!pages[id]||historyBusy)return;
    const project=trigger?.dataset.project||'';
    if(currentPage!==id||currentProject!==project||!dialog.open)push(id,project);
    show(id,trigger,project);
  }
  function hide(){
    hideImage();if(dialog.open)dialog.close();currentPage='';currentProject='';
    previousFocus?.focus({preventScroll:true});readingChanged();
  }
  function close() {
    if(historyBusy)return;
    if(depth()>0){historyBusy=true;closeToRoot=true;history.go(-depth());}
    else {history.replaceState(state({image:null}),'',url(''));hide();}
  }
  function restore(){
    historyBusy=false;
    if(closeToRoot){closeToRoot=false;history.replaceState(state({image:null}),'',url(''));}
    const {id,project}=route();
    if(!id){hide();return;}
    const image=history.state?.suite?.image;
    if(currentPage!==id||currentProject!==project||!dialog.open)show(id,null,project);
    if(image){const trigger=[...body.querySelectorAll('.figure-open')].find(el=>el.dataset.imageTitle===image);if(trigger&&!viewer.open)openImage(trigger,false);}
    else hideImage();
  }
  document.addEventListener('click',event=>{
    const imageTrigger=event.target.closest('.figure-open');
    if(imageTrigger){event.preventDefault();openImage(imageTrigger);return;}
    const target=event.target.closest('[data-open]');
    if(target){event.preventDefault();open(target.dataset.open,target);}
  });
  scaleButton.addEventListener('click',()=>{
    const actual=viewer.classList.toggle('is-actual');
    scaleButton.setAttribute('aria-pressed',String(actual));
    scaleButton.textContent=actual?'适应窗口':'原始尺寸';
    stage.scrollTop=stage.scrollLeft=0;
  });
  fullImage.addEventListener('load',()=>{stage.scrollTop=stage.scrollLeft=0;});
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
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(viewer.open)closeImage();else close();});
  // Only a click outside a dialog's rectangle dismisses its backdrop.
  for(const [element,dismiss]of [[dialog,close],[viewer,closeImage]])element.addEventListener('click',event=>{
    if(event.target!==element)return;
    const r=element.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dismiss();
  });
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();if(dialog.open)close();});
  restore();
  window.suiteOpen=open;
  window.addEventListener('popstate',restore);
  window.addEventListener('hashchange',restore);
})();
