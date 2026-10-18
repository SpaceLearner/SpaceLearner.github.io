// One owner for arrival, retargeting and interruptions. No timers or DOM globals:
// hidden tabs cannot accumulate delayed callbacks or apply an old destination.
export const TRANSIT_DURATION=2400;
export const QUIET_TRANSIT_DURATION=280;
export function createVistaTransit({initial='earth',onCommit,onFrame,onState}) {
  let current=initial,desired=initial,from=initial,destination=initial,active=false,elapsed=0,last=null;
  let lowMotion=false,committed=false,available=true,progress=0;
  const valid=v=>v==='gargantua'?'gargantua':'earth';
  const frame=()=>onFrame({active,progress,lowMotion,current,desired,from,destination});
  const commit=()=>{if(current!==destination){current=destination;onCommit(current);}committed=true;};
  function start(){from=current;destination=desired;active=true;elapsed=progress=0;last=null;committed=false;onState({active,current,desired,destination,lowMotion});frame();}
  function settle(reason='skip'){
    if(!active)return;destination=desired;commit();active=false;progress=1;last=null;
    frame();onState({active,current,desired,destination,lowMotion,reason});
  }
  return {
    get active(){return active;},get current(){return current;},get desired(){return desired;},get progress(){return progress;},
    request(value,{quiet=false}={}){
      if(!available)return false;
      const next=valid(value);if(next===desired&&(active||next===current))return false;
      desired=next;
      if(active){
        // Once arrival contributes pixels, keep its target stable. A later
        // selection queues one continuous return instead of swapping mid-fold.
        // Early changes still cancel or replace intent before the dissolve.
        if(progress<.30&&!committed)destination=desired;
        if(quiet){lowMotion=true;settle('quiet');}else onState({active,current,desired,destination,lowMotion});
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
        active=false;frame();onState({active,current,desired,destination,lowMotion,reason:'arrived'});
        if(desired!==current)start();
      }else frame();
      return true;
    },
    settle,
    disable(){settle('unavailable');available=false;},
  };
}
