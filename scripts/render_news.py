#!/usr/bin/env python3
"""Render the shared News data into both static layouts; no browser fetch needed."""
import argparse
import json
import re
from datetime import datetime
from html import escape
from pathlib import Path
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parents[1]
START, END = '<!-- NEWS:START -->', '<!-- NEWS:END -->'


def render(entries):
    rows = []
    for item in sorted(entries, key=lambda row: row['date'], reverse=True):
        date = datetime.strptime(item['date'], '%Y-%m-%d' if len(item['date']) == 10 else '%Y-%m')
        date_label = date.strftime('%d %B %Y').lstrip('0') if len(item['date']) == 10 else date.strftime('%B %Y')
        summary = escape(item['summary'])
        if item.get('url'):
            source = urlsplit(item['url'])
            if source.scheme != 'https' or not source.netloc:
                raise ValueError('News sources must use absolute HTTPS URLs')
            summary = '<a href="' + escape(item['url'], quote=True) + '" target="_blank" rel="noopener noreferrer">' + summary + '</a>'
        papers = []
        for paper in item.get('papers', []):
            url = urlsplit(paper['url'])
            if url.scheme != 'https' or not url.netloc:
                raise ValueError('News sources must use absolute HTTPS URLs')
            papers.append('<li><a lang="en" href="' + escape(paper['url'], quote=True)
                          + '" target="_blank" rel="noopener noreferrer">'
                          + escape(paper['title']) + '<span aria-hidden="true"> ↗</span></a>'
                          + '<small lang="en">' + escape(paper['track']) + '</small></li>')
        details = ('<details class="news-papers"><summary>Papers and acceptance details <span aria-hidden="true">＋</span></summary>'
                   + '<ul>' + ''.join(papers) + '</ul></details>') if papers else ''
        rows.append('<li class="news-entry"><time datetime="' + item['date'] + '">'
                    + date_label + '</time><div><p class="news-summary">'
                    + summary + '</p>' + details + '</div></li>')
    return START + '\n<ol class="news-list" aria-label="News, newest first">' + ''.join(rows) + '</ol>\n' + END


def update(root, content, check):
    targets = [root / 'index.html', root / ('preview/index.html' if (root / 'preview/suite.css').exists() else 'classic/index.html')]
    for target in targets:
        old = target.read_text()
        new, count = re.subn(re.escape(START) + r'.*?' + re.escape(END), lambda _: content, old, flags=re.S)
        if count != 1:
            raise ValueError(f'Expected one News block in {target}, found {count}')
        if check and old != new:
            raise SystemExit(f'Stale News content: {target}')
        if not check:
            target.write_text(new)
        print(('Checked ' if check else 'Updated ') + str(target))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mirror', type=Path, help='Also update a prepared GitHub Pages directory')
    parser.add_argument('--check', action='store_true', help='Fail if generated HTML is stale')
    args = parser.parse_args()
    source = BASE / 'data/news.json'
    entries = json.loads(source.read_text())
    archive = BASE / 'data/publications.json'
    if archive.exists():
        records = {p['url']: p for p in json.loads(archive.read_text())['publications']}
        for entry in entries:
            for paper in entry.get('papers', []):
                record = records.get(paper['url'])
                if not record or record['title'] != paper['title'] or record['venue'] != paper['track']:
                    raise ValueError('News/publication mismatch: ' + paper['title'])
    content = render(entries)
    primary = BASE / 'dist' if (BASE / 'dist/index.html').exists() else BASE
    update(primary, content, args.check)
    if args.mirror:
        update(args.mirror, content, args.check)
        if not args.check:
            for relative, origin in [('news.css', primary / 'news.css'), ('data/news.json', source), ('scripts/render_news.py', Path(__file__))]:
                destination = args.mirror / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(origin.read_bytes())
