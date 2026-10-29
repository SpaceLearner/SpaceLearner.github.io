'use strict';
const list = document.querySelector('.paper-list');
const filters = [...document.querySelectorAll('.filter')];
const search = document.getElementById('paper-search');
const results = document.getElementById('paper-results');
const empty = document.querySelector('.paper-empty');
const papers = [...list.querySelectorAll('.paper')];
let view = 'selected';
const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const archive = papers.map(paper => ({paper, text: normalize(paper.textContent + ' ' + paper.closest('.paper-year').querySelector('h3').textContent)}));
const updatePapers = () => {
  const query = normalize(search.value.trim());
  const activeView = query ? 'all' : view;
  list.dataset.view = activeView;
  let count = 0;
  archive.forEach(({paper, text}) => {
    const matches = (!query || query.split(/\s+/).every(word => text.includes(word))) && (activeView === 'all' || paper.dataset.selected === 'true');
    paper.hidden = !matches;
    if (matches) count++;
  });
  list.querySelectorAll('.paper-year').forEach(year => { year.hidden = ![...year.querySelectorAll('.paper')].some(paper => !paper.hidden); });
  filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter.dataset.filter === activeView)));
  results.textContent = query ? `${count} matching ${count === 1 ? 'paper' : 'papers'} in the full archive` : `${count} ${activeView === 'selected' ? 'selected papers' : 'papers in the archive'}`;
  empty.hidden = count !== 0;
};
filters.forEach(button => button.addEventListener('click', () => {
  view = button.dataset.filter;
  search.value = '';
  updatePapers();
}));
search.closest('.paper-search').hidden = false;
results.hidden = false;
search.addEventListener('input', updatePapers);
const motion = document.querySelector('.motion-toggle');
motion.hidden = false;
motion.addEventListener('click', () => {
  const paused = motion.closest('figure').classList.toggle('is-paused');
  motion.setAttribute('aria-pressed', String(paused));
  motion.textContent = paused ? 'Resume animation' : 'Pause animation';
});
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
