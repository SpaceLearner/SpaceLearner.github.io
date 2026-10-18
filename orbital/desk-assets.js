import {createKeyboard} from './desk-inputs.js';
import {createCoffeeMug} from './coffee-mug.js';
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
    aluminum: standard('#929995', .32, .86),
    edge: standard('#aeb3ad', .25, .91),
    graphite: standard('#262c2e', .57, 0),
    abs: standard('#171b1d', .62, 0),
    rubber: standard('#111516', .91),
    gasket: standard('#080c0e', .77),
    whiteKey: standard('#bcbdb4', .53, 0),
    greyKey: standard('#737e7e', .60, 0),
    ceramic: standard('#c9c5b7', .29, 0, {clearcoat:.42, clearcoatRoughness:.18, ior:1.48}),
    unglazed: standard('#a7a08c', .88),
    coffee: standard('#22140c', .20, 0, {clearcoat:.46, clearcoatRoughness:.15}),
    robotPaint: standard('#a6aaa2', .44, .08, {clearcoat:.16, clearcoatRoughness:.38}),
    robotAccent: standard('#6d7a79', .42, .62),
    hardware: standard('#727b7b', .27, .94),
    recess: standard('#090c0e', .82)
  };
  // Fine roughness only: fabrication texture should never read as large scratches.
  function surfaceTexture(brushed=false) {
    const data=new Uint8Array(64*64*4);
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){
      const i=(y*64+x)*4,grain=((x*37+y*53+x*y*7)%29)/28;
      const v=Math.round(222+grain*24+(brushed?Math.sin(y*2.7)*9:0));
      data.set([v,v,v,255],i);
    }
    const t=new THREE.DataTexture(data,64,64);t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.repeat.set(brushed?3:8,8);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
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

  // Compact six-axis engineering arm. Cast housings enclose the links and motors.
  const robot=group('Desktop articulated research manipulator');
  for(const x of [-.064,.064])for(const z of [-.055,.055])rb(robot,.019,.004,.019,.002,materials.rubber,[x,.002,z],'Isolated robot foot');
  rb(robot,.178,.024,.156,.007,materials.graphite,[0,.016,0],'Machined mounting plinth',3);
  rb(robot,.170,.008,.148,.0035,materials.aluminum,[0,.032,0],'Plinth top plate');
  for(const x of [-.065,.065])for(const z of [-.052,.052])screw(robot,x,.0367,z,.004,'y');
  cyl(robot,.052,.062,.051,materials.robotPaint,[0,.062,0],'Yaw motor housing',48);
  cyl(robot,.053,.053,.006,materials.rubber,[0,.090,0],'Yaw bearing seal',48);
  cyl(robot,.048,.051,.018,materials.aluminum,[0,.102,0],'Rotating shoulder flange',48);
  const joints=[[0,.135,0],[-.073,.327,0],[.089,.440,.008],[.188,.354,.023]];
  function joint(at,r,w,name){
    const outer=cyl(robot,r,r,w,materials.graphite,at,name+' motor casing',40);outer.rotation.x=Math.PI/2;
    for(const side of [-1,1]){
      const z=at[2]+side*(w/2+.001);
      const capProfile=[[0,-.0015],[r*.77,-.0015],[r*.85,-.0005],[r*.85,.0005],[r*.80,.0015],[0,.0015]];
      const cap=part(robot,new THREE.LatheGeometry(capProfile.map(p=>new THREE.Vector2(...p)),48),materials.aluminum,[at[0],at[1],z],name+' chamfered bearing cover');cap.rotation.x=Math.PI/2;
      torus(robot,r*.69,.00085,materials.gasket,[at[0],at[1],z+side*.0019],'z',name+' cover seam');
      const hub=cyl(robot,r*.30,r*.30,.004,materials.robotAccent,[at[0],at[1],z+side*.002],name+' axis hub',24);hub.rotation.x=Math.PI/2;
      for(let j=0;j<4;j++){const a=j*Math.PI/2+Math.PI/4;screw(robot,at[0]+Math.cos(a)*r*.60,at[1]+Math.sin(a)*r*.60,z+side*.0025,.0019,'z',side);}
    }
  }
  // Continuous shoulder yoke supports the first horizontal pivot.
  for(const side of [-1,1])rb(robot,.065,.059,.013,.005,materials.robotPaint,[0,.126,side*.055],'Shoulder bearing yoke');
  joint(joints[0],.045,.091,'Shoulder');
  const widths=[.062,.054,.042],depths=[.064,.056,.045];
  for(let i=0;i<3;i++){
    const a=V(joints[i]),b=V(joints[i+1]),dir=b.clone().sub(a).normalize();
    const aa=a.clone().addScaledVector(dir,.012),bb=b.clone().addScaledVector(dir,-.014);
    beam(robot,aa.toArray(),bb.toArray(),widths[i],depths[i],.013,materials.robotPaint,`Cast link ${i+1}`);
    // Inset service panel, fastening points, and a proper parting line.
    const mid=aa.clone().add(bb).multiplyScalar(.5);
    const frontA=aa.clone();frontA.z+=depths[i]/2+.0006;const frontB=bb.clone();frontB.z+=depths[i]/2+.0006;
    const trim=beam(robot,frontA.toArray(),frontB.toArray(),widths[i]*.61,.0018,.0007,materials.robotAccent,`Link ${i+1} service cover`);
    for(const t of [.26,.74]){const p=a.clone().lerp(b,t);screw(robot,p.x,p.y,p.z+depths[i]/2+.002,.0018);}
    if(i<2)joint(joints[i+1],i===0?.039:.033,depths[i]+.014,i===0?'Elbow':'Wrist pitch');
  }
  joint(joints[3],.025,.054,'Tool roll');
  const wristDirection=V(joints[3]).sub(V(joints[2])).normalize();
  const wristCenter=V(joints[2]).lerp(V(joints[3]),.60);
  const wrist=cyl(robot,.025,.025,.028,materials.hardware,wristCenter.toArray(),'Wrist axial bearing',40);
  wrist.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),wristDirection);
  const wristSeal=torus(robot,.025,.0015,materials.gasket,wristCenter.toArray(),'z','Wrist axial seal');
  wristSeal.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),wristDirection);
  // Parallel gripper: sliding carriage, opposed jaws, and replaceable rubber tips.
  const tool=group('Parallel end effector');tool.position.set(...joints[3]);tool.rotation.z=-.12;robot.add(tool);
  rb(tool,.064,.030,.041,.005,materials.graphite,[0,-.031,.005],'Gripper actuator');
  rb(tool,.062,.005,.042,.0018,materials.aluminum,[0,-.049,.005],'Gripper sliding rail');
  for(const side of [-1,1]){
    rb(tool,.013,.021,.030,.002,materials.hardware,[side*.024,-.058,.005],'Sliding jaw carriage');
    rb(tool,.008,.038,.025,.0022,materials.aluminum,[side*.027,-.081,.005],'Gripper finger');
    rb(tool,.004,.022,.021,.0012,materials.rubber,[side*.022,-.088,.005],'Replaceable grip pad');
    screw(tool,side*.027,-.079,.019,.0017);
  }
  // A rear service loop gives each pivot enough cable travel; clamps anchor it.
  tube(robot,[[.01,.047,-.056],[.029,.116,-.066],[-.038,.219,-.060],[-.092,.320,-.057],[-.075,.362,-.051],[.014,.405,-.050],[.085,.467,-.042],[.129,.425,-.036],[.181,.357,-.020]],.0041,materials.rubber,'Joint service cable loom',48);
  for(const [x,y,z]of [[-.033,.219,-.054],[.013,.400,-.041],[.139,.399,-.020]])rb(robot,.014,.011,.012,.003,materials.graphite,[x,y,z],'Cable retaining saddle');
  rb(robot,.030,.014,.002,.002,materials.recess,[0,.018,.079],'Base controller socket');
  rb(robot,.011,.007,.0015,.0006,materials.hardware,[0,.018,.0804],'Recessed data connector');
  robot.userData.axes=6;

  const result={monitor,terminal,keyboard,mug,robot,monitorScreen:main.screen,terminalScreen:secondary.screen,materials};
  // Convenient contact/size metadata, also useful for automated geometry checks.
  for(const obj of [monitor,terminal,keyboard,mug,robot]){
    obj.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(obj),size=bb.getSize(new THREE.Vector3());
    obj.userData.bounds={min:bb.min.toArray(),max:bb.max.toArray(),size:size.toArray()};
  }
  return result;
}
