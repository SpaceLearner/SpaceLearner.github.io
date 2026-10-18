import {RoundedBoxGeometry} from './vendor/DeskRoundedBoxGeometry.js';

// Original metric input devices. +Z faces the seated viewer; y=0 is contact.
export function createKeyboard(THREE,materials) {
  const cache=new Map();
  function geo(key,make){if(!cache.has(key))cache.set(key,make());return cache.get(key);}
  function part(parent,geometry,material,position=[0,0,0],name=''){const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function rb(p,w,h,d,r,m,pos,name='',segments=2){return part(p,new RoundedBoxGeometry(w,h,d,segments,Math.min(r,w*.49,h*.49,d*.49)),m,pos,name);}
  function tube(p,points,r,m,name='',steps=24){return part(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),steps,r,8,false),m,[0,0,0],name);}
  function merge(parts){
    const position=[],normal=[],uv=[];
    for(const item of parts){const g=item.geometry.index?item.geometry.toNonIndexed():item.geometry,p=g.attributes.position,n=g.attributes.normal,t=g.attributes.uv;
      for(let i=0;i<p.count;i++){position.push(p.getX(i)+item.position.x,p.getY(i)+item.position.y,p.getZ(i)+item.position.z);normal.push(n.getX(i),n.getY(i),n.getZ(i));uv.push(t?.getX(i)||0,t?.getY(i)||0);}}
    const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(position,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return result;
  }
  // Full-size low-profile keyboard. Staggered ANSI rows and separate numpad.
  const keyboard=new THREE.Group();keyboard.name='104-key sculpted mechanical keyboard';keyboard.userData.contactOrigin=true;keyboard.userData.units='metres';
  const kw=.47,kd=.17;
  for(const x of [-.195,.195])for(const z of [-.057,.057])rb(keyboard,.030,.003,.012,.0012,materials.rubber,[x,.0015,z],'Keyboard rubber foot');
  rb(keyboard,kw,.016,kd,.005,materials.aluminum,[0,.011,0],'Machined keyboard lower case',3);
  rb(keyboard,kw-.003,.002,kd-.003,.0008,materials.gasket,[0,.020,0],'Case separation seam');
  rb(keyboard,kw-.004,.006,kd-.004,.0025,materials.graphite,[0,.023,0],'Switch plate and upper case');
  const pitch=.01905,left=-.2225;
  const legends=[];
  // Geometry has tapered walls, rounded corners and a subtly concave finger dish.
  function keyGeometry(width,depth=.0172){
    return geo(`key:${width}:${depth}`,()=>{
      const positions=[],uvs=[],indices=[];const N=32,rad=.0017;
      const outline=[];
      for(let c=0;c<4;c++)for(let j=0;j<8;j++){
        const a=(-Math.PI/2+c*Math.PI/2)+(j/8)*Math.PI/2;
        const cx=(c===0||c===1?1:-1)*(width/2-rad);
        const cz=(c===1||c===2?1:-1)*(depth/2-rad);
        outline.push([cx+Math.cos(a)*rad,cz+Math.sin(a)*rad]);
      }
      // Bottom lip, side taper, rolled top edge, and dished concentric top rings.
      const levels=[[1,0],[1,.0011],[.94,.0068],[.87,.0097],[.72,.0093],[.47,.0088],[.20,.00855]];
      for(const [scale,y] of levels)for(const [x,z]of outline){positions.push(x*scale,y,z*scale);uvs.push(x*scale/width+.5,z*scale/depth+.5);}
      for(let r=0;r<levels.length-1;r++)for(let i=0;i<N;i++){
        const a=r*N+i,b=r*N+(i+1)%N,c=(r+1)*N+i,d=(r+1)*N+(i+1)%N;
        indices.push(a,c,b,b,c,d);
      }
      const mid=positions.length/3;positions.push(0,.0085,0);uvs.push(.5,.5);
      for(let i=0;i<N;i++)indices.push((levels.length-1)*N+i,mid,(levels.length-1)*N+(i+1)%N);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
    });
  }
  function key(x,z,u,label,grey=false,depth=.0172){
    const w=u*pitch-.002,baseY=.0268+(.046-z)*.055;
    const m=part(keyboard,keyGeometry(w,depth),grey?materials.greyKey:materials.whiteKey,[x,baseY,z],`Key ${label}`);
    legends.push({x,z,baseY,w,depth,label,grey,mesh:m});return m;
  }
  function row(z,spec,start=left){let x=start;for(const item of spec){const [label,u=1,grey=false]=Array.isArray(item)?item:[item];key(x+u*pitch/2,z,u,label,grey);x+=u*pitch;}}
  const rows=[
    ['`','1','2','3','4','5','6','7','8','9','0','-','=', ['Backspace',2,true]],
    [['Tab',1.5,true],'Q','W','E','R','T','Y','U','I','O','P','[',']',['\\',1.5]],
    [['Caps',1.75,true],'A','S','D','F','G','H','J','K','L',';',"'",['Enter',2.25,true]],
    [['Shift',2.25,true],'Z','X','C','V','B','N','M',',','.','/',['Shift',2.75,true]],
    [['Ctrl',1.25,true],['Win',1.25,true],['Alt',1.25,true],['',6.25],['Alt',1.25,true],['Fn',1.25,true],['Menu',1.25,true],['Ctrl',1.25,true]]
  ];
  rows.forEach((r,i)=>row(-.030+i*pitch,r));
  row(-.059,[['Esc',1,true]],left);
  for(let b=0;b<3;b++)row(-.059,Array.from({length:4},(_,i)=>['F'+(b*4+i+1),1,true]),left+(2+b*4.4)*pitch);
  const nav=left+15*pitch+.012;
  row(-.030,[['Ins',1,true],['Home',1,true],['PgUp',1,true]],nav);
  row(-.011,[['Del',1,true],['End',1,true],['PgDn',1,true]],nav);
  row(.027,[['↑',1,true]],nav+pitch);row(.046,[['←',1,true],['↓',1,true],['→',1,true]],nav);
  row(-.059,[['Prt',1,true],['Scr',1,true],['Pause',1,true]],nav);
  const num=nav+3*pitch+.009;
  row(-.030,[['Num',1,true],['/',1,true],['*',1,true],['−',1,true]],num);
  row(-.011,['7','8','9'],num);key(num+3.5*pitch,-.0015,1,'+',true,pitch*2-.002);
  row(.008,['4','5','6'],num);row(.027,['1','2','3'],num);
  key(num+3.5*pitch,.0365,1,'Enter',true,pitch*2-.002);row(.046,[['0',2],'.'],num);
  // Merge the necks and caps into one draw each. Their atlas carries actual
  // printed legends, so lettering receives exactly the same baked light as PBT.
  const neckParts=legends.map(k=>({geometry:new THREE.BoxGeometry(.007,k.baseY-.025+.001,.007),position:new THREE.Vector3(k.x,(k.baseY+.025)/2,k.z)}));
  const necks=part(keyboard,merge(neckParts),materials.gasket,[0,0,0],'Recessed switch necks');necks.userData.keyCount=legends.length;
  if(typeof document!=='undefined') {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
    const ctx=canvas.getContext('2d'),cells=16,cell=128;
    const capParts=[];
    legends.forEach((k,i)=>{
      const col=i%cells,row=Math.floor(i/cells),px=col*cell,py=row*cell;
      ctx.fillStyle=k.grey?'#737e7e':'#bcbdb4';ctx.fillRect(px,py,cell,cell);
      ctx.fillStyle=k.grey?'#e7e8de':'#28302e';
      const font=k.label.length===1?38:Math.min(30,Math.max(14,112*.0048/k.w));
      ctx.font=`500 ${font}px Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(k.label,px+64,py+53,100);
      const g=k.mesh.geometry.clone(),uv=g.attributes.uv;
      for(let j=0;j<uv.count;j++)uv.setXY(j,(px+8+uv.getX(j)*112)/2048,1-(py+8+uv.getY(j)*112)/2048);
      capParts.push({geometry:g,position:k.mesh.position});keyboard.remove(k.mesh);
    });
    const atlas=new THREE.CanvasTexture(canvas);atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=8;atlas.generateMipmaps=true;
    const pbt=materials.whiteKey.clone();pbt.name='PBT with pad-printed legends';pbt.color.set('#ffffff');pbt.map=atlas;pbt.roughness=.59;
    const caps=part(keyboard,merge(capParts),pbt,[0,0,0],'Sculpted PBT keycaps with printed legends');caps.userData.keyCount=legends.length;
  }
  // Home-position tactile marks, status apertures and rear USB-C connector.
  for(const label of ['F','J']){const k=legends.find(k=>k.label===label);rb(keyboard,.0034,.00035,.0006,.00016,materials.whiteKey,[k.x,k.baseY+.0091,k.z+.0043],'Tactile home-key bar',1);}
  for(let i=0;i<3;i++)rb(keyboard,.0019,.0006,.0019,.0003,i===0?materials.robotAccent:materials.recess,[num+.012+i*.015,.0264,-.059],'Keyboard status light',1);
  rb(keyboard,.010,.0038,.002,.0007,materials.recess,[0,.014,-kd/2-.0003],'USB-C port');
  tube(keyboard,[[0,.014,-.086],[0,.012,-.10],[.02,.004,-.115],[.043,.003,-.125]],.0023,materials.rubber,'Keyboard USB cable');
  keyboard.userData.keyCount=legends.length;

  return keyboard;
}

function addPart(THREE,parent,geometry,material,name){const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function slab(THREE,w,d,h,r){
  const b=Math.min(.0004,h*.15),x=w/2-b,z=d/2-b,rr=r-b,s=new THREE.Shape();
  s.moveTo(-x+rr,-z);s.lineTo(x-rr,-z);s.quadraticCurveTo(x,-z,x,-z+rr);s.lineTo(x,z-rr);s.quadraticCurveTo(x,z,x-rr,z);s.lineTo(-x+rr,z);s.quadraticCurveTo(-x,z,-x,z-rr);s.lineTo(-x,-z+rr);s.quadraticCurveTo(-x,-z,-x+rr,-z);
  const g=new THREE.ExtrudeGeometry(s,{depth:h-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:3,curveSegments:12});g.rotateX(-Math.PI/2);g.translate(0,b,0);return g;
}

export function createMouse(THREE){
  const group=new THREE.Group();group.name='Sculpted ergonomic mouse';group.userData.contactOrigin=true;
  const shell=new THREE.MeshPhysicalMaterial({color:'#b7b8b2',roughness:.43,metalness:0,clearcoat:.08,clearcoatRoughness:.5});
  const rubber=new THREE.MeshPhysicalMaterial({color:'#202525',roughness:.86,metalness:0});
  const seam=new THREE.MeshStandardMaterial({color:'#111718',roughness:.78});
  const width=t=>.0355*Math.sqrt(Math.max(0,1-t*t))*(.97+.07*t);
  const height=(u,t)=>.006+.034*Math.pow(Math.max(0,1-t*t),.48)*(1+.18*t)*Math.pow(Math.max(0,1-u*u),.48);
  // Separate palm and button shells sit above the dark continuous inner carrier.
  // The carrier is visible through real gaps, including the wheel opening.
  function patch(name,material,t0,t1,side=0,lower=0){
    const ps=[],uv=[],idx=[],rows=42,cols=24;
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const t=t0+(t1-t0)*j/rows,w=width(t),wheelWell=Math.exp(-Math.pow((t+.43)/.20,8));
      const gap=(.00065+.0052*wheelWell)/Math.max(w,.001),f=i/cols;
      const u=side<0?-1+(1-Math.min(.98,gap))*f:side>0?Math.min(.98,gap)+(1-Math.min(.98,gap))*f:-1+2*f;
      ps.push(w*u,height(u,t)-lower,t*.060);uv.push((u+1)/2,(t+1)/2);
    }
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;idx.push(a,c,b,b,c,d);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return addPart(THREE,group,g,material,name);
  }
  patch('Continuous recessed mouse carrier',seam,-1,1,0,.00065);
  patch('Raised rear palm shell',shell,-.115,1);
  patch('Independent left mouse button',shell,-1,-.135,-1);
  patch('Independent right mouse button',shell,-1,-.135,1);
  const skirt=new THREE.CylinderGeometry(1,1,1,64),skirtP=skirt.attributes.position;
  for(let i=0;i<skirtP.count;i++){
    const t=skirtP.getZ(i),top=skirtP.getY(i)>0,factor=top?.997:.965;
    skirtP.setXYZ(i,skirtP.getX(i)*.0355*(.97+.07*t)*factor,top?.0055:.001,t*.060*factor);
  }
  skirt.computeVertexNormals();addPart(THREE,group,skirt,rubber,'Mouse lower skirt');
  for(const z of [-.037,.036]){const foot=addPart(THREE,group,slab(THREE,.044,.009,.001,.004),rubber,'PTFE glide foot');foot.position.z=z;}
  const wheel=addPart(THREE,group,new THREE.CylinderGeometry(.0085,.0085,.010,48),rubber,'Recessed rubber scroll wheel');wheel.rotation.z=Math.PI/2;wheel.position.set(0,.0285,-.026);
  const ringGeo=new THREE.TorusGeometry(.0085,.00019,4,48);
  for(let i=0;i<8;i++){const ridge=addPart(THREE,group,ringGeo,rubber,'Scroll wheel molded rib');ridge.rotation.y=Math.PI/2;ridge.position.set((i-3.5)*.00115,.0285,-.026);}
  group.userData.dimensions=[.071,.043,.12];return group;
}

export function createDeskMat(THREE){
  const group=new THREE.Group();group.name='Woven desk mat';group.userData.contactOrigin=true;
  const w=1.218,d=.4032,h=.003,r=.014;
  const data=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const over=(Math.floor(x/4)+Math.floor(y/4))%2;
    const strand=over?Math.cos(y%4/4*Math.PI*2):Math.cos(x%4/4*Math.PI*2),v=Math.round(222+strand*9);
    data.set([v,v,v,255],(y*128+x)*4);
  }
  const weave=new THREE.DataTexture(data,128,128);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(44,15);weave.magFilter=THREE.LinearFilter;weave.minFilter=THREE.LinearMipmapLinearFilter;weave.generateMipmaps=true;weave.anisotropy=8;weave.needsUpdate=true;
  const dye=data.slice();for(let i=0;i<dye.length;i+=4){const value=245+(dye[i]-222)*.45;dye[i]=dye[i+1]=dye[i+2]=value;}
  const weaveColor=new THREE.DataTexture(dye,128,128);weaveColor.colorSpace=THREE.SRGBColorSpace;weaveColor.wrapS=weaveColor.wrapT=THREE.RepeatWrapping;weaveColor.repeat.copy(weave.repeat);weaveColor.magFilter=THREE.LinearFilter;weaveColor.minFilter=THREE.LinearMipmapLinearFilter;weaveColor.generateMipmaps=true;weaveColor.anisotropy=8;weaveColor.needsUpdate=true;
  const rubber=new THREE.MeshStandardMaterial({color:'#303530',roughness:.96});
  const cloth=new THREE.MeshPhysicalMaterial({color:'#6b7069',map:weaveColor,roughness:.93,metalness:0,bumpMap:weave,bumpScale:.00022,roughnessMap:weave,sheen:.15,sheenRoughness:.95,sheenColor:'#777c71'});
  addPart(THREE,group,slab(THREE,w,d,h-.0004,r),rubber,'Flexible rubber mat backing');
  const top=addPart(THREE,group,slab(THREE,w-.0008,d-.0008,.0004,r-.0004),cloth,'Woven fabric mat surface');top.position.y=h-.0004;
  // Give the top a metric planar UV; all fabric maps share its fine weave.
  const uv=top.geometry.attributes.uv,pos=top.geometry.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/w+.5,pos.getZ(i)/d+.5);
  const contour=[];for(let c=0;c<4;c++)for(let j=0;j<20;j++){
    const a=-Math.PI/2+c*Math.PI/2+j/20*Math.PI/2,x=(c<2?1:-1)*(w/2-r),z=(c===1||c===2?1:-1)*(d/2-r);
    contour.push(new THREE.Vector3(x+Math.cos(a)*(r-.0023),h-.0001,z+Math.sin(a)*(r-.0023)));
  }
  const path=new THREE.CatmullRomCurve3(contour,true),binding=new THREE.MeshStandardMaterial({color:'#555b52',roughness:.94});
  addPart(THREE,group,new THREE.TubeGeometry(path,256,.00045,5,true),binding,'Rolled fabric edge binding');
  const points=path.getSpacedPoints(960),ps=[],ns=[],tex=[];
  for(let i=0;i<points.length-1;i++){
    const p=points[i],t=path.getTangent(i/960).normalize(),a=p.clone().addScaledVector(t,-.0009),b=p.clone().addScaledVector(t,.0009),n=new THREE.Vector3(-t.z,0,t.x).multiplyScalar(.00012);
    const corners=[a.clone().add(n),a.clone().sub(n),b.clone().sub(n),b.clone().add(n)];
    for(const j of [0,2,1,0,3,2]){const v=corners[j];ps.push(v.x,h+.00011,v.z);ns.push(0,1,0);tex.push(j===0||j===3?0:1,j<2?0:1);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(ns,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));
  addPart(THREE,group,g,new THREE.MeshStandardMaterial({color:'#757a6e',roughness:.97}),'Fine edge overlock stitches');
  const shadowGeo=new THREE.PlaneGeometry(w+.026,d+.026);shadowGeo.rotateX(-Math.PI/2);
  const shadow=addPart(THREE,group,shadowGeo,new THREE.MeshBasicMaterial({color:'#000000',transparent:true,opacity:0,depthWrite:false,toneMapped:false}),'Baked mat to walnut contact shadow');shadow.position.y=.00012;shadow.castShadow=shadow.receiveShadow=false;shadow.userData.contactBake=true;
  group.userData.thickness=h;return group;
}
