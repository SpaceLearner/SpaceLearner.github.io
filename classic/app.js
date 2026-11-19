'use strict';

const list = document.querySelector('.paper-list');
const filters = document.querySelector('.filters');
const buttons = [...filters.querySelectorAll('button')];
const search = document.getElementById('paper-search');
const results = document.getElementById('paper-results');
const empty = document.querySelector('.paper-empty');

function normalize(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const years = [...list.querySelectorAll('.paper-year')].map(year => {
  const label = year.querySelector('h3').textContent;
  const papers = [...year.querySelectorAll('.paper')].map(paper => ({
    paper,
    text: normalize(label + ' ' + paper.textContent),
  }));
  return { year, papers };
});

let view = 'selected';
function updatePapers() {
  const query = normalize(search.value.trim());
  const terms = query ? query.split(/\s+/) : [];
  const activeView = query ? 'all' : view;
  list.dataset.view = activeView;
  let count = 0;

  for (const { year, papers } of years) {
    let yearCount = 0;
    for (const { paper, text } of papers) {
      const visible = (activeView === 'all' || paper.dataset.selected === 'true') &&
        terms.every(term => text.includes(term));
      paper.hidden = !visible;
      if (visible) yearCount++;
    }
    year.hidden = yearCount === 0;
    count += yearCount;
  }

  for (const button of buttons) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === activeView));
  }
  const noun = count === 1 ? 'publication' : 'publications';
  results.textContent = query ? `${count} matching ${noun}` : `${count} ${noun} shown`;
  empty.hidden = count !== 0;
}

for (const button of buttons) {
  button.addEventListener('click', () => {
    view = button.dataset.filter;
    search.value = '';
    updatePapers();
  });
}

function revealLinkedYear() {
  const target = document.getElementById(location.hash.slice(1));
  if (!target?.closest('.paper-year')?.hidden) return;
  view = 'all';
  search.value = '';
  updatePapers();
  target.scrollIntoView();
}

search.addEventListener('input', updatePapers);
filters.hidden = false;
search.closest('.paper-search').hidden = false;
results.hidden = false;
updatePapers();
revealLinkedYear();
window.addEventListener('hashchange', revealLinkedYear);

const navLinks = [...document.querySelectorAll('.masthead nav a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of navLinks) {
        if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-14% 0px -80% 0px' });
  for (const link of navLinks) observer.observe(document.querySelector(link.hash));
}
