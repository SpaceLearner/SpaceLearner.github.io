import {RoundedBoxGeometry} from './vendor/DeskRoundedBoxGeometry.js';

// Original desktop manipulator, in metres, with a small articulated hierarchy.
// Rounded load-bearing shells, separated reducer faces and a guided tool make
// the six axes readable at the seated viewing distance.
export function createResearchArm(THREE,shared) {
  const robot=new THREE.Group();robot.name='Desktop articulated research manipulator';
  robot.userData.units='metres';robot.userData.contactOrigin=true;
  const metal=(color,roughness,metalness)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const mats={
    satin:metal('#9aa8aa',.33,.82),darkMetal:metal('#303b41',.42,.68),
    shell:metal('#b1b8b5',.38,.22),polymer:metal('#263037',.62,0),
    seal:metal('#101517',.88,0),steel:metal('#aab1b2',.28,.94),
    recess:metal('#080c0e',.84,0),accent:metal('#b48a50',.53,.28)
  };
  for(const k of ['satin','darkMetal','steel'])mats[k].roughnessMap=shared.hardware.roughnessMap;
  for(const k of ['shell','polymer'])mats[k].roughnessMap=shared.graphite.roughnessMap;
  const pieces=[],cache=new Map(),V=p=>new THREE.Vector3(...p),Y=new THREE.Vector3(0,1,0);
  const nodes={},bindPositions={};
  function joint(name,parent,position){
    const node=new THREE.Bone();node.name=name;nodes[name]=node;bindPositions[name]=V(position);
    node.position.copy(bindPositions[name]).sub(parent?bindPositions[parent]:new THREE.Vector3());
    (parent?nodes[parent]:robot).add(node);return node;
  }
  joint('base',null,[0,0,0]);joint('yaw','base',[0,.1305,0]);
  joint('shoulder','yaw',[0,.215,0]);joint('elbow','shoulder',[-.082,.435,-.012]);
  joint('wrist','elbow',[.155,.568,.015]);joint('roll','wrist',[.260,.467,.026]);
  joint('jawLeft','roll',[.260,.467,.026]);joint('jawRight','roll',[.260,.467,.026]);
  let owner='base';
  function geometry(key,make){if(!cache.has(key))cache.set(key,make());return cache.get(key);}
  function part(g,mat,p,name){const mesh=new THREE.Mesh(g,mat);mesh.position.set(...p);mesh.name=name;mesh.userData.rigidOwner=owner;pieces.push(mesh);return mesh;}
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
  owner='yaw';
  cylinder(.061,.015,mats.satin,[0,.1305,0],'Yaw output bearing');
  box(.105,.035,.108,.009,mats.darkMetal,[0,.151,0],'Rotating shoulder saddle');
  for(const z of [-.058,.058])box(.080,.080,.018,.009,mats.satin,[0,.187,z],'Shoulder fork cheek');
  const shoulder=[0,.215,0],elbow=[-.082,.435,-.012],wrist=[.155,.568,.015],tool=[.260,.467,.026];
  pivot(shoulder,.059,.094,'Shoulder');
  owner='shoulder';
  link([-.009,.239,0],[-.075,.415,-.010],.098,.089,.086,'Upper link');
  pivot(elbow,.049,.092,'Elbow');
  owner='elbow';
  const roll=V(elbow).lerp(V(wrist),.62),axis=V(wrist).sub(V(elbow)).normalize();
  link(V(elbow).addScaledVector(axis,.027).toArray(),roll.clone().addScaledVector(axis,-.022).toArray(),.086,.074,.079,'Forearm proximal link');
  cylinder(.038,.041,mats.darkMetal,roll.toArray(),'Forearm axial servo',axis.toArray());
  for(const sign of [-1,1]){
    cylinder(.0385,.003,mats.seal,roll.clone().addScaledVector(axis,sign*.022).toArray(),'Forearm roll seal',axis.toArray());
    cylinder(.0375,.005,mats.satin,roll.clone().addScaledVector(axis,sign*.026).toArray(),'Forearm roll flange',axis.toArray());
  }
  link(roll.clone().addScaledVector(axis,.028).toArray(),V(wrist).addScaledVector(axis,-.020).toArray(),.071,.064,.067,'Forearm distal link');
  pivot(wrist,.037,.073,'Wrist pitch');
  owner='wrist';
  const shortAxis=V(tool).sub(V(wrist)).normalize();
  link(V(wrist).addScaledVector(shortAxis,.022).toArray(),V(tool).addScaledVector(shortAxis,-.013).toArray(),.066,.057,.059,'Tool carrier');
  cylinder(.031,.045,mats.polymer,[tool[0],tool[1]-.014,tool[2]],'Tool roll motor');
  owner='roll';
  cylinder(.032,.003,mats.seal,[tool[0],tool[1]-.038,tool[2]],'Tool roll race');
  cylinder(.034,.009,mats.satin,[tool[0],tool[1]-.044,tool[2]],'End-effector mounting flange');
  for(let i=0;i<6;i++){const a=i*Math.PI/3;fastener([tool[0]+.027*Math.cos(a),tool[1]-.049,tool[2]+.027*Math.sin(a)],[0,-1,0],.0023);}
  cylinder(.026,.014,mats.darkMetal,[tool[0],tool[1]-.053,tool[2]],'Bolted gripper adapter');
  box(.094,.039,.055,.006,mats.polymer,[tool[0],tool[1]-.079,tool[2]],'Parallel gripper actuator');
  box(.087,.006,.047,.002,mats.steel,[tool[0],tool[1]-.101,tool[2]],'Ground linear guide');
  for(const sign of [-1,1]){
    owner=sign<0?'jawLeft':'jawRight';
    box(.019,.018,.042,.003,mats.satin,[tool[0]+sign*.031,tool[1]-.112,tool[2]],'Guided jaw carriage');
    box(.011,.050,.032,.003,mats.satin,[tool[0]+sign*.034,tool[1]-.144,tool[2]],'Replaceable machined finger');
    box(.018,.012,.032,.003,mats.satin,[tool[0]+sign*.028,tool[1]-.165,tool[2]],'Inward finger toe');
    box(.004,.026,.027,.0014,mats.seal,[tool[0]+sign*.018,tool[1]-.156,tool[2]],'Gripper contact pad');
    fastener([tool[0]+sign*.034,tool[1]-.142,tool[2]+.0165],[0,0,1],.0022);
  }
  // Rigid eye ends follow their joints; telescoping barrels and rods are updated
  // between those anchors. No per-frame geometry creation or physics engine.
  const supports=[];
  for(const z of [-.071,.071]){
    const a=[.023,.182,z],b=[-.098,.365,z];
    owner='yaw';cylinder(.016,.017,mats.satin,a,'Assist cylinder lower eye',[0,0,1]);fastener([a[0],a[1],a[2]+.010],[0,0,1],.0035);
    owner='shoulder';cylinder(.016,.017,mats.satin,b,'Assist cylinder upper eye',[0,0,1]);fastener([b[0],b[1],b[2]+.010],[0,0,1],.0035);
    box(.025,.031,.043,.007,mats.darkMetal,[b[0]+.014,b[1],z*.80],'Assist cylinder link bracket');
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,1,24),mats.darkMetal);
    const rod=new THREE.Mesh(new THREE.CylinderGeometry(.0065,.0065,1,20),mats.steel);
    barrel.name='Telescoping support barrel';rod.name='Telescoping support rod';
    barrel.castShadow=rod.castShadow=barrel.receiveShadow=rod.receiveShadow=true;robot.add(barrel,rod);
    supports.push({a:V(a).sub(bindPositions.yaw),b:V(b).sub(bindPositions.shoulder),barrel,rod});
  }
  const cablePoints=[[.024,.070,-.065],[.039,.150,-.089],[.012,.249,-.081],[-.055,.345,-.060],[-.088,.439,-.080],[-.059,.488,-.067],[.032,.523,-.048],[.151,.599,-.055],[.194,.546,-.049],[.260,.467,-.009]];
  owner='loom';
  part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints.map(V)),48,.0042,8,false),mats.seal,[0,0,0],'Rear flexible service loom');
  owner='base';
  box(.048,.013,.002,.001,mats.recess,[0,.018,.1135],'Recessed controller interface');
  box(.016,.006,.0015,.0006,mats.steel,[.009,.018,.115],'Data connector shell');
  box(.020,.006,.001,.001,mats.accent,[-.025,.089,.064],'Controller status marker');

  // Batch by rigid link and material rather than by individual fastener.
  // The original geometry and material proportions remain unchanged at rest.
  const batches=new Map(),components=[];
  robot.updateMatrixWorld(true);
  for(const piece of pieces){
    const owner=piece.userData.rigidOwner;piece.updateMatrix();
    if(owner==='loom')continue;
    const g=piece.geometry.index?piece.geometry.toNonIndexed():piece.geometry.clone();g.applyMatrix4(piece.matrix);
    g.computeBoundingBox();components.push({name:piece.name,min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()});
    g.translate(-bindPositions[owner].x,-bindPositions[owner].y,-bindPositions[owner].z);
    const key=owner+':'+piece.material.uuid;
    if(!batches.has(key))batches.set(key,{owner,material:piece.material,geometries:[]});batches.get(key).geometries.push(g);
  }
  for(const {owner,material,geometries} of batches.values()){
    const g=new THREE.BufferGeometry();
    for(const name of ['position','normal','uv']){const count=geometries.reduce((sum,x)=>sum+x.getAttribute(name).array.length,0),array=new Float32Array(count);let offset=0;for(const x of geometries){const a=x.getAttribute(name).array;array.set(a,offset);offset+=a.length;}g.setAttribute(name,new THREE.BufferAttribute(array,name==='uv'?2:3));}
    g.computeBoundingSphere();const mesh=new THREE.Mesh(g,material);mesh.name=owner+' / '+Object.keys(mats).find(k=>mats[k]===material);mesh.castShadow=mesh.receiveShadow=true;nodes[owner].add(mesh);
    for(const geometry of geometries)geometry.dispose();
  }
  // A single skinned service loom follows the joints with smooth transitions.
  const loomSource=pieces.find(p=>p.userData.rigidOwner==='loom'),loomGeometry=loomSource.geometry.clone();
  const skinIndices=[],skinWeights=[],cuts=[.16,.40,.75];
  for(let i=0;i<loomGeometry.attributes.position.count;i++){
    const t=Math.floor(i/9)/48;let first=0,second=0,weight=0;
    for(let k=0;k<cuts.length;k++){
      if(t>cuts[k]+.08){first=second=k+1;weight=0;}
      else if(t>=cuts[k]-.08){first=k;second=k+1;const f=(t-cuts[k]+.08)/.16;weight=f*f*(3-2*f);break;}
    }
    skinIndices.push(first,second,0,0);skinWeights.push(1-weight,weight,0,0);
  }
  loomGeometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));loomGeometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeights,4));
  const loom=new THREE.SkinnedMesh(loomGeometry,mats.seal);loom.name='Flexible service loom';loom.frustumCulled=false;robot.add(loom);
  loom.bind(new THREE.Skeleton([nodes.yaw,nodes.shoulder,nodes.elbow,nodes.wrist]));
  for(const g of new Set(pieces.map(p=>p.geometry)))g.dispose();
  const inverseRoot=new THREE.Matrix4(),a=new THREE.Vector3(),b=new THREE.Vector3(),direction=new THREE.Vector3(),mid=new THREE.Vector3();
  function updateSupports(){
    robot.updateWorldMatrix(true,true);inverseRoot.copy(robot.matrixWorld).invert();
    for(const support of supports){
      a.copy(support.a).applyMatrix4(nodes.yaw.matrixWorld).applyMatrix4(inverseRoot);
      b.copy(support.b).applyMatrix4(nodes.shoulder.matrixWorld).applyMatrix4(inverseRoot);
      const length=direction.subVectors(b,a).length();direction.normalize();mid.copy(a).addScaledVector(direction,length*.55);
      support.barrel.position.copy(a).lerp(mid,.5);support.barrel.quaternion.setFromUnitVectors(Y,direction);support.barrel.scale.y=length*.55;
      support.rod.position.copy(mid).lerp(b,.5);support.rod.quaternion.copy(support.barrel.quaternion);support.rod.scale.y=length*.45+.006;
    }
  }
  const L1=Math.hypot(.082,.220),L2=Math.hypot(.237,.133),restShoulder=Math.atan2(.220,-.082),restElbow=Math.atan2(.133,.237)-restShoulder;
  const limits={yaw:[-.65,.30],shoulder:[-.75,.30],elbow:[-1.05,.35],wrist:[-.5,1.6],roll:[-.6,.6]};
  function pose({reach=.260,height=.316,yaw=0,roll=0,opening=0}={}){
    const x=reach-.105,y=height+.151+.101-.215;
    const c=(x*x+y*y-L1*L1-L2*L2)/(2*L1*L2);
    if(c < -1 || c > 1)throw new RangeError('Arm target is outside its scripted workspace');
    const elbow=-Math.acos(c),shoulder=Math.atan2(y,x)-Math.atan2(L2*Math.sin(elbow),L1+L2*Math.cos(elbow));
    const angles={yaw,shoulder:shoulder-restShoulder,elbow:elbow-restElbow,wrist:-(shoulder-restShoulder+elbow-restElbow),roll};
    for(const [key,value]of Object.entries(angles))if(value<limits[key][0]-1e-6||value>limits[key][1]+1e-6)throw new RangeError('Arm joint limit: '+key);
    nodes.yaw.rotation.y=yaw;nodes.shoulder.rotation.z=angles.shoulder;nodes.elbow.rotation.z=angles.elbow;nodes.wrist.rotation.z=angles.wrist;nodes.roll.rotation.y=roll;
    nodes.jawLeft.position.x=-opening;nodes.jawRight.position.x=opening;
    updateSupports();return angles;
  }
  robot.armRig={nodes,pose,updateSupports,limits,grip:nodes.roll,materials:mats};
  robot.userData.axes=6;robot.userData.components=components;
  robot.userData.construction='Joint-batched desktop manipulator; deterministic demonstration, not a physics simulation.';
  pose();robot.updateMatrixWorld(true);
  // Restore the original low draw-call shape outside an active demonstration.
  // Both representations share materials; this cache is built only once.
  const movingMeshes=[];robot.traverse(o=>{if(o.isMesh)movingMeshes.push(o);});
  const idleBatches=new Map(),idleMeshes=[];
  for(const mesh of movingMeshes){
    const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrixWorld);
    if(!idleBatches.has(mesh.material))idleBatches.set(mesh.material,[]);idleBatches.get(mesh.material).push(g);
  }
  for(const [material,geometries]of idleBatches){
    const geometry=new THREE.BufferGeometry();
    for(const key of ['position','normal','uv']){
      const values=new Float32Array(geometries.reduce((sum,g)=>sum+g.attributes[key].array.length,0));let offset=0;
      for(const g of geometries){values.set(g.attributes[key].array,offset);offset+=g.attributes[key].array.length;}
      geometry.setAttribute(key,new THREE.BufferAttribute(values,key==='uv'?2:3));
    }
    geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,material);mesh.name='Idle manipulator batch';mesh.castShadow=mesh.receiveShadow=true;robot.add(mesh);idleMeshes.push(mesh);
    geometries.forEach(g=>g.dispose());
  }
  movingMeshes.forEach(m=>m.layers.set(2));
  robot.armRig.setAnimated=value=>{movingMeshes.forEach(m=>m.visible=value);idleMeshes.forEach(m=>m.visible=!value);};
  robot.armRig.drawCalls={idle:idleMeshes.length,animated:movingMeshes.length};
  robot.armRig.setAnimated(false);return robot;
}
