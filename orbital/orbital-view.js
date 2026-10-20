import { quality } from './quality-profile.js';
// Render only the orbital layer to a small HDR target. The cabin is rendered
// once, with its original camera and lighting; its depth hides this sky pass.
// UI remains ordinary DOM and never enters the distortion or bloom pipeline.
export function createOrbitalView(THREE,scene,orbit) {
  orbit.group.traverse(o=>o.layers.enable(1));
  scene.traverse(o=>{if(o.isLight)o.layers.enable(1);});
  let target=null,bright=null,blurX=null,blurY=null;
  const size=new THREE.Vector2();
  const uniforms={sky:{value:null},glowMap:{value:null},resolution:{value:new THREE.Vector2(1,1)},progress:{value:0},jumpActive:{value:0},quiet:{value:0},bloom:{value:0}};
  const material=new THREE.ShaderMaterial({depthTest:true,depthWrite:false,uniforms,
    vertexShader:`varying vec2 uvScreen;void main(){uvScreen=position.xy*.5+.5;gl_Position=vec4(position.xy,.999999,1.);}`,
    fragmentShader:`
      varying vec2 uvScreen;uniform sampler2D sky;uniform sampler2D glowMap;uniform vec2 resolution;
      uniform float progress,jumpActive,quiet,bloom;
      float hash(float n){return fract(sin(n*127.1+311.7)*43758.5453);}
      mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
      vec3 sampleSky(vec2 p){
        vec2 edge=smoothstep(vec2(0.),vec2(.015),p)*(1.-smoothstep(vec2(.985),vec2(1.),p));
        return texture2D(sky,clamp(p,vec2(.001),vec2(.999))).rgb*edge.x*edge.y;
      }
      // A nonlinear ray map changes radial and tangential scale differently.
      // It bends the actual captured planet, station and star field into a
      // narrowing, curved ribbon; this is not a second layer of drawn lines.
      vec2 curvedRay(vec2 q,float depth){
        float r=max(length(q),.00001);
        float radial=.30*pow(r/.30,1.-depth*.60)*(1.+depth*.40);
        float twist=depth*1.45/(1.+r*3.);
        return rot(twist)*(q/r)*radial;
      }
      float streaks(vec2 p,float drive,float power){
        float radius=length(p);float theta=atan(p.y,p.x)+power*.27*exp(-radius*1.6);
        float sector=(theta+3.141593)*19.1;float id=floor(sector);
        float lane=fract(sector)-(.22+.56*hash(id+8.));
        // Convert sector units back to angular distance before sizing the ray.
        // A pixel-sized floor prevents broken, dotted trails on narrow screens.
        float distance=abs(lane)/19.1*max(radius,.07);
        float width=max(.00045+.0006*hash(id+1.),.7/resolution.y);
        float narrow=exp(-pow(distance/width,2.));
        float head=fract(hash(id+3.)+drive*(.42+.55*hash(id+9.)))*1.45;
        float tail=head-radius;
        float trail=smoothstep(0.,.018,tail)*(1.-smoothstep(.04+power*.10,.08+power*.40,tail));
        return narrow*trail*smoothstep(.04,.12,radius)*(.25+.75*hash(id+2.));
      }
      void main(){
        vec2 uv=uvScreen,texel=1./resolution;
        float p=progress;
        float envelope=jumpActive*smoothstep(0.,.44,p)*(1.-smoothstep(.56,1.,p));
        float power=envelope*(1.-quiet);
        vec2 aspect=vec2(resolution.x/resolution.y,1.);
        vec2 focus=vec2(.46,.58);
        vec2 q=(uv-focus)*aspect;float radius=length(q);
        vec2 warped=curvedRay(q,power);
        vec2 source=focus+warped/aspect;
        vec3 color=sampleSky(source);
        // Integrate neighboring depths of the same warped scene: continuous
        // planet color and cloud detail stretch with the light, not just stars.
        if(power>.001){
          vec3 stretched=vec3(0.);float weight=0.;
          for(int i=0;i<16;i++){
            float t=float(i)/15.,w=exp(-t*2.8);
            vec2 v=curvedRay(q*(1.-power*t*.48),power);
            stretched+=sampleSky(focus+v/aspect)*w;weight+=w;
          }
          color=mix(color,stretched/weight,power*.72);
        }
        // A low-energy optical veil softens only high radiance. No neon halo,
        // large full-screen glow, exposure pumping or effect on cabin objects.
        color+=texture2D(glowMap,source).rgb*bloom*.22*(1.-power*.8);
        // Keep the deformed scenery visible through the approach and arrival.
        // Only the short crossing interval fully conceals the destination swap.
        float crossing=smoothstep(.39,.46,p)*(1.-smoothstep(.56,.63,p));
        float quietCover=smoothstep(.20,.46,p)*(1.-smoothstep(.56,.82,p));
        float cover=jumpActive*mix(crossing,quietCover,quiet);
        float rays=streaks(q,p*2.8,power)+streaks(rot(.38)*q*1.25,p*3.2+.6,power)*.38;
        vec3 tunnel=vec3(.001,.002,.004)+rays*vec3(.035,.055,.075)*power;
        tunnel+=vec3(.004,.007,.010)*exp(-radius*radius*8.)*power;
        color=mix(color,tunnel,cover*(1.-quiet));
        color+=rays*vec3(.016,.025,.033)*power*(1.-cover);
        // Quiet mode is a brief dim-through transition, with no geometric
        // distortion, moving stars, camera movement or sudden white flash.
        color*=1.-quiet*cover*.96;
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
  const quad=new THREE.Mesh(geometry,material);quad.name='Depth-masked orbital optical pass';quad.frustumCulled=false;quad.renderOrder=-19;quad.visible=false;quad.userData.skyBackground=true;scene.add(quad);
  const filterUniforms={source:{value:null},stepUV:{value:new THREE.Vector2()},extract:{value:0}};
  const filterMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:filterUniforms,
    vertexShader:material.vertexShader,
    fragmentShader:`varying vec2 uvScreen;uniform sampler2D source;uniform vec2 stepUV;uniform float extract;
      vec3 sampleLight(vec2 uv){return texture2D(source,uv).rgb;}
      void main(){
        if(extract>.5){vec3 c=(sampleLight(uvScreen+stepUV)+sampleLight(uvScreen-stepUV)+sampleLight(uvScreen+vec2(stepUV.x,-stepUV.y))+sampleLight(uvScreen+vec2(-stepUV.x,stepUV.y)))*.25;gl_FragColor=vec4(max(c-1.1,vec3(0.)),1.);return;}
        vec3 c=sampleLight(uvScreen)*.227027;
        c+=(sampleLight(uvScreen+stepUV*1.384615)+sampleLight(uvScreen-stepUV*1.384615))*.316216;
        c+=(sampleLight(uvScreen+stepUV*3.230769)+sampleLight(uvScreen-stepUV*3.230769))*.070270;
        gl_FragColor=vec4(c,1.);}`});
  const filterScene=new THREE.Scene(),filterCamera=new THREE.Camera(),filterQuad=new THREE.Mesh(geometry,filterMaterial);filterQuad.frustumCulled=false;filterScene.add(filterQuad);
  let state={active:false,progress:0,lowMotion:false};
  return {
    setTransit(next){state=next;},
    render(renderer,camera){
      const needed=orbit.vista==='gargantua'||state.active;
      if(!needed){quad.visible=false;orbit.group.visible=true;renderer.render(scene,camera);return;}
      renderer.getDrawingBufferSize(size);
      const factor=Math.min(1,Math.sqrt(quality.skyPixels/(size.x*size.y)));
      const w=Math.max(1,Math.round(size.x*factor)),h=Math.max(1,Math.round(size.y*factor));
      if(!target){target=new THREE.WebGLRenderTarget(w,h,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true});target.texture.name='Orbital HDR view';}
      if(target.width!==w||target.height!==h)target.setSize(w,h);
      const previousTarget=renderer.getRenderTarget(),mask=camera.layers.mask;
      try{
        quad.visible=false;orbit.group.visible=true;camera.layers.set(1);
        renderer.setRenderTarget(target);renderer.render(scene,camera);
      }finally{camera.layers.mask=mask;renderer.setRenderTarget(previousTarget);}
      if(orbit.vista==='gargantua'){
        const bw=Math.max(1,Math.round(w/4)),bh=Math.max(1,Math.round(h/4));
        if(!blurX){blurX=new THREE.WebGLRenderTarget(bw,bh,{type:target.texture.type,depthBuffer:false});blurY=blurX.clone();bright=blurX.clone();}
        if(blurX.width!==bw||blurX.height!==bh){blurX.setSize(bw,bh);blurY.setSize(bw,bh);bright.setSize(bw,bh);}
        try{
          filterUniforms.source.value=target.texture;filterUniforms.extract.value=1;filterUniforms.stepUV.value.set(1/w,1/h);
          renderer.setRenderTarget(bright);renderer.render(filterScene,filterCamera);
          filterUniforms.source.value=bright.texture;filterUniforms.extract.value=0;filterUniforms.stepUV.value.set(1.2/bw,0);
          renderer.setRenderTarget(blurX);renderer.render(filterScene,filterCamera);
          filterUniforms.source.value=blurX.texture;filterUniforms.extract.value=0;filterUniforms.stepUV.value.set(0,1.2/bh);
          renderer.setRenderTarget(blurY);renderer.render(filterScene,filterCamera);
        }finally{renderer.setRenderTarget(previousTarget);}
      }
      uniforms.sky.value=target.texture;uniforms.resolution.value.set(w,h);
      uniforms.glowMap.value=blurY?.texture||target.texture;
      uniforms.progress.value=state.progress;uniforms.jumpActive.value=state.active?1:0;
      uniforms.quiet.value=state.lowMotion?1:0;uniforms.bloom.value=orbit.vista==='gargantua'?1:0;
      quad.visible=true;orbit.group.visible=false;
      try{renderer.render(scene,camera);}finally{orbit.group.visible=true;quad.visible=false;}
    },
    dispose(){target?.dispose();bright?.dispose();blurX?.dispose();blurY?.dispose();filterMaterial.dispose();geometry.dispose();material.dispose();scene.remove(quad);},
  };
}
