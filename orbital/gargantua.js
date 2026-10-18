// Original, art-directed black-hole vista. Curved rays suggest gravitational
// lensing; this bounded, inexpensive visual model is not a scientific simulation.
// The volume lives in world space: neither its pose nor scale follows the camera.
// Visual study: James et al. (2015), https://arxiv.org/abs/1502.03808, §4.
// All flow, radiance and lensing code here is original; no film images are used.
export function createGargantua(THREE,center) {
  const scale=3.2;
  // A seamless polar flow texture, generated from our own deterministic noise.
  // Mip filtering matters: evaluating very fine noise inside a divergent ray
  // loop produced crawling grain at phone resolution.
  const width=1024,height=256,data=new Uint8Array(width*height*4);
  const fract=x=>x-Math.floor(x),smooth=x=>x*x*(3-2*x);
  const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
  function noise(x,y,period){const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(fract(x)),fy=smooth(fract(y)),j=((iy%period)+period)%period,k=(j+1)%period;const a=hash(ix,j)*(1-fx)+hash(ix+1,j)*fx,b=hash(ix,k)*(1-fx)+hash(ix+1,k)*fx;return a*(1-fy)+b*fy;}
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const r=x/(width-1),angle=y/height;
    const broad=noise(r*5,angle*7,7)*.62+noise(r*12+3,angle*17,17)*.38;
    const warp=(broad-.5)*.32;
    const wisps=noise((r+warp)*36,angle*9,9)*.58+noise((r+warp)*88+7,angle*19,19)*.29+noise((r+warp)*170,angle*37,37)*.13;
    const density=Math.max(0,Math.min(1,broad*.52+wisps*.48));
    const i=(y*width+x)*4;data[i]=Math.round(density*255);data[i+1]=Math.round(broad*255);data[i+2]=Math.round(wisps*255);data[i+3]=255;
  }
  const flowMap=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
  flowMap.name='Original filtered accretion filaments';flowMap.wrapS=THREE.ClampToEdgeWrapping;flowMap.wrapT=THREE.RepeatWrapping;
  flowMap.magFilter=THREE.LinearFilter;flowMap.minFilter=THREE.LinearMipmapLinearFilter;flowMap.generateMipmaps=true;flowMap.needsUpdate=true;
  flowMap.anisotropy=8;
  const material=new THREE.ShaderMaterial({
    transparent:true,depthTest:true,depthWrite:false,side:THREE.FrontSide,
    uniforms:{origin:{value:center},worldScale:{value:scale},phase:{value:0},flowMap:{value:flowMap}},
    vertexShader:`varying vec3 worldPoint;
      void main(){vec4 p=modelMatrix*vec4(position,1.);worldPoint=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`
      uniform vec3 origin;uniform float worldScale;uniform float phase;uniform sampler2D flowMap;
      varying vec3 worldPoint;
      vec3 bend(vec3 p,float h2){float r2=max(dot(p,p),.6);return -1.5*h2*p/(r2*r2*sqrt(r2));}
      const vec3 diskNormal=vec3(.025,.976,.216);
      vec4 disk(vec4 hit,vec3 direction,float order,float impact){
        float height=dot(hit.xyz,diskNormal);
        float r=max(sqrt(max(dot(hit.xyz,hit.xyz)-height*height,0.)),2.85);
        float u=clamp((r-2.85)/7.95,0.,1.);
        float angle=(atan(hit.z,hit.x+.0000001)+3.141593)/6.283185;
        // Two overlapping, finite-age flows renew smoothly before differential
        // shear can turn the texture into subpixel concentric rings. No UTC seed.
        float age=fract(phase/4.8),other=fract(age+.5);
        float weight=pow(sin(age*3.141593),2.);
        float shear=.38/pow(r/3.,1.5);
        vec3 first=texture2D(flowMap,vec2(u,angle-age*shear),.15).rgb;
        vec3 second=texture2D(flowMap,vec2(u,angle-other*shear),.15).rgb;
        vec3 flow=mix(second,first,weight);
        float density=.08+pow(flow.r,2.5)*3.2;
        float edge=smoothstep(2.85,3.65,r)*(1.-smoothstep(7.3,10.8,r));
        vec3 tangent=normalize(cross(diskNormal,hit.xyz+vec3(.00001,0,0)));
        float boost=clamp(1.+dot(tangent,-direction)*.45,.55,1.45);
        float strength=edge*pow(3.4/r,2.3)*density*boost*1.65;
        vec3 color=mix(vec3(.80,.36,.13),vec3(1.,.88,.68),pow(1.-u,.8));
        // Unresolved, repeatedly wound rays otherwise form a dotted inner ring.
        // Attenuate only outgoing images near the critical impact parameter;
        // the foreground disk still passes continuously across the shadow.
        strength*=mix(1.,smoothstep(2.67,2.84,impact),step(1.5,hit.w));
        float alpha=edge*clamp(.88+flow.g*.12,0.,.995)*min(hit.w,1.);
        return vec4(color*strength*alpha*pow(.10,order),alpha);
      }
      void main(){
        vec3 p=(worldPoint-origin)/worldScale;
        vec3 v=normalize(worldPoint-cameraPosition);
        vec3 angular=cross(p,v);float h2=dot(angular,angular);
        vec3 normal=normalize(diskNormal);
        vec3 viewRay=v;float hits=0.;bool captured=false,escaped=false;
        vec4 hit0=vec4(0.),hit1=vec4(0.),hit2=vec4(0.);
        // Adaptive steps concentrate work around the shadow and photon arcs.
        // A hard upper bound keeps the same shader usable on mobile GPUs.
        for(int i=0;i<192;i++){
          float radius=length(p);
          if(radius<1.04){captured=true;break;}
          if(radius>16.1){escaped=true;break;}
          float stepSize=clamp((radius-1.)*.115,.035,.75);
          vec3 halfV=v+bend(p,h2)*(.5*stepSize);
          vec3 next=p+halfV*stepSize;
          vec3 nextV=halfV+bend(next,h2)*(.5*stepSize);
          float a=dot(p,normal),b=dot(next,normal);
          // Trace the emitting surface at its midplane. Its inclination exposes
          // the near-side disk; a continuous crossing avoids holes from repeated
          // entry/exit tests on a slab thinner than the adaptive ray step.
          if(a*b<0.){
            vec3 hit=mix(p,next,a/(a-b));
            float r=length(hit);
            if(r>2.85&&r<10.8){
              float outgoing=dot(hit,v)>0.?2.:1.;
              if(hits<.5)hit0=vec4(hit,outgoing);else if(hits<1.5)hit1=vec4(hit,outgoing);else if(hits<2.5)hit2=vec4(hit,outgoing);
              hits+=1.;
            }
          }
          p=next;v=nextV;
        }
        vec4 first=disk(hit0,viewRay,0.,sqrt(h2)),second=disk(hit1,viewRay,1.,sqrt(h2)),third=disk(hit2,viewRay,2.,sqrt(h2));
        vec3 light=first.rgb+(1.-first.a)*second.rgb+(1.-first.a)*(1.-second.a)*third.rgb;
        float opacity=1.-(1.-first.a)*(1.-second.a)*(1.-third.a);
        if(captured||!escaped)opacity=1.;
        if(opacity<.008)discard;
        // Render after the star field, with ordinary alpha blending: the black
        // shadow actually hides background stars, without additive glow/bloom.
        gl_FragColor=vec4(light/max(opacity,.001),opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const volume=new THREE.Mesh(new THREE.SphereGeometry(16*scale,64,40),material);
  volume.name='Gargantua curved-ray accretion volume';volume.position.copy(center);
  volume.renderOrder=5;volume.visible=false;
  volume.userData.worldAnchored=true;volume.userData.artDirected=true;
  volume.userData.safetySphere={radius:16*scale};
  return {volume,setMotion(phase=0){material.uniforms.phase.value=((phase%4.8)+4.8)%4.8;}};
}
