// This small classic script deliberately lives outside the WebGL module graph.
(() => {
  const box = document.getElementById('scene-load');
  const message = document.getElementById('scene-load-message');
  const detail = document.getElementById('scene-load-detail');
  const progress = document.getElementById('scene-load-progress');
  const retry = document.getElementById('scene-reload');
  const tasks = new Map(), failures = new Set();
  let ready = false, unavailable = false, slow = false, textureLoaded = 0, textureTotal = 0;
  function paint() {
    const pending = [...tasks.values()].filter(v => !v).length;
    document.body.dataset.sceneResources = unavailable ? 'unavailable' : failures.size ? 'partial' : pending || !ready ? 'loading' : 'ready';
    box.hidden = ready && pending === 0 && failures.size === 0 && !unavailable;
    if (box.hidden) return;
    retry.hidden = !failures.size && !unavailable;
    progress.hidden = unavailable || failures.size > 0;
    if (unavailable) {
      message.textContent = '3D scene unavailable';
      detail.textContent = 'Research content remains available.';
    } else if (failures.size) {
      message.textContent = 'Some scene assets could not be loaded';
      detail.textContent = 'Basic lighting is available. Content and links still work.';
    } else {
      message.textContent = ready ? 'Loading lighting and materials' : 'Preparing the cabin';
      detail.textContent = slow ? 'Details are still loading. You can start reading now.' : textureTotal ? `Images ${textureLoaded} / ${textureTotal}` : 'Content is ready to read';
      if (textureTotal) { progress.max = textureTotal; progress.value = textureLoaded; }
      else progress.removeAttribute('value');
    }
  }
  const slowTimer = setTimeout(() => { slow = true; paint(); }, 12000);
  function complete(name, failed = false) {
    tasks.set(name, true); if (failed) failures.add(name); paint();
    if (ready && [...tasks.values()].every(Boolean)) clearTimeout(slowTimer);
  }
  function fallback(reason) {
    if (unavailable) return;
    unavailable = true; clearTimeout(slowTimer);
    document.body.classList.remove('ready', 'entering'); document.body.classList.add('no-webgl');
    document.getElementById('space').hidden = true;
    document.getElementById('fallback').hidden = false;
    document.getElementById('fallback-detail').textContent = reason || 'The 3D files could not be loaded. You can read the research content or reload the page.';
    for (const id of ['entry-controls', 'vista-control']) document.getElementById(id).hidden = true;
    document.getElementById('status').textContent = 'Standard browsing mode; research content is available';
    window.dispatchEvent(new Event('suite-startup-unavailable')); paint();
  }
  window.suiteHealth = {
    task(name, promise) { tasks.set(name, false); paint(); return Promise.resolve(promise).then(value => { complete(name); return value; }, error => { complete(name, true); throw error; }); },
    textures(loaded, total) { textureLoaded = loaded; textureTotal = total; tasks.set('textures', loaded >= total); paint(); },
    textureError() { failures.add('textures'); paint(); },
    ready() { ready = true; clearTimeout(startupTimer); if ([...tasks.values()].every(Boolean)) clearTimeout(slowTimer); paint(); },
    unavailable: fallback
  };
  const startupTimer = setTimeout(() => {
    if (!ready && !unavailable) {
      slow = true; document.getElementById('fallback').hidden = false;
      document.getElementById('fallback-detail').textContent = 'The scene is taking longer to load. You can read the content now; the scene will appear when ready.';
      paint();
    }
  }, 15000);
  window.addEventListener('error', event => {
    if (event.target?.id === 'suite-module') fallback();
  }, true);
  retry.addEventListener('click', () => location.reload());
  document.getElementById('fallback-reload').addEventListener('click', () => location.reload());
  paint();
})();
