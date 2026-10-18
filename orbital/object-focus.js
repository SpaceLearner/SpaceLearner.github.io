// One camera owner for object reading. The scene's existing RAF advances it.
// The original pose is retained across switches, including an interrupted return.
export function createObjectFocus(THREE,{camera,target,book,changed,phase,reduced}) {
  let saved=null,kind='',motion=null,clock=null,openness=0,available=true;
  const copy=()=>({position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov,open:openness});
  function apply(p){camera.position.copy(p.position);camera.quaternion.copy(p.quaternion);camera.fov=p.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();openness=p.open;book.setOpen(openness);changed();}
  function finish(){
    if(!motion)return;
    const m=motion;motion=null;apply(m.to);
    if(m.returning){saved=null;kind='';phase('idle','');}else phase('reading',kind);
    m.done?.();
  }
  function animate(to,done,instant,returning=false){
    const from=copy();motion={from,to,done,returning,elapsed:0};clock=null;
    phase(returning?'returning':'approaching',kind);
    if(instant||reduced())finish();
  }
  return {
    enter(next,{instant=false,done}={}){
      if(!available)return false;
      if(!saved)saved=copy();
      if(kind===next&&!motion){done?.();return true;}
      kind=next;const to=target(kind);to.open=kind==='notebook'?1:0;
      animate(to,done,instant);return true;
    },
    leave({instant=false,done}={}){if(!saved){done?.();return;}animate({...saved,open:0},done,instant,true);},
    finish,
    resize(){
      if(!saved)return;
      saved.fov=camera.fov;
      if(motion?.returning){motion.to.fov=camera.fov;return;}
      const to=target(kind);to.open=kind==='notebook'?1:0;
      if(motion){motion.from=copy();motion.to=to;motion.elapsed=0;clock=null;}else apply(to);
    },
    tick(ms){
      if(!motion){clock=ms;return;}
      if(clock!==null)motion.elapsed+=Math.min(50,Math.max(0,ms-clock));clock=ms;
      const t=Math.min(1,motion.elapsed/950),s=t*t*t*(t*(t*6-15)+10),m=motion;
      const position=m.from.position.clone().lerp(m.to.position,s);
      // A shallow arc keeps the path above the keyboard and in front of the screens.
      position.y+=Math.sin(Math.PI*s)*.055;
      apply({position,quaternion:m.from.quaternion.clone().slerp(m.to.quaternion,s),fov:THREE.MathUtils.lerp(m.from.fov,m.to.fov,s),open:THREE.MathUtils.lerp(m.from.open,m.to.open,s)});
      if(t===1)finish();
    },
    suspend(){clock=null;},
    disable(){if(saved)apply({...saved,open:0});motion=null;saved=null;kind='';available=false;phase('idle','');},
    get active(){return !!saved;},get moving(){return !!motion;},get kind(){return kind;},
    get state(){return {kind,active:!!saved,moving:!!motion,returning:!!motion?.returning,openness,progress:motion?motion.elapsed/950:1};}
  };
}
