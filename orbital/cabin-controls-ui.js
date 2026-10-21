(() => {
  const top=document.querySelector('.top'),tools=top.querySelector('.header-tools');
  const menu=document.createElement('details');menu.id='cabin-menu';
  const summary=document.createElement('summary');summary.textContent='Cabin controls';
  const panel=document.createElement('div');panel.className='cabin-menu-panel';
  menu.append(summary,panel);tools.prepend(menu);
  panel.append(top.querySelector('nav'),document.getElementById('vista-control'),document.querySelector('.view-controls'));
  const arm=document.createElement('button');arm.type='button';arm.textContent='Robot arm';arm.dataset.armShortcut='';
  arm.addEventListener('click',()=>{menu.open=false;document.getElementById('arm-demo-entry').click();});
  panel.append(arm,top.querySelector('.original'));
  panel.addEventListener('click',e=>{if(e.target.closest('[data-open],#entry-replay,#recenter'))menu.open=false;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open&&!document.querySelector('dialog[open]')&&document.getElementById('vista-options').hidden){menu.open=false;summary.focus();e.preventDefault();}});
  document.addEventListener('pointerdown',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false;});
  window.addEventListener('suite-startup-unavailable',()=>{arm.hidden=true;menu.open=false;document.body.dataset.sceneLanguage='fallback';mount.style.visibility='hidden';});
  const mount=document.createElement('div');mount.id='scene-language';mount.setAttribute('aria-label','Language / 语言');document.querySelector('.suite').append(mount);
})();
