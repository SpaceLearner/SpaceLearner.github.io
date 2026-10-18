// Select-only combobox: one focus stop, explicit selection, and a list that
// works identically with a pointer, touch, keyboard or assistive technology.
export function createVistaPicker(root) {
  const button=root.querySelector('#vista-select'),menu=root.querySelector('#vista-options');
  const value=root.querySelector('#vista-value'),label=root.querySelector('#vista-current');
  const options=[...menu.querySelectorAll('[role="option"]')];
  let open=false,active=options.findIndex(o=>o.dataset.value===value.value);
  function highlight(index){
    active=(index+options.length)%options.length;
    options.forEach((o,i)=>o.classList.toggle('is-active',i===active));
    if(open)button.setAttribute('aria-activedescendant',options[active].id);
  }
  function close(){open=false;menu.hidden=true;button.setAttribute('aria-expanded','false');button.removeAttribute('aria-activedescendant');}
  function show(){open=true;menu.hidden=false;button.setAttribute('aria-expanded','true');highlight(options.findIndex(o=>o.dataset.value===value.value));}
  function choose(index){
    const option=options[index],changed=value.value!==option.dataset.value;
    value.value=option.dataset.value;label.textContent=option.textContent.trim();
    options.forEach(o=>o.setAttribute('aria-selected',String(o===option)));
    close();button.focus({preventScroll:true});
    if(changed)value.dispatchEvent(new Event('change',{bubbles:true}));
  }
  button.addEventListener('click',()=>{button.focus({preventScroll:true});if(open)close();else show();});
  button.addEventListener('keydown',e=>{
    if(e.key==='Tab'){close();return;}
    if(e.key==='Escape'){if(!open)return;close();}
    else if(e.key==='Enter'||e.key===' '){if(open)choose(active);else show();}
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(!open)show();else highlight(active+(e.key==='ArrowDown'?1:-1));}
    else if(e.key==='Home'||e.key==='End'){if(!open)show();highlight(e.key==='Home'?0:options.length-1);}
    else {
      const index=options.findIndex(o=>o.textContent.trim().startsWith(e.key)||(e.key.length===1&&o.dataset.value.startsWith(e.key.toLowerCase())));
      if(index<0)return;if(!open)show();highlight(index);
    }
    e.preventDefault();e.stopPropagation();
  });
  options.forEach((o,i)=>{
    o.addEventListener('pointermove',()=>highlight(i));
    o.addEventListener('mousedown',e=>e.preventDefault());
    o.addEventListener('click',()=>choose(i));
  });
  document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))close();});
  root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget))close();});
  return {close};
}
