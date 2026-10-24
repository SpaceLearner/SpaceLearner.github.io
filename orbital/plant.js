// A potted rubber-plant-style shrub: curved stems, tapered leaf blades with a
// raised midrib and a natural droop. Merged into two meshes for draw cost.

// Non-indexed geometries with matching attributes only; enough for leaves and stems.
function merge(THREE,list){
  const out=new THREE.BufferGeometry();
  for(const name of Object.keys(list[0].attributes)){
    const size=list[0].attributes[name].itemSize,array=new Float32Array(list.reduce((n,g)=>n+g.attributes[name].array.length,0));
    let offset=0;for(const g of list){array.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}
    out.setAttribute(name,new THREE.BufferAttribute(array,size));
  }
  for(const g of list)g.dispose();out.computeBoundingSphere();return out;
}

function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

// Leaf in its own frame: base at origin, tip along +Y, blade width along X.
function leafGeometry(THREE,length,width,curl,droop){
  const rows=14,cols=6,positions=[],uvs=[],index=[];
  for(let j=0;j<=rows;j++){
    const t=j/rows,half=width*Math.sin(Math.PI*Math.pow(t,.8))*(1-.35*t)*.5;
    for(let i=0;i<=cols;i++){
      const u=i/cols*2-1,x=u*half;
      // Cupped across the blade, raised along the midrib, drooping toward the tip.
      const cup=-u*u*curl*width*.6,rib=(1-Math.min(1,Math.abs(u)*8))*width*.025;
      positions.push(x,t*length,cup+rib-t*t*droop*length);uvs.push(i/cols,t);
    }
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;index.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(index);g.computeVertexNormals();
  return g.toNonIndexed();
}

export function createPlant(THREE,{potMaterial}){
  const group=new THREE.Group();group.name='Potted plant';
  const random=rng(4219);
  const leafMat=new THREE.MeshPhysicalMaterial({color:'#3f6a4c',roughness:.42,metalness:0,clearcoat:.35,clearcoatRoughness:.45,side:THREE.DoubleSide,sheen:.2,sheenColor:new THREE.Color('#9fc4a3')});
  // Lighter veins and a darker edge, painted once and shared by every leaf.
  const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');
  const grad=g.createLinearGradient(0,0,64,0);grad.addColorStop(0,'#2c4a37');grad.addColorStop(.42,'#4c7a58');grad.addColorStop(.5,'#9cbf8e');grad.addColorStop(.58,'#4c7a58');grad.addColorStop(1,'#2c4a37');
  g.fillStyle=grad;g.fillRect(0,0,64,256);g.strokeStyle='#7ea47466';g.lineWidth=1;
  for(let y=24;y<256;y+=22){g.beginPath();g.moveTo(32,y);g.quadraticCurveTo(18,y-6,4,y-16);g.moveTo(32,y);g.quadraticCurveTo(46,y-6,60,y-16);g.stroke();}
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;leafMat.map=map;leafMat.color.set('#ffffff');
  const stemMat=new THREE.MeshStandardMaterial({color:'#4d5a3a',roughness:.7});
  const leaves=[],stems=[],m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),s=new THREE.Vector3(1,1,1);
  const count=17;
  for(let i=0;i<count;i++){
    const golden=i*2.39996,height=.32+.9*(i/count)+random()*.12;
    const reach=.12+.22*random(),dir=new THREE.Vector3(Math.cos(golden),0,Math.sin(golden));
    const base=new THREE.Vector3(0,.02,0),tip=dir.clone().multiplyScalar(reach).setY(height);
    const mid=base.clone().lerp(tip,.55).add(new THREE.Vector3(0,.06,0));
    const curve=new THREE.QuadraticBezierCurve3(base,mid,tip);
    stems.push(new THREE.TubeGeometry(curve,10,.007,5,false).toNonIndexed());
    const length=.26+random()*.14,width=length*(.42+random()*.1);
    const leaf=leafGeometry(THREE,length,width,.22+random()*.1,.18+random()*.14);
    // Leaf leans outward along its stem direction and tilts up toward the light.
    e.set(-(.9+random()*.5),golden+Math.PI/2,(random()-.5)*.4,'YXZ');
    q.setFromEuler(e);m.compose(tip,q,s);leaf.applyMatrix4(m);leaves.push(leaf);
  }
  const leafMesh=new THREE.Mesh(merge(THREE,leaves),leafMat);leafMesh.name='Plant leaves';
  const stemMesh=new THREE.Mesh(merge(THREE,stems),stemMat);stemMesh.name='Plant stems';
  for(const mesh of [leafMesh,stemMesh]){mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
  // Soil surface inside the pot rim.
  const soil=new THREE.Mesh(new THREE.CircleGeometry(.3,32),new THREE.MeshStandardMaterial({color:'#2a211a',roughness:1}));
  soil.rotation.x=-Math.PI/2;soil.position.y=.01;soil.receiveShadow=true;group.add(soil);
  return group;
}
