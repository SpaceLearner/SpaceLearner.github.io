export function createCabinInteractions(THREE,{scene,camera,canvas,viewport,inactive,targets,languageFace,languagePanel,languageFlip,changed}){
  const buttons=[...document.querySelectorAll('[data-anchor]')],mount=document.getElementById('scene-language');
  const flipButton=document.createElement('button');flipButton.type='button';flipButton.id='language-flip';mount.append(flipButton);flipButton.addEventListener('click',()=>languageFlip.toggle());
  const ray=new THREE.Raycaster(),direction=new THREE.Vector3();let hovered=null;const visibilityCache=new Map();
  function hover(id){if(hovered===id)return;hovered=id;for(const b of buttons)b.classList.toggle('object-hover',b.dataset.anchor===id);}
  function visible(point,id){
    const key=[...camera.position.toArray(),...point.toArray()].map(n=>n.toFixed(4)).join(',');
    const cached=visibilityCache.get(id);if(cached?.key===key)return cached.value;
    const distance=point.distanceTo(camera.position);direction.copy(point).sub(camera.position).normalize();ray.set(camera.position,direction);ray.camera=camera;ray.far=Math.max(0,distance-.012);
    const hits=ray.intersectObjects(scene.children,true).filter(hit=>{let o=hit.object;for(let p=o;p;p=p.parent)if(!p.visible)return false;const material=o.material;return !Array.isArray(material)&&!material?.transparent;});
    const value=!hits.length||hits[0].object.userData.panel===id;visibilityCache.set(id,{key,value});return value;
  }
  for(const b of buttons){b.addEventListener('pointerenter',()=>hover(b.dataset.anchor));b.addEventListener('pointerleave',()=>hover(null));b.addEventListener('focus',()=>hover(b.dataset.anchor));b.addEventListener('blur',()=>hover(null));}
  window.addEventListener('suite-language-change',changed);
  function layout(){
    const{width,height}=viewport(),hidden=inactive();scene.updateMatrixWorld();camera.updateMatrixWorld();
    for(const b of buttons){const point=targets[b.dataset.anchor](),p=point.clone().project(camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2;
      const shown=!hidden&&p.z>-1&&p.z<1&&x>24&&x<width-24&&y>90&&y<height-45&&visible(point,b.dataset.anchor);
      b.style.left=x+'px';b.style.top=y+'px';b.style.visibility=shown?'visible':'hidden';b.dataset.projected=shown?'visible':'occluded';
    }
    // Real geometry rotates; this transparent hit target follows its projected
    // bounds and keeps a minimum keyboard/touch target through the edge-on pose.
    const points=[];for(const x of [-.145,.145])for(const y of [0,.126])for(const z of [-.033,.033])points.push(languagePanel.localToWorld(new THREE.Vector3(x,y,z)));
    const center=languagePanel.localToWorld(new THREE.Vector3(0,.066,0));
    const projected=points.map(p=>{p.project(camera);return{x:(p.x+1)*width/2,y:(1-p.y)*height/2,z:p.z};});
    const left=Math.min(...projected.map(p=>p.x)),right=Math.max(...projected.map(p=>p.x)),top=Math.min(...projected.map(p=>p.y)),bottom=Math.max(...projected.map(p=>p.y));
    const w=right-left,h=bottom-top,retained=languageFlip.moving&&document.body.dataset.sceneLanguage==='visible';
    const shown=!hidden&&width>=700&&(retained||w>=70&&h>=24)&&projected.every(p=>p.z>-1&&p.z<1&&p.x>8&&p.x<width-8&&p.y>90&&p.y<height-24)&&visible(center,'language');
    mount.style.visibility=shown?'visible':'hidden';
    Object.assign(mount.style,{left:((left+right)/2-Math.max(44,w)/2)+'px',top:((top+bottom)/2-Math.max(44,h)/2)+'px',width:Math.max(44,w)+'px',height:Math.max(44,h)+'px',transform:'none'});
    mount.dataset.surfaceBounds=JSON.stringify({left,right,top,bottom});
    const lang=window.suiteI18n.language,label=(lang==='zh'?'中':'EN')+' · '+window.suiteI18n.t(lang==='zh'?'Switch to English':'Switch to Chinese');
    if(flipButton.getAttribute('aria-label')!==label)flipButton.setAttribute('aria-label',label);
    const state=shown?'visible':'fallback';if(document.body.dataset.sceneLanguage!==state)document.body.dataset.sceneLanguage=state;

  }
  return{layout,hover};
}
