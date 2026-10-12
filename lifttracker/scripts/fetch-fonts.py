"""Downloads the latin woff2 file for Oswald and Source Sans 3 from Google
Fonts into public/fonts. Both are variable fonts, so one file per family
carries every weight the app uses. Run once; the files are committed. Usage:
    python3 scripts/fetch-fonts.py
"""
import re
import sys
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'fonts'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36')
FAMILIES = {
    'Oswald': ('oswald', [500, 600, 700]),
    'Source Sans 3': ('source-sans-3', [400, 600]),
}


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req) as r:
        return r.read()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for family, (slug, weights) in FAMILIES.items():
        q = family.replace(' ', '+') + ':wght@' + ';'.join(map(str, weights))
        css = fetch(f'https://fonts.googleapis.com/css2?family={q}&display=swap').decode()
        blocks = re.findall(r'/\* latin \*/\s*@font-face\s*{(.*?)}', css, re.S)
        urls = {re.search(r'url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)', b).group(1) for b in blocks}
        if len(urls) != 1:
            print(f'{family}: expected one variable file, got {len(urls)}', file=sys.stderr)
            sys.exit(1)
        target = OUT / f'{slug}.woff2'
        target.write_bytes(fetch(urls.pop()))
        print(f'{target.name}: {target.stat().st_size} bytes')
    missing = [f'{slug}.woff2' for slug, _ in FAMILIES.values() if not (OUT / f'{slug}.woff2').exists()]
    if missing:
        print('missing:', missing, file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
