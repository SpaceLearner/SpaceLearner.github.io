// Earth imagery: NASA/GSFC, Reto Stockli, NASA Earth Observatory.
// Exact URLs and processing are recorded in ./textures/orbit-sources.json.
// Orbit composition is independent of the cabin and of the camera's flight path.
// The Earth is a depth-tested world-space sphere, never a camera-facing backdrop.
import {createStarField} from './star-field.js';
import {createDistantStation} from './distant-station.js';
import {createGargantua} from './gargantua.js';
import {sampleOrbitalMotion,createOrbitalMotionClock} from './orbital-motion.js';
// A clock-synced visual day, not an astronomical ephemeris. UTC milliseconds
// avoid timezone/DST changes; the existing orientation is the midnight datum.
export function earthRotationAt(timestamp=Date.now()) {
  const day=86400000;
  return ((timestamp%day)+day)%day/day*Math.PI*2;
}
export function createOrbitalBackground(THREE, surface, clouds) {
  const group=new THREE.Group();group.name='Orbital sky and Earth';
  // Both destinations share one world-space focal point. Their silhouettes,
  // sizes and motion stay independent, while arrival preserves the sightline.
  const radius=18,center=new THREE.Vector3(21,17,-125);
  const sunDirection=new THREE.Vector3(-.95,.18,-.25).normalize();
  surface.repeat.set(1,1);surface.wrapS=THREE.RepeatWrapping;surface.wrapT=THREE.ClampToEdgeWrapping;
  surface.colorSpace=THREE.SRGBColorSpace;
  clouds.repeat.set(1,1);clouds.wrapS=THREE.RepeatWrapping;clouds.wrapT=THREE.ClampToEdgeWrapping;
  clouds.colorSpace=THREE.NoColorSpace;
  const material=new THREE.ShaderMaterial({
    uniforms:{surface:{value:surface},clouds:{value:clouds},cloudDrift:{value:0},sunDirection:{value:sunDirection}},
    vertexShader:`
      varying vec2 vUv;varying vec3 vNormalW;varying vec3 vWorldP;
      void main(){vUv=uv;vNormalW=normalize(mat3(modelMatrix)*normal);vec4 p=modelMatrix*vec4(position,1.);vWorldP=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`
      uniform sampler2D surface;uniform sampler2D clouds;uniform float cloudDrift;uniform vec3 sunDirection;
      varying vec2 vUv;varying vec3 vNormalW;varying vec3 vWorldP;
      void main(){
        vec3 n=normalize(vNormalW),viewDir=normalize(cameraPosition-vWorldP);
        vec3 albedo=texture2D(surface,vUv).rgb;
        albedo=mix(vec3(dot(albedo,vec3(.2126,.7152,.0722))),albedo,.84);
        vec2 cloudUv=vUv+vec2(cloudDrift,0.);
        float cloud=texture2D(clouds,cloudUv).r;
        float cloudShadow=texture2D(clouds,cloudUv+vec2(.001,-.0006)).r;
        albedo*=1.-cloudShadow*.16;
        albedo=mix(albedo,vec3(.84,.88,.92),smoothstep(.08,.88,cloud)*.9);
        float mu=dot(n,sunDirection),day=smoothstep(-.08,.14,mu);
        vec3 light=albedo*(.001+day*(.14+.82*pow(max(mu,0.),.65)));
        float grazing=pow(1.-max(dot(n,viewDir),0.),4.);
        light=mix(light,vec3(.035,.13,.24)*(.28+.72*day),grazing*.55);
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
      void main(){float limb=pow(1.-abs(dot(normalize(n),normalize(v))),4.);float day=smoothstep(-.1,.22,dot(normalize(nw),sunDirection));gl_FragColor=vec4(.13,.34,.58,limb*(.025+day*.42));}`
  });
  const airRadius=radius*1.0023;
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
