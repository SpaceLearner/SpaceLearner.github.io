'use strict';
const filters = [...document.querySelectorAll('.filter')];
const papers = [...document.querySelectorAll('.paper')];
const groups = [...document.querySelectorAll('.paper-year-group')];
const yearFilter = document.getElementById('year-filter');
let selectedView = 'all';
function updatePublications() {
  const year = yearFilter.value;
  let count = 0;
  papers.forEach(paper => {
    paper.hidden = (selectedView === 'selected' && paper.dataset.selected !== 'true') || (year !== 'all' && paper.dataset.year !== year);
    if (!paper.hidden) count++;
  });
  groups.forEach(group => {
    const visibleCount = [...group.querySelectorAll('.paper')].filter(paper => !paper.hidden).length;
    group.hidden = visibleCount === 0;
    group.querySelector('.year-count').textContent = `${visibleCount} 条`;
  });
  document.getElementById('paper-count').textContent = `${count} 条记录`;
  document.getElementById('no-papers').hidden = count > 0;
}
filters.forEach(button => button.addEventListener('click', () => {
  selectedView = button.dataset.filter;
  filters.forEach(filter => {
    const active = filter === button;
    filter.classList.toggle('active', active);
    filter.setAttribute('aria-pressed', String(active));
  });
  updatePublications();
}));
yearFilter.addEventListener('change', updatePublications);
if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('nav a')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) links.forEach(link => {
        const current = link.hash === `#${entry.target.id}`;
        link.classList.toggle('current', current);
        if (current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, {rootMargin:'-20% 0px -55% 0px'});
  document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
}
