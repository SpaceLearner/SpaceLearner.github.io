import { textureAsset } from './asset-profile.js?v=a67911eab6f13824';
import { quality } from './quality-profile.js?v=72ab348954d7850d';
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from './vendor/RectAreaLightUniformsLib.js';
import { createDeskAssets } from './desk-assets.js?v=5a81780ab8b25ade';
import { createMouse, createDeskMat } from './desk-inputs.js?v=7979d33756ad1ab8';
import { applyInputBake } from './input-lightmap.js?v=6cc46599476c0c1b';
import { applyMugBake } from './coffee-mug.js?v=3b18c44ab7a38c04';
import { createShelfBooks } from './book-assets.js?v=3a17e0c9ea70dfa8';
import { createBed, applyBedBake } from './bed-assets.js?v=fd218e1f2e52272a';
import { createCabinArchitecture } from './cabin-architecture.js?v=9e44c4e9e4da1bf9';
import { applyCabinBake } from './cabin-lightmap.js?v=15f447780e7e70d1';
import { createOrbitalBackground } from './orbit-background.js?v=f1413e0b9d82c157';
import { createEntryHatch } from './entry-hatch.js?v=fbffef56921dcdef';
import { createEntryFlight, createEntryPlayback } from './entry-flight.js?v=95e58690863af5a6';
import { createVistaTransit } from './vista-transit.js?v=b6d66b3c8e4010ae';
import { createOrbitalView } from './orbital-view.js?v=1f10bc5f8f4013ff';
import { createVistaPicker } from './vista-picker.js?v=95c6230009bde26e';
import { createVistaLighting } from './vista-lighting.js?v=14263e296f7c4b3f';
import { createSurfaceReading } from './surface-reading.js?v=2cd67a956bc741a4';
import { createArmDemo } from './arm-demo.js?v=2b4b3be0fa35603c';
import { createLanguagePlacard } from './language-placard.js?v=1f98c8a79072db46';
import { createCabinInteractions } from './cabin-interactions.js?v=0b722074c6fbdb9c';
import { createObjectFocus } from './object-focus.js?v=25e2e646187e94da';
import { createPlant } from './plant.js?v=a91bcf41a243fdc0';
import { createResearchNotebook } from './research-notebook.js?v=bafef615e3309dee';

const canvas = document.getElementById('space');
const status = document.getElementById('status');
const fallback = document.getElementById('fallback');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const reduceMotion = motionPreference.matches;
const anchors = {};
const objects = [];
let paused = reduceMotion;
let renderer;
let stopEntry=()=>{};
const health=window.suiteHealth;
const track=(label,promise)=>health?health.task(label,promise,{optional:true}):promise;
const itemStart=THREE.DefaultLoadingManager.itemStart.bind(THREE.DefaultLoadingManager),itemEnd=THREE.DefaultLoadingManager.itemEnd.bind(THREE.DefaultLoadingManager);
THREE.DefaultLoadingManager.itemStart=url=>{health?.imageStart(url);itemStart(url);};
THREE.DefaultLoadingManager.itemEnd=url=>{health?.imageEnd(url);itemEnd(url);};
THREE.DefaultLoadingManager.onStart=(_url,loaded,total)=>health?.textures(loaded,total);
THREE.DefaultLoadingManager.onProgress=(_url,loaded,total)=>health?.textures(loaded,total);
THREE.DefaultLoadingManager.onError=url=>health?.textureError(url);

function showFallback(message) {
  health?.unavailable(message);
  stopEntry();
  document.body.classList.remove('entering');
  document.getElementById('entry-controls').hidden=true;
  document.getElementById('entry-replay').hidden=true;
  document.body.classList.remove('ready');
  document.body.classList.add('no-webgl');
  fallback.hidden = false;
  status.textContent = 'STANDARD EXPLORER / Standard browsing';
  if (message) document.getElementById('fallback-detail').textContent = message;
  canvas.hidden = true;
}

try {
  renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, powerPreference:'high-performance'});
  renderer.setPixelRatio(quality.pixelRatio(innerWidth,innerHeight));
  renderer.transmissionResolutionScale=quality.compact?.5:.75;
  document.body.dataset.quality=quality.textureTier;
  renderer.setSize(innerWidth, canvas.parentElement.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Static geometry needs its sunlight, Earthlight and lamp shadow maps only once.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  RectAreaLightUniformsLib.init();
  createSuite();
} catch (error) {
  console.warn('Orbital Suite could not start WebGL:', error);
  showFallback('WebGL 3D is unavailable in this browser. All research content remains accessible. Open this page in a browser with WebGL support to explore the cabin.');
}

function createSuite() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#010205');
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 260);camera.layers.enable(2);
  const room = new THREE.Group(); scene.add(room);
  const mat = (color, roughness=.65, metalness=.05) => new THREE.MeshPhysicalMaterial({color, roughness, metalness});
  const walnut=mat('#ffffff',.49), bronze=mat('#a3845a',.36,.88), shell=mat('#747672',.47,.7), dark=mat('#292d2e',.5,.55), ivory=mat('#c7c3b9',.92), upholstery=mat('#ab9f8a',.96), rugMat=mat('#77766c',1), black=mat('#131719',.38,.32), paper=mat('#d7d0bc',.95);
  const stone=mat('#a4a39c',.55,.02),leather=mat('#6a4630',.62);
  ivory.sheen=1;ivory.sheenRoughness=.85;ivory.sheenColor=new THREE.Color('#aca99e');upholstery.sheen=.8;upholstery.sheenRoughness=.95;
  walnut.clearcoat=.12;walnut.clearcoatRoughness=.65;
  const textures=new Map();
  const loadTex=(file,repeat,color=false)=>{const key=[file,...repeat,color].join(':');if(textures.has(key))return textures.get(key);const t=new THREE.TextureLoader().load(new URL('./textures/'+textureAsset(file),import.meta.url).href,()=>{window.dispatchEvent(new Event('suite-texture-ready'));});t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(color)t.colorSpace=THREE.SRGBColorSpace;textures.set(key,t);return t;};
  walnut.map=loadTex('walnut-color.jpg',[2,2],true);walnut.bumpMap=loadTex('walnut-bump.jpg',[2,2]);walnut.bumpScale=.014;walnut.roughnessMap=loadTex('walnut-roughness.jpg',[2,2]);
  for(const m of [ivory,upholstery,rugMat]){m.map=loadTex('linen-color.jpg',[5,5],true);m.bumpMap=loadTex('linen-bump.jpg',[5,5]);m.bumpScale=.011;m.roughnessMap=loadTex('linen-roughness.jpg',[5,5]);}
  for(const m of [bronze,shell,dark]){m.bumpMap=loadTex('metal-bump.jpg',[3,3]);m.bumpScale=.002;m.roughnessMap=loadTex('metal-roughness.jpg',[3,3]);}
  stone.map=loadTex('stone-color.jpg',[2,2],true);stone.bumpMap=loadTex('stone-bump.jpg',[2,2]);stone.bumpScale=.01;stone.roughnessMap=loadTex('stone-roughness.jpg',[2,2]);
  leather.bumpMap=loadTex('leather-bump.jpg',[3,3]);leather.bumpScale=.006;leather.roughnessMap=loadTex('leather-roughness.jpg',[3,3]);
  const warm=new THREE.MeshBasicMaterial({color:'#ffdcae'}), cool=new THREE.MeshBasicMaterial({color:'#8a989c'});
  const environment=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(environment,.04).texture;scene.environmentIntensity=.29;environment.dispose();pmrem.dispose();
  // Every furnishing is a volumetric mesh, with a real perspective camera and ray-cast hit testing.
  function mesh(geo, material, x=0,y=0,z=0,parent=room) { const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
  function box(w,h,d,x,y,z,material,parent=room){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);}
  function round(w,h,d,x,y,z,material,r=.12,parent=room){
    r=Math.min(r,w/2-.001,h/2-.001,d/2-.001);const shape=new THREE.Shape();const a=-w/2+r,b=-h/2+r,W=w-2*r,H=h-2*r;
    shape.moveTo(a,b-r);shape.lineTo(a+W,b-r);shape.quadraticCurveTo(a+W+r,b-r,a+W+r,b);shape.lineTo(a+W+r,b+H);shape.quadraticCurveTo(a+W+r,b+H+r,a+W,b+H+r);shape.lineTo(a,b+H+r);shape.quadraticCurveTo(a-r,b+H+r,a-r,b+H);shape.lineTo(a-r,b);shape.quadraticCurveTo(a-r,b-r,a,b-r);
    const g=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:r*.5,bevelThickness:r,curveSegments:16});g.translate(0,0,-d/2+r);return mesh(g,material,x,y,z,parent);
  }
  function cylinder(rt,rb,h,x,y,z,material,parent=room){return mesh(new THREE.CylinderGeometry(rt,rb,h,40),material,x,y,z,parent);}
  function sphere(r,x,y,z,material,parent=room){return mesh(new THREE.SphereGeometry(r,32,24),material,x,y,z,parent);}
  function lineBetween(a,b,r,material,parent=room){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b);const m=mesh(new THREE.CylinderGeometry(r,r,p.distanceTo(q),12),material,0,0,0,parent);m.position.copy(p).add(q).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return m;}
  function register(group,id,anchor){group.traverse(m=>{if(m.isMesh){m.userData.panel=id;objects.push(m);}});anchors[id]=new THREE.Vector3(...anchor);}
  function texture(draw,w=1024,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d'),fill=ctx.fillText.bind(ctx);let hasText=false;ctx.fillText=(value,...args)=>{hasText=true;fill(window.suiteI18n?.t(value)||value,...args);};draw(ctx,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.userData.redraw=()=>{ctx.clearRect(0,0,w,h);draw(ctx,w,h);t.needsUpdate=true;};if(hasText)window.addEventListener('suite-language-change',()=>{ctx.clearRect(0,0,w,h);draw(ctx,w,h);t.needsUpdate=true;window.dispatchEvent(new Event('suite-texture-ready'));});return t;}
  function screenTexture(title,subtitle,lines){return texture((c,w,h)=>{const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#25221d');bg.addColorStop(1,'#12100d');c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle='#d9bb86';c.font='18px monospace';c.fillText('JIAYAN GUO / ORBITAL RESEARCH',48,54);c.strokeStyle='#8a6a3c';c.lineWidth=2;c.beginPath();c.moveTo(48,78);c.lineTo(w-48,78);c.stroke();c.fillStyle='#efe9dc';c.font='52px Georgia';c.fillText(title,48,161);c.fillStyle='#b3aa9b';c.font='19px monospace';c.fillText(subtitle,50,205);lines.forEach((t,i)=>{c.fillStyle=i%2?'#b3aa9b':'#ece6da';c.font='22px monospace';c.fillText(t,50,290+i*53);});c.strokeStyle='#8fb4d9';c.globalAlpha=.5;for(let i=0;i<3;i++){c.beginPath();c.ellipse(790,340,106,35+i*20,-.5,0,Math.PI*2);c.stroke();}c.globalAlpha=1;});}
  function panel(w,h,x,y,z,t,parent){const m=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}),x,y,z,parent);m.castShadow=false;return m;}
  const publicationList=document.getElementById('papers').content.querySelector('.publications');
  const publicationCount=publicationList.children.length,publicationYears=publicationList.dataset.years||'2022 — 2026';
  let liveTick=0;const liveScreens=[];
  function desktopTexture(projects=false){const t=texture((c,w,h)=>{
    c.fillStyle='#14120f';c.fillRect(0,0,w,h);c.fillStyle='#1e1c19';c.fillRect(0,0,w,36);
    for(let i=0;i<3;i++){c.beginPath();c.arc(20+i*17,18,4,0,Math.PI*2);c.fillStyle=['#a07b72','#aa9974','#7f9286'][i];c.fill();}
    c.fillStyle='#8c8476';c.font='12px Arial';c.fillText('JIAYAN GUO  /  RESEARCH DESKTOP',390,23);
    c.fillStyle='#191714';c.fillRect(0,36,177,h-36);c.fillStyle='#d9bb86';c.font='bold 20px Georgia';c.fillText('JG /',25,89);
    ['Overview','Research','Projects','Publications'].forEach((label,i)=>{c.fillStyle=(projects?i===2:i===0)?'#2e2a24':'#191714';c.fillRect(14,123+i*47,148,34);c.fillStyle=(projects?i===2:i===0)?'#efe9dc':'#8c8476';c.font='15px Arial';c.fillText(label,27,145+i*47);});
    c.fillStyle='#8c8476';c.font='12px monospace';c.fillText('PERSONAL WORKSPACE',211,85);c.fillStyle='#efe9dc';c.font='46px Georgia';c.fillText(projects?'Selected research':'Jiayan Guo',209,151);
    const cards=projects?[['ZeroSearch','Search agents / reinforcement learning'],['RynnBrain','Embodied foundation models'],['WorldVLA · RynnVLA','Vision, language and action']]:[['01 / Agentic search and tool use','Query, read, reason, act on evidence'],['02 / Embodied agents','From what an agent sees to what it does'],['Research archive',publicationCount+' public records / '+publicationYears]];
    cards.forEach(([title,caption],i)=>{const y=231+i*99;c.fillStyle='#1e1c19';c.fillRect(209,y,775,83);c.strokeStyle='#3a3328';c.strokeRect(209,y,775,83);c.fillStyle='#d9bb86';c.font='23px Georgia';c.fillText(title,231,y+32);c.fillStyle='#a39a8b';c.font='16px Arial';c.fillText(caption,231,y+59);c.fillStyle='#d9bb86';c.font='19px Arial';c.fillText('↗',945,y+44);});
    c.fillStyle='#7a7265';c.font='11px monospace';c.textAlign='right';c.fillText('SELECT THE SCREEN TO READ',984,566);c.textAlign='left';
    // Live strip: an agent loop trace that scrolls one step at a time, plus a cursor.
    const steps=projects?['plan   · decompose task into 4 sub-goals','search · query "embodied spatial grounding"','read   · 6 documents, 2 relevant','act    · call tool: retrieve(paper, sec 3)','observe· result matches sub-goal 2','reflect· revise plan, continue']:['observe· desk, monitor, notebook, arm','plan   · pick up block, place in tray','act    · arm.move(approach)','observe· gripper aligned','act    · arm.grip(); arm.lift()','done   · task complete in 6 steps'];
    // Two-line console in the free band between the last card (ends y=512) and the footer (y=554).
    const tick=liveTick,first=tick%steps.length,prev=steps[first],cur=steps[(first+1)%steps.length];
    c.fillStyle='#100e0c';c.fillRect(209,516,775,28);c.font='11px monospace';
    c.fillStyle='#6e675b';c.fillText('  '+prev,216,527);c.fillStyle='#d9bb86';c.fillText('› '+cur,216,540);
    if(tick%2===0)c.fillRect(216+c.measureText('› '+cur).width+3,531,6,11);
    c.fillStyle='#7a7265';
  },1024,576);liveScreens.push(t);return t;}

  const cabin=createCabinArchitecture(THREE,{walnut,metalBump:bronze.bumpMap,metalRoughness:bronze.roughnessMap});room.add(cabin);
  // Covers the aft airlock aperture (outline 2.6 × 4.9 at x=-2.72/.84) just outside its gasket.
  const hatch=createEntryHatch(THREE,{x:-2.72/.84,y:2.47,z:7.6,width:2.66,height:4.96,radius:.6});room.add(hatch.group);
  track('cabin',applyCabinBake(THREE,cabin)).then(({count})=>{
    document.body.dataset.cabinBake=String(count);
    window.dispatchEvent(new Event('suite-texture-ready'));
  }).catch(error=>{
    document.body.dataset.cabinBake='unavailable';
    console.warn('Cabin lighting uses its realtime fallback.',error);
  });
  // The right lounge is a private suite, rather than an empty control room.
  round(4.6,.13,5.0,2.9,.01,1.6,rugMat,.055);
  for(let i=0;i<42;i++)box(4.3,.004,.006,2.9,.08,-.65+i*.11,mat('#6f7067',1));
  const bed=createBed(THREE,{walnut});bed.position.set(4.1,0,-3.25);bed.scale.x=.74;room.add(bed);
  track('bed',applyBedBake(THREE,bed)).then(({count})=>{document.body.dataset.bedBake='ready';document.body.dataset.bedBakeCount=String(count);window.dispatchEvent(new Event('suite-texture-ready'));}).catch(error=>{document.body.dataset.bedBake='unavailable';console.warn('Bed lighting uses its realtime fallback.',error);});
  // Lounge sofa, low table and a book left open under a warm pendant.
  round(3.2,.22,1.32,3.4,.39,1.65,leather,.055);
  for(const x of [2,4.8])for(const z of [1.16,2.1])cylinder(.035,.035,.27,x,.17,z,bronze);
  round(3.3,.78,.25,3.4,.99,1.02,upholstery,.08);
  for(const x of [2.61,4.18]){const back=round(1.45,.65,.24,x,1.01,1.2,ivory,.075);back.rotation.x=-.1;}
  for(const x of [1.85,4.95])round(.18,.52,1.4,x,.76,1.63,upholstery,.055);
  // Upholstery reads as filled fabric: seats dip where people sit, pillows bulge
  // at the centre and pinch at the corners. Deforms the rounded-box geometry in place.
  function cushionShape(w,h,d,x,y,z,material,{dip=0,puff=0,round:r=.4}={}){
    const g=new THREE.BoxGeometry(w,h,d,24,8,18),p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const u=p.getX(i)/(w/2),v=p.getY(i)/(h/2),t=p.getZ(i)/(d/2);
      // Round every edge: shrink each axis by how far the other two are toward a corner.
      const sx=1-r*.18*Math.pow(Math.max(Math.abs(v),Math.abs(t)),6),sy=1-r*.35*Math.pow(Math.max(Math.abs(u),Math.abs(t)),6),sz=1-r*.3*Math.pow(Math.max(Math.abs(u),Math.abs(v)),6);
      let X=p.getX(i)*sx,Y=p.getY(i)*sy,Z=p.getZ(i)*sz;
      const field=Math.max(0,1-u*u)*Math.max(0,1-t*t);
      // Seat dip: the top sinks most behind centre, where weight rests.
      if(dip&&v>0)Y-=dip*field*(.7+.3*Math.max(0,-t))*v;
      // Pillow puff: both large faces bulge, pinching toward the corners.
      if(puff){const bulge=puff*Math.max(0,1-u*u)*Math.max(0,1-v*v);Z+=Math.sign(t)*bulge*Math.abs(t);}
      p.setXYZ(i,X,Y,Z);
    }
    g.computeVertexNormals();return mesh(g,material,x,y,z);
  }
  for(const x of [2.62,4.15])cushionShape(1.41,.19,1.01,x,.64,1.55,ivory,{dip:.045});
  const cushion=cushionShape(.7,.56,.23,2.25,1.02,1.27,mat('#8a6a4c',.95),{puff:.025,round:.9});cushion.rotation.z=.18;
  const cushion2=cushionShape(.7,.56,.23,4.6,1.02,1.27,mat('#5f6b6c',.95),{puff:.025,round:.9});cushion2.rotation.z=-.14;
  cylinder(.8,.8,.07,2.6,.64,3.4,stone);cylinder(.09,.15,.6,2.6,.3,3.4,bronze);cylinder(.51,.57,.07,2.6,.07,3.4,dark);
  const notes=new THREE.Group();room.add(notes);
  // Paper cover label, redrawn on language change by texture().
  const notebookLabel=texture((g,w,h)=>{
    g.fillStyle='#e6dcc5';g.fillRect(0,0,w,h);let seed=23;const r=()=>(seed=seed*16807%2147483647)/2147483647;
    for(let i=0;i<2600;i++){g.fillStyle=`rgba(90,70,40,${r()*.05})`;g.fillRect(r()*w,r()*h,1,1);}
    g.strokeStyle='#7d5f33';g.lineWidth=3;g.strokeRect(34,34,w-68,h-68);g.lineWidth=1;g.strokeRect(46,46,w-92,h-92);
    g.textAlign='center';g.fillStyle='#2a2620';g.font='italic 400 92px "Iowan Old Style", Georgia, "Songti SC", serif';g.fillText('Research Notes',w/2,h*.47);
    g.fillStyle='#7d5f33';g.font='500 30px -apple-system, "Segoe UI", "PingFang SC", sans-serif';g.fillText(publicationCount+' PUBLICATIONS',w/2,h*.67);
    g.fillStyle='#6e675b';g.font='400 26px -apple-system, "Segoe UI", sans-serif';g.fillText(publicationYears,w/2,h*.79);
  },1024,512);
  const notebook=createResearchNotebook(THREE,notebookLabel);
  notebook.group.position.set(2.6,.70,3.55);notebook.group.rotation.y=-.18;notes.add(notebook.group);
  notes.scale.setScalar(.82);notes.position.set(-4.02,.896,-4.03);notes.rotation.y=.03;
  register(notes,'papers',[-1.8,1.72,-1.2]);
  cylinder(.08,.07,.2,2.13,.8,3.18,paper);cylinder(.071,.071,.005,2.13,.904,3.18,mat('#34251d'));
  const hoop=mesh(new THREE.TorusGeometry(.055,.012,12,24),paper,2.03,.81,3.18);hoop.rotation.y=Math.PI/2;
  // Fixed first-person workstation. The tabletop remains true volumetric geometry.
  const desktopWalnut=walnut.clone();desktopWalnut.map=loadTex('ai-walnut-desktop-v1.png',[1,1],true);desktopWalnut.roughness=.58;desktopWalnut.roughnessMap=null;desktopWalnut.bumpScale=.004;desktopWalnut.clearcoat=.08;
  const desktopSurface=round(4.6,.18,1.7,-3.15,1.35,-1.6,desktopWalnut,.055);desktopSurface.name='Preserved walnut desktop';
  desktopSurface.geometry.computeBoundingBox();
  const deskTop=desktopSurface.position.y+desktopSurface.geometry.boundingBox.max.y,matTop=deskTop+.003/.62;
  for(const x of [-5.05,-1.3]){round(.075,1.3,1.25,x,.65,-1.6,dark,.022);}
  // Metric hero assets: preserve fabrication proportions despite the room's legacy scale.
  const deskAssets=createDeskAssets(THREE,{monitor:desktopTexture(),terminal:desktopTexture(true)});
  function placeDeskAsset(g,x,y,z,scale=1,angle=0){
    const mount=new THREE.Group();room.add(mount);mount.position.set(x,y,z);mount.scale.set(1/.84,1/.62,1/.84);
    g.scale.setScalar(scale);g.rotation.y=angle;mount.add(g);return mount;
  }
  const monitor=placeDeskAsset(deskAssets.monitor,-3.7,1.468,-2,1.3);
  register(monitor,'monitor',[-3.7,2.6,-1.96]);
  const terminal=placeDeskAsset(deskAssets.terminal,-1.9,1.468,-1.73,1.2,-.12);
  register(terminal,'projects',[-1.9,2.12,-1.7]);
  // Independent physical language placard beside the monitor foot.
  const languagePanel=new THREE.Group();box(.29,.012,.065,0,.006,0,dark,languagePanel);box(.29,.12,.025,0,.066,0,dark,languagePanel);
  // Independent outward-facing textures keep both faces readable, never mirrored.
  const languageTexture=label=>texture((c,w,h)=>{c.fillStyle='#1e1c19';c.fillRect(0,0,w,h);c.fillStyle='#d9bb86';c.font='64px Arial';c.textAlign='center';c.fillText(label,w/2,h*.68);},256,128);
  const languageFace=panel(.27,.10,0,.066,.013,languageTexture('EN'),languagePanel);
  const languageBack=panel(.27,.10,0,.066,-.013,languageTexture('中'),languagePanel);languageBack.rotation.y=Math.PI;
  placeDeskAsset(languagePanel,-2.7,deskTop,-1.45,1,-.08);
  languagePanel.traverse(o=>{if(o.isMesh){o.userData.panel='language';objects.push(o);}});
  // Screen fill leaves the front surface, aimed slightly down at the desk.
  for(const [group,screen,intensity]of [[deskAssets.monitor,deskAssets.monitorScreen,.45],[deskAssets.terminal,deskAssets.terminalScreen,.24]]){
    const fill=new THREE.RectAreaLight('#c1cfd2',intensity,screen.width,screen.height);
    fill.position.set(...screen.position);fill.position.z+=.004;
    fill.lookAt(new THREE.Vector3(0,screen.position[1]-.22,.65));group.add(fill);
  }
  const keyboardMount=placeDeskAsset(deskAssets.keyboard,-3.65,matTop,-1.02,1.15);
  const mouseGroup=createMouse(THREE);placeDeskAsset(mouseGroup,-3.08,matTop,-1);
  // Compact ceramic/aluminium task lamp, kept below the window horizon.
  const lampBase=mat('#d2d0c6',.66,.08),lampStem=mat('#a3845a',.34,.9);
  cylinder(.13,.16,.045,-5.12,1.49,-1.96,lampBase);
  lineBetween([-5.12,1.52,-1.96],[-5.12,2.28,-1.96],.014,lampStem);
  lineBetween([-5.12,2.28,-1.96],[-4.96,2.33,-1.96],.014,lampStem);
  cylinder(.12,.19,.115,-4.96,2.29,-1.96,lampBase);
  cylinder(.165,.165,.008,-4.96,2.23,-1.96,warm);
  // A shielded task light: only the downward cone illuminates the work surface.
  const lampLight=new THREE.SpotLight('#ffd3a0',1.05,2.4,Math.PI/3.1,.78,2);
  lampLight.position.set(-4.96,2.21,-1.96);lampLight.target.position.set(-4.55,1.44,-1.3);
  lampLight.castShadow=true;lampLight.shadow.mapSize.set(1024,1024);
  lampLight.shadow.camera.near=.08;lampLight.shadow.camera.far=3;
  lampLight.shadow.bias=-.00008;lampLight.shadow.normalBias=.0015;
  room.add(lampLight,lampLight.target);
  // Desk chair.
  cylinder(.1,.13,.5,-3.5,.55,.1,bronze);cylinder(.55,.55,.05,-3.5,.11,.1,dark);
  round(1,.2,1,-3.5,.9,.1,upholstery,.09);round(1,.95,.22,-3.5,1.4,.5,upholstery,.1);
  // The articulated desktop arm opens its pick-up demonstration.
  const lab=placeDeskAsset(deskAssets.robot,-4.82,deskTop,-1.64,.9,.15);
  let armDemo=null;
  register(lab,'arm',[-4.78,2.37,-1.64]);
  const deskMat=createDeskMat(THREE);placeDeskAsset(deskMat,-3.5,deskTop,-1.05);
  let inputBakeIndex=0;
  for(const group of [deskAssets.keyboard,mouseGroup,deskMat])group.traverse(mesh=>{if(mesh.isMesh&&mesh.material.isMeshStandardMaterial){mesh.geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();mesh.userData.inputBakeIndex=inputBakeIndex++;}});
  track('inputs',applyInputBake(THREE,[deskAssets.keyboard,mouseGroup,deskMat])).then(result=>{document.body.dataset.inputBake=String(result.count);window.dispatchEvent(new Event('suite-texture-ready'));}).catch(error=>{document.body.dataset.inputBake='unavailable';console.warn('Desktop detail lighting unavailable:',error);});
  function cable(points,r=.004){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,8,false),black);}
  cable([[-3.7,1.51,-2],[-3.9,1.48,-2.2],[-4.4,1.47,-2.2],[-4.5,1.4,-2.3]]);
  cable([[-1.9,1.5,-1.75],[-2.05,1.47,-2],[-2.4,1.47,-2.2]]);
  cylinder(.055,.055,.012,-4.5,1.449,-2.23,dark);
  // Clear iced coffee at the approved cup position; the glass retains real wall thickness.
  placeDeskAsset(deskAssets.mug,-2.5,1.468,-1.9,1.15,-.4);
  track('cup',applyMugBake(THREE,deskAssets.mug)).then(result=>{document.body.dataset.mugBake=String(result.count);window.dispatchEvent(new Event('suite-texture-ready'));}).catch(error=>{document.body.dataset.mugBake='unavailable';console.warn('Cup detail lighting unavailable:',error);});
  // Leather notepad and pen sit right of the mouse, angled toward the seat; the left keeps the lamp and arm clear.
  const notepad=new THREE.Group();notepad.position.set(-1.72,0,-1.12);notepad.rotation.y=-.22;room.add(notepad);
  round(.38,.035,.48,0,1.47,0,leather,.014,notepad);
  for(let i=0;i<4;i++)box(.35,.002,.44,0,1.47+i*.004,0,paper,notepad);
  lineBetween([-.09,1.495,.18],[.09,1.495,-.18],.007,bronze,notepad);sphere(.009,.09,1.495,-.18,black,notepad);

  // Personal details: books, plant, shelving, pendant, wall art.
  const bookshelf=round(1.8,.065,.46,-5.72,3.6,-4.3,walnut,.025);bookshelf.name='Walnut books shelf';
  // Framed star chart on the left wall: a printed celestial map in a walnut frame,
  // drawn procedurally (no external art). Lit by the scene like any other print.
  const chart=texture((g,w,h)=>{
    g.fillStyle='#ebe2cc';g.fillRect(0,0,w,h);let seed=1931;const r=()=>(seed=seed*16807%2147483647)/2147483647;
    for(let i=0;i<5000;i++){g.fillStyle=`rgba(120,95,60,${r()*.06})`;g.fillRect(r()*w,r()*h,1,1);}
    const cx=w/2,cy=h*.46,R=h*.36;g.strokeStyle='#3b3428';g.lineWidth=2;g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.stroke();
    g.lineWidth=.8;g.strokeStyle='#3b342866';for(let k=1;k<4;k++){g.beginPath();g.arc(cx,cy,R*k/4,0,Math.PI*2);g.stroke();}
    for(let k=0;k<12;k++){const a=k*Math.PI/6;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);g.stroke();}
    g.strokeStyle='#7d5f33aa';g.lineWidth=1.4;g.beginPath();g.ellipse(cx,cy,R,R*.42,-.42,0,Math.PI*2);g.stroke();
    const stars=[];for(let i=0;i<160;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*R*.97,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d,m=r();stars.push([x,y]);g.fillStyle='#2a2620';g.beginPath();g.arc(x,y,.8+m*m*3.2,0,Math.PI*2);g.fill();}
    g.strokeStyle='#2a262088';g.lineWidth=.9;for(let c=0;c<7;c++){const s0=Math.floor(r()*stars.length);g.beginPath();g.moveTo(...stars[s0]);let cur=stars[s0];for(let k=0;k<4;k++){let best=null,bd=1e9;for(const st of stars){const dd=Math.hypot(st[0]-cur[0],st[1]-cur[1]);if(dd>12&&dd<bd&&dd<R*.32){bd=dd;best=st;}}if(!best)break;g.lineTo(...best);cur=best;}g.stroke();}
    g.fillStyle='#2a2620';g.textAlign='center';g.font='italic 400 30px "Iowan Old Style", Georgia, serif';g.fillText('Planisphaerium Coeleste',cx,h*.9);
    g.font='500 13px -apple-system, "Segoe UI", sans-serif';g.fillStyle='#7d5f33';g.fillText('N O R T H E R N   H E M I S P H E R E',cx,h*.945);
    g.strokeStyle='#3b3428';g.lineWidth=1;g.strokeRect(18,18,w-36,h-36);
  },512,640);
  const frame=new THREE.Group();frame.position.set(-6.74,3.55,-1.45);frame.rotation.y=Math.PI/2;room.add(frame);
  // Undo the room's non-uniform scale so the frame keeps its real proportions.
  frame.scale.set(1/.84,1/.62,1/.84);
  for(const [w,h,x,y] of [[.62,.04,0,.38],[.62,.04,0,-.38],[.04,.8,-.29,0],[.04,.8,.29,0]])box(w,h,.035,x,y,0,walnut,frame);
  box(.58,.76,.01,0,0,-.012,mat('#f3ede0',.95),frame);
  const print=mesh(new THREE.PlaneGeometry(.46,.575),new THREE.MeshStandardMaterial({map:chart,roughness:.85}),0,0,-.004,frame);print.castShadow=false;
  bookshelf.geometry.computeBoundingBox();
  const shelfBooks=createShelfBooks(THREE);shelfBooks.position.set(-5.72,bookshelf.position.y+bookshelf.geometry.boundingBox.max.y,-4.25);
  shelfBooks.scale.set(1/.84,1/.62,1/.84);room.add(shelfBooks);
  cylinder(.32,.22,.62,5.68,.4,3.3,bronze);
  const plant=createPlant(THREE,{});plant.position.set(5.68,.71,3.3);plant.scale.set(1/.84*1.15,1/.62*1.15,1/.84*1.15);room.add(plant);
  lineBetween([2.6,6.1,-.1],[2.6,3.7,-.1],.015,bronze);
  const pendant=mesh(new THREE.TorusGeometry(.48,.025,16,80),bronze,2.6,3.65,-.1);pendant.rotation.x=Math.PI/2;
  const diffuser=mesh(new THREE.TorusGeometry(.48,.012,12,80),warm,2.6,3.626,-.1);diffuser.rotation.x=Math.PI/2;
  const pendantLight=new THREE.PointLight('#ffd6a8',.7,4.2,2);pendantLight.position.set(2.6,3.4,-.1);room.add(pendantLight);

  // Thin upholstery piping, mattress seams, hardware and layered construction.
  const seam=mat('#a09b8e',.97);
  function piping(w,d,x,y,z,m=seam){const pts=[];const r=.055;for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;const px=Math.sign(Math.cos(a))*(w/2-r)+Math.cos(a)*r;const pz=Math.sign(Math.sin(a))*(d/2-r)+Math.sin(a)*r;pts.push(new THREE.Vector3(px+x,y,pz+z));}return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),100,.007,5,true),m);}
  for(const x of [2.62,4.15])piping(1.37,.97,x,.735,1.55);
  // Soft local contact shadows anchor every major piece to the floor.
  const shadowTexture=texture((c,w,h)=>{c.clearRect(0,0,w,h);const g=c.createRadialGradient(w/2,h/2,w*.04,w/2,h/2,w*.5);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.45,'rgba(0,0,0,.30)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,w,h);},128,128);
  function contact(w,d,x,z,opacity=.55,y=-.032){const m=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity,depthWrite:false,toneMapped:false});const o=mesh(new THREE.PlaneGeometry(w,d),m,x,y,z);o.rotation.x=-Math.PI/2;o.castShadow=false;o.receiveShadow=false;return o;}
  contact(4.2,2.2,3.4,1.65,.6,.084);contact(3.6,3.5,4.1,-3.25,.68);contact(4.9,2,-3.15,-1.6,.48);contact(1.5,1.5,-3.5,.1,.65);contact(2.3,2.1,2.6,3.4,.48,.084);contact(1.55,1.35,-5.55,1.55,.6);
  // Subtle tabletop contact shadows sit directly below the device feet.
  contact(.52,.34,-3.7,-2.04,.25,1.469);
  contact(.30,.24,-1.9,-1.77,.23,1.469);contact(.36,.32,-4.82,-1.64,.28,1.469);
  // Correct architectural proportions: human-scale ceiling and furniture heights.
  room.scale.set(.84,.62,.84);
  for(const anchor of Object.values(anchors))anchor.multiply(room.scale);

  // An open celestial field, with a smaller depth-tested Earth near the window edge.
  // At this apparent size the 2k maps are sufficient, including on desktop.
  const planetMap=loadTex('nasa-earth-surface.jpg',[1,1],true);
  const cloudMap=loadTex('nasa-earth-clouds.jpg',[1,1]);
  const lightsMap=loadTex('nasa-earth-lights.jpg',[1,1]);
  const orbit=createOrbitalBackground(THREE,planetMap,cloudMap,lightsMap);scene.add(orbit.group);
  const {sunDirection}=orbit;camera.far=800;camera.updateProjectionMatrix();

  scene.add(new THREE.HemisphereLight('#c9d4da','#7a6f60',.32));
  scene.add(new THREE.AmbientLight('#d2cec3',.05));
  const sunlight=new THREE.DirectionalLight('#eee8d9',2.1);
  sunlight.target.position.set(-2.65,1,-1.5);sunlight.position.copy(sunlight.target.position).addScaledVector(sunDirection,14);
  sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);
  // Concentrate the shadow map on the desktop; millimetre offsets keep feet grounded.
  Object.assign(sunlight.shadow.camera,{left:-3.2,right:3.2,top:3,bottom:-2.5,near:.1,far:28});
  sunlight.shadow.bias=-.00008;sunlight.shadow.normalBias=.002;sunlight.shadow.radius=2;
  scene.add(sunlight,sunlight.target);
  // Broad Earth-reflected light enters through the glass; the sun stays outside.
  // A soft shadowing key complements the area fill and anchors the desk objects.
  const earthKey=new THREE.DirectionalLight('#b9d1e0',.28);earthKey.name='Earthlight through the window';
  earthKey.target.position.set(-2.65,1,-1.5);
  earthKey.position.copy(earthKey.target.position).addScaledVector(orbit.center.clone().sub(earthKey.target.position).normalize(),10);
  earthKey.castShadow=true;earthKey.shadow.mapSize.set(2048,2048);
  Object.assign(earthKey.shadow.camera,{left:-3.2,right:3.2,top:2.5,bottom:-2.5,near:.1,far:15});
  earthKey.shadow.bias=-.00008;earthKey.shadow.normalBias=.001;earthKey.shadow.radius=3;
  scene.add(earthKey,earthKey.target);
  // Keep the full rectangular emitter below the roof: tilting this broad panel
  // made its far edge cross the pressure shell in the offline lighting bake.
  const interiorLight=new THREE.RectAreaLight('#f0dfc5',.72,8,4);interiorLight.name='Ceiling diffuse fill';interiorLight.position.set(-1,5.9,.3);interiorLight.rotation.x=-Math.PI/2;room.add(interiorLight);
  const windowFill=new THREE.RectAreaLight('#b8d5e7',.20,11,3.5);windowFill.position.set(0,3.4,-5.6);windowFill.lookAt(-3,1.4,-1);room.add(windowFill);
  const vistaLight=createVistaLighting(THREE,earthKey,windowFill);
  const orbitalView=createOrbitalView(THREE,scene,orbit);
  let viewAvailable=true,frameRequest=0,startupComplete=false;
  function requestFrame(){if(!startupComplete||!viewAvailable||document.hidden||frameRequest)return;frameRequest=requestAnimationFrame(render);}
  function invalidate(){needsRender=true;requestFrame();}

  // Seated first-person view: the eye position never moves, only bounded head rotation.
  let width=innerWidth,height=canvas.parentElement.clientHeight,mobile=width<600,needsRender=true;
  const cameraPosition=new THREE.Vector3(-2.72,1.65,.55);
  const cameraTarget=new THREE.Vector3(-2.66,1.42,-2.4);
  const entryPath=createEntryFlight(THREE,cameraPosition,cameraTarget);
  const forward=cameraTarget.clone().sub(cameraPosition).normalize();
  const baseYaw=Math.atan2(-forward.x,-forward.z),basePitch=Math.asin(forward.y);
  const yawLimit=THREE.MathUtils.degToRad(30),pitchLimit=THREE.MathUtils.degToRad(15);
  const dragThreshold=6,sensitivity=.0025;
  let yaw=0,pitch=0,gesture=null,suppressClick=false,entry=null,objectFocus=null;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();raycaster.layers.enable(2);
  function updateLook(){if(entry?.active||objectFocus?.active)return;yaw=THREE.MathUtils.clamp(yaw,-yawLimit,yawLimit);pitch=THREE.MathUtils.clamp(pitch,-pitchLimit,pitchLimit);camera.position.copy(cameraPosition);camera.rotation.set(basePitch+pitch,baseYaw+yaw,0,'YXZ');camera.updateMatrixWorld();invalidate();}
  function resize(){width=canvas.parentElement.clientWidth;height=canvas.parentElement.clientHeight;mobile=width<600;renderer.setPixelRatio(quality.pixelRatio(width,height,!!entry?.active));renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=mobile?79:59;camera.updateProjectionMatrix();if(entry?.active){entryPath.sample(entry.progress,camera);invalidate();}else if(objectFocus?.active){objectFocus.resize();layoutReading();}else updateLook();}
  const motionButton=document.getElementById('motion');
  const entryControls=document.getElementById('entry-controls'),skipButton=document.getElementById('entry-skip'),replayButton=document.getElementById('entry-replay'),recenterButton=document.getElementById('recenter');
  const hint=document.getElementById('hint');
  function updateMotion(){motionButton.textContent=paused?'Resume ambient motion':'Pause ambient motion';motionButton.setAttribute('aria-pressed',String(paused));motionButton.setAttribute('aria-label',paused?'Resume ambient motion':'Pause ambient motion');}
  updateMotion();motionButton.addEventListener('click',()=>{paused=!paused;armDemo?.suspend('ambient',paused);orbit.suspendMotion();if(paused)transit.settle('pause');updateMotion();invalidate();});
  const vistaControl=document.getElementById('vista-control'),vistaCaption=document.getElementById('vista-caption');
  vistaControl.hidden=false;
  vistaControl.querySelector('#vista-value').value='earth';document.body.dataset.vista='earth';
  createVistaPicker(vistaControl);
  const vistaName=v=>v==='earth'?'Earth':'Gargantua';
  let transitStage='idle';
  function updateVista(vista){
    orbit.setVista(vista);
    document.body.dataset.vista=vista;invalidate();
  }
  const transit=createVistaTransit({
    onCommit:updateVista,
    onFrame(state){
      orbitalView.setTransit(state);vistaLight.update(state);
      // A small FOV push sells acceleration; the window light pulses with the crossing flash.
      const kick=state.active&&!state.lowMotion?Math.sin(Math.PI*Math.min(1,state.progress/.5))**2*(1-Math.min(1,Math.max(0,(state.progress-.5)/.4))):0;
      const baseFov=mobile?79:59;if(!objectFocus?.active&&!entry?.active){camera.fov=baseFov+kick*6;camera.updateProjectionMatrix();}
      const pulse=state.active&&!state.lowMotion?Math.exp(-(((state.progress-.48)/.04)**2)):0;windowFill.intensity*=1+pulse*5;earthKey.intensity*=1+pulse*3;
      invalidate();
      const stage=!state.active?'idle':state.lowMotion?'quiet':state.progress<.25?'charging':state.progress<.7?'transit':'arriving';
      if(stage!==transitStage){transitStage=stage;document.body.dataset.transit=stage;
        if(state.active)vistaCaption.textContent='Switching to '+vistaName(state.desired);
      }
    },
    onState(state){
      vistaControl.setAttribute('aria-busy',String(state.active));document.body.classList.toggle('jumping',state.active);
      if(state.active)vistaCaption.textContent='Switching to '+vistaName(state.desired);
      else vistaCaption.textContent='';
    }
  });
  vistaControl.addEventListener('change',e=>{
    if(e.target.name!=='vista')return;
    transit.request(e.target.value,{quiet:paused||motionPreference.matches||entry?.active||objectFocus?.active});
  });
  function intersect(x,y){const r=canvas.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(objects.filter(mesh=>mesh.visible),false)[0]?.object.userData.panel;}
  canvas.addEventListener('pointerdown',e=>{if(entry?.active||objectFocus?.active||e.isPrimary===false||e.button!==0||gesture)return;suppressClick=false;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch,dragging:false};canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
    if(entry?.active||objectFocus?.active)return;
    if(gesture&&gesture.id===e.pointerId){const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.dragging&&dx*dx+dy*dy>dragThreshold*dragThreshold)gesture.dragging=true;if(gesture.dragging){suppressClick=true;yaw=gesture.yaw+dx*sensitivity;pitch=gesture.pitch+dy*sensitivity;updateLook();canvas.style.cursor='grabbing';}return;}
    if(!gesture){const id=intersect(e.clientX,e.clientY);canvas.style.cursor=id?'pointer':'grab';cabinInteractions?.hover(id);}
  });
  canvas.addEventListener('pointerleave',()=>cabinInteractions?.hover(null));
  function endGesture(e,cancelled=false){if(!gesture||gesture.id!==e.pointerId)return;suppressClick=cancelled||gesture.dragging;gesture=null;canvas.style.cursor='grab';if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
  canvas.addEventListener('pointerup',e=>endGesture(e));
  canvas.addEventListener('pointercancel',e=>endGesture(e,true));
  canvas.addEventListener('lostpointercapture',e=>endGesture(e,true));
  canvas.addEventListener('click',e=>{if(entry?.active||suppressClick){e.preventDefault();return;}const id=intersect(e.clientX,e.clientY);if(id==='language'){languageFlip.toggle();return;}if(id==='arm'){demoOpen.click();return;}if(id)window.suiteOpen(id==='monitor'?'about':id==='papers'?'research':id,canvas,{focus:id==='about'||id==='monitor'?'monitor':id==='papers'?'notebook':id==='research'?'monitor':id==='projects'?'terminal':''});});
  function recenter(){if(objectFocus?.active)return;if(entry?.active){entry.skip();return;}if(gesture)endGesture({pointerId:gesture.id},true);yaw=0;pitch=0;updateLook();}
  document.getElementById('recenter').addEventListener('click',recenter);
  canvas.addEventListener('keydown',e=>{const id={1:'about',2:'research',3:'projects',4:'papers'}[e.key];if(id){e.preventDefault();window.suiteOpen(id,canvas,{focus:id==='about'?'monitor':id==='papers'?'notebook':id==='research'?'monitor':id==='projects'?'terminal':''});return;}const step=THREE.MathUtils.degToRad(3);if(e.key==='Home'){e.preventDefault();recenter();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(entry?.active||objectFocus?.active)return;if(e.key==='ArrowLeft')yaw+=step;if(e.key==='ArrowRight')yaw-=step;if(e.key==='ArrowUp')pitch+=step;if(e.key==='ArrowDown')pitch-=step;updateLook();}});
  const sheet=document.getElementById('sheet');
  const surfaces=createSurfaceReading(THREE,{camera,sheet,room,
    screen:kind=>kind==='monitor'?deskAssets.monitorScreen:deskAssets.terminalScreen,
    notebook,viewport:()=>({width,height})});
  const focusTarget=kind=>{
    if(kind!=='arm')return surfaces.target(kind);
    const robot=deskAssets.robot;robot.updateWorldMatrix(true,true);
    const center=robot.localToWorld(new THREE.Vector3(.12,.32,.08));
    const direction=new THREE.Vector3(.30,.20,1).transformDirection(robot.matrixWorld);
    const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    const distance=Math.max(.9,.66/(2*tangent)*height/Math.max(120,height-220),.74/(2*tangent)*height/Math.max(200,width-40));
    const pose=new THREE.PerspectiveCamera();pose.fov=camera.fov;pose.position.copy(center).addScaledVector(direction,distance);pose.lookAt(center);
    return {position:pose.position,quaternion:pose.quaternion,fov:pose.fov};
  };
  function layoutReading(){
    if(objectFocus?.active&&sheet.dataset.object)surfaces.layout(objectFocus.kind);
  }
  objectFocus=createObjectFocus(THREE,{camera,book:notebook,target:focusTarget,reduced:()=>motionPreference.matches,
    changed(){invalidate();layoutReading();},
    phase(value,kind){
      document.body.dataset.objectFocus=value;document.body.dataset.focusObject=kind;
      recenterButton.disabled=replayButton.disabled=value!=='idle';
      canvas.setAttribute('aria-busy',String(value==='approaching'||value==='returning'));
      if(value==='idle'){canvas.removeAttribute('aria-busy');canvas.style.cursor='grab';}
      document.getElementById('arm-demo-controls').hidden=kind!=='arm'||value!=='reading';
      invalidate();
    }
  });
  window.suiteFocus={
    enter(kind,options){
      if(gesture)endGesture({pointerId:gesture.id},true);
      if(kind!=='arm')armDemo?.pause();
      entry?.skip();transit.settle('object-reading');
      return objectFocus.enter(kind,options);
    },
    leave(options){objectFocus.leave(options);},finish(){objectFocus.finish();},layout:layoutReading
  };
  let entryStorage=null;try{entryStorage=window.sessionStorage;}catch{/* Private storage denial defaults to skipping autoplay. */}
  entry=createEntryPlayback({storage:entryStorage,reduceMotion:()=>motionPreference.matches||document.getElementById('sheet').open||!!location.hash&&location.hash!=='#home',
    onStart(){
      armDemo?.pause();objectFocus.leave({instant:true});transit.settle('entry');
      if(gesture)endGesture({pointerId:gesture.id},true);yaw=0;pitch=0;suppressClick=true;
      document.body.classList.add('entering');entryControls.hidden=false;
      recenterButton.disabled=motionButton.disabled=replayButton.disabled=true;
      canvas.setAttribute('aria-busy','true');canvas.style.cursor='default';
      status.textContent='Entering the cabin · About 5 seconds';hint.textContent='Skip at any time to go straight to the desk';
      renderer.setPixelRatio(quality.pixelRatio(width,height,true));
    },
    onFrame(progress){hatch.set(progress);entryPath.sample(progress,camera);invalidate();},
    onFinish(reason){
      document.body.classList.remove('entering');entryControls.hidden=true;
      recenterButton.disabled=motionButton.disabled=replayButton.disabled=false;
      canvas.removeAttribute('aria-busy');canvas.style.cursor='grab';yaw=0;pitch=0;updateLook();
      status.textContent='At the desk';
      hint.textContent='Drag to look around · Click anything on the desk';renderer.setPixelRatio(quality.pixelRatio(width,height));
      if(reason!=='unavailable'&&(document.activeElement===skipButton||document.activeElement===replayButton))canvas.focus({preventScroll:true});
    }
  });
  stopEntry=()=>{armDemo?.pause();document.getElementById('arm-demo-entry').hidden=true;document.getElementById('arm-demo-controls').hidden=true;viewAvailable=false;cancelAnimationFrame(frameRequest);frameRequest=0;objectFocus.disable();delete window.suiteFocus;window.dispatchEvent(new Event('suite-focus-unavailable'));entry.disable();transit.disable();orbitalView.dispose();};
  skipButton.addEventListener('click',()=>entry.skip());
  replayButton.addEventListener('click',()=>{if(!objectFocus.active&&!document.querySelector('dialog[open]'))entry.start({replay:true});});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&entry.active){e.preventDefault();entry.skip();}else if(e.key==='Escape'&&transit.active){e.preventDefault();transit.settle('skip');}});
  window.addEventListener('suite-panel-open',()=>{armDemo?.pause();entry.skip();transit.settle('panel');});
  let reading=!!document.querySelector('dialog[open]'),lastSceneFrame=-Infinity;
  window.addEventListener('suite-reading-change',e=>{reading=e.detail.active;armDemo?.suspend('reading',reading);orbit.suspendMotion();invalidate();lastSceneFrame=-Infinity;});
  document.addEventListener('visibilitychange',()=>{armDemo?.suspend('hidden',document.hidden);entry.suspend();objectFocus.suspend();orbit.suspendMotion();if(document.hidden){transit.settle('hidden');cancelAnimationFrame(frameRequest);frameRequest=0;}else invalidate();});
  window.addEventListener('pagehide',()=>{armDemo?.suspend('hidden',true);objectFocus.suspend();orbit.suspendMotion();transit.settle('pagehide');cancelAnimationFrame(frameRequest);frameRequest=0;});
  window.addEventListener('pageshow',()=>{armDemo?.suspend('hidden',document.hidden);invalidate();});
  motionPreference.addEventListener?.('change',e=>{if(e.matches){entry.skip();transit.settle('reduced-motion');objectFocus.finish();paused=true;armDemo?.reducedChanged();armDemo?.suspend('ambient',true);orbit.suspendMotion();updateMotion();invalidate();}else if(armDemo)demoUI(armDemo.state);});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showFallback('The 3D graphics context was lost. All content is still available below. Reload the page to try the cabin again.');});
  window.addEventListener('resize',resize);window.addEventListener('suite-texture-ready',()=>{invalidate();});
  // Dynamic browser bars can resize the scene without changing the layout viewport.
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(canvas.parentElement);
  const demoOpen=document.getElementById('arm-demo-entry'),demoRun=document.getElementById('arm-demo-run'),demoPause=document.getElementById('arm-demo-pause'),demoStep=document.getElementById('arm-demo-step'),demoReset=document.getElementById('arm-demo-reset');
  let lastArmActive=false,lastArmShadow=-Infinity;
  // Keep shadows cached at rest; refresh all shadow casters at a capped rate
  // during the short demonstration so links do not leave stale shadows.
  scene.traverse(light=>{if(light.isLight&&light.shadow){light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;}});
  function demoUI(state){
    if(lastArmActive!==state.active){lastArmActive=state.active;scene.traverse(light=>{if(light.isLight&&light.shadow)light.shadow.needsUpdate=true;});renderer.shadowMap.needsUpdate=true;lastArmShadow=-Infinity;}

    demoRun.disabled=state.active;demoPause.hidden=!state.active||state.stepMode;demoStep.hidden=!state.active||!state.stepMode;
    demoPause.textContent=state.paused?'Resume':'Pause';demoReset.disabled=!state.active||state.resetting;
    document.getElementById('arm-demo-status').textContent=(state.active&&state.paused&&!state.stepMode?'Paused · ':'')+state.phase;
    document.getElementById('arm-demo-note').textContent=state.stepMode?'Step-by-step · Scripted motion, not a physics simulation':'Scripted motion · Not a physics simulation';
    demoRun.textContent=motionPreference.matches?'View steps':'Run once';
    document.body.dataset.armDemo=state.active?(state.stepMode?'steps':state.paused?'paused':'running'):'idle';
  }
  armDemo=createArmDemo(THREE,deskAssets.robot,{changed(){scene.traverse(light=>{if(light.isLight&&light.shadow)light.shadow.needsUpdate=true;});renderer.shadowMap.needsUpdate=true;invalidate();},onState:demoUI,reduced:()=>motionPreference.matches});
  armDemo.suspend('ambient',paused);demoOpen.hidden=false;
  function openDemo(){window.suiteFocus.enter('arm',{done:()=>demoRun.focus({preventScroll:true})});}
  demoOpen.addEventListener('click',openDemo);
  demoRun.addEventListener('click',()=>{armDemo.start();invalidate();if(armDemo.state.stepMode)demoStep.focus({preventScroll:true});});
  demoPause.addEventListener('click',()=>{if(armDemo.state.paused){paused=false;armDemo.suspend('ambient',false);updateMotion();armDemo.resume();}else armDemo.pause();invalidate();});
  demoStep.addEventListener('click',()=>{armDemo.step();invalidate();});
  demoReset.addEventListener('click',()=>{armDemo.reset();invalidate();});
  function leaveDemo(){armDemo.pause();objectFocus.leave({done:()=>requestAnimationFrame(()=>{const target=getComputedStyle(demoOpen).visibility==='visible'?demoOpen:document.querySelector('#cabin-menu summary');target.focus({preventScroll:true});})});}
  document.getElementById('arm-demo-back').addEventListener('click',leaveDemo);
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&objectFocus.kind==='arm'){event.preventDefault();leaveDemo();}});
  let applyingLanguage=false;
  const languageFlip=createLanguagePlacard({group:languagePanel,language:()=>window.suiteI18n.language,
    apply(next){applyingLanguage=true;try{window.suiteI18n.setLanguage(next);}finally{applyingLanguage=false;}},
    changed(){scene.traverse(light=>{if(light.isLight&&light.shadow)light.shadow.needsUpdate=true;});renderer.shadowMap.needsUpdate=true;invalidate();},
    reduced:()=>motionPreference.matches,ready:()=>startupComplete,
    facing(){const normal=languageFace.getWorldDirection(new THREE.Vector3()),center=languageFace.getWorldPosition(new THREE.Vector3());return normal.dot(camera.position.clone().sub(center))>=0?'en':'zh';}});
  window.suiteLanguageFlip=languageFlip;
  window.addEventListener('suite-language-change',()=>{if(!applyingLanguage)languageFlip.sync();});
  motionPreference.addEventListener('change',()=>{if(motionPreference.matches)languageFlip.settle();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)languageFlip.settle();});
  window.addEventListener('pagehide',()=>languageFlip.settle());
  window.addEventListener('suite-startup-unavailable',()=>languageFlip.disable());
  // Optional local review instrumentation, absent from normal visits.
  if(new URLSearchParams(location.search).has('arm-debug'))window.armDemoDebug={controls:{languageFace,languageBack,languagePanel,languageFlip},demo:armDemo,robot:deskAssets.robot,camera,renderer,scene,obstacles:{keyboard:deskAssets.keyboard,coffee:deskAssets.mug,monitor:deskAssets.monitor,terminal:deskAssets.terminal,mouse:mouseGroup,notepad,lamp:room.children.filter(m=>m.isMesh&&[lampBase,lampStem,warm].includes(m.material))},info:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,rigCalls:deskAssets.robot.armRig.drawCalls})};
  resize();
  const projected=new THREE.Vector3();
  const cabinInteractions=createCabinInteractions(THREE,{scene,camera,canvas,viewport:()=>({width,height}),inactive:()=>entry.active||objectFocus.active,
    targets:{monitor:()=>deskAssets.monitorScreen.mesh.getWorldPosition(new THREE.Vector3()),projects:()=>deskAssets.terminalScreen.mesh.getWorldPosition(new THREE.Vector3()),arm:()=>deskAssets.robot.localToWorld(new THREE.Vector3(.03,.25,.09)),papers:()=>notebook.group.localToWorld(new THREE.Vector3(.03,.04,0))},languageFace,languagePanel,languageFlip,changed:invalidate});
  function render(ms){
    frameRequest=0;
    if(!viewAvailable||document.hidden)return;
    entry.tick(ms);
    transit.tick(ms);
    objectFocus.tick(ms);
    languageFlip.tick(ms);
    if(ms-lastSceneFrame>=1000/quality.fps)armDemo?.tick(ms);
    // Earth samples UTC; local environmental motion uses a suspendable clock.
    // Opaque reading panels freeze the background; user-driven camera motion stays live.
    if(!paused&&!reading&&ms-lastSceneFrame>=1000/quality.fps){orbit.setTime(Date.now(),ms);needsRender=true;}
    if(!paused&&!reading&&!entry.active){const next=Math.floor(ms/800);if(next!==liveTick){liveTick=next;for(const t of liveScreens)t.userData.redraw();needsRender=true;}}
    if(needsRender){if((armDemo?.moving||languageFlip.moving)&&lastArmShadow!==-Infinity&&ms-lastArmShadow<1000/(quality.constrained||quality.compact?10:15))scene.traverse(light=>{if(light.isLight&&light.shadow)light.shadow.needsUpdate=false;});else if(renderer.shadowMap.needsUpdate)lastArmShadow=ms;lastSceneFrame=ms;orbit.update(camera);orbitalView.render(renderer,camera);cabinInteractions.layout();needsRender=false;}
    if((!paused&&!reading)||entry.active||transit.active||objectFocus.moving||armDemo?.moving||languageFlip.moving||needsRender)requestFrame();
  }
  window.addEventListener('suite-startup-unavailable',()=>stopEntry());
  health.ready(async()=>{
    if(entry.willAutoplay&&!location.hash.includes('@'))entryPath.sample(0,camera);
    orbit.update(camera);
    if(renderer.compileAsync)await renderer.compileAsync(scene,camera);
    if(!viewAvailable)return;
    orbitalView.render(renderer,camera);
  },()=>{
    if(!viewAvailable)return;
    startupComplete=true;document.body.classList.add('ready');document.getElementById('fallback').hidden=true;
    entry.start();window.dispatchEvent(new Event('suite-focus-ready'));requestFrame();
  });
}
