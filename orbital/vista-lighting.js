// A restrained color response in the existing window lights. The sunlight,
// exposure, baked cabin irradiance and emitter positions stay fixed. This is
// art-directed reflected illumination, not a radiometric or ray-traced model.
export function createVistaLighting(THREE,key,fill) {
  const earth={key:new THREE.Color('#b9d1e0'),fill:new THREE.Color('#b8d5e7'),keyPower:.34,fillPower:.28};
  const disk={key:new THREE.Color('#dcc4a9'),fill:new THREE.Color('#d8b58a'),keyPower:.29,fillPower:.24};
  let value=0,start=0,target=0,startProgress=0,lastProgress=1,active=false;
  const index=v=>v==='gargantua'?1:0;
  function apply(next){
    value=Math.max(0,Math.min(1,next));key.color.copy(earth.key).lerp(disk.key,value);fill.color.copy(earth.fill).lerp(disk.fill,value);
    key.intensity=earth.keyPower+(disk.keyPower-earth.keyPower)*value;fill.intensity=earth.fillPower+(disk.fillPower-earth.fillPower)*value;
  }
  apply(0);
  return {
    update(state){
      if(!state.active){apply(index(state.current));active=false;lastProgress=1;return;}
      const p=state.progress;
      if(!active||p<lastProgress){start=value;target=index(state.desired);startProgress=p;active=true;}
      // Early retargets are blended from the current color. Late requests wait
      // for the return leg, matching the existing transit owner's behavior.
      else if(p<=.56&&index(state.desired)!==target){start=value;target=index(state.desired);startProgress=p;}
      const t=Math.max(0,Math.min(1,(p-startProgress)/Math.max(.001,1-startProgress)));
      apply(start+(target-start)*t*t*(3-2*t));lastProgress=p;
    },
    get state(){return {mix:value,keyColor:key.color.toArray(),fillColor:fill.color.toArray(),keyIntensity:key.intensity,fillIntensity:fill.intensity};}
  };
}
