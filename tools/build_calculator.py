"""Assemble the single-file site: src/ + data/ -> index.html

Everything is inlined so the page works offline and straight from disk — a split
build would need a web server, because browsers block local data loads from file://
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
DATA = os.path.join(ROOT, 'data')


def read(path, fallback=None):
    """Source file, used verbatim."""
    if not os.path.exists(path):
        if fallback is None:
            raise SystemExit(f'missing: {path}')
        return fallback
    with open(path) as f:
        return f.read()


def payload(path, fallback=None):
    """JSON that gets embedded inside a <script> block, so it must not close it."""
    return read(path, fallback).replace('</script>', '<\\/script>')


def main():
    page = read(os.path.join(SRC, 'index.html'))
    parts = {
        '__STYLES__': '<style>\n' + read(os.path.join(SRC, 'styles.css')) + '</style>',
        '__APP__': '<script>\n' + read(os.path.join(SRC, 'app.js')) + '</script>',
        '__DATA__': payload(os.path.join(DATA, 'calc_data.json')),
        '__IMAGES__': payload(os.path.join(DATA, 'images.json'), '{"portraits":{},"gear":{}}'),
        '__NAMES__': payload(os.path.join(DATA, 'names.json'), '{"characters":{},"pieces":{}}'),
        '__ICONS__': payload(os.path.join(DATA, 'icons.json'), '{}'),
    }
    for token, value in parts.items():
        if token not in page:
            raise SystemExit(f'placeholder {token} not found in src/index.html')
        page = page.replace(token, value)

    out = os.path.join(ROOT, 'index.html')
    with open(out, 'w') as f:
        f.write(page)
    print(f'index.html: {len(page) / 1024 / 1024:.2f} MB')


if __name__ == '__main__':
    main()
