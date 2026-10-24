import {createKeyboard} from './desk-inputs.js?v=7979d33756ad1ab8';
import {createCoffeeMug} from './coffee-mug.js?v=3b18c44ab7a38c04';
import {createResearchArm} from './research-arm.js?v=4595f80e5861bbed';
import { RoundedBoxGeometry } from './vendor/DeskRoundedBoxGeometry.js';

/** Original desktop models. Metres, +Y up, +Z toward the seated viewer.
 * Each group has its origin at tabletop contact. Do not squash individual axes.
 * Optional maps: {monitor: THREE.Texture, terminal: THREE.Texture}.
 * Screen records include local position, dimensions, and the actual mesh.
 */
export function createDeskAssets(THREE, maps = {}) {
  const standard = (color, roughness, metalness = 0, more = {}) =>
    new THREE.MeshPhysicalMaterial({color, roughness, metalness, ...more});
  const materials = {
    aluminum: standard('#b2a690', .30, .88),
    edge: standard('#cfc2a6', .22, .92),
    graphite: standard('#2b2824', .57, 0),
    abs: standard('#1c1a17', .62, 0),
    rubber: standard('#111516', .91),
    gasket: standard('#080c0e', .77),
    whiteKey: standard('#d6cdb9', .55, 0),
    greyKey: standard('#5a534a', .60, 0),
    ceramic: standard('#c9c5b7', .29, 0, {clearcoat:.42, clearcoatRoughness:.18, ior:1.48}),
    unglazed: standard('#a7a08c', .88),
    coffee: standard('#22140c', .20, 0, {clearcoat:.46, clearcoatRoughness:.15}),
    robotPaint: standard('#c9c1b0', .42, .06, {clearcoat:.18, clearcoatRoughness:.36}),
    robotAccent: standard('#a3845a', .36, .86),
    hardware: standard('#a3845a', .28, .92),
    recess: standard('#090c0e', .82)
  };
  // Fine roughness only: fabrication texture should never read as large scratches.
  function surfaceTexture(brushed=false) {
    // 256px with value noise and no short integer period, so the grain no longer
    // tiles into a visible grid; brushing adds long, slightly wavering strokes.
    const n=256,data=new Uint8Array(n*n*4);
    const hash=(x,y)=>{let h=Math.imul(x*374761393+y*668265263,1274126177);h^=h>>>13;return ((h>>>0)%1024)/1023;};
    const smooth=(x,y,cell)=>{const gx=x/cell,gy=y/cell,ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),w=n/cell;
      const v=(a,b)=>hash(((a%w)+w)%w,((b%w)+w)%w);return (v(ix,iy)*(1-sx)+v(ix+1,iy)*sx)*(1-sy)+(v(ix,iy+1)*(1-sx)+v(ix+1,iy+1)*sx)*sy;};
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const i=(y*n+x)*4,grain=hash(x,y)*.45+smooth(x,y,8)*.35+smooth(x,y,32)*.2;
      const stroke=brushed?(hash(0,y)*.7+smooth(x,y*8,64)*.3-.5)*22:0;
      const v=Math.max(0,Math.min(255,Math.round(214+grain*34+stroke)));
      data.set([v,v,v,255],i);
    }
    const t=new THREE.DataTexture(data,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.repeat.set(brushed?1.5:3,3);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=8;t.needsUpdate=true;return t;
  }
  const fineGrain=surfaceTexture(),brushing=surfaceTexture(true);
  for(const name of ['abs','graphite','whiteKey','greyKey','robotPaint'])materials[name].roughnessMap=fineGrain;
  for(const name of ['aluminum','edge','hardware'])materials[name].roughnessMap=brushing;
  const cache = new Map();
  const V = p => new THREE.Vector3(...p);
  function geo(key, make) { if(!cache.has(key)) cache.set(key, make()); return cache.get(key); }
  function part(parent, geometry, material, position=[0,0,0], name='') {
    const m = new THREE.Mesh(geometry, material); m.position.set(...position);
    m.castShadow=true; m.receiveShadow=true; m.name=name; parent.add(m); return m;
  }
  function rb(p,w,h,d,r,mat,pos,name='',segments=2) {
    r=Math.min(r,w*.49,h*.49,d*.49);
    return part(p,geo(`r:${w}:${h}:${d}:${r}:${segments}`,()=>new RoundedBoxGeometry(w,h,d,segments,r)),mat,pos,name);
  }
  function cyl(p,rt,rb,h,mat,pos,name='',n=32) {
    return part(p,geo(`c:${rt}:${rb}:${h}:${n}`,()=>new THREE.CylinderGeometry(rt,rb,h,n)),mat,pos,name);
  }
  function torus(p,r,t,mat,pos,axis='y',name='') {
    const m=part(p,geo(`t:${r}:${t}`,()=>new THREE.TorusGeometry(r,t,6,40)),mat,pos,name);
    if(axis==='y')m.rotation.x=Math.PI/2; if(axis==='x')m.rotation.y=Math.PI/2; return m;
  }
  function tube(p,points,r,mat,name='',steps=24,radialSegments=8) {
    return part(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(V)),steps,r,radialSegments,false),mat,[0,0,0],name);
  }
  function beam(p,a,b,w,d,r,mat,name) {
    const start=V(a),end=V(b);const m=rb(p,w,start.distanceTo(end),d,r,mat,[0,0,0],name);
    m.position.copy(start).add(end).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return m;
  }
  function screw(p,x,y,z,r=.0022,axis='z',face=1) {
    const s=cyl(p,r,r,.0011,materials.hardware,[x,y,z],'Socket-head fastener',12);
    if(axis==='z')s.rotation.x=Math.PI/2;if(axis==='x')s.rotation.z=Math.PI/2;
    const inset=cyl(p,r*.42,r*.42,.0012,materials.recess,[x+(axis==='x'?face*.0006:0),y+(axis==='y'?face*.0006:0),z+(axis==='z'?face*.0006:0)],'Hex socket',6);
    if(axis==='z')inset.rotation.x=Math.PI/2;if(axis==='x')inset.rotation.z=Math.PI/2;
  }
  function group(name){ const g=new THREE.Group();g.name=name;g.userData.units='metres';g.userData.contactOrigin=true;return g; }

  // A thin enclosure can have generous plan-view corners without a swollen edge.
  function enclosure(p,w,h,d,r,mat,pos,name) {
    const bevel=Math.min(.0012,d*.15),x=w/2-bevel,y=h/2-bevel,rr=r-bevel;
    const s=new THREE.Shape();s.moveTo(-x+rr,-y);s.lineTo(x-rr,-y);
    s.quadraticCurveTo(x,-y,x,-y+rr);s.lineTo(x,y-rr);s.quadraticCurveTo(x,y,x-rr,y);
    s.lineTo(-x+rr,y);s.quadraticCurveTo(-x,y,-x,y-rr);s.lineTo(-x,-y+rr);s.quadraticCurveTo(-x,-y,-x+rr,-y);
    const g=new THREE.ExtrudeGeometry(s,{depth:d-2*bevel,steps:1,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:10});
    g.translate(0,0,-d/2+bevel);return part(p,g,mat,pos,name);
  }

  // Monitors: metal rear shell, molded front carrier, inset LCD, structural stand.
  function display(name,width,screenWidth,screenHeight,height,centerY,baseW,baseD,map) {
    const g=group(name),bodyH=screenHeight+.026,faceZ=.0165;
    enclosure(g,width,bodyH,.025,.010,materials.aluminum,[0,centerY,-.003],'Anodized rear housing');
    enclosure(g,width-.0015,bodyH-.0015,.007,.009,materials.abs,[0,centerY,.010],'Matte front bezel');
    // Back cover bulges only around electronics; outer edge stays thin.
    rb(g,width*.73,bodyH*.62,.012,.005,materials.graphite,[0,centerY-.012,-.019],'Rear electronics cover');
    const screenY=centerY+.0045;
    rb(g,screenWidth+.003,screenHeight+.003,.0015,.0007,materials.gasket,[0,screenY,faceZ-.001],'Display perimeter gasket');
    const screenMaterial=map ? standard('#ffffff',.32,0,{map,emissive:'#ffffff',emissiveMap:map,emissiveIntensity:.24,clearcoat:.12,clearcoatRoughness:.25}) : standard('#0d1619',.32,0);
    const screen=part(g,new THREE.PlaneGeometry(screenWidth,screenHeight),screenMaterial,[0,screenY,faceZ],'LCD image surface');
    screen.castShadow=false;screen.receiveShadow=false;
    // Base rests on four visibly distinct rubber pads.
    for(const x of [-baseW*.36,baseW*.36])for(const z of [-baseD*.3,baseD*.3])
      rb(g,.025,.0035,.017,.0014,materials.rubber,[x,.00175,z-.026],'Non-slip foot');
    rb(g,baseW,.014,baseD,.006,materials.aluminum,[0,.0105,-.026],'Weighted aluminum foot',3);
    rb(g,baseW-.01,.002,baseD-.01,.0008,materials.graphite,[0,.018,-.026],'Base top insert');
    // Stand runs continuously from the foot to a pivot bolted to the rear casing.
    const mountY=centerY-.036;
    beam(g,[0,.016,-.06],[0,mountY-.018,-.051],width*.060,.022,.004,materials.aluminum,'Solid stand column');
    rb(g,width*.088,.058,.021,.006,materials.aluminum,[0,mountY,-.039],'VESA tilt bracket');
    const hinge=cyl(g,.012,.012,width*.083,materials.graphite,[0,mountY-.016,-.045],'Tilt hinge');hinge.rotation.z=Math.PI/2;
    for(const s of [-1,1]) { const cap=cyl(g,.0095,.0095,.0016,materials.hardware,[s*width*.044,mountY-.016,-.045],'Hinge end cap');cap.rotation.z=Math.PI/2; }
    rb(g,.015,.030,.0018,.0008,materials.gasket,[0,mountY*.45,-.064],'Stand cable guide');
    tube(g,[[0,mountY-.035,-.054],[.011,mountY*.58,-.067],[.009,.032,-.073],[.036,.006,-baseD*.7]],.0028,materials.rubber,'Display power cable');
    // Recessed lower rear vents and two actual port wells.
    const ventCount=width>.5?19:11;
    for(let i=0;i<ventCount;i++)rb(g,.0014,.020,.0012,.0004,materials.recess,[(i-(ventCount-1)/2)*.008,centerY-bodyH*.30,-.0256],'Rear vent slot',1);
    for(const x of [-.025,.018])rb(g,.024,.007,.002,.0008,materials.recess,[x,centerY-bodyH*.36,-.0256],'Recessed display input');
    for(const x of [-width*.34,width*.34])screw(g,x,centerY-bodyH*.35,-.0165,.0018);
    // Tiny neutral status aperture, no decorative glow.
    rb(g,.0035,.0012,.001,.0003,materials.edge,[width*.44,centerY-bodyH*.46,.014],'Status aperture',1);
    g.userData.screen={width:screenWidth,height:screenHeight,position:[0,screenY,faceZ],rotation:[0,0,0]};
    return {group:g,screen:{...g.userData.screen,mesh:screen},height};
  }
  const main=display('Main research monitor',.80,.776,.4365,.52,.28875,.292,.185,maps.monitor);
  const secondary=display('Secondary project monitor',.38,.357,.223125,.30,.17544,.162,.133,maps.terminal);
  const monitor=main.group,terminal=secondary.group;

  const keyboard=createKeyboard(THREE,materials);

  const mug=createCoffeeMug(THREE);

  const robot=createResearchArm(THREE,materials);

  const result={monitor,terminal,keyboard,mug,robot,monitorScreen:main.screen,terminalScreen:secondary.screen,materials};
  // Convenient contact/size metadata, also useful for automated geometry checks.
  for(const obj of [monitor,terminal,keyboard,mug,robot]){
    obj.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(obj),size=bb.getSize(new THREE.Vector3());
    obj.userData.bounds={min:bb.min.toArray(),max:bb.max.toArray(),size:size.toArray()};
  }
  return result;
}
