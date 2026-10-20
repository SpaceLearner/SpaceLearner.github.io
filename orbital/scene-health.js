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
      message.textContent = '3D 场景暂不可用';
      detail.textContent = '研究内容仍可正常阅读。';
    } else if (failures.size) {
      message.textContent = '部分画面资源未加载';
      detail.textContent = '已保留基础光照，内容与链接仍可使用。';
    } else {
      message.textContent = ready ? '正在加载光照与材质' : '正在准备太空舱';
      detail.textContent = slow ? '细节仍在加载，可先打开上方内容。' : textureTotal ? `图像 ${textureLoaded} / ${textureTotal}` : '内容入口已经可用';
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
    document.getElementById('fallback-detail').textContent = reason || '3D 文件未能载入。可以直接阅读研究内容，或重新加载页面。';
    for (const id of ['entry-controls', 'vista-control']) document.getElementById(id).hidden = true;
    document.getElementById('status').textContent = '普通浏览模式，研究内容可用';
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
      document.getElementById('fallback-detail').textContent = '场景加载较慢。你可以先阅读内容，画面就绪后会自动进入。';
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
