// One owner for arrival, retargeting and interruptions. No timers or DOM globals:
// hidden tabs cannot accumulate delayed callbacks or apply an old destination.
export const TRANSIT_DURATION=2400;
export const QUIET_TRANSIT_DURATION=280;
export function createVistaTransit({initial='earth',onCommit,onFrame,onState}) {
  let current=initial,desired=initial,active=false,elapsed=0,last=null;
  let lowMotion=false,committed=false,available=true,progress=0;
  const valid=v=>v==='gargantua'?'gargantua':'earth';
  const frame=()=>onFrame({active,progress,lowMotion,current,desired});
  const commit=()=>{if(current!==desired){current=desired;onCommit(current);}committed=true;};
  function start(){active=true;elapsed=progress=0;last=null;committed=false;onState({active,current,desired,lowMotion});frame();}
  function settle(reason='skip'){
    if(!active)return;commit();active=false;progress=1;last=null;
    frame();onState({active,current,desired,lowMotion,reason});
  }
  return {
    get active(){return active;},get current(){return current;},get desired(){return desired;},get progress(){return progress;},
    request(value,{quiet=false}={}){
      if(!available)return false;
      const next=valid(value);if(next===desired&&(active||next===current))return false;
      desired=next;
      if(active){
        // Before the covered midpoint, only replace intent. During the covered
        // interval retarget invisibly; late intent gets one smooth return jump.
        if(committed&&progress<=.56)commit();
        if(quiet){lowMotion=true;settle('quiet');}else onState({active,current,desired,lowMotion});
      }else if(desired!==current){lowMotion=quiet;start();}
      return true;
    },
    tick(now){
      if(!active)return false;
      if(last===null){last=now;frame();return true;}
      elapsed+=Math.min(100,Math.max(0,now-last));last=now;
      progress=Math.min(1,elapsed/(lowMotion?QUIET_TRANSIT_DURATION:TRANSIT_DURATION));
      if(!committed&&progress>=.48)commit();
      if(progress>=1){
        active=false;frame();onState({active,current,desired,lowMotion,reason:'arrived'});
        if(desired!==current)start();
      }else frame();
      return true;
    },
    settle,
    disable(){settle('unavailable');available=false;},
  };
}
