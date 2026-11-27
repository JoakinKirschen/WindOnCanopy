/* Meertaligheid (EN / NL / FR).
   Brontekst = Nederlands. Het woordenboek (src/lang/*.txt, door build.py omgezet naar I18N_DICT)
   vertaalt tekstfragmenten in één doorgang (langste fragment eerst, woordgrenzen gerespecteerd).
   Alle HTML die via innerHTML / insertAdjacentHTML / textContent in de pagina komt, wordt vertaald;
   de vaste tekst van de pagina wordt bij een taalwissel opnieuw ingevuld vanuit het Nederlandse origineel.
   Tekst binnen <span translate="no"> (eigen opmerkingen, bestandsnamen) blijft ongewijzigd. */
var I18N = (function () {
  'use strict';
  var D = (typeof I18N_DICT !== 'undefined') ? I18N_DICT : [], LANGS = ['en', 'nl', 'fr'], COL = { en: 1, fr: 2 };
  var lang = 'nl', map = null, re = null, MARK = '<!--i18n-->', statics = null;
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function build() {
    map = Object.create(null); re = null;
    if (lang === 'nl') return;
    var keys = [];
    D.forEach(function (r) { var k = r[0]; if (!(k in map)) keys.push(k); map[k] = r[COL[lang]]; });
    keys.sort(function (a, b) { return b.length - a.length; });
    var parts = keys.map(function (k) {
      var p = escRe(k).replace(/ /g, '\\s+');
      if (/^[\p{L}\p{N}]/u.test(k)) p = '(?<![\\p{L}\\p{N}_])' + p;
      if (/[\p{L}\p{N}]$/u.test(k)) p += '(?![\\p{L}\\p{N}_])';
      return p;
    });
    parts.push('(?<![\\p{L}\\p{N}])[Aa]s (?=\\d|[A-P](?![\\p{L}]))'); // "as 13" / "as A" → axis / axe
    re = new RegExp(parts.join('|'), 'gu');
  }
  function cb(m) {
    var k = m.replace(/\s+/g, ' ');
    if (k in map) return map[k];
    if (/^[Aa]s\s$/.test(m)) return lang === 'en' ? (m[0] === 'A' ? 'Axis ' : 'axis ') : (m[0] === 'A' ? 'Axe ' : 'axe ');
    return m;
  }
  function Lt(t) {
    if (lang === 'nl' || !re || t === null || t === undefined) return t;
    t = String(t).replace(re, cb);
    if (lang === 'en') t = t.replace(/(\d),(\d)/g, '$1.$2'); // decimaalteken
    return t;
  }
  function L(html) {
    if (lang === 'nl' || typeof html !== 'string' || html.indexOf(MARK) === 0) return html;
    var parts = html.split(/(<[a-zA-Z\/!][^>]*>)/), skip = null, out = '';
    for (var i = 0; i < parts.length; i++) {
      var s = parts[i];
      if (i % 2) { // tag
        if (skip) { if (skip.test(s)) skip = null; out += s; continue; }
        if (/^<(textarea|script|style)\b/i.test(s)) skip = new RegExp('^</' + RegExp.$1, 'i');
        else if (/^<span[^>]*translate="no"/i.test(s)) skip = /^<\/span/i;
        out += s.replace(/\b(title|aria-label|placeholder)="([^"]*)"/g, function (m, a, v) { return a + '="' + Lt(v) + '"'; });
      } else out += skip ? s : Lt(s);
    }
    return out;
  }
  // haken: alle dynamische HTML gaat via deze setters
  var dI = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', { configurable: true, enumerable: dI.enumerable, get: dI.get, set: function (v) { dI.set.call(this, L(v)); } });
  var oIA = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (pos, v) { return oIA.call(this, pos, L(v)); };
  var dT = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  Object.defineProperty(Node.prototype, 'textContent', { configurable: true, enumerable: dT.enumerable, get: dT.get, set: function (v) { if (lang !== 'nl' && this.nodeType === 1 && typeof v === 'string' && !/^(TEXTAREA|SCRIPT|STYLE)$/.test(this.tagName)) v = Lt(v); dT.set.call(this, v); } });

  // vaste tekst van de pagina (één keer opgenomen, in het Nederlands)
  function collect() {
    statics = { text: [], attr: [], title: document.title };
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { var p = n.parentNode; return (/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) || !/\S/.test(n.nodeValue)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    while (w.nextNode()) statics.text.push([w.currentNode, w.currentNode.nodeValue]);
    document.querySelectorAll('[title],[aria-label],[placeholder]').forEach(function (el) { ['title', 'aria-label', 'placeholder'].forEach(function (a) { if (el.hasAttribute(a)) statics.attr.push([el, a, el.getAttribute(a)]); }); });
  }
  function applyStatic() {
    if (!statics) collect();
    statics.text.forEach(function (t) { t[0].nodeValue = Lt(t[1]); });
    statics.attr.forEach(function (a) { a[0].setAttribute(a[1], Lt(a[2])); });
    document.title = Lt(statics.title);
    document.documentElement.lang = lang;
  }
  function set(l) { lang = LANGS.indexOf(l) >= 0 ? l : 'en'; build(); applyStatic(); return lang; }
  return { set: set, get: function () { return lang; }, L: L, Lt: Lt, MARK: MARK, LANGS: LANGS, collect: collect };
})();
