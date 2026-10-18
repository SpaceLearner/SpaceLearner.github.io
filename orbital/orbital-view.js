// Render only the orbital layer to a small HDR target. The cabin is rendered
// once, with its original camera and lighting; its depth hides this sky pass.
// UI remains ordinary DOM and never enters the distortion or bloom pipeline.
export function createOrbitalView(THREE,scene,orbit) {
  orbit.group.traverse(o=>o.layers.enable(1));
  scene.traverse(o=>{if(o.isLight)o.layers.enable(1);});
  let target=null,arrival=null,bright=null,blurX=null,blurY=null;
  const size=new THREE.Vector2(),focalPoint=new THREE.Vector3();
  const projection=new THREE.Matrix4(),projectionInverse=new THREE.Matrix4();
  const uniforms={sky:{value:null},arrivalSky:{value:null},glowMap:{value:null},resolution:{value:new THREE.Vector2(1,1)},focus:{value:new THREE.Vector2(.5,.5)},overscan:{value:1},progress:{value:0},jumpActive:{value:0},quiet:{value:0},fromBloom:{value:0},toBloom:{value:0}};
  const material=new THREE.ShaderMaterial({depthTest:true,depthWrite:false,uniforms,
    vertexShader:`varying vec2 uvScreen;void main(){uvScreen=position.xy*.5+.5;gl_Position=vec4(position.xy,.999999,1.);}`,
    fragmentShader:`
      varying vec2 uvScreen;uniform sampler2D sky,arrivalSky,glowMap;
      uniform vec2 resolution,focus;uniform float overscan,progress,jumpActive,quiet,fromBloom,toBloom;
      mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
      vec2 captureUV(vec2 p){return .5+(p-.5)/overscan;}
      vec3 sampleScene(sampler2D image,vec2 p,float bias){
        vec2 uv=captureUV(p);
        vec2 edge=smoothstep(vec2(0.),vec2(.025),uv)*(1.-smoothstep(vec2(.975),vec2(1.),uv));
        return texture2D(image,clamp(uv,vec2(.001),vec2(.999)),bias).rgb*edge.x*edge.y;
      }
      // An art-directed ray map, not a physical spacetime simulation. The same
      // continuous fold deforms the captured clouds, disk, station and stars.
      // Anamorphic compression and a shallow asymmetric bend replace spirals.
      vec2 curvedRay(vec2 q,float depth,float phase){
        float r=length(q);
        vec2 v=rot(depth*(.13+.09*phase)/(1.+r*3.))*q;
        v.y+=depth*(.23*v.x*v.x/(r+.18)-.055*v.x);
        v*=1.+depth*2.4/(1.+r*2.4);
        v*=vec2(1.-depth*.68,1.+depth*2.2);
        return v;
      }
      void main(){
        float p=progress;
        float envelope=jumpActive*smoothstep(0.,.42,p)*(1.-smoothstep(.58,1.,p));
        float power=envelope*(1.-quiet);
        vec2 aspect=vec2(resolution.x/resolution.y,1.);
        vec2 q=(uvScreen-focus)*aspect;
        // Exchange the two real views while they share the narrowest part of
        // the fold. No opaque cover or synthetic tunnel replaces the scenery.
        float blend=jumpActive*mix(smoothstep(.34,.72,p),smoothstep(.18,.82,p),quiet);
        vec2 source=focus+curvedRay(q,power,p)/aspect;
        vec3 color=mix(sampleScene(sky,source,0.),sampleScene(arrivalSky,source,0.),blend);
        if(power>.001){
          vec3 integrated=vec3(0.);float weight=0.;
          vec2 tail=focus+curvedRay(q*(1.-power*.16),power*.96,p-.035*power)/aspect;
          vec2 capturePixels=resolution/overscan;
          float footprint=max(length(dFdx(source)*capturePixels),length(dFdy(source)*capturePixels));
          float spacing=length((tail-source)*capturePixels)/15.;
          // Prefilter only the shutter samples so a small star stretches into
          // a continuous faint trace instead of twelve copies of a bright dot.
          float shutterBias=max(0.,log2(max(spacing*.85/max(footprint,1.),1.)));
          for(int i=0;i<16;i++){
            float t=float(i)/15.,w=exp(-t*3.2);
            // A finite shutter samples actual scene detail along curved rays.
            // Length grows with field angle; there are no generated star lanes.
            vec2 ray=curvedRay(q*(1.-power*t*.16),power*(1.-t*.04),p-t*.035*power);
            vec2 uv=focus+ray/aspect;
            integrated+=mix(sampleScene(sky,uv,shutterBias),sampleScene(arrivalSky,uv,shutterBias),blend)*w;
            weight+=w;
          }
          color=mix(color,integrated/weight,power*.88);
          color=mix(color,vec3(dot(color,vec3(.2126,.7152,.0722))),power*.18);
          color*=1.-power*.26;
        }
        float bloom=mix(fromBloom,toBloom,blend);
        color+=texture2D(glowMap,captureUV(source)).rgb*bloom*.22*(1.-power*.92);
        // Reduced motion keeps a short, gentle dim-through dissolve only.
        color*=1.-quiet*envelope*.46;
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
  let state={active:false,progress:0,lowMotion:false,current:orbit.vista,from:orbit.vista,destination:orbit.vista};
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  return {
    setTransit(next){state=next;},
    render(renderer,camera){
      // Keep both settled destinations on this same color pipeline. Switching
      // back to a direct Earth draw used to pop star brightness at arrival.
      renderer.getDrawingBufferSize(size);
      const factor=Math.min(1,Math.sqrt(1600000/(size.x*size.y)));
      const w=Math.max(1,Math.round(size.x*factor)),h=Math.max(1,Math.round(size.y*factor));
      if(!target){target=new THREE.WebGLRenderTarget(w,h,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true,minFilter:THREE.LinearMipmapLinearFilter,generateMipmaps:true});target.texture.name='Departure orbital HDR view';}
      if(target.width!==w||target.height!==h)target.setSize(w,h);
      const from=state.active?state.from:orbit.vista,to=state.active?state.destination:orbit.vista;
      if(from!==to&&!arrival){arrival=target.clone();arrival.texture.name='Arrival orbital HDR view';}
      if(arrival&&(arrival.width!==w||arrival.height!==h))arrival.setSize(w,h);
      const nextTarget=from===to?target:arrival;
      const envelope=state.active?smooth(0,.42,state.progress)*(1-smooth(.58,1,state.progress)):0;
      const overscan=1+.6*envelope*(state.lowMotion?0:1);
      focalPoint.copy(orbit.center).project(camera);
      uniforms.focus.value.set(focalPoint.x*.5+.5,focalPoint.y*.5+.5);
      const previousTarget=renderer.getRenderTarget(),mask=camera.layers.mask,originalVista=orbit.vista;
      projection.copy(camera.projectionMatrix);projectionInverse.copy(camera.projectionMatrixInverse);
      try{
        quad.visible=false;orbit.group.visible=true;camera.layers.set(1);
        // Capture a gradually wider sky, then map it back to the original view.
        // Rays can reach beyond the window without clamping its edges into bars.
        camera.projectionMatrix.elements[0]/=overscan;camera.projectionMatrix.elements[5]/=overscan;
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
        orbit.setVista(from);renderer.setRenderTarget(target);renderer.render(scene,camera);
        if(from!==to){orbit.setVista(to);renderer.setRenderTarget(nextTarget);renderer.render(scene,camera);}
      }finally{
        orbit.setVista(originalVista);camera.layers.mask=mask;
        camera.projectionMatrix.copy(projection);camera.projectionMatrixInverse.copy(projectionInverse);
        renderer.setRenderTarget(previousTarget);
      }
      const blackHoleTarget=from==='gargantua'?target:to==='gargantua'?nextTarget:null;
      if(blackHoleTarget){
        const bw=Math.max(1,Math.round(w/4)),bh=Math.max(1,Math.round(h/4));
        if(!blurX){blurX=new THREE.WebGLRenderTarget(bw,bh,{type:target.texture.type,depthBuffer:false});blurY=blurX.clone();bright=blurX.clone();}
        if(blurX.width!==bw||blurX.height!==bh){blurX.setSize(bw,bh);blurY.setSize(bw,bh);bright.setSize(bw,bh);}
        try{
          filterUniforms.source.value=blackHoleTarget.texture;filterUniforms.extract.value=1;filterUniforms.stepUV.value.set(1/w,1/h);
          renderer.setRenderTarget(bright);renderer.render(filterScene,filterCamera);
          filterUniforms.source.value=bright.texture;filterUniforms.extract.value=0;filterUniforms.stepUV.value.set(1.2/bw,0);
          renderer.setRenderTarget(blurX);renderer.render(filterScene,filterCamera);
          filterUniforms.source.value=blurX.texture;filterUniforms.extract.value=0;filterUniforms.stepUV.value.set(0,1.2/bh);
          renderer.setRenderTarget(blurY);renderer.render(filterScene,filterCamera);
        }finally{renderer.setRenderTarget(previousTarget);}
      }
      uniforms.sky.value=target.texture;uniforms.arrivalSky.value=nextTarget.texture;uniforms.resolution.value.set(w,h);
      uniforms.overscan.value=overscan;
      uniforms.glowMap.value=blurY?.texture||target.texture;
      uniforms.progress.value=state.progress;uniforms.jumpActive.value=state.active?1:0;
      uniforms.quiet.value=state.lowMotion?1:0;uniforms.fromBloom.value=from==='gargantua'?1:0;uniforms.toBloom.value=to==='gargantua'?1:0;
      quad.visible=true;orbit.group.visible=false;
      try{renderer.render(scene,camera);}finally{orbit.group.visible=true;quad.visible=false;}
    },
    dispose(){target?.dispose();arrival?.dispose();bright?.dispose();blurX?.dispose();blurY?.dispose();filterMaterial.dispose();geometry.dispose();material.dispose();scene.remove(quad);},
  };
}
