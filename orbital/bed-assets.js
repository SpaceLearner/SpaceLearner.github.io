import { textureAsset } from './asset-profile.js?v=15091979dc992eb7';
import { RoundedBoxGeometry } from './vendor/DeskRoundedBoxGeometry.js';

// The existing walnut platform, oatmeal headboard and greige foot throw remain.
// Dimensions use the cabin's legacy units; the parent preserves its original scale.
export function createBed(THREE,{walnut}) {
  const bed=new THREE.Group();bed.name='Refined walnut platform bed';
  const weaveSize=128,pixels=new Uint8Array(weaveSize*weaveSize*4);
  for(let y=0;y<weaveSize;y++)for(let x=0;x<weaveSize;x++){
    const warp=Math.cos(x*Math.PI/2),weft=Math.cos(y*Math.PI/2);
    const value=Math.round(155+12*((Math.floor(x/2)+Math.floor(y/2))%2?warp:weft)+3*Math.sin(x*.37+y*.19));
    const i=(y*weaveSize+x)*4;pixels.set([value,value,value,255],i);
  }
  const weave=new THREE.DataTexture(pixels,weaveSize,weaveSize);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(9,9);
  weave.generateMipmaps=true;weave.minFilter=THREE.LinearMipmapLinearFilter;weave.magFilter=THREE.LinearFilter;weave.anisotropy=8;weave.needsUpdate=true;
  function cloth(color,roughness=.93){return new THREE.MeshPhysicalMaterial({color,roughness,metalness:0,bumpMap:weave,bumpScale:.0018,specularIntensity:.28,sheen:.18,sheenColor:new THREE.Color('#c6c0b1'),sheenRoughness:.96});}
  const sheet=cloth('#d1cbbd'),pillowMat=cloth('#d6d0c4'),headboard=cloth('#aba79c'),throwMat=cloth('#909184',.96),thread=cloth('#656155'),throwThread=cloth('#505149');
  const timber=walnut.clone();timber.roughness=.62;timber.bumpScale=.004;timber.clearcoat=.04;
  const plinth=walnut.clone();plinth.color.set('#655748');plinth.roughness=.76;plinth.bumpScale=.002;plinth.clearcoat=0;
  function add(name,geometry,material,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,material);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;bed.add(o);return o;}
  function rounded(name,w,h,d,x,y,z,material,r=.06){return add(name,new RoundedBoxGeometry(w,h,d,4,r),material,x,y,z);}
  function seam(name,points,material,r=.0028,closed=false){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed,'centripetal');return add(name,new THREE.TubeGeometry(curve,points.length*2,r,5,closed),material);}
  function perimeter(w,d,y,r=.06){const points=[];for(const [cx,cz,a]of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])for(let i=0;i<9;i++){const t=a+i/8*Math.PI/2;points.push([cx+Math.cos(t)*r,y,cz+Math.sin(t)*r]);}return points;}
  rounded('Recessed bed plinth',3.22,.36,2.32,0,.13,0,plinth,.035);
  rounded('Original proportion walnut bed platform',3.7,.28,2.75,0,.45,0,timber,.065);
  rounded('Tailored oatmeal upholstered headboard',3.6,1.15,.25,0,1.2,-1.35,headboard,.075);
  rounded('Fitted linen mattress',3.44,.34,2.5,0,.76,0,sheet,.075);
  seam('Mattress top welt attached to bed',perimeter(3.39,2.45,.904,.075),thread,.0028,true);
  seam('Mattress lower welt',perimeter(3.39,2.45,.612,.075),thread,.0025,true);

  // A closed cushion surface: broad compressed underside, tapered sewn edge and
  // shallow off-centre settling. A few tension creases replace rigid bevel faces.
  function pillow(cx,cz,angle,seed){
    const nx=40,nz=24,positions=[],uv=[],indices=[],w=1.31,d=.68;
    function point(u,v,top){
      const x=u*w/2*(1-.065*Math.pow(Math.abs(v),10)),z=v*d/2*(1-.055*Math.pow(Math.abs(u),10));
      const envelope=Math.pow(Math.max(0,(1-u*u)*(1-v*v)),.62);
      const dimple=.028*Math.exp(-((u+.15)**2/.28+(v-.08)**2/.52))*envelope;
      const crease=.007*Math.sin(v*19+u*3+seed)*Math.exp(-Math.pow((Math.abs(u)-.76)/.2,2))*Math.pow(Math.max(0,1-v*v),2);
      const y=top?.981+.185*envelope-dimple+crease*envelope:.930+.051*(1-envelope)**2;
      const ca=Math.cos(angle),sa=Math.sin(angle);
      return [cx+x*ca+z*sa,y,cz+z*ca-x*sa];
    }
    for(let side=0;side<2;side++)for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const u=i/nx*2-1,v=j/nz*2-1;positions.push(...point(u,v,side===0));uv.push((u+1)*.65,(v+1)*.34);}
    const count=(nx+1)*(nz+1);
    for(let side=0;side<2;side++)for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=side*count+j*(nx+1)+i,b=a+1,c=a+nx+1,e=c+1;indices.push(...(side===0?[a,c,b,b,c,e]:[a,b,c,b,e,c]));}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    add(seed===1?'Left softly settled linen pillow':'Right softly settled linen pillow',geo,pillowMat);
    const points=[];for(let i=0;i<24;i++)points.push(point(-1+i/12,-1,true));for(let i=0;i<16;i++)points.push(point(1,-1+i/8,true));for(let i=0;i<24;i++)points.push(point(1-i/12,1,true));for(let i=0;i<16;i++)points.push(point(-1,1-i/8,true));
    seam(seed===1?'Left pillow fine sewn perimeter':'Right pillow fine sewn perimeter',points,thread,.0023,true);
  }
  pillow(-.82,-.77,-.025,1);pillow(.82,-.79,.02,2);

  // One continuous textile, with a curved drop around the mattress edge and a
  // small number of uneven folds. No second slab underneath to cause z-fighting.
  const nx=72,nz=42,positions=[],uv=[],indices=[];
  const gaussian=(x,z,cx,cz,sx,sz)=>Math.exp(-Math.pow((x-cx)/sx,2)-Math.pow((z-cz)/sz,2));
  function wrap(s,start,r){if(s<=start)return[s,0];const a=Math.min((s-start)/r,Math.PI/2);return[start+r*Math.sin(a),-r*(1-Math.cos(a))-Math.max(0,s-start-r*Math.PI/2)];}
  function drape(u,v){
    const rawX=u*1.84,rawZ=.03+v*1.45;
    const [ax,dropX]=wrap(Math.abs(rawX),1.65,.088),[z,dropZ]=wrap(rawZ,1.18,.088);
    const topWeight=Math.exp((dropX+dropZ)*8);
    const foldA=.046*Math.exp(-Math.pow((rawX+.68-.36*rawZ)/.20,2))*Math.exp(-Math.pow((rawZ-.6)/.72,2));
    const foldB=.032*Math.exp(-Math.pow((rawX-.52+.22*rawZ)/.26,2))*Math.exp(-Math.pow((rawZ-.38)/.5,2));
    const foldC=.015*Math.sin(rawX*5+rawZ*2.3)*gaussian(rawX,rawZ,.5,.95,1.1,.4);
    const turnedEdge=.015*Math.exp(-Math.pow((rawZ-.07)/.055,2))*(1+.18*Math.sin(rawX*2.1));
    const x=Math.sign(rawX)*ax+.006*Math.sin(rawZ*8+rawX*2)*Math.min(1,-dropX*4);
    return[x,.952+dropX+dropZ+(foldA+foldB+foldC+turnedEdge)*topWeight,z+.008*Math.sin(rawX*3.1)*v*v];
  }
  for(let side=0;side<2;side++)for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const u=i/nx*2-1,v=j/nz,p=new THREE.Vector3(...drape(u,v));
    // Thickness follows the surface normal, including the vertical drape. A Y-only
    // offset would make the two faces coplanar at the foot and produce black tears.
    if(side){const du=new THREE.Vector3(...drape(u+.0001,v)).sub(new THREE.Vector3(...drape(u-.0001,v))),dv=new THREE.Vector3(...drape(u,v+.0001)).sub(new THREE.Vector3(...drape(u,v-.0001)));p.addScaledVector(dv.cross(du).normalize(),-.006);}
    positions.push(p.x,p.y,p.z);uv.push((u+1)*1.84,v*1.45);
  }
  const count=(nx+1)*(nz+1);
  for(let side=0;side<2;side++)for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=side*count+j*(nx+1)+i,b=a+1,c=a+nx+1,e=c+1;indices.push(...(side===0?[a,c,b,b,c,e]:[a,b,c,b,e,c]));}
  const boundary=[];for(let i=0;i<=nx;i++)boundary.push(i);for(let j=1;j<=nz;j++)boundary.push(j*(nx+1)+nx);for(let i=nx-1;i>=0;i--)boundary.push(nz*(nx+1)+i);for(let j=nz-1;j>0;j--)boundary.push(j*(nx+1));
  for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length];indices.push(a,b,a+count,b,b+count,a+count);}
  const throwGeo=new THREE.BufferGeometry();throwGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));throwGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));throwGeo.setIndex(indices);throwGeo.computeVertexNormals();
  add('Greige linen throw with natural edge drape',throwGeo,throwMat);
  const hem=[];for(let i=0;i<40;i++)hem.push(drape(-1+i/20,0));for(let i=0;i<24;i++)hem.push(drape(1,i/24));for(let i=0;i<40;i++)hem.push(drape(1-i/20,1));for(let i=0;i<24;i++)hem.push(drape(-1,1-i/24));
  seam('Fine tonal stitched throw hem',hem,throwThread,.0026,true);
  // Millimetre piping keeps its live material: putting very thin UV islands in
  // the diffuse atlas would introduce dark texel flecks along the sewn edges.
  let index=0;bed.traverse(o=>{if(o.isMesh&&o.geometry.type!=='TubeGeometry'){o.geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();o.userData.bedBakeIndex=index++;}});
  bed.userData.bakeTargets=index;
  return bed;
}

export async function applyBedBake(THREE,bed){
  const base=new URL('./baked-bed/',import.meta.url),get=async file=>{const r=await fetch(new URL(file,base));if(!r.ok)throw Error('Bed lighting asset unavailable: '+file);return r;};
  const manifest=await(await get('manifest.json')).json();
  const [buffer,map]=await Promise.all([get('uv.bin').then(r=>r.arrayBuffer()),new THREE.TextureLoader().loadAsync(new URL(textureAsset('irradiance-rgbm.webp'),base).href)]);
  const targets=new Map();bed.traverse(o=>{if(o.userData.bedBakeIndex!==undefined)targets.set(o.userData.bedBakeIndex,o);});
  if(manifest.version!==1||manifest.mappings.length!==targets.size||!Number.isFinite(manifest.range)||manifest.range<=0)throw Error('Bed bake manifest mismatch');
  for(const entry of manifest.mappings){const o=targets.get(entry.index);if(!o||o.name!==entry.name||o.geometry.attributes.position.count!==entry.vertexCount||entry.floatCount!==entry.vertexCount*2||entry.byteOffset<0||entry.byteOffset%4||entry.byteOffset+entry.floatCount*4>buffer.byteLength)throw Error('Bed bake geometry mismatch');for(const v of new Float32Array(buffer,entry.byteOffset,entry.floatCount))if(!Number.isFinite(v)||v<0||v>1)throw Error('Bed bake UV invalid');}
  map.colorSpace=THREE.NoColorSpace;map.channel=1;
  for(const entry of manifest.mappings){const o=targets.get(entry.index),m=o.material.clone();o.geometry.setAttribute('uv1',new THREE.BufferAttribute(new Float32Array(buffer,entry.byteOffset,entry.floatCount),2));m.lightMap=map;m.onBeforeCompile=shader=>{shader.uniforms.bedBakeRange={value:manifest.range};shader.fragmentShader='uniform float bedBakeRange;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      vec4 bedLight=texture2D(lightMap,vLightMapUv);
      reflectedLight.directDiffuse=vec3(0.0);
      reflectedLight.indirectDiffuse=bedLight.rgb*bedLight.a*bedBakeRange*material.diffuseColor;`);};m.customProgramCacheKey=()=>'bed-diffuse-bake-v1';o.material=m;}
  return{count:targets.size};
}
