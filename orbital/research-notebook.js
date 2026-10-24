// A small articulated notebook: linen-bound boards with rounded corners, a
// paper block with visible page edges, an elastic strap and a ribbon marker.
// Page content remains accessible HTML; the cover label texture comes from the caller.
import {RoundedBoxGeometry} from './vendor/DeskRoundedBoxGeometry.js';

function canvasTexture(THREE,w,h,draw,color=true){
  const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);if(color)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
// Deterministic noise so the cloth and paper look the same on every load.
function rng(seed){return()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};}

export function createResearchNotebook(THREE,labelMap){
  const group=new THREE.Group();group.name='Research notebook';
  // Book-cloth weave: fine warp/weft threads over a deep ink-blue ground.
  const weave=canvasTexture(THREE,512,512,(g,w,h)=>{
    g.fillStyle='#808080';g.fillRect(0,0,w,h);const r=rng(7);
    for(let y=0;y<h;y+=2){g.fillStyle=`rgba(255,255,255,${.05+r()*.09})`;g.fillRect(0,y,w,1);}
    for(let x=0;x<w;x+=2){g.fillStyle=`rgba(0,0,0,${.05+r()*.1})`;g.fillRect(x,0,1,h);}
    for(let i=0;i<900;i++){g.fillStyle=`rgba(${r()<.5?0:255},${r()<.5?0:255},${r()<.5?0:255},.05)`;g.fillRect(r()*w,r()*h,1+r()*3,1);}
  },false);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(3,2.2);
  const cloth=new THREE.MeshPhysicalMaterial({color:'#2b3442',roughness:.88,bumpMap:weave,bumpScale:.0011,roughnessMap:weave,sheen:.35,sheenRoughness:.8,sheenColor:new THREE.Color('#6c7a8c')});
  // Page block: stacked sheets read as faint horizontal striations on the edge.
  const edges=canvasTexture(THREE,64,256,(g,w,h)=>{
    g.fillStyle='#e9e2d0';g.fillRect(0,0,w,h);const r=rng(11);
    for(let y=0;y<h;y++){const v=200+r()*30|0;g.fillStyle=`rgba(${v-40},${v-48},${v-70},${.18+r()*.22})`;g.fillRect(0,y,w,1);}
  });
  const paper=new THREE.MeshStandardMaterial({color:'#efe7d4',roughness:.95,map:edges});
  const endpaper=new THREE.MeshStandardMaterial({color:'#e8dfca',roughness:.97});
  const elastic=new THREE.MeshStandardMaterial({color:'#1b1e24',roughness:.72});
  const ribbon=new THREE.MeshStandardMaterial({color:'#8c3f2e',roughness:.6,metalness:0});
  function part(geometry,material,x,y,z,parent=group){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  const board=(w,h,d)=>new RoundedBoxGeometry(w,h,d,3,Math.min(.006,h*.45));

  part(board(.70,.012,.50),cloth,0,-.022,0);
  // Paper block sits slightly inside the boards, as a real binding does.
  part(new RoundedBoxGeometry(.666,.033,.462,2,.004),paper,.004,0,0);
  part(board(.022,.047,.5),cloth,-.343,0,0);
  const cover=new THREE.Group();cover.name='Hinged notebook cover';cover.position.set(-.35,.025,0);group.add(cover);
  part(board(.70,.012,.50),cloth,.35,0,0,cover);
  part(new THREE.BoxGeometry(.663,.001,.46),endpaper,.35,-.0066,0,cover);
  // Debossed paper label: lit by the scene, not a glowing screen.
  const label=part(new THREE.PlaneGeometry(.36,.18),new THREE.MeshStandardMaterial({map:labelMap,roughness:.9}),.39,.0066,0,cover);
  label.rotation.x=-Math.PI/2;label.castShadow=false;
  // Elastic closure strap runs over the cover, near the fore-edge.
  part(new THREE.BoxGeometry(.012,.0025,.504),elastic,.62,.0072,0,cover);
  // Ribbon marker drapes out of the bottom of the block.
  const tail=part(new THREE.BoxGeometry(.016,.0008,.12),ribbon,.21,-.019,.285);tail.rotation.x=.18;
  return {group,cover,setOpen(value){cover.rotation.z=value*Math.PI*160/180;},
    center(){return group.localToWorld(new THREE.Vector3(-.20,.02,0));}};
}
