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
T = rd(os.path.join(src, 'template.html')).replace('<!--INPUTS-->', '')
files = ['canopy.js', 'engine.js', 'defaults.js', 'ui.js', 'view.js']
for f in files: assert '</script' not in rd(os.path.join(src, f)).lower(), f
own = ''.join('<script>\n' + rd(os.path.join(src, f)) + '\n</script>\n' for f in files)
def make(head, btns, libs):
    t = T
    for k, v in [('<!--HEAD-->', head), ('<!--EXPORTBTNS-->', btns), ('<!--SCRIPTS-->', libs + own)]:
        assert t.count(k) == 1, k; t = t.replace(k, v)
    return t
btn = '<button id="btnReportDlg">Rapport…</button>\n    <button id="btnSave">Project opslaan</button>\n    <button id="btnOpen">Project openen</button>\n    <button id="btnCsv">CSV</button>\n    <button id="btnJson">JSON</button>'
lib_in = '<script>\n' + rd(os.path.join(three, 'three.min.js')) + '\n</script>\n<script>\n' + rd(os.path.join(three, 'OrbitControls.js')) + '\n</script>\n'
off = make('<!DOCTYPE html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Windbelasting loods Gent</title>',
           '<button id="btnPrint">Afdrukken pagina</button>\n    ' + btn, lib_in) + '</html>\n'
lib_cdn = '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>\n'
pg = make('<title>Windbelasting loods Gent</title>\n<meta name="claude:viewport-fit-sides" content="cover">', btn, lib_cdn)
os.makedirs(dist, exist_ok=True)
open(os.path.join(dist, 'windberekening_loods_gent.html'), 'w', encoding='utf-8').write(off)
open(os.path.join(dist, 'artifact.html'), 'w', encoding='utf-8').write(pg)
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(off)  # GitHub Pages
print('dist/windberekening_loods_gent.html', len(off), '· dist/artifact.html', len(pg))
