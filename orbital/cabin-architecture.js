// A continuous pressure shell, with recessed glazing and a short docking collar.
// Coordinates share the original room frame; its legacy scale is applied by suite.js.
import {RoundedBoxGeometry} from './vendor/DeskRoundedBoxGeometry.js';
export function createCabinArchitecture(THREE, {walnut,metalBump,metalRoughness}) {
  const cabin=new THREE.Group();cabin.name='Continuous orbital cabin';
  const material=(color,roughness,metalness=0)=>new THREE.MeshPhysicalMaterial({color,roughness,metalness});
  const ceramic=material('#c2beb3',.64), lining=material('#cec6b6',.84), graphite=material('#30383d',.42,.68);
  const titanium=material('#929e9f',.30,.94), seal=material('#20282c',.94), solar=material('#102333',.30,.34);
  ceramic.clearcoat=.04;ceramic.clearcoatRoughness=.65;ceramic.envMapIntensity=.45;
  for(const m of [ceramic,titanium,graphite]){m.bumpMap=metalBump;m.bumpScale=m===ceramic?.0007:.0012;if(m!==ceramic)m.roughnessMap=metalRoughness;}
  function add(geometry,mat,name,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;cabin.add(m);return m;}
  function box(w,h,d,x,y,z,mat,name){return add(new RoundedBoxGeometry(w,h,d,2,Math.min(.012,w*.15,h*.15,d*.15)),mat,name,x,y,z);}
  function outline(w,h,r,cx=0,cy=0){
    const s=new THREE.Shape(),x=cx-w/2,y=cy-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
  }
  function extrude(shape,depth,z,mat,name){
    const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:32});
    // Average only side normals: keep cap edges crisp, curved pressure walls smooth.
    const positions=geometry.attributes.position,normals=geometry.attributes.normal,sums=new Map();
    const key=i=>`${positions.getX(i).toFixed(5)},${positions.getY(i).toFixed(5)}`;
    for(let i=0;i<positions.count;i++)if(Math.abs(normals.getZ(i))<.01){const k=key(i);if(!sums.has(k))sums.set(k,new THREE.Vector3());sums.get(k).add(new THREE.Vector3(normals.getX(i),normals.getY(i),0));}
    for(const value of sums.values())value.normalize();
    for(let i=0;i<positions.count;i++)if(Math.abs(normals.getZ(i))<.01){const n=sums.get(key(i));normals.setXYZ(i,n.x,n.y,0);}
    return add(geometry,mat,name,0,0,z);
  }
  function ring(outer,inner,depth,z,mat,name){outer.holes.push(inner);return extrude(outer,depth,z,mat,name);}
  function shell(w,h,r,t,depth,z,mat,name){return ring(outline(w,h,r,0,3.02),outline(w-t*2,h-t*2,r-t,0,3.02),depth,z,mat,name);}
  // Gentle corner radii and five joined shell bays replace the rectangular slabs.
  shell(14,6.65,2.65,.14,12.18,-6.06,graphite,'Continuous pressure shell');
  const bays=[-6.06,-3.8,-1.2,1.4,4.0,6.12];
  for(let i=0;i<bays.length-1;i++)shell(14.08,6.73,2.69,.065,bays[i+1]-bays[i]-.045,bays[i]+.018,ceramic,`Exterior shell bay ${i+1}`);
  for(let i=0;i<bays.length-1;i++)shell(13.70,6.35,2.5,.08,bays[i+1]-bays[i]-.024,bays[i]+.012,lining,'Removable interior lining panel '+(i+1));
  for(const z of [-3.8,1.4,6.0])shell(13.57,6.22,2.43,.018,.038,z,titanium,'Flush cabin joint');
  for(const z of bays.slice(1,-1))shell(14.08,6.73,2.69,.055,.025,z-.012,graphite,'Recessed exterior panel joint');
  // The floor ends at the shell. No exposed wooden platform or docking apron.
  const floor=walnut.clone();floor.map=walnut.map.clone();floor.map.repeat.set(8,6);floor.roughness=.82;floor.roughnessMap=null;floor.clearcoat=0;floor.bumpMap=walnut.bumpMap.clone();floor.bumpMap.repeat.set(8,6);floor.bumpScale=.006;
  box(11.0,.14,12.35,0,-.08,.025,floor,'Interior walnut deck');
  for(let x=-5.2;x<5.5;x+=.8)box(.006,.002,12.2,x,-.008,.025,graphite,'Fine deck seam');
  for(const x of [-5.44,5.44])box(.025,.14,11.95,x,.065,0,titanium,'Deck perimeter kick rail');
  // One wide rounded aperture: the frame sits at the perimeter of the view.
  ring(outline(14.08,6.73,2.69,0,3.02),outline(12.65,4.65,.82,0,3.48),.24,-6.3,ceramic,'Panoramic forward bulkhead');
  ring(outline(12.72,4.72,.86,0,3.48),outline(12.53,4.53,.76,0,3.48),.16,-6.14,seal,'Recessed window gasket');
  ring(outline(12.54,4.54,.76,0,3.48),outline(12.44,4.44,.71,0,3.48),.09,-5.98,titanium,'Slim window reveal');
  ring(outline(12.45,4.45,.72,0,3.48),outline(12.41,4.41,.70,0,3.48),.025,-5.87,graphite,'Inner glazing bead');
  function fastener(x,y,z,r=.014){
    const washer=add(new THREE.CylinderGeometry(r*1.5,r*1.5,.004,16),graphite,'Fastener recessed seat',x,y,z);washer.rotation.x=Math.PI/2;
    const head=add(new THREE.CylinderGeometry(r,r,.008,6),titanium,'Captive hex fastener',x,y,z+.003);head.rotation.x=Math.PI/2;
  }
  for(const x of [-5.7,-4.3,-2.8,-1.4,0,1.4,2.8,4.3,5.7])for(const y of [1.20,5.76])fastener(x,y,-5.86,.012);
  const glass=new THREE.MeshPhysicalMaterial({color:'#bfd5dc',roughness:.15,metalness:0,transparent:true,opacity:.032,depthWrite:false,clearcoat:.35,envMapIntensity:.12});
  const pane=add(new THREE.ShapeGeometry(outline(12.48,4.48,.72,0,3.48),32),glass,'Continuous panoramic glass',0,0,-6.03);pane.castShadow=false;
  // Aft bulkhead and a compact rounded collar. The aperture remains fully open.
  const hx=-2.72/.84;
  ring(outline(14.08,6.73,2.69,0,3.02),outline(2.6,4.9,.56,hx,2.47),.25,6.12,ceramic,'Rounded aft bulkhead');
  ring(outline(2.98,5.24,.75,hx,2.49),outline(2.6,4.9,.56,hx,2.47), .92,6.37,graphite,'Short docking neck');
  ring(outline(3.12,5.38,.83,hx,2.49),outline(2.6,4.9,.56,hx,2.47),.19,7.29,titanium,'Docking collar');
  ring(outline(2.7,5,.61,hx,2.47),outline(2.6,4.9,.56,hx,2.47),.055,7.48,seal,'Airlock gasket');
  box(2.35,.045,1.25,hx,.035,6.86,titanium,'Docking threshold');
  for(const side of [-1,1])for(const y of [1.15,2.47,3.79])fastener(hx+side*1.43,y,7.485,.022);
  for(const x of [hx-.75,hx,hx+.75])for(const y of [.035,4.95])fastener(x,y,7.485,.022);
  for(const y of [1.12,3.78]){
    box(.09,.32,.13,hx-1.61,y,7.25,titanium,'Docking latch housing');
    box(.035,.20,.15,hx-1.67,y,7.27,graphite,'Docking latch lever');
  }
  // Restrained service panels and structural brackets make each attachment legible.
  for(const x of [.4,3.7]){
    const panel=outline(2.65,2.3,.28,x,2.65);extrude(panel,.075,6.38,graphite,'Recessed service panel');
    const inset=outline(2.45,2.1,.2,x,2.65);extrude(inset,.08,6.4,ceramic,'Service cover');
    for(let i=0;i<7;i++)box(1.45,.022,.012,x,2.3+i*.085,6.489,graphite,'Service ventilation slot');
    for(const dx of [-.95,.95])box(.06,.24,.04,x+dx,2.65,6.5,titanium,'Service cover hinge');
    for(const dx of [-1.03,1.03])for(const dy of [-.8,.8]){
      fastener(x+dx,2.65+dy,6.49,.018);
    }
  }
  const labelCanvas=document.createElement('canvas');labelCanvas.width=768;labelCanvas.height=256;
  const ctx=labelCanvas.getContext('2d');ctx.clearRect(0,0,768,256);ctx.fillStyle='#36474b';
  ctx.font='600 80px Arial';ctx.fillText('JG / 01',24,102);ctx.font='25px monospace';ctx.fillText('ORBITAL RESEARCH',28,157);ctx.font='18px monospace';ctx.fillText('HABITAT  /  EARTH OBSERVATION',28,201);
  const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
  const label=add(new THREE.PlaneGeometry(2.8,.93),new THREE.MeshBasicMaterial({map:labelTexture,transparent:true,depthWrite:false}), 'Painted cabin identifier',1.55,4.72,6.379);label.castShadow=false;
  // Broad, thin solar wings pivot at their existing roots. Cell print remains
  // finer than the structural panel seams as the deployed area increases.
  const wingWidth=6.6,wingDepth=6.4,wingAngle=.16;
  const cellCanvas=document.createElement('canvas');cellCanvas.width=cellCanvas.height=1024;
  const cellContext=cellCanvas.getContext('2d');cellContext.fillStyle='#7f96a9';cellContext.fillRect(0,0,1024,1024);
  for(let row=0;row<24;row++)for(let column=0;column<24;column++){
    const x=column*1024/24,y=row*1024/24,size=1024/24;
    cellContext.fillStyle=(row+column)%3===0?'#d4dde6':'#c2d0dc';cellContext.fillRect(x+1.6,y+1.6,size-3.2,size-3.2);
    cellContext.fillStyle='#91a6b7';for(let line=1;line<4;line++)cellContext.fillRect(x+line*size/4,y+2,.55,size-4);
  }
  solar.map=new THREE.CanvasTexture(cellCanvas);solar.map.colorSpace=THREE.SRGBColorSpace;
  cabin.userData.solarLightmap=true;
  for(const side of [-1,1]){
    for(const z of [-1.65,1.65]){
      box(1.15,.13,.16,side*7.32,2.8,z,titanium,'Solar root spar');
      const joint=add(new THREE.CylinderGeometry(.18,.18,.22,24),graphite,'Solar hinge',side*7.72,2.8,z);joint.rotation.x=Math.PI/2;
    }
    const wing=new THREE.Group();wing.name='Supported solar wing';wing.position.set(side*(7.72+wingWidth/2*Math.cos(wingAngle)),2.8+wingWidth/2*Math.sin(wingAngle),0);wing.rotation.z=side*wingAngle;cabin.add(wing);
    function wingBox(w,h,d,x,y,z,mat,name){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.name=name;m.castShadow=true;m.receiveShadow=true;wing.add(m);}
    wingBox(wingWidth,.09,wingDepth,0,0,0,graphite,'Solar frame');wingBox(wingWidth-.14,.012,wingDepth-.16,0,.051,0,solar,'Blue photovoltaic cells');
    for(let i=-2;i<=2;i++)wingBox(.018,.016,wingDepth-.16,i*(wingWidth-.14)/5,.063,0,titanium,'Cell column');
    for(let i=-5;i<=5;i++)wingBox(wingWidth-.14,.017,.012,0,.064,i*(wingDepth-.16)/11,titanium,'Cell row');
  }
  // Concealed warm ceiling coves are a quiet, architectural light source.
  const cove=new THREE.MeshBasicMaterial({color:'#ffe0b4',toneMapped:true});
  for(const x of [-5.35,5.35])box(.035,.018,10.8,x,5.98,0,cove,'Recessed ceiling cove');
  let bakeIndex=0;cabin.traverse(o=>{if(o.isMesh&&!o.material.transparent){o.geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry;o.userData.bakeIndex=bakeIndex++;}});
  return cabin;
}
