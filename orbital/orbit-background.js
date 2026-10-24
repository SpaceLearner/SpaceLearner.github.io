// Earth imagery: NASA/GSFC, Reto Stockli, NASA Earth Observatory.
// Exact URLs and processing are recorded in ./textures/orbit-sources.json.
// Orbit composition is independent of the cabin and of the camera's flight path.
// The Earth is a depth-tested world-space sphere, never a camera-facing backdrop.
import {createStarField} from './star-field.js?v=844245f51357b75c';
import {createDistantStation} from './distant-station.js?v=7b2dc2527788d5f2';
import {createGargantua} from './gargantua.js?v=0872165e20334530';
import {sampleOrbitalMotion,createOrbitalMotionClock} from './orbital-motion.js?v=743ef3180e115eb3';
// A clock-synced visual day, not an astronomical ephemeris. UTC milliseconds
// avoid timezone/DST changes; the existing orientation is the midnight datum.
export function earthRotationAt(timestamp=Date.now()) {
  const day=86400000;
  return ((timestamp%day)+day)%day/day*Math.PI*2;
}
export function createOrbitalBackground(THREE, surface, clouds, lights) {
  const group=new THREE.Group();group.name='Orbital sky and Earth';
  // Both destinations share one world-space focal point. Their silhouettes,
  // sizes and motion stay independent, while arrival preserves the sightline.
  const radius=18,center=new THREE.Vector3(21,17,-125);
  const sunDirection=new THREE.Vector3(-.95,.18,-.25).normalize();
  surface.repeat.set(1,1);surface.wrapS=THREE.RepeatWrapping;surface.wrapT=THREE.ClampToEdgeWrapping;
  surface.colorSpace=THREE.SRGBColorSpace;
  clouds.repeat.set(1,1);clouds.wrapS=THREE.RepeatWrapping;clouds.wrapT=THREE.ClampToEdgeWrapping;
  clouds.colorSpace=THREE.NoColorSpace;
  if(lights){lights.repeat.set(1,1);lights.wrapS=THREE.RepeatWrapping;lights.wrapT=THREE.ClampToEdgeWrapping;lights.colorSpace=THREE.NoColorSpace;}
  const material=new THREE.ShaderMaterial({
    uniforms:{surface:{value:surface},clouds:{value:clouds},lights:{value:lights||null},hasLights:{value:lights?1:0},cloudDrift:{value:0},sunDirection:{value:sunDirection}},
    vertexShader:`
      varying vec2 vUv;varying vec3 vNormalW;varying vec3 vWorldP;varying vec3 vEastW;varying vec3 vNorthW;
      void main(){
        vUv=uv;vNormalW=normalize(mat3(modelMatrix)*normal);
        vec3 east=normalize(vec3(position.z,0.,-position.x)+vec3(.00001,0.,0.));
        vEastW=normalize(mat3(modelMatrix)*east);vNorthW=normalize(mat3(modelMatrix)*cross(normal,east));
        vec4 p=modelMatrix*vec4(position,1.);vWorldP=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;
      }`,
    fragmentShader:`
      uniform sampler2D surface;uniform sampler2D clouds;uniform sampler2D lights;uniform float hasLights;uniform float cloudDrift;uniform vec3 sunDirection;
      varying vec2 vUv;varying vec3 vNormalW;varying vec3 vWorldP;varying vec3 vEastW;varying vec3 vNorthW;
      void main(){
        vec3 n=normalize(vNormalW),viewDir=normalize(cameraPosition-vWorldP);
        vec3 east=normalize(vEastW),north=normalize(vNorthW);
        float mu=dot(n,sunDirection),viewMu=max(dot(n,viewDir),.06);
        float day=smoothstep(-.06,.13,mu),direct=pow(max(mu,0.),.83);
        vec3 albedo=texture2D(surface,vUv).rgb;
        albedo=mix(vec3(dot(albedo,vec3(.2126,.7152,.0722))),albedo,.88);
        // A thin cloud layer: tangent-plane projection follows the actual sun
        // direction and tilted Earth, rather than a constant texture offset.
        // This is a bounded visual approximation, not atmospheric simulation.
        float latitudeScale=max(sin(vUv.y*3.141593),.18);
        vec2 metric=vec2(6.283185*latitudeScale,3.141593);
        vec2 sunTangent=vec2(dot(sunDirection,east),dot(sunDirection,north));
        vec2 shadowStep=clamp(sunTangent/metric*(.0015/max(mu,.12)),vec2(-.012),vec2(.012));
        vec2 cloudUv=vUv+vec2(cloudDrift,0.);
        vec2 viewStep=vec2(dot(viewDir,east),dot(viewDir,north))/metric*(.0015/viewMu);
        float shadow=texture2D(clouds,cloudUv+shadowStep).r;
        vec3 ground=albedo*(1.-smoothstep(.14,.85,shadow)*.24*day);
        vec3 light=ground*(.0006+day*(.045+.94*direct));
        vec2 raisedUv=cloudUv+viewStep;
        float cloud=texture2D(clouds,raisedUv).r;
        float dx=texture2D(clouds,raisedUv+vec2(.0007,0.)).r-cloud;
        float dy=texture2D(clouds,raisedUv+vec2(0.,.0014)).r-cloud;
        vec3 cloudNormal=normalize(n-east*dx*.75-north*dy*.75);
        float cloudMu=max(dot(cloudNormal,sunDirection),0.);
        float cloudDay=smoothstep(-.075,.12,mu);
        vec3 cloudLight=vec3(.88,.90,.92)*(.0007+cloudDay*(.065+.94*pow(cloudMu,.72)));
        float coverage=smoothstep(.09,.84,cloud)*.94;
        light=mix(light,cloudLight,coverage);
        // Ocean sun glint. The Blue Marble map has no water mask, so open water is
        // inferred from blue dominance and low brightness; ice and land stay matte.
        vec3 halfV=normalize(sunDirection+viewDir);
        float water=smoothstep(.02,.09,albedo.b-max(albedo.r,albedo.g))*(1.-smoothstep(.35,.55,dot(albedo,vec3(.333))));
        float spec=pow(max(dot(n,halfV),0.),220.)*1.6+pow(max(dot(n,halfV),0.),28.)*.06;
        float fresnel=.02+.98*pow(1.-max(dot(halfV,viewDir),0.),5.);
        light+=vec3(1.,.93,.82)*spec*fresnel*water*day*(1.-coverage)*6.;
        // City lights on the night side, faded through the terminator and dimmed under cloud.
        float night=1.-smoothstep(-.18,.04,mu);
        float city=hasLights>.5?texture2D(lights,vUv).r:0.;
        light+=vec3(1.,.72,.38)*pow(city,1.6)*night*(1.-coverage*.75)*.09;
        // Very shallow blue grazing scatter, restricted to the illuminated rim.
        // The dark hemisphere stays dark instead of carrying an all-around halo.
        float grazing=pow(1.-max(dot(n,viewDir),0.),5.);
        light+=vec3(.015,.065,.125)*grazing*smoothstep(-.055,.24,mu)*.55;
        gl_FragColor=vec4(light,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const planet=new THREE.Mesh(new THREE.SphereGeometry(radius,192,128),material);
  planet.name='Earth at orbital scale';planet.position.copy(center);planet.rotation.set(-.72,5.2,-.14);
  const earthOrientation=planet.quaternion.clone(),earthAxis=new THREE.Vector3(0,1,0),earthSpin=new THREE.Quaternion();
  function setEarthTime(timestamp=Date.now()) {
    // Spin the ground about its fixed, tilted axis. Cloud advection has its own
    // UV offset; sunlight and the atmospheric limb stay in world space.
    planet.quaternion.copy(earthOrientation).multiply(earthSpin.setFromAxisAngle(earthAxis,earthRotationAt(timestamp)));
  }
  setEarthTime();
  planet.userData.safetySphere={radius};group.add(planet);
  const atmosphere=new THREE.ShaderMaterial({
    transparent:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,
    uniforms:{sunDirection:{value:sunDirection}},
    vertexShader:`varying vec3 n;varying vec3 v;varying vec3 nw;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);nw=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*p;}`,
    fragmentShader:`uniform vec3 sunDirection;varying vec3 n;varying vec3 v;varying vec3 nw;
      void main(){
        float limb=pow(1.-abs(dot(normalize(n),normalize(v))),3.2);
        float mu=dot(normalize(nw),sunDirection);
        float day=smoothstep(-.08,.3,mu);
        // Light skimming the terminator travels through more air and reddens.
        float twilight=exp(-pow((mu+.02)/.09,2.));
        vec3 color=mix(vec3(.10,.30,.62),vec3(.95,.48,.20),twilight*.75);
        gl_FragColor=vec4(color,limb*(.003+day*.36+twilight*.22));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const airRadius=radius*1.0085;
  const air=new THREE.Mesh(new THREE.SphereGeometry(airRadius,192,128),atmosphere);
  air.name='Thin sunlit atmospheric limb';air.position.copy(center);air.userData.safetySphere={radius:airRadius};group.add(air);
  const stars=createStarField(THREE);group.add(stars.group);
  const station=createDistantStation(THREE);group.add(station);
  const gargantua=createGargantua(THREE,center);group.add(gargantua.volume);
  const clock=createOrbitalMotionClock(),stationPosition=station.position.clone(),stationOrientation=station.quaternion.clone();
  const driftRotation=new THREE.Euler(),driftQuaternion=new THREE.Quaternion();
  function setMotion(seconds){
    const motion=sampleOrbitalMotion(seconds);
    station.position.set(stationPosition.x+motion.stationOffset[0],stationPosition.y+motion.stationOffset[1],stationPosition.z+motion.stationOffset[2]);
    driftRotation.set(...motion.stationRotation);
    station.quaternion.copy(stationOrientation).multiply(driftQuaternion.setFromEuler(driftRotation));
    stars.group.rotation.set(...motion.starRotation);
    material.uniforms.cloudDrift.value=motion.cloudDrift;
    station.userData.setBlink?.(seconds);
    gargantua.setMotion(motion.diskPhase);
  }
  setMotion(0);
  let vista='earth';
  function setVista(value){
    vista=value==='gargantua'?'gargantua':'earth';
    planet.visible=air.visible=vista==='earth';gargantua.volume.visible=vista==='gargantua';
    // Switching back always samples the current UTC clock, even after a long
    // hidden interval. It does not reset Earth to a fixed texture orientation.
    setEarthTime();return vista;
  }
  return {group,planet,air,station,gargantua,sunDirection,center,radius,setEarthTime,setVista,
    setTime(timestamp=Date.now(),frameTimestamp=timestamp){setEarthTime(timestamp);setMotion(clock.advance(frameTimestamp));},
    suspendMotion(){clock.suspend();},get motionSeconds(){return clock.seconds;},
    get vista(){return vista;},update(camera){stars.update(camera);}};
}
