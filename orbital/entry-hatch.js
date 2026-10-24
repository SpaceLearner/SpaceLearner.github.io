// Bi-parting aft hatch, driven by entrance progress. Kept outside the cabin
// group so the baked lightmap manifest and static batches stay unchanged.
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};

// Closed while approaching, unlatch, swing open before the camera reaches the
// collar (progress ~.6), then close behind it; closed at rest and after skip.
export function hatchState(p){
  return {unlatch:smooth(.26,.33,p)*(1-smooth(.9,.98,p)),open:smooth(.33,.55,p)*(1-smooth(.84,.96,p))};
}

export function createEntryHatch(THREE,{x,y,z,width,height,radius}) {
  const group=new THREE.Group();group.name='Aft entry hatch';
  const skin=new THREE.MeshPhysicalMaterial({color:'#c2beb3',roughness:.64,metalness:.05,clearcoat:.08,clearcoatRoughness:.6});
  const trim=new THREE.MeshPhysicalMaterial({color:'#2d3539',roughness:.45,metalness:.7});
  const lamp=new THREE.MeshBasicMaterial({color:'#e0a85a'}),locked=new THREE.Color('#e0a85a'),clear=new THREE.Color('#bfe6d2');
  const w=width/2-.012,h=height,r=Math.min(radius,w*.9),d=.07;
  const leaves=[-1,1].map(side=>{
    // Hinge-local shape: rounded on the hinge side, square along the seam.
    const s=new THREE.Shape(),sx=v=>-side*v;
    s.moveTo(sx(r),-h/2);s.lineTo(sx(w),-h/2);s.lineTo(sx(w),h/2);s.lineTo(sx(r),h/2);
    s.quadraticCurveTo(0,h/2,0,h/2-r);s.lineTo(0,-h/2+r);s.quadraticCurveTo(0,-h/2,sx(r),-h/2);
    const geometry=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.012,bevelSize:.01,bevelSegments:2,curveSegments:20});
    geometry.translate(0,0,-d/2);
    const pivot=new THREE.Group();pivot.position.set(x+side*width/2,y,z);group.add(pivot);
    const leaf=new THREE.Mesh(geometry,skin);leaf.name='Hatch leaf';pivot.add(leaf);
    const part=(gw,gh,gd,px,py,pz,m)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(gw,gh,gd),m);mesh.position.set(px,py,pz);pivot.add(mesh);return mesh;};
    for(const gy of [-h*.22,h*.2])part(w*.82,.022,.012,sx(w*.5),gy,d/2+.012,trim);
    part(.05,h*.86,.014,sx(w-.03),0,d/2+.013,trim);
    part(.1,.42,.03,sx(w-.2),0,d/2+.02,trim);
    part(.022,.3,.008,sx(w-.06),h*.36,d/2+.022,lamp);
    pivot.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
    return {pivot,side};
  });
  return {
    group,
    set(progress){
      const {unlatch,open}=hatchState(progress);
      for(const {pivot,side} of leaves){// Leaves pop out of the gasket, then swing outward clear of the collar.
        pivot.position.z=z+unlatch*.035;pivot.rotation.y=side*open*THREE.MathUtils.degToRad(100);}
      lamp.color.copy(locked).lerp(clear,unlatch);
    }
  };
}
