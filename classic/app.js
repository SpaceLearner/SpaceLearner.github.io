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
