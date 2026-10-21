#!/usr/bin/env python3
"""Stamp first-party homepage JS/CSS URLs with content hashes; --check is read-only."""
import argparse
import hashlib
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULE = re.compile(r'''((?:from\s*|import\s*\(\s*|import\s*)['"])(\.[^'"?]+\.js)(?:\?v=[0-9a-f]+)?(['"])''')
ASSET = re.compile(r'''((?:src|href)=['"])([^'"?]+\.(?:js|css))(?:\?v=[0-9a-f]+)?(['"])''')


def build(root):
    outputs, digests, active = {}, {}, set()

    def resolve(owner, url):
        path = (owner.parent / url).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise ValueError(f'Missing local asset: {owner.relative_to(root)} -> {url}')
        return path

    def stamp(owner, pattern, source):
        def replace(match):
            prefix, url, quote = match.groups()
            if '://' in url or url.startswith('//'):
                return match.group(0)
            path = resolve(owner, url)
            # Keep vendored Three.js imports untouched to retain a single module identity.
            if 'vendor' in path.relative_to(root).parts:
                return match.group(0)
            return f'{prefix}{url}?v={digest(path)}{quote}'
        return pattern.sub(replace, source)

    def digest(path):
        if path in digests:
            return digests[path]
        if path in active:
            raise ValueError(f'Cyclic local module dependency: {path.relative_to(root)}')
        active.add(path)
        source = path.read_text()
        if path.suffix == '.js':
            source = stamp(path, MODULE, source)
        outputs[path] = source
        digests[path] = hashlib.sha256(source.encode()).hexdigest()[:16]
        active.remove(path)
        return digests[path]

    for relative in ('index.html', 'classic/index.html'):
        path = root / relative
        outputs[path] = stamp(path, MODULE, stamp(path, ASSET, path.read_text()))
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    outputs = build(ROOT)
    stale = [path for path, text in outputs.items() if path.read_text() != text]
    if args.check:
        for path in stale:
            print(f'Stale asset versions: {path.relative_to(ROOT)}')
        return bool(stale)
    for path in stale:
        path.write_text(outputs[path])
    print(f'Updated {len(stale)} files; {len(outputs)} first-party assets/entries checked.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
