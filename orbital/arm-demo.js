// A fixed, analytic pick-and-place demonstration. No physics or robot connection.
export const ARM_HOME=Object.freeze({reach:.260,height:.316,yaw:0,roll:0,opening:0});
export const ARM_PICK=Object.freeze({reach:.340,height:.026,yaw:-.48,roll:0});
const smooth=t=>t*t*t*(t*(t*6-15)+10);
export function createArmDemo(THREE,robot,{changed=()=>{},onState=()=>{},reduced=()=>false}={}){
  const rig=robot.armRig;
  const block=new THREE.Mesh(new THREE.BoxGeometry(.032,.032,.032),new THREE.MeshStandardMaterial({color:'#b99056',roughness:.52,metalness:.32}));
  block.name='Dedicated demo block';block.castShadow=block.receiveShadow=true;
  const axis=new THREE.Vector3(0,1,0),rest=new THREE.Vector3(ARM_PICK.reach,ARM_PICK.height,.026).applyAxisAngle(axis,ARM_PICK.yaw);
  const restRotation=new THREE.Quaternion().setFromAxisAngle(axis,ARM_PICK.yaw);
  block.position.copy(rest);block.quaternion.copy(restRotation);robot.add(block);
  const tray=new THREE.Mesh(new THREE.BoxGeometry(.108,.004,.108),rig.materials.polymer);
  tray.name='Dedicated demo tray';tray.position.set(rest.x,.002,rest.z);tray.rotation.y=ARM_PICK.yaw;tray.receiveShadow=true;robot.add(tray);
  // A narrow raised seat leaves clearance below the gripper's finger tips.
  const seat=new THREE.Mesh(new THREE.BoxGeometry(.024,.006,.046),rig.materials.polymer);
  seat.name='Block locating seat';seat.position.set(rest.x,.007,rest.z);seat.rotation.y=ARM_PICK.yaw;seat.receiveShadow=true;robot.add(seat);
  let pose={...ARM_HOME},segments=[],index=0,elapsed=0,clock=null,held=false,active=false,paused=false,resetting=false,stepMode=false,lastLabel='Ready';
  const suspended=new Set();
  function state(){return {active,paused:paused||suspended.size>0,resetting,stepMode:active?stepMode:reduced(),held,index,phase:active?segments[index]?.label||'Ready':lastLabel,pose:{...pose},suspended:[...suspended]};}
  function emit(){onState(state());}
  function attach(){robot.updateWorldMatrix(true,true);rig.grip.attach(block);held=true;}
  function release(){robot.updateWorldMatrix(true,true);robot.attach(block);block.position.copy(rest);block.quaternion.copy(restRotation);held=false;}
  function segment(label,to,duration,action){return {label,to,duration,action};}
  function begin(plan,isReset=false){rig.setAnimated(true);block.layers.set(2);segments=plan;index=elapsed=0;clock=null;active=true;paused=false;resetting=isReset;stepMode=reduced();segments[0].from={...pose};emit();changed();}
  function apply(t){const s=segments[index],f=smooth(t);for(const key of Object.keys(ARM_HOME))pose[key]=s.from[key]+((s.to[key]??s.from[key])-s.from[key])*f;rig.pose(pose);changed();}
  function complete(){
    const s=segments[index];if(s.action==='grip')attach();if(s.action==='release')release();
    index++;elapsed=0;if(index>=segments.length){active=false;resetting=false;lastLabel='Ready';clock=null;rig.setAnimated(false);block.layers.set(0);}else segments[index].from={...pose};emit();
  }
  return {
    block,tray,rest,rig,
    start(){
      if(active)return false;
      begin([
        segment('Open gripper',{opening:.012},.8),
        segment('Approach',{...ARM_PICK,height:.20,opening:.012},1.6),
        segment('Align',{height:ARM_PICK.height},1.6),
        segment('Grip',{opening:0},.7,'grip'),
        segment('Lift',{height:.22},1.5),
        segment('Inspect',{yaw:-.27,roll:.40},1.4),
        segment('Return above tray',{yaw:ARM_PICK.yaw,roll:0},1.2),
        segment('Place',{height:ARM_PICK.height},1.6),
        segment('Release',{opening:.012},.7,'release'),
        segment('Clear block',{height:.20},1.1),
        segment('Return home',{...ARM_HOME,opening:.012},1.6),
        segment('Ready',{opening:0},.8)
      ]);return true;
    },
    reset(){
      if(!active)return false;if(resetting)return false;
      const plan=[];
      if(held){plan.push(segment('Reset: lift clear',{height:Math.max(.22,pose.height)},1.1),segment('Reset: return above tray',{...ARM_PICK,height:Math.max(.22,pose.height),opening:0},1.4),segment('Reset: place',{height:ARM_PICK.height},1.6),segment('Reset: release',{opening:.012},.7,'release'));}
      else plan.push(segment('Reset: open',{opening:.012},.7));
      plan.push(segment('Reset: clear block',{height:Math.max(.20,pose.height)},1.1),segment('Reset: return home',{...ARM_HOME,opening:.012},1.6),segment('Ready',{opening:0},.8));
      begin(plan,true);return true;
    },
    pause(){if(active){paused=true;clock=null;emit();}},
    resume(){if(active){paused=false;clock=null;emit();changed();}},
    suspend(reason,value=true){if(value)suspended.add(reason);else suspended.delete(reason);clock=null;emit();},
    reducedChanged(){if(active&&reduced()){stepMode=true;clock=null;emit();}},
    step(){if(!active||!stepMode||suspended.has('hidden')||suspended.has('reading'))return false;apply(1);complete();return true;},
    tick(ms){
      if(!active||stepMode||paused||suspended.size){clock=null;return false;}
      if(clock===null){clock=ms;return false;}
      // No wall-time catch-up after hidden tabs or a slow software-rendered frame.
      elapsed+=Math.min(50,Math.max(0,ms-clock))/1000;clock=ms;
      apply(Math.min(1,elapsed/segments[index].duration));if(elapsed>=segments[index].duration)complete();return true;
    },
    get moving(){return active&&!stepMode&&!paused&&!suspended.size;},
    get state(){return state();}
  };
}
