// Art-directed celestial field, not an astronomical catalogue or a sky photograph.
// Fixed directions, mixed magnitudes and a faint dusty band; no animated twinkle.
export function createStarField(THREE) {
  const sky=new THREE.Group();sky.name='Distant layered star field';
  const pole=new THREE.Vector3(.48,.86,.14).normalize();
  const axis=new THREE.Vector3().crossVectors(pole,new THREE.Vector3(0,0,1)).normalize();
  const other=new THREE.Vector3().crossVectors(pole,axis).normalize();
  const band=new THREE.Mesh(new THREE.SphereGeometry(480,64,32),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,depthTest:true,toneMapped:false,
    uniforms:{pole:{value:pole}},
    vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec3 direction;uniform vec3 pole;
      float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float cloud(vec3 p){return noise(p)*.57+noise(p*2.17+3.1)*.28+noise(p*4.83+1.7)*.15;}
      void main(){
        vec3 d=normalize(direction);float latitude=dot(d,pole);
        float broad=exp(-latitude*latitude*46.);
        float detail=cloud(d*25.);float structure=cloud(d*5.7);
        float lane=exp(-pow((latitude+.035+(structure-.5)*.10)*24.,2.));
        float density=broad*(.16+.84*structure)*(.45+.55*detail)*(1.-lane*.68);
        vec3 color=vec3(.00024,.00033,.00050)+vec3(.011,.013,.016)*density;
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`
  }));
  band.name='Faint galactic dust band';band.renderOrder=-20;band.userData.skyBackground=true;sky.add(band);

  let seed=7937;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const positions=[],colors=[],sizes=[];
  const direction=new THREE.Vector3();
  function star(belt,minSize,maxSize,minLight,maxLight){
    if(belt){
      const longitude=random()*Math.PI*2;
      const normal=Math.sqrt(-2*Math.log(Math.max(random(),1e-6)))*Math.cos(random()*Math.PI*2);
      const latitude=normal*(.075+.045*Math.sin(longitude*3+1)**2);
      direction.copy(axis).multiplyScalar(Math.cos(longitude)*Math.cos(latitude));
      direction.addScaledVector(other,Math.sin(longitude)*Math.cos(latitude));direction.addScaledVector(pole,Math.sin(latitude));
    }else{
      const y=random()*2-1,longitude=random()*Math.PI*2,r=Math.sqrt(1-y*y);
      direction.set(Math.cos(longitude)*r,y,Math.sin(longitude)*r);
    }
    positions.push(direction.x*450,direction.y*450,direction.z*450);
    const light=minLight+(maxLight-minLight)*random(),temperature=random();
    // Very restrained warm/cool variation, keeping the field essentially neutral.
    colors.push(light*(.88+.12*temperature),light*.95,light*(1.-.15*temperature));
    sizes.push(minSize+(maxSize-minSize)*random());
  }
  for(let i=0;i<2400;i++)star(false,1.05,1.75,.38,.74);
  for(let i=0;i<650;i++)star(false,1.8,2.8,.68,1.05);
  for(let i=0;i<85;i++)star(false,2.8,3.7,1.,1.30);
  for(let i=0;i<14;i++)star(false,3.8,4.7,1.2,1.45);
  for(let i=0;i<1800;i++)star(true,.85,1.45,.25,.52);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('size',new THREE.Float32BufferAttribute(sizes,1));
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false,
    uniforms:{pixelRatio:{value:Math.min(globalThis.devicePixelRatio||1,1.7)}},
    vertexShader:`attribute vec3 color;attribute float size;uniform float pixelRatio;varying vec3 light;void main(){light=color;gl_PointSize=size*pixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 light;void main(){float radius=length(gl_PointCoord-.5);if(radius>.5)discard;float core=exp(-radius*radius*8.);float edge=1.-smoothstep(.35,.50,radius);gl_FragColor=vec4(light,core*edge*.95);
      #include <colorspace_fragment>
    }`
  });
  const points=new THREE.Points(geometry,material);points.name='Fixed stars with varied apparent magnitudes';sky.add(points);
  sky.userData.starCount=sizes.length;
  return {group:sky,update(camera){sky.position.copy(camera.position);}};
}
