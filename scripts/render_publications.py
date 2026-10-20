from pathlib import Path
from html import escape as e
import argparse, json, re

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Generate both publication layouts from one verified archive.')
parser.add_argument('--mirror',type=Path,help='Also update the prepared GitHub Pages directory')
parser.add_argument('--check',action='store_true',help='Fail if generated pages are stale')
args=parser.parse_args()
dataset=json.loads((ROOT/'data/publications.json').read_text())
items=dataset['publications'] if isinstance(dataset,dict) else dataset
selected=json.loads((ROOT/'data/selected-publications.json').read_text())
def normalize(title):return re.sub(r'[^a-z0-9]','',title.lower())
features={normalize(p['title']):p for p in selected}
seen=set();seen_urls=set()
for item in items:
 key=normalize(item['title'])
 if key in seen:raise ValueError('Duplicate paper: '+item['title'])
 seen.add(key)
 if item['url'] in seen_urls:raise ValueError('Duplicate paper source: '+item['url'])
 seen_urls.add(item['url'])
 if key in features:
  feature=features[key]
  for k in ('summary','contribution','award','category'):
   if feature.get(k):item[k]=feature[k]
  if feature.get('code') and not item.get('code'):item['code']=feature['code']
  item['selected']=True
 else:item['selected']=False
 if not item.get('url','').startswith('https://'):raise ValueError('Missing verified HTTPS paper link: '+item['title'])
 if not isinstance(item['year'],int):raise ValueError('Missing verified paper year')
items.sort(key=lambda p:(-p['year'],not p['selected'],normalize(p['title'])))
news_path=ROOT/'data/news.json'
if news_path.exists():
 by_url={p['url']:p for p in items}
 for entry in json.loads(news_path.read_text()):
  for paper in entry.get('papers',[]):
   record=by_url.get(paper['url'])
   if not record or record['title']!=paper['title'] or record['venue']!=paper['track']:
    raise ValueError('News/publication mismatch: '+paper['title'])
years=sorted({p['year'] for p in items},reverse=True)
selection_count=sum(p['selected'] for p in items)
if selection_count!=5:raise ValueError(f'Expected five retained selected papers, found {selection_count}')
parts=[f'''    <section id="publications" class="publications section wrap" aria-labelledby="publications-title">
      <div class="section-heading"><div class="section-label"><span>04 / PUBLICATIONS</span><h2 id="publications-title">Papers & Publications</h2></div><a class="text-link" href="https://scholar.google.com/citations?user=M-AFBG4AAAAJ&hl=en" target="_blank" rel="noopener noreferrer">Google Scholar <span aria-hidden="true">↗</span></a></div>
      <div class="publication-toolbar"><div class="filters" role="group" aria-label="Choose a paper list"><button class="filter active" type="button" data-filter="all" aria-pressed="true">All papers <span>{len(items)}</span></button><button class="filter" type="button" data-filter="selected" aria-pressed="false">Selected papers <span>{selection_count}</span></button></div><div class="year-control"><label for="year-filter">Year</label><select id="year-filter" aria-label="Filter papers by year"><option value="all">All years</option>{''.join(f'<option value="{y}">{y}</option>' for y in years)}</select></div></div>
      <div class="publication-context"><span>Published papers and preprints, organized by year</span><span id="paper-count" class="paper-count" aria-live="polite">{len(items)} records</span></div>
      <div class="paper-list">''']
for year in years:
 group=[p for p in items if p['year']==year]
 parts.append(f'<section class="paper-year-group" data-year="{year}" aria-labelledby="year-{year}"><div class="year-heading"><h3 id="year-{year}">{year}</h3><span class="year-line"></span><span class="year-count">{len(group)} papers</span></div>')
 for i,p in enumerate(group,1):
  featured=p['selected'];extra='';role='';award='';authors='';display_note=''
  if p.get('displayNote'):display_note=f'<p class="paper-note">{e(p["displayNote"])}</p>'
  link_label={'Record':'Record','arXiv':'arXiv','OpenReview':'OpenReview'}.get(p.get('linkLabel'),'Paper')
  if p.get('summary'):extra=f'<p>{e(p["summary"])}</p>'
  if p.get('contribution'):role=f'<div class="contribution">{e(p["contribution"])}</div>'
  if p.get('authors'):
   names=p['authors'] if isinstance(p['authors'],list) else [p['authors']]
   author_html=', '.join('<strong>'+e(name)+'</strong>' if name=='Jiayan Guo' else e(name) for name in names)
   authors=f'<div class="paper-authors">{author_html}</div>' if len(names)<=12 else f'<details class="authors-details"><summary>View authors</summary><div class="paper-authors">{author_html}</div></details>'
  if p.get('award'):award=f'<a class="award" href="{e(p["award"]["url"])}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">✧</span> {e(p["award"]["label"])} <span aria-hidden="true">↗</span></a>'
  code=f'<a href="{e(p["code"])}" target="_blank" rel="noopener noreferrer">Code <span aria-hidden="true">↗</span></a>' if p.get('code') else ''
  for link in p.get('links',[]):
   if not link['url'].startswith('https://'):raise ValueError('Invalid additional source URL')
   code+=f'<a href="{e(link["url"])}" target="_blank" rel="noopener noreferrer">{e(link["label"])} <span aria-hidden="true">↗</span></a>'
  selected_badge='<span class="selected-badge">SELECTED</span>' if featured else ''
  venue_raw=p.get('venue') or 'Preprint'
  if venue_raw=='arXiv':venue_raw='arXiv · Preprint'
  if 'Intelligent Systems and Technology' in venue_raw:venue_raw='TIST '+str(year)
  if 'The Web Conference' in venue_raw:venue_raw='WWW '+str(year)
  venue=e(venue_raw)
  parts.append(f'''<article class="paper" data-selected="{str(featured).lower()}" data-year="{year}"><div class="paper-meta"><span class="venue">{venue}</span>{selected_badge}</div><div class="paper-main"><h4><a href="{e(p['url'])}" target="_blank" rel="noopener noreferrer">{e(p['title'])}</a></h4>{authors}{extra}{role}{award}{display_note}<div class="paper-links"><a href="{e(p['url'])}" target="_blank" rel="noopener noreferrer">{link_label} <span aria-hidden="true">↗</span></a>{code}</div></div><span class="paper-index" aria-hidden="true">{i:02}</span></article>''')
 parts.append('</section>')
parts.append('''      </div><p id="no-papers" class="no-papers" hidden>No selected papers for this year. Choose another year or view all papers.</p><p class="publication-footnote">Compiled from public profiles, code repositories, and original papers. Published papers and preprints are labeled separately.</p>
    </section>''')
def venue_label(p):
 value=p.get('venue') or 'Preprint'
 return 'arXiv · Preprint' if value=='arXiv' else value

def write_checked(page,old,new):
 if args.check and old!=new:raise SystemExit('Stale publication content: '+str(page))
 if not args.check:page.write_text(new)

def update(root,classic_path,orbital_path,full_page):
 page=root/classic_path;old=page.read_text()
 new,n=re.subn(r'    <section id="publications".*?(?=    <section id="experience")',lambda _:'\n'.join(parts)+'\n',old,flags=re.S)
 if n!=1:raise ValueError('Missing classic publication section: '+str(page))
 write_checked(page,old,new)
 entries=[]
 for p in items:
  note=f'<small>{e(p["displayNote"])}</small>' if p.get('displayNote') else ''
  for link in p.get('links',[]):
   note+=f'<small><a href="{e(link["url"])}" target="_blank" rel="noopener noreferrer">{e(link["label"])}</a></small>'
  entries.append(f'<li data-paper-id="{e(p["id"])}"><a href="{e(p["url"])}" target="_blank" rel="noopener noreferrer">{e(p["title"])}</a><small>{p["year"]} · {e(venue_label(p))}</small>{note}</li>')
 year_range=f'{min(years)} — {max(years)}'
 template=f'<template id="papers"><p class="note">{min(years)}—{max(years)} · {len(items)} papers, including published papers and preprints.</p><ol class="publications" data-years="{year_range}">'+''.join(entries)+f'</ol><a class="quiet-link" href="{full_page}#publications">All papers and author details ↗</a></template>'
 page=root/orbital_path;old=page.read_text()
 new,n=re.subn(r'<template id="papers">.*?</template>',lambda _:template,old,flags=re.S)
 if n!=1:raise ValueError('Missing orbital publication template: '+str(page))
 new=re.sub(r'<small>\d+ PAPERS</small>',f'<small>{len(items)} PAPERS</small>',new)
 new=re.sub(r'(<button data-open="papers">)\d+( Papers ↗</button>)',lambda m:m[1]+str(len(items))+m[2],new)
 write_checked(page,old,new)

primary=ROOT/'dist' if (ROOT/'dist/index.html').exists() else ROOT
if primary==ROOT:update(primary,'classic/index.html','index.html','./classic/')
else:update(primary,'index.html','preview/index.html','../')
if args.mirror:
 update(args.mirror,'classic/index.html','index.html','./classic/')
 if not args.check:
  for relative in ['data/publications.json','data/selected-publications.json','scripts/render_publications.py']:
   destination=args.mirror/relative;destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes((ROOT/relative).read_bytes())
print(json.dumps({'papers':len(items),'selected':selection_count,'years':years},ensure_ascii=False))
