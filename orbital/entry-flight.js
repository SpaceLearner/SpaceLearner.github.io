export const ENTRY_SESSION_KEY='orbital-desk-entry-seen-v1';
export const ENTRY_DURATION=5000;

const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{const t=clamp(v);return t*t*t*(t*(t*6-15)+10);};

// World-space route: stay behind the hull until aligned with the open aft hatch.
// Arc-length sampling avoids abrupt speed changes at the individual waypoints.
export function createEntryFlight(THREE,seat,target) {
  const route=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-13.8,7.3,16.7),
    new THREE.Vector3(-9,4.6,12.5),
    new THREE.Vector3(-4.9,2.7,9.4),
    new THREE.Vector3(-2.72,1.65,7.25),
    new THREE.Vector3(-2.72,1.65,6.25),
    new THREE.Vector3(-2.72,1.65,4.35),
    new THREE.Vector3(-2.72,1.65,2.35),
    seat.clone()
  ],false,'centripetal');
  route.arcLengthDivisions=500;route.updateArcLengths();
  const exteriorLook=new THREE.Vector3(-.6,1.8,1.2),hatchLook=new THREE.Vector3(-2.72,1.6,4.8),look=new THREE.Vector3();
  const framedRoutes=new Map();
  return {
    duration:ENTRY_DURATION,
    sample(progress,camera) {
      const p=clamp(progress),u=ease(p);
      // Narrow screens start farther out, along an arc-length sampled route,
      // so the larger wings fit without a sudden zoom during the approach.
      const halfWidth=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect;
      const framing=Math.max(1,.78/Math.max(.15,halfWidth));
      let activeRoute=route;
      if(framing>1){
        const key=framing.toFixed(4);
        if(!framedRoutes.has(key)){
          const points=route.points.map(p=>p.clone());
          points[0].sub(exteriorLook).multiplyScalar(framing).add(exteriorLook);
          points[1].sub(exteriorLook).multiplyScalar(1+(framing-1)*.45).add(exteriorLook);
          const framed=new THREE.CatmullRomCurve3(points,false,'centripetal');framed.arcLengthDivisions=500;framed.updateArcLengths();framedRoutes.set(key,framed);
        }
        activeRoute=framedRoutes.get(key);
      }
      activeRoute.getPointAt(u,camera.position);
      if(u<.45)look.copy(exteriorLook).lerp(hatchLook,ease(u/.45));
      else look.copy(hatchLook).lerp(target,ease((u-.45)/.55));
      if(p===1){camera.position.copy(seat);look.copy(target);}
      camera.lookAt(look);camera.updateMatrixWorld();
    }
  };
}

// No DOM or rendering dependency: one state machine owns autoplay, skip and replay.
export function createEntryPlayback({storage,reduceMotion=false,onStart,onFrame,onFinish,duration=ENTRY_DURATION}) {
  let active=false,elapsed=0,last=null,available=true;
  const remember=()=>{try{storage?.setItem(ENTRY_SESSION_KEY,'1');}catch{/* Storage denial must not block navigation. */}};
  const seen=()=>{try{return !storage||storage.getItem(ENTRY_SESSION_KEY)==='1';}catch{return true;}};
  function finish(reason) {
    active=false;elapsed=duration;last=null;onFrame(1);onFinish(reason);
  }
  return {
    get active(){return active;},
    get progress(){return clamp(elapsed/duration);},
    start({replay=false}={}) {
      if(!available)return false;
      const skip=!replay&&(reduceMotion||seen());remember();
      if(skip){finish(reduceMotion?'reduced-motion':'seen');return false;}
      active=true;elapsed=0;last=null;onStart();onFrame(0);return true;
    },
    tick(now) {
      if(!active)return;
      if(last===null){last=now;return;}
      // Long frame stalls never jump straight through the entrance.
      elapsed+=Math.min(Math.max(now-last,0),100);last=now;
      if(elapsed>=duration)finish('complete');else onFrame(elapsed/duration);
    },
    suspend(){last=null;},
    skip(){if(active)finish('skip');},
    disable(){available=false;if(active)finish('unavailable');}
  };
}
