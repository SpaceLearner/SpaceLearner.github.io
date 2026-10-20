// Independent of the WebGL module graph: a failed import still has an exit.
(() => {
  if(document.body.dataset.startup==='failed')return;
  const box=document.getElementById('scene-load'),message=document.getElementById('scene-load-message'),detail=document.getElementById('scene-load-detail'),progress=document.getElementById('scene-load-progress');
  const tasks=new Map(),failures=new Set(),blocked=new Map(),pendingImages=new Map(),degraded=new Set();
  let imageTracking=false,basicLighting=false;
  const optionalImage=url=>/\/(?:baked-cabin|baked-bed|baked-inputs|iced-coffee)\//.test(url);
  function textureTask(){tasks.set('textures',textureLoaded>=textureTotal||(basicLighting&&imageTracking&&![...pendingImages.keys()].some(url=>!optionalImage(url))));}
  function useBasicLighting(name){basicLighting=true;degraded.add(name);document.body.dataset.lighting='basic';textureTask();}
  let initialized=false,preparing=false,revealed=false,unavailable=false,slow=false,textureLoaded=0,textureTotal=0,prepareScene,revealScene;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function block(value){for(const el of document.querySelectorAll('.suite > :not(#scene-load),body > dialog')){if(value){if(!blocked.has(el))blocked.set(el,el.inert);el.inert=true;}else if(blocked.has(el))el.inert=blocked.get(el);}}
  function stage(name){document.body.dataset.startup=name;window.dispatchEvent(new CustomEvent('suite-startup-stage',{detail:name}));}
  function paint(){
    if(revealed||unavailable)return;
    const pending=[...tasks.values()].filter(v=>!v).length;
    document.body.dataset.sceneResources=pending||!initialized?'loading':'ready';
    message.textContent=preparing?'Preparing the view':textureTotal?'Loading the cabin':'Starting the observatory';
    detail.textContent=preparing?(basicLighting?'Preparing the view with basic lighting. Essential scene assets are ready.':'Compiling materials and preparing the first frame.'):textureTotal?`${textureLoaded} of ${textureTotal} images loaded · ${pending} asset groups pending`:'Establishing the scene and locating its assets.';
    document.getElementById('scene-load-help').textContent=slow?'This is taking longer than usual. You can use the text-only page at any time.':'A quiet workspace, above the world.';
    // This measures image requests only, never a fabricated overall percentage.
    progress.hidden=false;
    if(textureTotal&&!preparing){progress.max=textureTotal;progress.value=textureLoaded;progress.setAttribute('aria-label','Scene images loaded');}
    else{progress.removeAttribute('value');progress.setAttribute('aria-label','Preparing the scene');}
    for(const el of box.querySelectorAll('[data-startup-step]'))el.dataset.state=el.dataset.startupStep==='assets'?(preparing?'complete':'active'):el.dataset.startupStep==='prepare'?(preparing?'active':'pending'):'pending';
  }
  function fallback(reason){
    if(unavailable)return;unavailable=true;clearTimeout(deadline);clearTimeout(slowTimer);block(false);box.setAttribute('aria-busy','false');stage('failed');
    document.body.dataset.sceneResources='unavailable';document.body.classList.remove('ready','entering');document.body.classList.add('no-webgl');box.hidden=true;
    document.getElementById('space').hidden=true;document.getElementById('fallback').hidden=false;
    document.getElementById('fallback-detail').textContent=reason||'The cabin could not finish loading. Reload to try again, or read all research content below.';
    for(const id of ['entry-controls','vista-control','arm-demo-entry','arm-demo-controls'])document.getElementById(id).hidden=true;
    document.getElementById('status').textContent='Standard browsing mode; research content is available';
    window.dispatchEvent(new Event('suite-startup-unavailable'));
  }
  async function launch(){
    if(!initialized||preparing||revealed||unavailable||[...tasks.values()].some(v=>!v))return;
    if(failures.size){fallback('Some cabin assets could not be loaded. Reload to retry, or explore the research content below.');return;}
    preparing=true;stage('preparing');paint();
    try{
      await prepareScene();if(unavailable)return;
      clearTimeout(deadline);clearTimeout(slowTimer);message.textContent='Ready for approach';detail.textContent='The cabin is ready.';progress.max=1;progress.value=1;progress.setAttribute('aria-label','Scene preparation complete');
      box.querySelectorAll('[data-startup-step]').forEach(el=>el.dataset.state='complete');
      // The first prepared frame becomes visible beneath this real visual transition.
      stage('revealing');
      if(!motion.matches&&box.animate){const fade=box.animate([{opacity:1},{opacity:0}],{duration:420,easing:'ease-out',fill:'forwards'});await fade.finished.catch(()=>{});}
      if(unavailable)return;
      revealed=true;box.hidden=true;box.setAttribute('aria-busy','false');block(false);stage('ready');document.body.dataset.sceneResources=degraded.size?'partial':'ready';
      revealScene();window.dispatchEvent(new Event('suite-startup-ready'));
    }catch(error){console.warn('Cabin startup failed:',error);fallback('The 3D view could not be prepared. Reload to try again, or use the research links below.');}
  }
  function complete(name,failed=false){tasks.set(name,true);if(failed)failures.add(name);paint();queueMicrotask(launch);}
  const slowTimer=setTimeout(()=>{slow=true;paint();},12000);
  // A deadline is an error exit, not artificial progress or an entrance delay.
  const deadline=setTimeout(()=>fallback('Loading exceeded the startup time limit. Reload to try again, or read the full research content below.'),90000);
  window.suiteHealth={
    task(name,promise,{optional=false}={}){
      tasks.set(name,false);paint();
      // Baked lighting has a realtime substitute. A stalled atlas must not hold
      // the entire scene hostage; essential images still gate the first frame.
      const timer=optional?setTimeout(()=>{useBasicLighting(name);complete(name);},15000):null;
      return Promise.resolve(promise).then(value=>{clearTimeout(timer);degraded.delete(name);if(!degraded.size)document.body.dataset.lighting='full';complete(name);if(revealed&&!degraded.size)document.body.dataset.sceneResources='ready';return value;},error=>{clearTimeout(timer);if(optional)useBasicLighting(name);complete(name,!optional);throw error;});
    },
    imageStart(url){imageTracking=true;pendingImages.set(url,(pendingImages.get(url)||0)+1);},
    imageEnd(url){const remaining=(pendingImages.get(url)||1)-1;if(remaining)pendingImages.set(url,remaining);else pendingImages.delete(url);},
    textures(loaded,total){textureLoaded=loaded;textureTotal=total;textureTask();paint();queueMicrotask(launch);},
    textureError(url=''){if(optionalImage(url))useBasicLighting('images');else failures.add('textures');},
    ready(prepare,reveal){initialized=true;prepareScene=prepare;revealScene=reveal;paint();queueMicrotask(launch);},
    unavailable:fallback
  };
  window.addEventListener('error',event=>{if(event.target?.id==='suite-module')fallback();},true);
  document.getElementById('scene-reload').addEventListener('click',()=>location.reload());
  document.getElementById('fallback-reload').addEventListener('click',()=>location.reload());
  block(true);paint();
})();
