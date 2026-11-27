"""Bouwt de twee HTML-varianten uit src/.

  dist/windberekening_loods_gent.html  – offline, één bestand (Three.js ingebed)
  dist/artifact.html                   – variant voor claude.ai (Three.js via CDN, opslaan via downloads-capability)
  index.html                           – kopie van de offline versie (GitHub Pages)

Gebruik:  python3 build.py
"""
import os
root = os.path.dirname(os.path.abspath(__file__))
src, three, dist = os.path.join(root, 'src'), os.path.join(root, 'vendor', 'three'), os.path.join(root, 'dist')
def rd(p): return open(p, encoding='utf-8').read()
import base64
logo = rd(os.path.join(src, 'logo.svg')).strip()
icon = '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,' + base64.b64encode(logo.encode('utf-8')).decode('ascii') + '">'
VERSION = rd(os.path.join(root, 'VERSION')).strip()
T = rd(os.path.join(src, 'template.html')).replace('<!--INPUTS-->', '').replace('<!--VERSION-->', VERSION).replace('<!--LOGO-->', logo.replace('<svg ', '<svg width="40" height="40" aria-hidden="true" style="flex:0 0 auto" ', 1))
files = ['i18n.js', 'canopy.js', 'engine.js', 'elements.js', 'defaults.js', 'ui.js', 'view.js']
# woordenboek NL || EN || FR (src/lang/*.txt) → I18N_DICT
import json, glob, re
dic, seen = [], {}
for fn in sorted(glob.glob(os.path.join(src, 'lang', '*.txt'))):
    for n, line in enumerate(open(fn, encoding='utf-8').read().split('\n'), 1):
        if not line.strip() or line.startswith('#'): continue
        parts = line.split(' || ')
        assert len(parts) == 3, (fn, n, line)
        k = re.sub(r'\s+', ' ', parts[0]).strip()
        if k in seen:
            assert seen[k] == parts[1:], ('dubbel met andere vertaling', fn, n, k)
            continue
        seen[k] = parts[1:]; dic.append([k] + parts[1:])
dict_js = 'var I18N_DICT = ' + json.dumps(dic, ensure_ascii=False) + ';'
assert '</script' not in dict_js.lower()
for f in files: assert '</script' not in rd(os.path.join(src, f)).lower(), f
own = '<script>var APP_VERSION = "' + VERSION + '";\n' + dict_js + '</script>\n' + ''.join('<script>\n' + rd(os.path.join(src, f)) + '\n</script>\n' for f in files)
def make(head, btns, libs):
    t = T
    for k, v in [('<!--HEAD-->', head), ('<!--EXPORTBTNS-->', btns), ('<!--SCRIPTS-->', libs + own)]:
        assert t.count(k) == 1, k; t = t.replace(k, v)
    return t
def menu(extra):
    return ('<button class="primary" id="btnReportDlg">Rapport…</button>\n    <details class="menu" id="fileMenu"><summary>Bestand</summary><div class="menupop">'
            '<button id="btnOpen">Project openen…</button><button id="btnSave">Project opslaan…</button><hr>'
            '<button id="btnCsv">Exporteren CSV (zones)</button><button id="btnJson">Exporteren JSON (alle resultaten)</button>' + extra +
            '<hr><button id="btnReset">Standaardwaarden herstellen</button></div></details>')
lib_in = '<script>\n' + rd(os.path.join(three, 'three.min.js')) + '\n</script>\n<script>\n' + rd(os.path.join(three, 'OrbitControls.js')) + '\n</script>\n'
off = make('<!DOCTYPE html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Windbelasting loods Gent</title>\n' + icon,
           menu('<button id="btnPrint">Pagina afdrukken</button>'), lib_in) + '</html>\n'
lib_cdn = '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>\n'
pg = make('<title>Windbelasting loods Gent</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + icon, menu(''), lib_cdn)
os.makedirs(dist, exist_ok=True)
open(os.path.join(dist, 'windberekening_loods_gent.html'), 'w', encoding='utf-8').write(off)
open(os.path.join(dist, 'artifact.html'), 'w', encoding='utf-8').write(pg)
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(off)  # GitHub Pages
print('dist/windberekening_loods_gent.html', len(off), '· dist/artifact.html', len(pg), '· woordenboek', len(dic), 'fragmenten')
