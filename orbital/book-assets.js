import { RoundedBoxGeometry } from './vendor/DeskRoundedBoxGeometry.js';

// Metric book bindings. +Z is the visible spine; the group's origin is the shelf.
export function createShelfBooks(THREE) {
  const shelf=new THREE.Group();shelf.name='Bound books on the shelf';
  const paperPixels=new Uint8Array(256*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<256;x++){
    const grain=(x*31+y*13)%9,leaf=x%7===0?18:x%3===0?7:0;
    const value=247-leaf-grain;paperPixels.set([value,value-3,value-10,255],(y*256+x)*4);
  }
  const paperMap=new THREE.DataTexture(paperPixels,256,32);paperMap.needsUpdate=true;
  paperMap.magFilter=THREE.LinearFilter;paperMap.minFilter=THREE.LinearMipmapLinearFilter;paperMap.generateMipmaps=true;
  const paper=new THREE.MeshStandardMaterial({color:'#ddd4bc',roughness:.96,map:paperMap});
  const specs=[
    {w:.032,h:.268,d:.191,color:'#4c5b5b',ink:'#d7cdb5',title:'ROBOTICS',mark:'01'},
    {w:.041,h:.293,d:.207,color:'#6e5745',ink:'#d9c6a6',title:'LEARNING',mark:'II'},
    {w:.024,h:.242,d:.177,color:'#aaa38f',ink:'#494942',title:'FIELD NOTES',mark:'03',soft:true},
    {w:.036,h:.277,d:.199,color:'#35464f',ink:'#c8c9bd',title:'PERCEPTION',mark:'04'},
    {w:.028,h:.255,d:.185,color:'#757761',ink:'#dfd6bc',title:'SYSTEMS',mark:'V'},
    {w:.038,h:.282,d:.216,color:'#554744',ink:'#cbbb9f',title:'DESIGN',mark:'06'},
    {w:.025,h:.251,d:.192,color:'#8d7961',ink:'#e0d5be',title:'RESEARCH',mark:'07',soft:true}
  ];
  function part(parent,geometry,material,position,name){
    const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.name=name;
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function block(parent,w,h,d,material,position,name,r=.0006){
    return part(parent,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.4,h*.4,d*.4)),material,position,name);
  }
  function spineTexture(spec,index){
    if(typeof document==='undefined')return null;
    const c=document.createElement('canvas');c.width=128;c.height=1024;const ctx=c.getContext('2d');
    ctx.fillStyle=spec.color;ctx.fillRect(0,0,128,1024);
    // Low-contrast cloth/paper grain, baked into the same small title texture.
    for(let i=0;i<1800;i++){
      ctx.fillStyle=i%2?'rgba(255,255,255,.025)':'rgba(0,0,0,.035)';
      ctx.fillRect((i*43+index*19)%128,(i*79+index*31)%1024,1,spec.soft?1:3);
    }
    ctx.fillStyle=spec.ink;ctx.globalAlpha=.78;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.save();ctx.translate(64,440);ctx.rotate(-Math.PI/2);
    ctx.font=spec.soft?'28px Arial, sans-serif':'32px Georgia, serif';ctx.fillText(spec.title,0,0,430);ctx.restore();
    ctx.font='20px Georgia, serif';ctx.fillText(spec.mark,64,870);
    ctx.globalAlpha=.30;ctx.fillRect(26,110,76,2);ctx.fillRect(26,806,76,2);ctx.globalAlpha=1;
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
  }
  function book(spec,index){
    const g=new THREE.Group();g.name=`Book ${index+1} / ${spec.title}`;
    const {w,h,d}=spec,t=spec.soft?.00075:.0018;
    const cover=new THREE.MeshStandardMaterial({color:spec.color,roughness:spec.soft?.76:.88});
    const crease=new THREE.MeshStandardMaterial({color:spec.color,roughness:.94});crease.color.multiplyScalar(.58);
    // Real cover boards overhang the page block on the head, tail and fore-edge.
    for(const side of [-1,1]){
      block(g,t,h,d,cover,[side*(w-t)/2,h/2,0],spec.soft?'Paper cover':'Cloth cover board');
      block(g,.00015,h-.014,.0008,crease,[side*(w/2+.00008),h/2,d/2-.007],'Binding hinge crease',.00005);
    }
    const pages=paper.clone();pages.color.multiplyScalar(index%3===0?.98:index%3===1?1.025:1);
    block(g,w-2*t-.0018,h-.006,d-.011,pages,[0,h/2,-.0015],'Inset page block',.0007);
    const spineWidth=w-.001,z=d/2-.0007,bulge=spec.soft?.0008:.0032;
    const shape=new THREE.Shape();shape.moveTo(-spineWidth/2,z-.004);shape.lineTo(spineWidth/2,z-.004);
    shape.lineTo(spineWidth/2,z);shape.quadraticCurveTo(0,z+bulge*2,-spineWidth/2,z);shape.closePath();
    const binding=new THREE.ExtrudeGeometry(shape,{depth:h-.001,bevelEnabled:false,steps:1,curveSegments:12});
    binding.rotateX(Math.PI/2);binding.translate(0,h-.0005,0);
    part(g,binding,cover,[0,0,0],'Rounded closed spine');
    // The printed spine follows the binding's curve instead of floating on a plane.
    const positions=[],uvs=[],indices=[],segments=16;
    for(let row=0;row<2;row++)for(let i=0;i<=segments;i++){
      const u=i/segments,x=(u-.5)*spineWidth;
      positions.push(x,.001+row*(h-.002),z+4*bulge*u*(1-u)+.00012);uvs.push(u,row);
    }
    for(let i=0;i<segments;i++)indices.push(i,i+1,i+segments+1,i+1,i+segments+2,i+segments+1);
    const front=new THREE.BufferGeometry();front.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));front.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));front.setIndex(indices);front.computeVertexNormals();
    const map=spineTexture(spec,index),print=new THREE.MeshStandardMaterial({color:map?'#ffffff':spec.color,map,roughness:cover.roughness});
    part(g,front,print,[0,0,0],'Printed curved spine');
    g.userData.binding=spec.soft?'paperback':'hardback';g.userData.metrics={width:w,height:h,depth:d};
    return g;
  }
  const books=specs.map(book);
  function ground(g,y=0){g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g);g.position.y+=y-b.min.y;g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(g);}
  let edge=-.43;
  books.slice(0,5).forEach((g,i)=>{
    // The fifth volume leans into the row. Minor depth offsets break repetition.
    g.rotation.z=i===4?.145:[0,-.008,.006,0][i];g.rotation.y=[.015,-.02,0,.012,0][i];
    g.position.z=[0,-.008,.005,-.003,.002][i];
    const bounds=ground(g);g.position.x+=edge-bounds.min.x;shelf.add(g);
    g.updateMatrixWorld(true);edge=new THREE.Box3().setFromObject(g).max.x+.0013;
  });
  let stackHeight=0;
  books.slice(5).forEach((g,i)=>{
    g.rotation.z=-Math.PI/2;g.rotation.y=i?-.055:.025;
    // Lay the full cover on the shelf/book below, accounting for rotation exactly.
    let bounds=ground(g,stackHeight);g.position.x+=.045-(bounds.min.x+bounds.max.x)/2+(i?.008:0);
    g.position.z=i?.009:0;shelf.add(g);g.updateMatrixWorld(true);
    bounds=new THREE.Box3().setFromObject(g);stackHeight=bounds.max.y;
  });
  shelf.userData.bookCount=books.length;shelf.userData.units='metres';return shelf;
}
