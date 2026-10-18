import {RoundedBoxGeometry} from './vendor/DeskRoundedBoxGeometry.js';

// Original desktop manipulator, in metres, in a fixed inspection pose.
// Rounded load-bearing shells, separated reducer faces and a guided tool make
// the six axes readable at the seated viewing distance.
export function createResearchArm(THREE,shared) {
  const robot=new THREE.Group();robot.name='Desktop articulated research manipulator';
  robot.userData.units='metres';robot.userData.contactOrigin=true;
  const metal=(color,roughness,metalness)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const mats={
    satin:metal('#939b9e',.40,.78),darkMetal:metal('#353c41',.46,.62),
    shell:metal('#d0cec4',.50,.08),polymer:metal('#293035',.65,0),
    seal:metal('#101517',.88,0),steel:metal('#aab1b2',.28,.94),
    recess:metal('#080c0e',.84,0),accent:metal('#b48a50',.53,.28)
  };
  for(const k of ['satin','darkMetal','steel'])mats[k].roughnessMap=shared.hardware.roughnessMap;
  for(const k of ['shell','polymer'])mats[k].roughnessMap=shared.graphite.roughnessMap;
  const pieces=[],cache=new Map(),V=p=>new THREE.Vector3(...p),Y=new THREE.Vector3(0,1,0);
  function geometry(key,make){if(!cache.has(key))cache.set(key,make());return cache.get(key);}
  function part(g,mat,p,name){const mesh=new THREE.Mesh(g,mat);mesh.position.set(...p);mesh.name=name;pieces.push(mesh);return mesh;}
  function box(w,h,d,r,mat,p,name){r=Math.min(r,w*.45,h*.45,d*.45);return part(geometry(`b:${w}:${h}:${d}:${r}`,()=>new RoundedBoxGeometry(w,h,d,3,r)),mat,p,name);}
  function cylinder(r,h,mat,p,name,axis=[0,1,0],n=40){const m=part(geometry(`c:${r}:${h}:${n}`,()=>new THREE.CylinderGeometry(r,r,h,n)),mat,p,name);m.quaternion.setFromUnitVectors(Y,V(axis).normalize());return m;}
  function fastener(p,axis=[0,0,1],r=.0026){
    const dir=V(axis).normalize();cylinder(r,.0016,mats.steel,p,'Recessed socket fastener',axis,12);
    cylinder(r*.45,.0004,mats.recess,V(p).addScaledVector(dir,.00086).toArray(),'Hex drive socket',axis,6);
  }
  function between(a,b,r,mat,name){const av=V(a),bv=V(b);return cylinder(r,av.distanceTo(bv),mat,av.clone().add(bv).multiplyScalar(.5).toArray(),name,bv.sub(av).toArray());}
  function link(a,b,w0,w1,d,name){
    const aa=V(a),bb=V(b),length=aa.distanceTo(bb),width=Math.max(w0,w1);
    const g=new RoundedBoxGeometry(width,length,d,4,Math.min(width,d)*.36);
    const points=g.attributes.position;
    for(let i=0;i<points.count;i++){const t=Math.max(0,Math.min(1,points.getY(i)/length+.5));const waist=1-.12*Math.sin(Math.PI*t);points.setX(i,points.getX(i)*(w0*(1-t)+w1*t)/width*waist);}
    g.computeVertexNormals();
    const center=aa.clone().add(bb).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(Y,bb.sub(aa).normalize());
    const body=part(g,mats.shell,center.toArray(),name+' rounded structural housing');body.quaternion.copy(q);
    // A narrow rear service cover leaves the rounded front silhouette intact.
    const panel=box(Math.min(w0,w1)*.48,length*.58,.003,.0014,mats.polymer,center.clone().add(new THREE.Vector3(0,0,-d/2)).toArray(),name+' rear service cover');panel.quaternion.copy(q);
  }
  function pivot(at,r,w,name){
    cylinder(r,w,mats.shell,at,name+' reducer housing',[0,0,1]);
    for(const sign of [-1,1]){
      const face=V(at).add(new THREE.Vector3(0,0,sign*(w/2+.0015)));
      cylinder(r*.93,.004,mats.seal,face.toArray(),name+' bearing seal',[0,0,1]);
      cylinder(r*.85,.008,mats.satin,face.clone().add(new THREE.Vector3(0,0,sign*.005)).toArray(),name+' output flange',[0,0,1]);
    }
    const front=V(at).add(new THREE.Vector3(0,0,w/2+.011));
    cylinder(r*.58,.005,mats.darkMetal,front.toArray(),name+' shaft cap',[0,0,1]);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;fastener([at[0]+r*.73*Math.cos(a),at[1]+r*.73*Math.sin(a),front.z-.001],[0,0,1],.0023);}
    box(r*1.38,r*1.20,.025,.009,mats.polymer,[at[0],at[1],at[2]-w/2-.015],name+' rear drive cover');
  }
  // Wide rigid mount, compliant desk contact, and a visibly supported yaw axis.
  box(.248,.004,.220,.0018,mats.seal,[0,.002,0],'Continuous base isolator');
  box(.254,.028,.226,.009,mats.satin,[0,.018,0],'Machined mounting plate');
  for(const x of [-.094,.094])for(const z of [-.080,.080]){
    cylinder(.008,.0014,mats.darkMetal,[x,.0327,z],'Mounting counterbore',[0,1,0],24);
    fastener([x,.0335,z],[0,1,0],.005);
  }
  cylinder(.073,.010,mats.darkMetal,[0,.037,0],'Yaw fixed flange');
  cylinder(.064,.078,mats.polymer,[0,.080,0],'Yaw servo enclosure');
  cylinder(.065,.004,mats.seal,[0,.121,0],'Yaw race seal');
  cylinder(.061,.015,mats.satin,[0,.1305,0],'Yaw output bearing');
  box(.105,.035,.108,.009,mats.darkMetal,[0,.151,0],'Rotating shoulder saddle');
  for(const z of [-.058,.058])box(.080,.080,.018,.009,mats.satin,[0,.187,z],'Shoulder fork cheek');
  const shoulder=[0,.215,0],elbow=[-.082,.435,-.012],wrist=[.155,.568,.015],tool=[.260,.467,.026];
  pivot(shoulder,.059,.094,'Shoulder');
  link([-.009,.239,0],[-.075,.415,-.010],.098,.089,.086,'Upper link');
  pivot(elbow,.049,.092,'Elbow');
  const roll=V(elbow).lerp(V(wrist),.62),axis=V(wrist).sub(V(elbow)).normalize();
  link(V(elbow).addScaledVector(axis,.027).toArray(),roll.clone().addScaledVector(axis,-.022).toArray(),.086,.074,.079,'Forearm proximal link');
  cylinder(.038,.041,mats.darkMetal,roll.toArray(),'Forearm axial servo',axis.toArray());
  for(const sign of [-1,1]){
    cylinder(.0385,.003,mats.seal,roll.clone().addScaledVector(axis,sign*.022).toArray(),'Forearm roll seal',axis.toArray());
    cylinder(.0375,.005,mats.satin,roll.clone().addScaledVector(axis,sign*.026).toArray(),'Forearm roll flange',axis.toArray());
  }
  link(roll.clone().addScaledVector(axis,.028).toArray(),V(wrist).addScaledVector(axis,-.020).toArray(),.071,.064,.067,'Forearm distal link');
  pivot(wrist,.037,.073,'Wrist pitch');
  const shortAxis=V(tool).sub(V(wrist)).normalize();
  link(V(wrist).addScaledVector(shortAxis,.022).toArray(),V(tool).addScaledVector(shortAxis,-.013).toArray(),.066,.057,.059,'Tool carrier');
  cylinder(.031,.045,mats.polymer,[tool[0],tool[1]-.014,tool[2]],'Tool roll motor');
  cylinder(.032,.003,mats.seal,[tool[0],tool[1]-.038,tool[2]],'Tool roll race');
  cylinder(.034,.009,mats.satin,[tool[0],tool[1]-.044,tool[2]],'End-effector mounting flange');
  for(let i=0;i<6;i++){const a=i*Math.PI/3;fastener([tool[0]+.027*Math.cos(a),tool[1]-.049,tool[2]+.027*Math.sin(a)],[0,-1,0],.0023);}
  cylinder(.026,.014,mats.darkMetal,[tool[0],tool[1]-.053,tool[2]],'Bolted gripper adapter');
  box(.094,.039,.055,.006,mats.polymer,[tool[0],tool[1]-.079,tool[2]],'Parallel gripper actuator');
  box(.087,.006,.047,.002,mats.steel,[tool[0],tool[1]-.101,tool[2]],'Ground linear guide');
  for(const sign of [-1,1]){
    box(.019,.018,.042,.003,mats.satin,[tool[0]+sign*.031,tool[1]-.112,tool[2]],'Guided jaw carriage');
    box(.011,.050,.032,.003,mats.satin,[tool[0]+sign*.034,tool[1]-.144,tool[2]],'Replaceable machined finger');
    box(.018,.012,.032,.003,mats.satin,[tool[0]+sign*.028,tool[1]-.165,tool[2]],'Inward finger toe');
    box(.004,.026,.027,.0014,mats.seal,[tool[0]+sign*.018,tool[1]-.156,tool[2]],'Gripper contact pad');
    fastener([tool[0]+sign*.034,tool[1]-.142,tool[2]+.0165],[0,0,1],.0022);
  }
  // Paired support cylinders connect the saddle and upper link through eye ends.
  for(const z of [-.071,.071]){
    const a=[.023,.182,z],b=[-.098,.365,z],mid=V(a).lerp(V(b),.55);
    between(a,mid.toArray(),.013,mats.darkMetal,'Assist cylinder barrel');
    between(mid.clone().addScaledVector(V(a).sub(V(b)).normalize(),.010).toArray(),b,.0065,mats.steel,'Assist cylinder rod');
    for(const p of [a,b]){cylinder(.016,.017,mats.satin,p,'Assist cylinder eye',[0,0,1]);fastener([p[0],p[1],p[2]+.010],[0,0,1],.0035);}
    box(.025,.031,.043,.007,mats.darkMetal,[b[0]+.014,b[1],z*.80],'Assist cylinder link bracket');
  }
  const cablePoints=[[.024,.070,-.065],[.039,.150,-.089],[.012,.249,-.081],[-.055,.345,-.060],[-.088,.439,-.080],[-.059,.488,-.067],[.032,.523,-.048],[.151,.599,-.055],[.194,.546,-.049],[.260,.467,-.009]];
  part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints.map(V)),48,.0042,8,false),mats.seal,[0,0,0],'Rear flexible service loom');
  box(.048,.013,.002,.001,mats.recess,[0,.018,.1135],'Recessed controller interface');
  box(.016,.006,.0015,.0006,mats.steel,[.009,.018,.115],'Data connector shell');
  box(.020,.006,.001,.001,mats.accent,[-.025,.089,.064],'Controller status marker');

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
  robot.userData.construction='Original fixed six-axis inspection pose with rounded structural shells and paired support cylinders; no animated mechanics.';
  return robot;
}
