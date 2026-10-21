import { textureAsset } from './asset-profile.js?v=e25ce7cd2bccf128';
import { batchArchitecture } from './static-batch.js?v=80a918055dedda24';
// Cycles diffuse lighting uses a separate UV atlas; live lighting still supplies
// the view-dependent metal/clearcoat reflections. RGBM keeps the lightmap linear.
export async function applyCabinBake(THREE,cabin) {
  const base=new URL('./baked-cabin/',import.meta.url);
  async function get(file) {
    const response=await fetch(new URL(file,base));
    if(!response.ok)throw new Error(`Cabin lighting asset ${file}: ${response.status}`);
    return response;
  }
  async function load(file){
    const manifest=await (await get(file)).json();
    const [buffer,texture]=await Promise.all([
      get(manifest.uv).then(response=>response.arrayBuffer()),
      new THREE.TextureLoader().loadAsync(new URL(textureAsset(manifest.texture),base).href)
    ]);
    texture.colorSpace=THREE.NoColorSpace;texture.channel=1;
    texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
    return {manifest,buffer,texture};
  }
  // Keep the approved cabin atlas intact; the enlarged wings have their own
  // small atlas, so updating their shadows cannot alter interior lighting.
  const [primary,solar]=await Promise.all([load('manifest.json'),cabin.userData.solarLightmap?load('solar-manifest.json'):null]);
  const {manifest,buffer}=primary;
  const meshes=new Map();cabin.traverse(mesh=>{if(mesh.isMesh&&mesh.userData.bakeIndex!==undefined)meshes.set(mesh.userData.bakeIndex,mesh);});
  // Validate the entire atlas before changing any material. Old cached geometry
  // then retains its ordinary lighting instead of receiving mismatched UVs.
  if(manifest.version!==1||!Number.isFinite(manifest.range)||manifest.range<=0||manifest.mappings.length!==meshes.size)throw new Error('Invalid cabin lightmap manifest');
  const seen=new Set();
  for(const item of manifest.mappings){
    const mesh=meshes.get(item.index);
    if(!mesh||mesh.name!==item.name||mesh.geometry.attributes.position.count!==item.vertexCount)throw new Error('Cabin lightmap does not match the scene geometry');
    if(seen.has(item.index)||item.floatCount!==item.vertexCount*2||!Number.isInteger(item.byteOffset)||item.byteOffset<0||item.byteOffset%4!==0||item.byteOffset+item.floatCount*4>buffer.byteLength)throw new Error('Invalid cabin lightmap UV buffer');
    seen.add(item.index);
    for(const value of new Float32Array(buffer,item.byteOffset,item.floatCount))if(!Number.isFinite(value)||value<0||value>1)throw new Error('Invalid cabin lightmap UV coordinates');
  }
  const overrides=new Map();
  if(solar){
    if(solar.manifest.version!==1||!Number.isFinite(solar.manifest.range)||solar.manifest.range<=0)throw new Error('Invalid solar lightmap manifest');
    for(const item of solar.manifest.mappings){
      const mesh=meshes.get(item.index);
      if(!mesh||mesh.name!==item.name||mesh.geometry.attributes.position.count!==item.vertexCount||item.floatCount!==item.vertexCount*2||!Number.isInteger(item.byteOffset)||item.byteOffset<0||item.byteOffset%4||item.byteOffset+item.floatCount*4>solar.buffer.byteLength||overrides.has(item.index))throw new Error('Solar lightmap does not match its geometry');
      for(const value of new Float32Array(solar.buffer,item.byteOffset,item.floatCount))if(!Number.isFinite(value)||value<0||value>1)throw new Error('Invalid solar UV coordinates');
      overrides.set(item.index,item);
    }
  }
  let count=0;const materials=new Map();
  for(const item of manifest.mappings){
    const mesh=meshes.get(item.index);
    if(!mesh.material.isMeshStandardMaterial)continue;
    const alternate=overrides.get(item.index),atlas=alternate?solar:primary,uv=alternate||item;
    mesh.geometry.setAttribute('uv1',new THREE.BufferAttribute(new Float32Array(atlas.buffer,uv.byteOffset,uv.floatCount),2));
    const exterior=mesh.name.startsWith('Exterior shell bay')||!!alternate;
    const key=mesh.material.uuid+':'+atlas.texture.uuid+':'+exterior;
    if(!materials.has(key)){const material=mesh.material.clone();material.lightMap=atlas.texture;materials.set(key,material);}
    const material=materials.get(key);
    material.onBeforeCompile=shader=>{
      shader.uniforms.cabinBakeRange={value:atlas.manifest.range};
      shader.fragmentShader='uniform float cabinBakeRange;\n'+shader.fragmentShader;
      // Three's rectangular area lights do not cast shadows. The ceiling fill
      // must not produce a specular highlight through the opaque outer shell.
      if(exterior)shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>','#undef RE_Direct_RectArea\n#include <lights_fragment_begin>');
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`
        #include <lights_fragment_end>
        #ifdef USE_LIGHTMAP
          vec4 cabinIrradiance=texture2D(lightMap,vLightMapUv);
          reflectedLight.directDiffuse=vec3(0.0);
          reflectedLight.indirectDiffuse=cabinIrradiance.rgb*cabinIrradiance.a*cabinBakeRange*material.diffuseColor;
        #endif
      `);
    };
    material.customProgramCacheKey=()=> 'cycles-cabin-rgbm-v1-'+exterior;
    mesh.material=material;mesh.userData.bakedIrradiance=true;count++;
  }
  const batches=batchArchitecture(THREE,cabin);
  return {count,batches};
}
