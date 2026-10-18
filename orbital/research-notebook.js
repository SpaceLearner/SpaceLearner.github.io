// A small articulated notebook. Page content remains accessible HTML.
export function createResearchNotebook(THREE,coverMap){
  const group=new THREE.Group();group.name='Research notebook';
  const cloth=new THREE.MeshStandardMaterial({color:'#314044',roughness:.92});
  const paper=new THREE.MeshStandardMaterial({color:'#e5decb',roughness:.96});
  function box(w,h,d,material,x,y,z,parent=group){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  box(.70,.012,.50,cloth,0,-.022,0);
  box(.666,.033,.462,paper,.004,0,0);
  const edge=new THREE.MeshStandardMaterial({color:'#c4baa4',roughness:1});
  for(const y of [-.010,-.002,.006,.014])box(.656,.001,.001,edge,.004,y,.2315);
  box(.016,.045,.49,cloth,-.342,0,0);
  const cover=new THREE.Group();cover.name='Hinged notebook cover';cover.position.set(-.35,.025,0);group.add(cover);
  box(.70,.012,.50,cloth,.35,0,0,cover);
  box(.663,.001,.46,paper,.35,-.0066,0,cover);
  const caption=new THREE.Mesh(new THREE.PlaneGeometry(.61,.41),new THREE.MeshBasicMaterial({map:coverMap}));
  caption.rotation.x=-Math.PI/2;caption.position.set(.35,.0068,0);cover.add(caption);
  const ribbon=new THREE.MeshStandardMaterial({color:'#a2654d',roughness:.9});
  box(.018,.001,.105,ribbon,.21,-.019,.274);
  return {group,cover,setOpen(value){cover.rotation.z=value*Math.PI*160/180;},
    center(){return group.localToWorld(new THREE.Vector3(-.20,.02,0));}};
}
