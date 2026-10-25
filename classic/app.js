'use strict';
const list = document.querySelector('.paper-list');
const filters = [...document.querySelectorAll('.filter')];
filters.forEach(button => button.addEventListener('click', () => {
  list.dataset.view = button.dataset.filter;
  filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
}));
if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('nav a')];
  const status = document.getElementById('run-step');
  const bar = status?.parentElement;
  const setStep = (no, step) => {
    if (!status || bar.dataset.step === step) return;
    status.textContent = `${no} ${step}`;
    bar.dataset.step = step;
    // Restart the one-shot pulse.
    bar.classList.remove('is-stepping'); void bar.offsetWidth; bar.classList.add('is-stepping');
  };
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    links.forEach(link => {
      if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    // The title bar shows the step being read, e.g. "03 observe".
    const {no, step} = entry.target.dataset;
    if (step) setStep(no, step);
  }), {rootMargin: '-30% 0px -60% 0px'});
  document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
  // The last step is too short to reach the trigger band; at the bottom, show it.
  const last = [...document.querySelectorAll('main > section[data-step]')].pop();
  addEventListener('scroll', () => {
    if (!last || innerHeight + scrollY < document.documentElement.scrollHeight - 4) return;
    setStep(last.dataset.no, last.dataset.step);
    links.forEach(link => {
      if (link.hash === `#${last.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, {passive: true});
}
filters.find(button => button.dataset.filter === 'selected')?.click();
// Justified prose: glue the last words with no-break spaces until the last line is a third full.
// ponytail: only the final line is checked; text-wrap: pretty handles the rest where supported.
const NBSP = "\u00a0";
const prose = [...document.querySelectorAll('.hero-lede, .hero-meta, .lede, .threads p, .work p:not(.work-role, .work-links), .timeline p, .service')];
const lastLineFill = p => {
  const range = document.createRange(); range.selectNodeContents(p);
  const rects = [...range.getClientRects()].filter(r => r.width);
  if (new Set(rects.map(r => Math.round(r.bottom))).size < 2) return 1;
  return (rects.at(-1).right - p.getBoundingClientRect().left) / p.clientWidth;
};
const fixLastLines = () => prose.forEach(p => {
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), spaces = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    node.data = node.data.replaceAll(NBSP, ' ');
    for (let i = node.data.indexOf(' '); i >= 0; i = node.data.indexOf(' ', i + 1)) spaces.push([node, i]);
  }
  for (let k = 1; k <= 6 && k < spaces.length && lastLineFill(p) < 1 / 3; k++) {
    const [node, i] = spaces[spaces.length - k];
    node.data = node.data.slice(0, i) + NBSP + node.data.slice(i + 1);
  }
});
let resizeTimer;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fixLastLines, 150); });
document.fonts.ready.then(fixLastLines);
