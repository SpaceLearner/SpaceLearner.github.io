// Deliberately restrained, time-compressed environmental motion. Earth itself
// keeps its separate UTC-day clock; these paths do not move the camera or lights.
export function sampleOrbitalMotion(seconds) {
  return {
    stationOffset:[16*Math.sin(seconds/34),3*Math.sin(seconds/43),4*(Math.cos(seconds/59)-1)],
    stationRotation:[.012*Math.sin(seconds/47),.035*Math.sin(seconds/55),.025*Math.sin(seconds/40)],
    starRotation:[.004*Math.sin(seconds/31),.014*Math.sin(seconds/46),.002*Math.sin(seconds/53)],
    cloudDrift:seconds*.0012,
    diskPhase:seconds*.18
  };
}
// Pauses and hidden tabs reset only the sampling anchor. On resume the visual
// phase is continuous, including when the reading view renders at 10 fps.
export function createOrbitalMotionClock() {
  let seconds=0,last=null;
  return {
    advance(now){
      if(Number.isFinite(now)){
        if(last!==null)seconds+=Math.min(250,Math.max(0,now-last))/1000;
        last=now;
      }
      return seconds;
    },
    suspend(){last=null;},
    get seconds(){return seconds;}
  };
}
