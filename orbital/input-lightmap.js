import { textureAsset } from './asset-profile.js?v=e25ce7cd2bccf128';
// Original desk props: offline diffuse bounce light, live specular highlights.
export async function applyInputBake(THREE,groups){
  const base=new URL('./baked-inputs/',import.meta.url);
  const get=async name=>{const r=await fetch(new URL(name,base));if(!r.ok)throw Error('Desktop bake asset unavailable: '+name);return r;};
  const manifest=await (await get('manifest.json')).json();
  const [buffer,texture,contact]=await Promise.all([get(manifest.uv).then(r=>r.arrayBuffer()),new THREE.TextureLoader().loadAsync(new URL(textureAsset(manifest.texture),base).href),new THREE.TextureLoader().loadAsync(new URL('mat-contact.png',base).href)]);
  texture.colorSpace=THREE.NoColorSpace;texture.channel=1;contact.colorSpace=THREE.NoColorSpace;
  const meshes=new Map();let shadow;
  for(const group of groups)group.traverse(mesh=>{if(mesh.userData.inputBakeIndex!==undefined)meshes.set(mesh.userData.inputBakeIndex,mesh);if(mesh.userData.contactBake)shadow=mesh;});
  if(manifest.version!==1||!Number.isFinite(manifest.range)||!(manifest.range>0)||manifest.mappings.length!==meshes.size||!shadow)throw Error('Invalid desktop lightmap manifest');
  const seen=new Set();
  for(const item of manifest.mappings){
    const mesh=meshes.get(item.index);
    if(!mesh||seen.has(item.index)||mesh.name!==item.name||mesh.geometry.attributes.position.count!==item.vertexCount||item.floatCount!==item.vertexCount*2||!Number.isInteger(item.byteOffset)||item.byteOffset<0||item.byteOffset%4||item.byteOffset+item.floatCount*4>buffer.byteLength)throw Error('Desktop lightmap does not match geometry');
    seen.add(item.index);for(const v of new Float32Array(buffer,item.byteOffset,item.floatCount))if(!Number.isFinite(v)||v<0||v>1)throw Error('Invalid desktop lightmap UV');
  }
  for(const item of manifest.mappings){
    const mesh=meshes.get(item.index),material=mesh.material.clone();mesh.geometry.setAttribute('uv1',new THREE.BufferAttribute(new Float32Array(buffer,item.byteOffset,item.floatCount),2));material.lightMap=texture;
    material.onBeforeCompile=shader=>{
      shader.uniforms.inputBakeRange={value:manifest.range};shader.fragmentShader='uniform float inputBakeRange;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        vec4 deskIrradiance=texture2D(lightMap,vLightMapUv);
        reflectedLight.directDiffuse=vec3(0.0);
        reflectedLight.indirectDiffuse=deskIrradiance.rgb*deskIrradiance.a*inputBakeRange*material.diffuseColor;`);
    };
    material.customProgramCacheKey=()=> 'cycles-input-rgbm-v1';mesh.material=material;mesh.userData.bakedInput=true;
  }
  shadow.material.alphaMap=contact;shadow.material.opacity=.65;shadow.material.needsUpdate=true;
  return {count:meshes.size};
}
