// A small original orbital outpost, built in world space rather than on the glass.
// Five merged material batches keep it inexpensive during the entrance flight.
export function createDistantStation(THREE){
  const station=new THREE.Group();station.name='Distant orbital research station';
  station.position.set(-37,32,-320);station.rotation.set(.14,-.48,.19);
  const definitions={
    hull:{color:'#b3b4ac',roughness:.69,metalness:.24},
    structure:{color:'#8e9392',roughness:.62,metalness:.65},
    cells:{color:'#263443',roughness:.63,metalness:.32},
    foil:{color:'#877451',roughness:.78,metalness:.5},
    radiator:{color:'#a9b1b2',roughness:.81,metalness:.08}
  },batches=new Map(Object.keys(definitions).map(k=>[k,{positions:[],normals:[]}]))
  const up=new THREE.Vector3(0,1,0),transform=new THREE.Object3D();
  function part(geo,material,position=[0,0,0],quaternion=null){
    const g=geo.index?geo.toNonIndexed():geo,p=g.attributes.position,n=g.attributes.normal,b=batches.get(material);
    transform.position.set(...position);transform.quaternion.copy(quaternion||new THREE.Quaternion());transform.updateMatrix();
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(transform.matrix);
    for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(transform.matrix),normal=new THREE.Vector3().fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();b.positions.push(v.x,v.y,v.z);b.normals.push(normal.x,normal.y,normal.z);}
    geo.dispose();if(g!==geo)g.dispose();
  }
  function bar(a,b,r=.045,material='structure'){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),direction=bv.clone().sub(av),q=new THREE.Quaternion().setFromUnitVectors(up,direction.clone().normalize());part(new THREE.CylinderGeometry(r,r,direction.length(),6),material,av.add(bv).multiplyScalar(.5).toArray(),q);}
  function box(w,h,d,position,material){part(new THREE.BoxGeometry(w,h,d),material,position);}
  const alongZ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
  // Three joined pressure modules, docking collars and one transverse node.
  for(const z of [-3.15,0,3.15]){
    part(new THREE.CylinderGeometry(.72,.72,2.75,20), 'hull',[0,-.55,z],alongZ);
    for(const dz of [-1.40,1.40])part(new THREE.CylinderGeometry(.77,.77,.11,20),'structure',[0,-.55,z+dz],alongZ);
    for(const dz of [-.8,.8])part(new THREE.CylinderGeometry(.735,.735,.10,20),'foil',[0,-.55,z+dz],alongZ);
  }
  part(new THREE.CylinderGeometry(.48,.48,1.25,16),'structure',[0,-.55,5.12],alongZ);
  part(new THREE.CylinderGeometry(.56,.56,.17,20),'hull',[0,-.55,5.77],alongZ);
  const alongX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);
  part(new THREE.CylinderGeometry(.6,.6,3.5,16),'hull',[1.8,-.55,.3],alongX);
  // An open structural truss, with diagonal bracing rather than a solid beam.
  for(const y of [-.22,.22])for(const z of [-.25,.25])bar([-12,y,z],[12,y,z]);
  for(let x=-12;x<12;x+=1.5){
    for(const z of [-.25,.25])bar([x,-.22,z],[x+1.5,.22,z],.033);
    for(const y of [-.22,.22])bar([x,y,-.25],[x+1.5,y,.25],.033);
  }
  for(const x of [-9,-5,5,9]){
    bar([x,-7.4,0],[x,7.4,0],.07);
    for(const sign of [-1,1]){
      const y=sign*4.3;
      box(3.05,6.5,.055,[x,y,.05],'cells');
      for(const edge of [-1,1])box(.045,6.55,.09,[x+edge*1.55,y,.05],'structure');
      for(const edge of [-1,1])box(3.15,.045,.09,[x,y+edge*3.28,.05],'structure');
      for(let row=-2.8;row<=2.8;row+=.7)box(3.02,.018,.012,[x,y+row,.085],'structure');
      box(.025,6.45,.012,[x,y,.085],'foil');
    }
  }
  for(const sign of [-1,1]){
    box(2.2,3.4,.08,[sign*2.65,sign*2.35,-.45],'radiator');
    for(let row=0;row<6;row++)box(2.18,.025,.025,[sign*2.65,sign*2.35-1.5+row*.6,-.39],'structure');
  }
  bar([-.4,.1,-3.8],[-1.4,1.65,-4.4],.04);bar([-1.4,1.65,-4.4],[-.5,1.65,-4.4],.025);
  for(const [name,b]of batches){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));geometry.computeBoundingSphere();const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial(definitions[name]));m.name='Distant station '+name;m.castShadow=m.receiveShadow=false;station.add(m);}
  // Navigation lights: port red, starboard green, white strobes at the truss ends.
  // Additive sprites, fixed screen size, so they read at 300 m without lighting cost.
  const dot=document.createElement('canvas');dot.width=dot.height=64;
  const g=dot.getContext('2d'),grad=g.createRadialGradient(32,32,0,32,32,32);
  grad.addColorStop(0,'#fff');grad.addColorStop(.18,'#ffffffcc');grad.addColorStop(.45,'#ffffff22');grad.addColorStop(1,'#fff0');g.fillStyle=grad;g.fillRect(0,0,64,64);
  const glow=new THREE.CanvasTexture(dot);
  const navLights=[[[-12,0,0],'#ff3b30',0],[[12,0,0],'#34d17a',0],[[-12,.3,0],'#ffffff',1],[[12,.3,0],'#ffffff',1.3],[[0,-.55,5.86],'#ffffff',.6]].map(([position,color,phase])=>{
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:false,toneMapped:false}));
    sprite.position.set(...position);sprite.scale.setScalar(.012);sprite.userData={phase,strobe:color==='#ffffff'};station.add(sprite);return sprite;
  });
  station.userData.setBlink=seconds=>{for(const l of navLights){
    // Steady coloured lights breathe gently; white strobes fire a short double flash.
    const t=(seconds+l.userData.phase)%1.6;
    l.material.opacity=l.userData.strobe?(t<.08||(t>.2&&t<.28)?1:.06):.75+.25*Math.sin(seconds*2.1+l.userData.phase);
  }};
  station.userData.setBlink(0);
  station.userData.worldAnchored=true;station.userData.noDynamicLights=true;
  return station;
}
