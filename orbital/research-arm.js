import {RoundedBoxGeometry} from './vendor/DeskRoundedBoxGeometry.js';

// Original compact research manipulator, in metres. A fixed inspection pose:
// yaw, shoulder, elbow, forearm roll, wrist pitch and tool roll are distinct axes.
export function createResearchArm(THREE,shared) {
  const robot=new THREE.Group();robot.name='Desktop articulated research manipulator';
  robot.userData.units='metres';robot.userData.contactOrigin=true;
  const metal=(color,roughness,metalness)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const mats={
    satin:metal('#929b9e',.38,.82),darkMetal:metal('#394247',.43,.66),
    polymer:metal('#293035',.62,0),seal:metal('#101517',.88,0),
    steel:metal('#a0a6a7',.30,.94),recess:metal('#080c0e',.84,0)
  };
  for(const k of ['satin','darkMetal','steel'])mats[k].roughnessMap=shared.hardware.roughnessMap;
  mats.polymer.roughnessMap=shared.graphite.roughnessMap;
  const pieces=[],cache=new Map(),V=p=>new THREE.Vector3(...p),Y=new THREE.Vector3(0,1,0);
  function geometry(key,make){if(!cache.has(key))cache.set(key,make());return cache.get(key);}
  function part(g,mat,p,name){const mesh=new THREE.Mesh(g,mat);mesh.position.set(...p);mesh.name=name;pieces.push(mesh);return mesh;}
  function box(w,h,d,r,mat,p,name){r=Math.min(r,w*.45,h*.45,d*.45);return part(geometry(`b:${w}:${h}:${d}:${r}`,()=>new RoundedBoxGeometry(w,h,d,2,r)),mat,p,name);}
  function cylinder(r,h,mat,p,name,axis=[0,1,0],n=32){const m=part(geometry(`c:${r}:${h}:${n}`,()=>new THREE.CylinderGeometry(r,r,h,n)),mat,p,name);m.quaternion.setFromUnitVectors(Y,V(axis).normalize());return m;}
  function fastener(p,axis=[0,0,1],r=.0018){
    const dir=V(axis).normalize();cylinder(r,.0012,mats.steel,p,'Recessed socket fastener',axis,12);
    cylinder(r*.42,.0003,mats.recess,V(p).addScaledVector(dir,.00066).toArray(),'Hex drive socket',axis,6);
  }
  function link(a,b,w0,w1,d,name){
    const aa=V(a),bb=V(b),length=aa.distanceTo(bb),s=new THREE.Shape();
    s.moveTo(-w0/2,-length/2);s.lineTo(w0/2,-length/2);s.lineTo(w1/2,length/2);s.lineTo(-w1/2,length/2);s.closePath();
    const g=new THREE.ExtrudeGeometry(s,{depth:d-.003,bevelEnabled:true,bevelThickness:.0015,bevelSize:.0015,bevelSegments:2,steps:1});g.translate(0,0,-(d-.003)/2);
    const center=aa.clone().add(bb).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(Y,bb.sub(aa).normalize());
    const body=part(g,mats.satin,center.toArray(),name+' tapered aluminum housing');body.quaternion.copy(q);
    const panel=box(Math.min(w0,w1)*.66,length*.68,.002,.0008,mats.polymer,center.clone().add(new THREE.Vector3(0,0,d/2+.0008)).toArray(),name+' inset service cover');panel.quaternion.copy(q);
    for(const y of [-length*.24,length*.24]){const p=new THREE.Vector3(0,y,d/2+.002).applyQuaternion(q).add(center);fastener(p.toArray());}
  }
  function pivot(at,r,w,name){
    cylinder(r,w,mats.darkMetal,at,name+' compact reducer housing',[0,0,1]);
    const front=V(at).add(new THREE.Vector3(0,0,w/2+.001));
    cylinder(r*.90,.003,mats.satin,front.toArray(),name+' machined output flange',[0,0,1]);
    cylinder(r*.68,.0012,mats.seal,front.clone().add(new THREE.Vector3(0,0,.0017)).toArray(),name+' bearing seal',[0,0,1]);
    cylinder(r*.61,.002,mats.darkMetal,front.clone().add(new THREE.Vector3(0,0,.0027)).toArray(),name+' shaft end',[0,0,1]);
    for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;fastener([at[0]+r*.76*Math.cos(a),at[1]+r*.76*Math.sin(a),front.z+.0022],[0,0,1],.00155);}
    box(r*1.55,r*1.40,.020,.003,mats.polymer,[at[0],at[1],at[2]-w/2-.006],name+' rear servo cover');
  }
  // A bolted plate carries the yaw pedestal; the thin isolator touches the desk.
  box(.174,.002,.150,.001,mats.seal,[0,.001,0],'Continuous base isolator');
  box(.178,.016,.156,.0028,mats.satin,[0,.010,0],'Machined mounting plate');
  for(const x of [-.067,.067])for(const z of [-.054,.054]){
    cylinder(.0051,.001,mats.darkMetal,[x,.0185,z],'Mounting counterbore',[0,1,0],24);
    fastener([x,.0192,z],[0,1,0],.0035);
  }
  cylinder(.047,.006,mats.darkMetal,[0,.021,0],'Yaw fixed flange');
  cylinder(.039,.042,mats.polymer,[0,.045,0],'Yaw servo enclosure');
  cylinder(.040,.002,mats.seal,[0,.067,0],'Yaw race seal');
  cylinder(.038,.010,mats.satin,[0,.073,0],'Yaw output bearing');
  box(.066,.026,.067,.003,mats.satin,[0,.089,0],'Rotating shoulder saddle');
  for(const z of [-.036,.036])box(.047,.040,.009,.0025,mats.satin,[0,.112,z],'Shoulder fork cheek');
  const shoulder=[0,.128,0],elbow=[-.057,.307,.008],wrist=[.106,.417,.012],tool=[.168,.356,.016];
  pivot(shoulder,.032,.057,'Shoulder');
  link([-.007,.148,0],[-.052,.286,.008],.040,.035,.042,'Upper link');
  pivot(elbow,.028,.050,'Elbow');
  const roll=V(elbow).lerp(V(wrist),.64),axis=V(wrist).sub(V(elbow)).normalize();
  link(V(elbow).addScaledVector(axis,.019).toArray(),roll.clone().addScaledVector(axis,-.018).toArray(),.035,.030,.036,'Forearm proximal link');
  cylinder(.020,.030,mats.darkMetal,roll.toArray(),'Forearm axial servo',axis.toArray());
  for(const sign of [-1,1]){
    cylinder(.0205,.002,mats.seal,roll.clone().addScaledVector(axis,sign*.016).toArray(),'Forearm roll seal',axis.toArray());
    cylinder(.020,.003,mats.satin,roll.clone().addScaledVector(axis,sign*.0185).toArray(),'Forearm roll flange',axis.toArray());
  }
  link(roll.clone().addScaledVector(axis,.021).toArray(),V(wrist).addScaledVector(axis,-.014).toArray(),.029,.026,.032,'Forearm distal link');
  pivot(wrist,.023,.043,'Wrist pitch');
  const shortAxis=V(tool).sub(V(wrist)).normalize();
  link(V(wrist).addScaledVector(shortAxis,.014).toArray(),V(tool).addScaledVector(shortAxis,-.010).toArray(),.027,.024,.030,'Tool carrier');
  cylinder(.017,.028,mats.polymer,[tool[0],tool[1]-.011,tool[2]],'Tool roll motor');
  cylinder(.018,.002,mats.seal,[tool[0],tool[1]-.026,tool[2]],'Tool roll race');
  cylinder(.019,.005,mats.satin,[tool[0],tool[1]-.0295,tool[2]],'End-effector mounting flange');
  for(const x of [-.012,.012])fastener([tool[0]+x,tool[1]-.0326,tool[2]],[0,-1,0],.0015);
  cylinder(.014,.010,mats.satin,[tool[0],tool[1]-.034,tool[2]],'Bolted gripper adapter');
  // The small parallel gripper has a drive block, two guided carriages and pads.
  box(.057,.025,.034,.002,mats.darkMetal,[tool[0],tool[1]-.048,tool[2]],'Parallel gripper actuator');
  box(.052,.004,.028,.0008,mats.steel,[tool[0],tool[1]-.0625,tool[2]],'Ground linear guide');
  for(const sign of [-1,1]){
    box(.011,.012,.025,.001,mats.satin,[tool[0]+sign*.019,tool[1]-.069,tool[2]],'Guided jaw carriage');
    box(.006,.031,.021,.001,mats.satin,[tool[0]+sign*.021,tool[1]-.089,tool[2]],'Replaceable machined finger');
    box(.009,.007,.021,.001,mats.satin,[tool[0]+sign*.0175,tool[1]-.101,tool[2]],'Inward finger toe');
    box(.002,.016,.018,.0006,mats.seal,[tool[0]+sign*.012,tool[1]-.096,tool[2]],'Gripper contact pad');
    fastener([tool[0]+sign*.021,tool[1]-.087,tool[2]+.011],[0,0,1],.0014);
  }
  // Rear-only service loom and short joint loops, held away from the bearing faces.
  const cablePoints=[[.015,.043,-.041],[.026,.090,-.068],[.013,.149,-.066],[-.025,.220,-.033],[-.061,.295,-.052],[-.063,.338,-.052],[.017,.369,-.025],[.095,.438,-.035],[.124,.408,-.034],[.168,.356,-.005]];
  part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints.map(V)),48,.0024,6,false),mats.seal,[0,0,0],'Rear flexible service loom');
  for(const p of [[-.025,.220,-.031],[.017,.369,-.024],[.129,.401,-.026]])box(.009,.010,.007,.0015,mats.polymer,p,'Service loom retaining clip');
  box(.028,.010,.0015,.001,mats.recess,[0,.010,.0783],'Recessed controller interface');
  box(.009,.005,.001,.0004,mats.steel,[.005,.010,.0792],'Data connector shell');

  // Merge the fixed pose by material. Small fasteners add geometry, not a draw
  // call each. This also shares the existing subtle material-grain textures.
  const batches=new Map(),components=[];
  for(const piece of pieces){
    piece.updateMatrix();const g=piece.geometry.index?piece.geometry.toNonIndexed():piece.geometry.clone();g.applyMatrix4(piece.matrix);
    g.computeBoundingBox();components.push({name:piece.name,min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()});
    if(!batches.has(piece.material))batches.set(piece.material,[]);batches.get(piece.material).push(g);
  }
  for(const [material,geometries]of batches){
    const g=new THREE.BufferGeometry();
    for(const name of ['position','normal','uv']){const count=geometries.reduce((sum,x)=>sum+x.getAttribute(name).array.length,0),array=new Float32Array(count);let offset=0;for(const x of geometries){const a=x.getAttribute(name).array;array.set(a,offset);offset+=a.length;}g.setAttribute(name,new THREE.BufferAttribute(array,name==='uv'?2:3));}
    g.computeBoundingSphere();const mesh=new THREE.Mesh(g,material);mesh.name='Manipulator '+Object.keys(mats).find(k=>mats[k]===material);mesh.castShadow=mesh.receiveShadow=true;robot.add(mesh);
    for(const geometry of geometries)geometry.dispose();
  }
  for(const g of new Set(pieces.map(p=>p.geometry)))g.dispose();
  robot.userData.axes=6;robot.userData.components=components;
  robot.userData.joints={shoulder,elbow,forearmRoll:roll.toArray(),wrist,tool};
  robot.userData.construction='Fixed six-axis inspection pose; six material batches; no animated mechanics.';
  return robot;
}
