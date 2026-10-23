'use strict';
const list = document.querySelector('.paper-list');
const filters = [...document.querySelectorAll('.filter')];
filters.forEach(button => button.addEventListener('click', () => {
  list.dataset.view = button.dataset.filter;
  filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
}));
if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('nav a')];
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    links.forEach(link => {
      if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }), {rootMargin: '-30% 0px -60% 0px'});
  document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
}
filters.find(button => button.dataset.filter === 'selected')?.click();
