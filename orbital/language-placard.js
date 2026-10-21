// One physical half-turn at a time; later requests coalesce to the last choice.
export function createLanguagePlacard({group,language,apply,changed,reduced,ready,facing}){
  const baseY=group.position.y,baseYaw=group.rotation.y,duration=620,lift=.052;
  let current=language(),desired=current,motion=null,clock=null,disabled=false;
  const angle=lang=>baseYaw+(lang==='zh'?Math.PI:0);
  group.rotation.y=angle(current);
  function commit(next){current=next;if(language()!==next)apply(next);}
  function settle(){motion=null;clock=null;commit(desired);group.position.y=baseY;group.rotation.y=angle(current);changed();}
  function start(){if(desired===current)return;motion={from:group.rotation.y,to:desired,elapsed:0,committed:false};clock=null;changed();}
  function request(next){if(!['en','zh'].includes(next))return;desired=next;if(disabled||reduced()||!ready()){settle();return;}if(!motion)start();}
  return{
    request,toggle(){request(desired==='en'?'zh':'en');},settle,
    sync(){desired=language();settle();},disable(){disabled=true;settle();},
    tick(ms){if(!motion)return;if(reduced()){settle();return;}if(clock!==null)motion.elapsed+=Math.min(50,Math.max(0,ms-clock));clock=ms;
      const t=Math.min(1,motion.elapsed/duration),s=t*t*t*(t*(t*6-15)+10);
      group.position.y=baseY+lift*4*t*(1-t);group.rotation.y=motion.from+Math.PI*s;
      if((t===1||(facing?facing()===motion.to:t>=.5))&&!motion.committed){motion.committed=true;commit(motion.to);}
      if(t===1){group.position.y=baseY;group.rotation.y=angle(current);motion=null;clock=null;start();}changed();
    },
    get moving(){return !!motion;},get state(){return{current,desired,moving:!!motion,progress:motion?motion.elapsed/duration:1,height:group.position.y-baseY,yaw:group.rotation.y-baseYaw};}
  };
}
