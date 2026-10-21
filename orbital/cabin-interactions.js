import {projectiveMatrix} from './surface-reading.js';
export function createCabinInteractions(THREE,{scene,camera,canvas,viewport,inactive,targets,languageFace,changed}){
  const buttons=[...document.querySelectorAll('[data-anchor]')],mount=document.getElementById('scene-language');
  const ray=new THREE.Raycaster(),direction=new THREE.Vector3();let hovered=null;const visibilityCache=new Map();
  function hover(id){if(hovered===id)return;hovered=id;for(const b of buttons)b.classList.toggle('object-hover',b.dataset.anchor===id);}
  function visible(point,id){
    const key=[...camera.position.toArray(),...point.toArray()].map(n=>n.toFixed(4)).join(',');
    const cached=visibilityCache.get(id);if(cached?.key===key)return cached.value;
    const distance=point.distanceTo(camera.position);direction.copy(point).sub(camera.position).normalize();ray.set(camera.position,direction);ray.far=Math.max(0,distance-.012);
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
    const points=[[-.135,.05,0],[.135,.05,0],[.135,-.05,0],[-.135,-.05,0]].map(p=>languageFace.localToWorld(new THREE.Vector3(...p)));
    const center=languageFace.getWorldPosition(new THREE.Vector3()),projected=points.map(p=>{p.project(camera);return{x:(p.x+1)*width/2,y:(1-p.y)*height/2,z:p.z};});
    const w=Math.hypot(projected[1].x-projected[0].x,projected[1].y-projected[0].y),h=Math.hypot(projected[3].x-projected[0].x,projected[3].y-projected[0].y);
    const shown=!hidden&&width>=700&&w>=70&&h>=24&&projected.every(p=>p.z>-1&&p.z<1&&p.x>8&&p.x<width-8&&p.y>90&&p.y<height-24)&&visible(center,null);
    const matrix=shown&&projectiveMatrix(projected,100,44);
    mount.style.visibility=matrix?'visible':'hidden';if(matrix){mount.style.transform='matrix3d('+matrix.join(',')+')';mount.dataset.surfaceCorners=JSON.stringify(projected);}
    const state=matrix?'visible':'fallback';if(document.body.dataset.sceneLanguage!==state)document.body.dataset.sceneLanguage=state;
  }
  return{layout,hover};
}
