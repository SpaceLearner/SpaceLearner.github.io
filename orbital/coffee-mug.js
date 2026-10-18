import {RoundedBoxGeometry} from './vendor/DeskRoundedBoxGeometry.js';

// Original metric glass and iced coffee. Same footprint, height and tabletop
// origin as the former cup. Ice is geometry, so it reads in the seated view.
export function createCoffeeMug(THREE){
  const mug=new THREE.Group();mug.name='Glass of iced coffee';
  Object.assign(mug.userData,{units:'metres',contactOrigin:true,capacityML:280,drink:'iced coffee',wallThickness:.002,baseThickness:.007});
  const glass=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.085,metalness:0,transmission:.98,thickness:.002,ior:1.5,attenuationColor:'#f4fbf8',attenuationDistance:.35,transparent:true,opacity:.76,depthWrite:false,envMapIntensity:.9});
  const coffeeMaterial=new THREE.MeshPhysicalMaterial({color:'#27150b',roughness:.18,metalness:0,ior:1.333,specularIntensity:.8,envMapIntensity:.75});
  const iceMaterial=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.055,metalness:0,transmission:.94,thickness:.021,ior:1.31,attenuationColor:'#d8e8e4',attenuationDistance:.3,envMapIntensity:1.9,depthWrite:false});
  function mesh(geometry,material,name){const m=new THREE.Mesh(geometry,material);m.name=name;m.receiveShadow=true;mug.add(m);return m;}
  const profile=[[0,0],[.028,0],[.030,0.0003],[.0314,.001],[.0322,.0023],[.0326,.004],[.033,.009],[.034,.026],[.0357,.050],[.0375,.074],[.039,.096]];
  for(let i=1;i<=16;i++){const a=i*Math.PI/16;profile.push([.038+.001*Math.cos(a),.096+.001*Math.sin(a)]);}
  profile.push([.0355,.074],[.0337,.050],[.032,.026],[.031,.010],[.0304,.008],[.028,.007],[0,.007]);
  const shell=mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),128),glass,'Clear glass with continuous inner wall and rounded lip');shell.renderOrder=4;
  // Deep coffee has a closed volume, a still top and a capillary edge at the wall.
  const liquid=[[0,.0077],[.028,.0077],[.0304,.0085],[.03095,.010],[.03195,.026],[.03365,.050],[.03545,.074],[.036185,.0843],[.03624,.08475],[.0360,.08455],[.0356,.0843],[.033,.08425],[.024,.08425],[0,.08425]];
  const coffee=mesh(new THREE.LatheGeometry(liquid.map(p=>new THREE.Vector2(...p)),128),coffeeMaterial,'Dark coffee volume and meniscus');coffee.castShadow=true;
  const cubes=[
    {p:[-.012,.078,-.012],s:[.023,.025,.020],r:[.28,.42,-.23]},
    {p:[.013,.0773,-.012],s:[.020,.024,.024],r:[-.26,-.34,.18]},
    {p:[-.011,.0775,.012],s:[.024,.022,.021],r:[-.18,.25,.32]},
    {p:[.013,.0783,.012],s:[.020,.024,.023],r:[.27,-.22,-.28]}
  ];
  const frost=new THREE.MeshPhysicalMaterial({color:'#dbe5df',roughness:.65,transparent:true,opacity:.25,depthWrite:false,metalness:0});
  frost.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n diffuseColor.a*=pow(max(dot(normal,normalize(vViewPosition)),0.0),1.25);');};
  frost.customProgramCacheKey=()=> 'soft-ice-core-v1';
  cubes.forEach((item,index)=>{
    const g=new RoundedBoxGeometry(...item.s,5,.0035);
    // Small asymmetric melted corners, no repeated opaque white blocks.
    const positions=g.attributes.position;
    for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);positions.setXYZ(i,x*(1+.06*Math.sin(y*173+z*191)),y*(1+.08*Math.cos(x*137-z*193)),z*(1+.05*Math.sin(x*211+y*157)));}
    // Preserve the smooth bevel normals while gently warping the corners.
    const cube=mesh(g,iceMaterial,'Clear floating ice '+(index+1));cube.position.set(...item.p);cube.rotation.set(...item.r);cube.renderOrder=2;cube.userData.ice=true;
    const core=new THREE.Mesh(new RoundedBoxGeometry(.013,.016,.014,4,.004),frost);core.name='Small cloudy ice core '+(index+1);core.position.set(-.001,.003,0);core.scale.set(1,.95,.85);core.rotation.set(.25,-.32,.18);core.renderOrder=6;cube.add(core);
  });
  // Sparse sub-millimetre condensation; no oversized droplets or steam.
  const water=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.10,ior:1.333,metalness:0,transparent:true,opacity:.34,depthWrite:false,envMapIntensity:.7});
  const beads=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),water,22);beads.name='Restrained cold condensation';beads.renderOrder=5;
  const transform=new THREE.Object3D();
  for(let i=0;i<22;i++){
    const angle=i*2.39996+.3,y=.019+((i*17)%47)/1000,r=y<=.026?.033+(y-.009)*(.001/.017):y<=.050?.034+(y-.026)*(.0017/.024):.0357+(y-.050)*(.0018/.024),bead=.00020+(i%4)*.000055;
    transform.position.set(Math.sin(angle)*(r+.000015),y,Math.cos(angle)*(r+.000015));transform.rotation.set(0,angle,0);transform.scale.set(bead,bead*(1.1+(i%3)*.1),bead*.38);transform.updateMatrix();beads.setMatrixAt(i,transform.matrix);
  }
  mug.add(beads);
  const shadow=mesh(new THREE.PlaneGeometry(.14,.14),new THREE.MeshBasicMaterial({color:'#271b11',transparent:true,opacity:0,depthWrite:false,toneMapped:false}),'Glass base contact shadow');shadow.rotation.x=-Math.PI/2;shadow.position.y=-.00018;shadow.userData.mugContactBake=true;
  return mug;
}

// Only the contact decal is baked. Glass and ice retain live transmission and
// reflections; no opaque diffuse lightmap is applied to transparent surfaces.
export async function applyMugBake(THREE,mug){
  const texture=await new THREE.TextureLoader().loadAsync(new URL('./iced-coffee/contact.png',import.meta.url).href);texture.colorSpace=THREE.NoColorSpace;
  const shadow=mug.getObjectByName('Glass base contact shadow');shadow.material.alphaMap=texture;shadow.material.opacity=.50;shadow.material.needsUpdate=true;return {count:1};
}
