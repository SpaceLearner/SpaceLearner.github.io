// Map a CSS rectangle to the four projected corners of the actual mesh plane.
// The projective terms preserve perspective, unlike an axis-aligned bounding box.
export function projectiveMatrix(points,w,h){
  const src=[[0,0],[w,0],[w,h],[0,h]],a=[];
  src.forEach(([x,y],i)=>{const {x:u,y:v}=points[i];a.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);});
  for(let i=0;i<8;i++){
    let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;
    [a[i],a[pivot]]=[a[pivot],a[i]];const d=a[i][i];if(Math.abs(d)<1e-10)return null;
    for(let k=i;k<9;k++)a[i][k]/=d;
    for(let j=0;j<8;j++)if(j!==i){const f=a[j][i];for(let k=i;k<9;k++)a[j][k]-=f*a[i][k];}
  }
  const [a0,b,c,d,e,f,g,h0]=a.map(row=>row[8]);
  return [a0,d,0,g,b,e,0,h0,0,0,1,0,c,f,0,1];
}
export function createSurfaceReading(THREE,{camera,sheet,room,screen,notebook,viewport}){
  function corners(kind){
    room.updateMatrixWorld(true);
    if(kind==='notebook'){
      const points=[[-.312,.018,-.207],[.320,.018,-.207],[.320,.018,.207],[-.312,.018,.207]].map(p=>notebook.group.localToWorld(new THREE.Vector3(...p)));
      const {width,height}=viewport();
      // Turn both the camera's up vector and the paper coordinates on portrait
      // phones, so the real page uses the tall viewport without sideways text.
      return width<700&&height>width?[points[3],points[0],points[1],points[2]]:points;
    }
    const s=screen(kind),w=s.width/2-.006,h=s.height/2-.006;
    return [[-w,h,.002],[w,h,.002],[w,-h,.002],[-w,-h,.002]].map(p=>s.mesh.localToWorld(new THREE.Vector3(...p)));
  }
  function target(kind){
    const p=corners(kind),center=p.reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(.25);
    const right=p[1].clone().sub(p[0]),up=p[0].clone().sub(p[3]);
    const normal=right.clone().cross(up).normalize(),{width,height}=viewport();
    const pose=new THREE.PerspectiveCamera(camera.fov,width/height,.01,100);
    pose.up.copy(up).normalize();
    const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    const distance=Math.max(up.length()/(2*tan)*height/Math.max(100,height-190),right.length()/(2*tan)*height/Math.max(180,width-72));
    pose.position.copy(center).addScaledVector(normal,distance);
    // Slight obliqueness keeps the physical notebook's paper and spine visible.
    if(kind==='notebook')pose.position.addScaledVector(up.clone().normalize(),-distance*.045);
    pose.lookAt(center);return {position:pose.position,quaternion:pose.quaternion,fov:pose.fov};
  }
  function layout(kind){
    const {width,height}=viewport();camera.updateMatrixWorld();
    const points=corners(kind).map(p=>{p.project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2};});
    const w=Math.max(180,Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y));
    const h=Math.max(80,Math.hypot(points[3].x-points[0].x,points[3].y-points[0].y));
    const m=projectiveMatrix(points,w,h);if(!m)return;
    Object.assign(sheet.style,{left:'0px',top:'0px',width:w+'px',height:h+'px',transform:'matrix3d('+m.join(',')+')'});
    sheet.dataset.surfaceCorners=JSON.stringify(points);
  }
  return {target,layout};
}
