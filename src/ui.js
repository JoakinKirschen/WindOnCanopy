(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  function fmt(v, d, sign) {
    if (v === null || v === undefined || isNaN(v)) return '–';
    if (v === Infinity) return '∞';
    d = d === undefined ? 2 : d;
    var s = Number(v).toLocaleString('nl-BE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
    if (sign && v > 0) s = '+' + s;
    return s;
  }
  // naam van de gebruikte uitwendige coëfficiënt volgens de belaste oppervlakte (EN fig. 7.2)
  function cn(A) { return A <= 1 + 1e-9 ? 'c<sub>pe,1</sub>' : A >= 10 - 1e-9 ? 'c<sub>pe,10</sub>' : 'c<sub>pe</sub>(A = ' + fmt(A, 1) + ' m²)'; }
  function cnT(A) { return A <= 1 + 1e-9 ? 'c_pe,1' : A >= 10 - 1e-9 ? 'c_pe,10' : 'c_pe(' + fmt(A, 1) + ' m²)'; }
  function cls(v) { return v > 1e-9 ? 'pos' : (v < -1e-9 ? 'neg' : ''); }
  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a ? a[k] : undefined; }, o); }
  function setPath(o, p, v) { var ks = p.split('.'), x = o; for (var i = 0; i < ks.length - 1; i++) x = x[ks[i]]; x[ks[ks.length - 1]] = v; }
  var PN = WE.PART_NAMES, DIRN = {}; WE.DIRS.forEach(function (d) { DIRN[d.id] = d; });
  var MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

  var FIELDS = [
    { g: 'Wind en terrein (ANB)', open: true },
    { k: 'vb0', l: 'v<sub>b,0</sub> [m/s]', s: 'ANB tabel 4.2: Gent = 26', t: 'num', min: 15, max: 40, step: 0.5, st: 'conf' },
    { k: 'cat', l: 'Terreincategorie', s: 'opdracht III · plan: WindCAT II', t: 'sel', o: [['0', '0'], ['I', 'I'], ['II', 'II'], ['III', 'III'], ['IV', 'IV']], st: 'ass' },
    { k: 'c0', l: 'Orografie c<sub>0</sub>', s: 'helling < 5 % → 1,0', t: 'num', min: 1, max: 2, step: 0.01, st: 'der' },
    { k: 'cdirMode', l: 'Richtingsfactor c<sub>dir</sub>', s: 'ANB tabel 4.3', t: 'sel', o: [['all', '1,0 – alle richtingen'], ['dir', 'uit windrichting'], ['man', 'handmatig']], st: 'ass' },
    { k: 'dirDeg', l: 'Windrichting (waaruit) [°]', s: '0 N · 90 O · 180 Z · 270 W', t: 'num', min: 0, max: 360, step: 1, st: 'ass' },
    { k: 'cdirMan', l: 'c<sub>dir</sub> handmatig', t: 'num', min: 0.5, max: 1, step: 0.01, st: 'ass' },
    { k: 'cdirShow', l: 'c<sub>dir</sub> gebruikt', t: 'out' },
    { k: 'kIformula', l: 'k<sub>I</sub> via formule', s: 'uit = ANB-waarde (III: 0,95)', t: 'chk', st: 'der' },
    { g: 'Tijdelijke situatie (ANB)' },
    { k: 'duration', l: 'Duur', s: 'opgave: < 1 jaar', t: 'sel', o: WE.DURATIONS.map(function (d) { return [d.id, d.label]; }), st: 'conf' },
    { k: 'month0', l: 'Startmaand', t: 'sel', o: MONTHS.map(function (m, i) { return [String(i + 1), m]; }), st: 'ass' },
    { k: 'useSeason', l: 'c<sub>season</sub> toepassen', s: 'ANB tabel 4.4', t: 'chk', st: 'ass' },
    { k: 'cseasonShow', l: 'c<sub>season</sub>', t: 'out' },
    { k: 'useProb', l: 'c<sub>prob</sub> toepassen', s: 'ANB tabel 4.5 – apart scenario', t: 'chk', st: 'ass' },
    { k: 'cprobMode', l: 'Bepaling c<sub>prob</sub>', t: 'sel', o: [['table', 'tabel 4.5 (T uit duur)'], ['formula', 'EN (4.2)'], ['manual', 'handmatig']], st: 'der' },
    { k: 'cprobMan', l: 'c<sub>prob</sub> handmatig', t: 'num', min: 0.5, max: 1.2, step: 0.01, st: 'ass' },
    { k: 'cprobShow', l: 'c<sub>prob</sub>', t: 'out' },
    { g: 'Geometrie' },
    { k: 'geo.s1', l: 'Overspanning as 1–7 [m]', t: 'num', min: 5, max: 200, step: 0.01, st: 'conf' },
    { k: 'geo.s2', l: 'Overspanning as 7–13 [m]', t: 'num', min: 5, max: 200, step: 0.01, st: 'conf' },
    { k: 'geo.sL', l: 'Overspanning as 13–14 [m]', t: 'num', min: 2, max: 400, step: 0.01, st: 'conf' },
    { k: 'geo.B', l: 'Lengte as A–P [m]', t: 'num', min: 5, max: 400, step: 0.001, st: 'conf' },
    { k: 'geo.hE1', l: 'Dakrand as 1 [m]', t: 'num', min: 2, max: 50, step: 0.01, st: 'conf' },
    { k: 'geo.hV7', l: 'Kilgoot as 7 [m]', t: 'num', min: 2, max: 50, step: 0.01, st: 'conf' },
    { k: 'geo.hR', l: 'Nok as 1–13 [m]', t: 'num', min: 2, max: 60, step: 0.01, st: 'conf' },
    { k: 'geo.hV13', l: 'Kilgoot as 13 [m]', t: 'num', min: 2, max: 50, step: 0.01, st: 'conf' },
    { k: 'pitchMode', l: 'Helling as 1–13 voor c<sub>pe</sub>', t: 'sel', o: [['plan', 'ingegeven waarde'], ['geom', 'uit niveaus']], st: 'der' },
    { k: 'pitchDeg', l: 'As 1–13: helling α [°]', s: 'plan: 15 % ≈ 8,53°', t: 'num', min: 1, max: 60, step: 0.01, st: 'conf' },
    { k: 'can.n', l: 'As 13–14: aantal velden', s: 'fig. 7.18 (indien open)', t: 'num', min: 1, max: 20, step: 1, st: 'conf' },
    { k: 'can.alpha', l: 'As 13–14: helling α [°]', s: 'fig. 7.17: + nok, − kil', t: 'num', min: -20, max: 45, step: 0.01, st: 'conf' },
    { k: 'can.he', l: 'As 13–14: goothoogte [m]', t: 'num', min: 1, max: 60, step: 0.01, st: 'conf' },
    { g: 'Daken (aan/uit en verwijderd deel)', open: true },
    { k: 'roofs.0.on', l: 'Dak as 1–7 aanwezig', t: 'chk', st: 'conf' },
    { k: 'roofs.0.rem', l: '· verwijderd over [m]', s: 'fase 1: volledig (109,439)', t: 'num', min: 0, max: 400, step: 0.1, st: 'ass' },
    { k: 'roofs.1.on', l: 'Dak as 7–13 aanwezig', t: 'chk', st: 'conf' },
    { k: 'roofs.1.rem', l: '· verwijderd over [m]', t: 'num', min: 0, max: 400, step: 0.1, st: 'conf' },
    { k: 'roofs.2.on', l: 'Dak as 13–14 aanwezig', t: 'chk', st: 'conf' },
    { k: 'roofs.2.rem', l: '· verwijderd over [m]', t: 'num', min: 0, max: 400, step: 0.1, st: 'conf' },
    { k: 'remFromA', l: 'Verwijderen vanaf as A', s: 'uit = vanaf as P', t: 'chk', st: 'ass' },
    { g: 'Wanden: aanwezig + openingen [m²]', open: true },
    { k: 'walls.W0', l: 'Gevel as 1 (links)', t: 'pair', st: 'conf' },
    { k: 'fase2.on', l: '· fase 2: gevelopening as 1', t: 'chk', st: 'conf' },
    { k: 'fase2.y0', l: '· begin y (as G) [m]', t: 'num', min: 0, max: 400, step: 0.001, st: 'conf' },
    { k: 'fase2.L', l: '· lengte [m]', s: 'rood kader 36,661', t: 'num', min: 0, max: 400, step: 0.001, st: 'conf' },
    { k: 'fase2.H', l: '· hoogte [m]', s: 'rood kader 10,837', t: 'num', min: 0, max: 60, step: 0.001, st: 'conf' },
    { k: 'walls.W1', l: 'Wand as 7', s: 'plan: geen wand', t: 'pair', st: 'conf' },
    { k: 'walls.W2', l: 'Wand as 13 (rechtergevel)', s: 'gesloten wand', t: 'pair', st: 'conf' },
    { k: 'walls.W3', l: 'Gevel as 14', s: 'open luifel', t: 'pair', st: 'conf' },
    { k: 'walls.A0', l: 'Gevel A · as 1–7', t: 'pair', st: 'conf' },
    { k: 'walls.A1', l: 'Gevel A · as 7–13', t: 'pair', st: 'conf' },
    { k: 'walls.A2', l: 'Gevel A · as 13–14', t: 'pair', st: 'conf' },
    { k: 'walls.P0', l: 'Gevel P · as 1–7', t: 'pair', st: 'conf' },
    { k: 'walls.P1', l: 'Gevel P · as 7–13', t: 'pair', st: 'conf' },
    { k: 'walls.P2', l: 'Gevel P · as 13–14', t: 'pair', st: 'conf' },
    { k: 'perm', l: 'Basisdoorlatendheid [%]', s: 'EN 7.2.9(2): 0,01 … 0,1 %', t: 'num', min: 0, max: 5, step: 0.01, st: 'ass' },
    { g: 'Inwendige druk (gesloten volumes)' },
    { k: 'scen.S1', l: 'S1 gesloten gebouw (+)', t: 'chk', st: 'der' },
    { k: 'cpiPos', l: '· c<sub>pi</sub>', s: 'ANB 7.2.9(6): +0,2', t: 'num', min: -1, max: 1, step: 0.01, st: 'der' },
    { k: 'scen.S2', l: 'S2 gesloten gebouw (−)', t: 'chk', st: 'der' },
    { k: 'cpiNeg', l: '· c<sub>pi</sub>', s: 'ANB 7.2.9(6): −0,3', t: 'num', min: -1, max: 1, step: 0.01, st: 'der' },
    { k: 'scen.S3', l: 'S3 openingen (7.2.9: dominante zijde / fig. 7.13)', t: 'chk', st: 'der' },
    { k: 'scen.S4', l: 'S4 handmatig', t: 'chk', st: 'ass' },
    { k: 'scen.S5', l: 'S5 grensvlak verwijderd dak = open loefgevel (veilig, cf. WInt)', s: 'overdekt deel als apart gebouw, c_pi = 0,9·c_pe', t: 'chk', st: 'der' },
    { k: 'cpiMan', l: '· c<sub>pi</sub>', t: 'num', min: -1.5, max: 1.5, step: 0.01, st: 'ass' },
    { g: 'Open delen (EN 7.3 / 7.4)' },
    { k: 'can.phiMode', l: 'Blokkering φ', s: 'EN 7.3(2),(4)', t: 'sel', o: [['dir', 'per windrichting'], ['single', 'één waarde']], st: 'der' },
    { k: 'can.phiDir.R', l: '· φ wind van rechts [%]', s: 'wand as 13 aan lijzijde → 100', t: 'num', min: 0, max: 100, step: 5, st: 'der' },
    { k: 'can.phiDir.L', l: '· φ wind van links [%]', s: 'lijzijde van blokkering → 0 (7.3(4))', t: 'num', min: 0, max: 100, step: 5, st: 'der' },
    { k: 'can.phiDir.A', l: '· φ wind van as A [%]', t: 'num', min: 0, max: 100, step: 5, st: 'der' },
    { k: 'can.phiDir.P', l: '· φ wind van as P [%]', t: 'num', min: 0, max: 100, step: 5, st: 'der' },
    { k: 'can.phi', l: '· φ één waarde [%]', t: 'num', min: 0, max: 100, step: 5, st: 'der' },
    { k: 'can.zeMode', l: 'z<sub>e</sub> overkapping', s: 'EN 7.3(8), fig. 7.17', t: 'sel', o: [['eave', 'h tot dakrand (fig. 7.17)'], ['top', 'bovenkant (veilig)'], ['manual', 'handmatig']], st: 'der' },
    { k: 'can.ze', l: '· z<sub>e</sub> handmatig [m]', t: 'num', min: 1, max: 200, step: 0.01, st: 'der' },
    { k: 'can.cfr', l: 'Wrijving c<sub>fr</sub>', s: 'EN tabel 7.10', t: 'sel', num: true, o: [['0.01', '0,01 glad'], ['0.02', '0,02 ruw'], ['0.04', '0,04 zeer ruw']], st: 'ass' },
    { g: 'Draagconstructie (belastingen per element)' },
    { k: 'str.frames', l: 'Spantposities vanaf as A [m]', s: 'gescheiden door ; · plan 2161/A: 16 spanten A–P', t: 'txt', st: 'conf' },
    { k: 'str.sP', l: 'Gordingafstand [m]', s: 'niet op plan – aanname', t: 'num', min: 0.3, max: 10, step: 0.05, st: 'ass' },
    { k: 'str.sR', l: 'Afstand gevelregels [m]', s: 'niet op plan – aanname', t: 'num', min: 0.3, max: 10, step: 0.05, st: 'ass' },
    { k: 'str.sCol', l: 'Afstand gevelkolommen gevel A/P [m]', s: 'plan: 7,50 (randvakken 7,26)', t: 'num', min: 1, max: 30, step: 0.01, st: 'conf' },
    { k: 'str.cfrB', l: 'Wrijving c<sub>fr</sub> gebouw', s: 'EN tabel 7.10, toets 5.3(4)', t: 'sel', num: true, o: [['0.01', '0,01 glad'], ['0.02', '0,02 ruw'], ['0.04', '0,04 zeer ruw']], st: 'ass' },
    { g: 'Referentiehoogte, oppervlakte, veiligheid' },
    { k: 'zeAuto', l: 'z<sub>e</sub> = z<sub>i</sub> = h per volume', s: 'EN 7.2.5(2), fig. 7.4, 7.2.9(7)', t: 'chk', st: 'der' },
    { k: 'zeBld', l: 'z<sub>e</sub> handmatig [m]', t: 'num', min: 1, max: 200, step: 0.01, st: 'ass' },
    { k: 'zi', l: 'z<sub>i</sub> handmatig [m]', t: 'num', min: 1, max: 200, step: 0.01, st: 'ass' },
    { k: 'zeDtop', l: 'z<sub>e</sub> loefgevel D = bovenkant gevel', s: 'fig. 7.4 / ANB 4.5 Opm. 3 (WInt); uit = h (veilig)', t: 'chk', st: 'der' },
    { k: 'i5pos', l: 'Tabel 7.4a zone I bij 5°: ook +0,2', s: 'WInt/AC; NBN-tekst: enkel −0,6', t: 'chk', st: 'der' },
    { k: 'Aloc', l: 'A<sub>lok</sub> [m²]', s: '1 m² = bevestigingen', t: 'num', min: 0.1, max: 1000, step: 0.1, st: 'der' },
    { k: 'cscd', l: 'c<sub>s</sub>c<sub>d</sub>', s: 'EN 6.2(1)', t: 'num', min: 0.7, max: 1.5, step: 0.01, st: 'ass' },
    { k: 'gammaQ', l: 'γ<sub>Q</sub>', s: 'EN 1990 A1.2(B): 1,5', t: 'num', min: 1, max: 2, step: 0.05, st: 'der' },
    { k: 'KFI', l: 'K<sub>FI</sub>', s: 'standaard 1,0', t: 'num', min: 0.8, max: 1.2, step: 0.05, st: 'ass' },
    { k: 'mode', l: 'Weergave', t: 'sel', o: [['k', 'karakteristiek'], ['d', 'ontwerp']], st: 'der' }
  ];
  function iid(k) { return 'in_' + k.replace(/\./g, '_'); }
  function buildInputs() {
    var h = '', open = false;
    FIELDS.forEach(function (f) {
      if (f.g) { if (open) h += '</div></details>'; h += '<details class="grp" data-g="' + f.g.replace(/[^A-Za-z]/g, '').slice(0, 24) + '"><summary>' + f.g + '</summary><div class="fields">'; open = true; return; }
      var id = iid(f.k), st = f.st === 'ass' ? 'assume' : f.st === 'der' ? 'derived' : 'conf';
      if (f.t === 'pair') {
        h += '<div class="f pair ' + st + '" id="w_' + id + '"><label for="' + id + '_on">' + f.l + (f.s ? '<small>' + f.s + '</small>' : '') + '</label><input type="checkbox" id="' + id + '_on" aria-label="' + f.l + ' aanwezig"><input type="number" id="' + id + '_op" min="0" max="100000" step="1" aria-label="openingen ' + f.l + ' in m²"><div class="err" id="e_' + id + '"></div></div>';
        return;
      }
      h += '<div class="f ' + st + (f.t === 'out' ? ' derived' : '') + (f.t === 'txt' ? ' txt' : '') + '" id="w_' + id + '"><label for="' + id + '">' + f.l + (f.s ? '<small>' + f.s + '</small>' : '') + '</label>';
      if (f.t === 'num') h += '<input type="number" id="' + id + '" step="' + f.step + '" min="' + f.min + '" max="' + f.max + '">';
      else if (f.t === 'sel') h += '<select id="' + id + '">' + f.o.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select>';
      else if (f.t === 'chk') h += '<input type="checkbox" id="' + id + '">';
      else if (f.t === 'txt') h += '<input type="text" id="' + id + '" spellcheck="false" autocomplete="off">';
      else h += '<input type="text" id="' + id + '" readonly tabindex="-1">';
      h += '<div class="err" id="e_' + id + '"></div></div>';
    });
    $('inputs').innerHTML = h + '</div></details>';
    var st = {}; try { st = JSON.parse(lsGet('groups') || '{}') || {}; } catch (e) { st = {}; }
    document.querySelectorAll('#inputs details.grp').forEach(function (d) { d.open = !!st[d.getAttribute('data-g')]; d.addEventListener('toggle', saveGroups); });
  }
  function saveGroups() { var st = {}; document.querySelectorAll('#inputs details.grp').forEach(function (d) { if (d.open) st[d.getAttribute('data-g')] = 1; }); lsSet('groups', JSON.stringify(st)); }
  function setGroups(open) { document.querySelectorAll('#inputs details.grp').forEach(function (d) { d.open = open; }); saveGroups(); }
  function setInputs(P) {
    FIELDS.forEach(function (f) {
      if (!f.k || f.t === 'out') return;
      var id = iid(f.k);
      if (f.t === 'pair') { var w = getPath(P, f.k); $(id + '_on').checked = !!w.on; $(id + '_op').value = String(w.open); return; }
      var v = f.k === 'cprobMan' ? (P.cprobMan !== undefined ? P.cprobMan : P.cprob) : getPath(P, f.k);
      if (f.t === 'chk') $(id).checked = !!v; else $(id).value = f.t === 'txt' && I18N.get() === 'en' ? String(v).replace(/(\d),(\d)/g, '$1.$2') : String(v);
    });
  }
  function readInputs() {
    var P = clone(DEFAULTS), errs = [];
    function bad(id, f, msg) { var gd = $('w_' + id).closest('details'); if (gd) gd.open = true; $('w_' + id).classList.add('invalid'); $('e_' + id).textContent = msg; errs.push(f.l.replace(/<[^>]+>/g, '').replace(/^· /, '') + ': ' + msg); }
    FIELDS.forEach(function (f) {
      if (!f.k || f.t === 'out') return;
      var id = iid(f.k), w = $('w_' + id); w.classList.remove('invalid');
      if (f.t === 'pair') {
        var on = $(id + '_on').checked, op = parseFloat(String($(id + '_op').value).replace(',', '.'));
        if (!isFinite(op) || op < 0) { bad(id, f, 'Openingen ≥ 0 m².'); return; }
        setPath(P, f.k, { on: on, open: op }); $(id + '_op').disabled = !on; return;
      }
      var v;
      if (f.t === 'chk') v = $(id).checked;
      else if (f.t === 'txt') { v = String($(id).value).trim(); var pf = WEL.parseFrames(v); if (pf.err) { bad(id, f, pf.err); return; } }
      else if (f.t === 'sel') v = f.num ? parseFloat($(id).value) : $(id).value;
      else {
        v = parseFloat(String($(id).value).replace(',', '.'));
        if ($(id).value === '' || !isFinite(v)) { bad(id, f, 'Geef een getal in.'); return; }
        if (v < f.min || v > f.max) { bad(id, f, 'Toegelaten: ' + f.min + ' … ' + f.max + '.'); return; }
      }
      if (f.k === 'month0') v = parseInt(v, 10);
      if (f.k === 'can.n') v = Math.round(v);
      if (f.k === 'cprobMan') P.cprobMan = v; else setPath(P, f.k, v);
    });
    var dur = WE.DURATIONS.filter(function (d) { return d.id === P.duration; })[0], cs = 0;
    for (var i = 0; i < dur.months; i++) cs = Math.max(cs, WE.NORM.cseason[(P.month0 - 1 + i) % 12]);
    P.cseason = cs; P.T = dur.T; P.monthsDur = dur.months;
    P.cprob = P.cprobMode === 'manual' ? P.cprobMan : (P.cprobMode === 'formula' ? WE.cprobFormula(1 / dur.T) : WE.cprobFromT(dur.T));
    $('in_cseasonShow').value = I18N.Lt(fmt(cs, 2) + (P.useSeason ? '' : ' (uit)'));
    $('in_cprobShow').value = I18N.Lt(fmt(P.cprob, 3) + ' (T = ' + dur.T + ' ' + (I18N.get() === 'nl' ? 'j' : I18N.get() === 'fr' ? 'ans' : 'y') + ')' + (P.useProb ? '' : ' (uit)'));
    $('in_cdirShow').value = I18N.Lt(fmt(P.cdirMode === 'all' ? 1 : P.cdirMode === 'dir' ? CE.cdirFromDeg(P.dirDeg) : P.cdirMan, 3));
    function x(c, m, k) { if (!c) { errs.push(m); var w = $('w_' + iid(k)); if (w) { if (w.closest('details')) w.closest('details').open = true; w.classList.add('invalid'); $('e_' + iid(k)).textContent = m; } } }
    x(P.geo.hR > Math.max(P.geo.hV7, P.geo.hV13), 'Nok moet hoger liggen dan de kilgoten.', 'geo.hR');
    x(P.fase2.y0 + P.fase2.L <= P.geo.B + 1e-6, 'Gevelopening valt buiten de gevel.', 'fase2.L');
    x(P.fase2.H <= P.geo.hE1, 'Gevelopening hoger dan dakrand as 1.', 'fase2.H');
    if (P.roofs[2].on && P.walls.W3.on && P.walls.A2.on && P.walls.P2.on) { /* gesloten luifel: helling moet binnen tabel 7.4 liggen */ x(P.can.alpha >= 5, 'Gesloten as 13–14: helling ≥ 5° nodig voor tabel 7.4.', 'can.alpha'); }
    $('in_dirDeg').disabled = P.cdirMode !== 'dir'; $('in_cdirMan').disabled = P.cdirMode !== 'man';
    $('in_month0').disabled = !P.useSeason; $('in_cprobMan').disabled = P.cprobMode !== 'manual';
    $('in_pitchDeg').disabled = P.pitchMode !== 'plan';
    [0, 1, 2].forEach(function (i) { $('in_roofs_' + i + '_rem').disabled = !P.roofs[i].on; });
    ['y0', 'L', 'H'].forEach(function (k) { $('in_fase2_' + k).disabled = !P.fase2.on || !P.walls.W0.on; });
    $('in_can_ze').disabled = P.can.zeMode !== 'manual';
    ['R', 'L', 'A', 'P'].forEach(function (d) { $('in_can_phiDir_' + d).disabled = P.can.phiMode !== 'dir'; }); $('in_can_phi').disabled = P.can.phiMode === 'dir'; $('in_zeBld').disabled = $('in_zi').disabled = P.zeAuto;
    return { P: P, errs: errs };
  }

  /* ---------- toestand ---------- */
  var OUT = null, EL = null, SEL = { dir: 'R', scen: 'S3', caseId: 'FGH−/IJ−', sign: 'min', lay: 'beide', meas: 'loc', mode: 'k' };
  function k(r, key) { var v = r[key] * r.red; return SEL.mode === 'd' ? v * r.gF : v; }
  function recalc() {
    var R = readInputs();
    if (R.errs.length) { $('statusMini').innerHTML = '✘ <b>invoer niet geldig</b> – resultaten niet bijgewerkt'; $('statusBox').innerHTML = '<div class="banner err"><b>Invoer niet geldig – resultaten niet bijgewerkt.</b><ul>' + R.errs.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul></div>'; return; }
    SEL.mode = R.P.mode; var rm = document.querySelector('input[name=mode][value=' + R.P.mode + ']'); if (rm) rm.checked = true;
    try { OUT = WE.compute(R.P); EL = WEL.compute(OUT); } catch (e) { $('statusBox').innerHTML = '<div class="banner err">Rekenfout: ' + e.message + '</div>'; throw e; }
    OUT.EL = EL; if (!EL.err) { OUT.checks = OUT.checks.concat(EL.checks); OUT.warnings = OUT.warnings.concat(EL.warnings); }
    var fs = $('f_surf'), cur = fs.value;
    fs.innerHTML = '<option value="all">alle</option>' + OUT.parts.map(function (p) { return '<option value="' + p + '">' + PN[p] + '</option>'; }).join('');
    fs.value = OUT.parts.indexOf(cur) >= 0 ? cur : 'all';
    renderAll();
  }
  function renderAll() {
    renderStatus(); renderModel(); renderSummary(); renderReport(); renderGeo(); renderQp(); renderCpe(); renderCpi(); renderRes(); renderTot(); renderOpen(); renderTemp(); renderChecks(); renderHand(); renderAss(); renderElem();
    if (window.View3D) View3D.update(OUT, SEL);
  }
  function renderStatus() {
    var n = OUT.checks.length, ok = OUT.checks.filter(function (c) { return c.ok; }).length;
    var h = '<div class="banner ' + (ok === n ? 'info' : 'err') + '">Controles <b>' + ok + '/' + n + '</b> · terreincategorie <b>' + OUT.P.cat + '</b> · ' + OUT.vols.map(function (v) { return v.name + ': <b>' + (v.closed ? 'gesloten' : 'open') + '</b>'; }).join(' · ') + (OUT.vb.red < 1 ? ' · <b>tijdelijke reductie r = ' + fmt(OUT.vb.red, 3) + '</b>' : '') + '</div>';
    if (OUT.warnings.length) h += '<div class="banner warn"><b>Waarschuwingen</b><ul>' + OUT.warnings.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul></div>';
    $('statusBox').innerHTML = h;
    $('statusMini').innerHTML = (ok === n ? '✔' : '✘') + ' controles <b>' + ok + '/' + n + '</b>' + (OUT.warnings.length ? ' · <b>' + OUT.warnings.length + '</b> waarschuwing' + (OUT.warnings.length > 1 ? 'en' : '') : '') + ' · ' + OUT.vols.map(function (v) { return 'V' + (v.i + 1) + ' ' + (v.closed ? 'gesloten' : 'open'); }).join(' · ');
  }

  /* ---------- model ---------- */
  function renderModel() {
    var o = OUT, X = o.X, B = o.B, W = 760, sc = (W - 90) / X[3], H = B * sc + 70, ox = 50, oy = 30;
    var PX = function (x) { return ox + x * sc; }, PY = function (y) { return oy + (B - y) * sc; };
    var vc = ['#2f6fb0', '#8a5cc2', '#2e8b57'];
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,Arial" font-size="15"><defs><pattern id="hb" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#9db4d6" stroke-width="1.2"/></pattern></defs>';
    o.spans.forEach(function (sp) {
      var v = sp.vol, fill = v.closed ? '#e3ecf7' : '#fde6cf';
      s += '<rect x="' + PX(sp.x0) + '" y="' + PY(B) + '" width="' + sp.w * sc + '" height="' + B * sc + '" fill="' + fill + '" stroke="#bbb"/>';
      if (sp.rem > 0) s += '<rect x="' + PX(sp.x0) + '" y="' + PY(sp.yr[1]) + '" width="' + sp.w * sc + '" height="' + (sp.yr[1] - sp.yr[0]) * sc + '" fill="url(#hb)"/>';
      s += '<text x="' + PX(sp.xm) + '" y="' + PY(B / 2) + '" text-anchor="middle" font-weight="600" fill="#333">' + sp.name + '</text><text x="' + PX(sp.xm) + '" y="' + (PY(B / 2) + 15) + '" text-anchor="middle" fill="' + vc[v.i] + '">V' + (v.i + 1) + ' · ' + (v.closed ? 'gesloten (7.2)' : 'open (7.3/7.4)') + '</text>';
      if (sp.rem > 0) s += '<text x="' + PX(sp.xm) + '" y="' + (PY(B / 2) + 30) + '" text-anchor="middle" fill="#2b4f9a">dak ' + (sp.rem >= B - 1e-9 ? 'afwezig' : 'deels verwijderd') + '</text>';
    });
    function wl(x0, y0, x1, y1, w, lab) {
      var on = w.on, col = on ? '#333' : '#c3c3c3';
      s += '<line x1="' + PX(x0) + '" y1="' + PY(y0) + '" x2="' + PX(x1) + '" y2="' + PY(y1) + '" stroke="' + col + '" stroke-width="' + (on ? 4 : 2) + '"' + (on ? '' : ' stroke-dasharray="5 4"') + '/>';
    }
    [0, 1, 2, 3].forEach(function (k2) { wl(X[k2], 0, X[k2], B, o.walls['W' + k2]); });
    o.spans.forEach(function (sp) { wl(sp.x0, 0, sp.x1, 0, o.walls['A' + sp.i]); wl(sp.x0, B, sp.x1, B, o.walls['P' + sp.i]); });
    var f2 = o.P.fase2;
    if (f2.on && o.walls.W0.on) s += '<line x1="' + PX(0) + '" y1="' + PY(f2.y0 + f2.L) + '" x2="' + PX(0) + '" y2="' + PY(f2.y0) + '" stroke="#d62728" stroke-width="6"/>';
    [[0, '1'], [X[1], '7'], [X[2], '13'], [X[3], '14']].forEach(function (q) { s += '<circle cx="' + PX(q[0]) + '" cy="' + (oy - 14) + '" r="9" fill="#fff" stroke="#333"/><text x="' + PX(q[0]) + '" y="' + (oy - 10) + '" text-anchor="middle">' + q[1] + '</text>'; });
    [[0, 'A'], [B, 'P']].forEach(function (q) { s += '<circle cx="' + (ox - 22) + '" cy="' + PY(q[0]) + '" r="9" fill="#fff" stroke="#333"/><text x="' + (ox - 22) + '" y="' + (PY(q[0]) + 4) + '" text-anchor="middle">' + q[1] + '</text>'; });
    s += '<text x="' + PX(X[3] / 2) + '" y="' + (H - 12) + '" text-anchor="middle" fill="#555">volle lijn = wand aanwezig · stippel = geen wand · rood = gevelopening fase 2 · arcering = dak verwijderd</text></svg>';
    $('svgPlan').innerHTML = s;
    // doorsnede
    var Hs = 240, zs = 8, sx = (W - 70) / X[3], gx = 40, gz = Hs - 34;
    var XX = function (x) { return gx + x * sx; }, ZZ = function (z) { return gz - z * zs; };
    var t = '<svg viewBox="0 0 ' + W + ' ' + Hs + '" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,Arial" font-size="11"><line x1="' + XX(-2) + '" y1="' + ZZ(0) + '" x2="' + XX(X[3] + 2) + '" y2="' + ZZ(0) + '" stroke="#555"/>';
    o.spans.forEach(function (sp) {
      var pts = [], N = sp.luifel ? sp.nb * 2 : 2;
      for (var i = 0; i <= N; i++) { var xx = sp.x0 + i * sp.w / N; pts.push([xx, i === 0 ? sp.zl : i === N ? sp.zr : (sp.luifel ? (i % 2 ? sp.zt : sp.zl) : sp.zt)]); }
      t += '<polyline points="' + pts.map(function (p) { return XX(p[0]) + ',' + ZZ(p[1]); }).join(' ') + '" fill="none" stroke="' + (sp.roofOn ? (sp.vol.closed ? '#2f6fb0' : '#e07a1f') : '#9db4d6') + '" stroke-width="' + (sp.roofOn ? 3 : 2) + '"' + (sp.roofOn ? '' : ' stroke-dasharray="6 4"') + '/>';
      t += '<text x="' + XX(sp.xm) + '" y="' + (ZZ(sp.top) - 8) + '" text-anchor="middle" fill="#c0392b">+' + fmt(sp.top, 2) + '</text>';
      t += '<text x="' + XX(sp.xm) + '" y="' + (ZZ(0) + 28) + '" text-anchor="middle" fill="#333">' + fmt(sp.w, 2) + ' m</text>';
    });
    [0, 1, 2, 3].forEach(function (k2) {
      var w = o.walls['W' + k2], hh = w.H;
      t += '<line x1="' + XX(X[k2]) + '" y1="' + ZZ(0) + '" x2="' + XX(X[k2]) + '" y2="' + ZZ(hh) + '" stroke="' + (w.on ? '#333' : '#c3c3c3') + '" stroke-width="' + (w.on ? 3 : 1.5) + '"' + (w.on ? '' : ' stroke-dasharray="4 4"') + '/>';
      t += '<text x="' + XX(X[k2]) + '" y="' + (ZZ(0) + 14) + '" text-anchor="middle">as ' + ['1', '7', '13', '14'][k2] + '</text>';
    });
    t += '</svg>';
    $('svgSec').innerHTML = t;
    // volumes
    var h = '<tr><th class="l">Volume</th><th class="l">Vlak</th><th>Bruto A [m²]</th><th>Openingen [m²]</th><th>Openingen [%]</th><th class="l">Gekozen theorie</th></tr>';
    o.vols.forEach(function (v) {
      v.faces.forEach(function (f, i) {
        h += '<tr>' + (i === 0 ? '<td class="l" rowspan="' + v.faces.length + '"><b>' + v.name + '</b><br><span class="small">' + v.n30 + ' vlak(ken) > 30 %</span></td>' : '') + '<td class="l">' + (f.id === 'roof' ? 'dak' : f.id === 'A' ? 'gevel A' : f.id === 'P' ? 'gevel P' : PN[f.id]) + '</td><td>' + fmt(f.A, 0) + '</td><td>' + fmt(f.open, 1) + '</td><td>' + (f.pct > 0.3 + 1e-12 ? '<span class="chip bad">' + fmt(f.pct * 100, 1) + ' %</span>' : fmt(f.pct * 100, 1) + ' %') + '</td>' + (i === 0 ? '<td class="l wrap" rowspan="' + v.faces.length + '">' + (v.closed ? '<span class="chip ok">gesloten</span> ' : '<span class="chip ass">open</span> ') + v.theory + '</td>' : '') + '</tr>';
      });
    });
    $('tblVol').innerHTML = h;
    var p = '<tr><th class="l">Deel</th><th class="l">Volume</th><th class="l">Theorie / normartikel</th></tr>';
    o.parts.forEach(function (pid) { var z = o.zones.filter(function (q) { return q.part === pid; })[0]; p += '<tr><td class="l">' + PN[pid] + '</td><td class="l">V' + (z.vol + 1) + '</td><td class="l">' + (z.kind === 'roof' ? 'zadeldak, tabel 7.4a/b (7.2.5, 7.2.7) + c<sub>pi</sub> 7.2.9' : 'gevel, tabel 7.1 (7.2.2) + c<sub>pi</sub> 7.2.9') + '</td></tr>'; });
    o.canopies.forEach(function (e) { var c = e.gov; p += '<tr><td class="l">' + PN[e.part] + '</td><td class="l">V' + (e.vol + 1) + '</td><td class="l">open overkapping, tabel 7.7 (+ tabel 7.8 bij ' + c.geo.n + ' velden), fig. 7.17, φ ' + (o.P.can.phiMode === 'dir' ? 'per richting' : fmt(o.P.can.phi, 0) + ' %') + ', z<sub>e</sub> = ' + fmt(c.geo.ze, 2) + ' m</td></tr>'; });
    var fw = {}; o.free.forEach(function (z) { fw[z.part] = z; });
    Object.keys(fw).forEach(function (pid) { var z = fw[pid]; p += '<tr><td class="l">' + PN[pid] + '</td><td class="l">V' + (z.vol + 1) + '</td><td class="l">vrijstaande wand, tabel 7.9 (7.4.1), φ = ' + fmt(z.phi, 2) + ', l/h = ' + fmt(z.lh, 2) + '</td></tr>'; });
    $('tblParts').innerHTML = p;
  }

  /* ---------- samenvatting ---------- */
  function kpi(t, v, u, s, c) { return '<div class="kpi ' + (c || '') + '"><div class="t">' + t + '</div><div class="v">' + v + ' <span style="font-size:12px;font-weight:400">' + u + '</span></div><div class="s">' + s + '</div></div>'; }
  function rdesc(r) { return r ? DIRN[r.dir].short + ' · zone ' + r.zone + (r.caseId !== '-' ? ' · ' + r.caseId : '') + ' · ' + r.scen + ' (c<sub>pi</sub> ' + fmt(r.cpi, 2, true) + ')' : '–'; }
  function renderSummary() {
    var o = OUT, mode = SEL.mode === 'd' ? 'ontwerp' : 'karakteristiek';
    $('sumMode').innerHTML = 'Weergave: <b>' + mode + '</b>' + (o.vb.red < 1 ? ' (met tijdelijke reductie r)' : '') + '. Gesloten delen: omhullende over richtingen, dakgevallen en aangevinkte c<sub>pi</sub>-scenario\'s.';
    var h = '', hw = [], TR = [];
    var T = '<tr><th class="l">Deel</th><th class="l">Grootheid</th><th class="l">Maatgevend</th><th>Coëff.</th><th>c<sub>pi</sub></th><th>Karakteristiek</th><th>Ontwerp</th><th>Eenh.</th></tr>';
    function row(part, what, desc, c, cpi, vk, unit) { TR.push('<tr><td class="l">' + part + '</td><td class="l">' + what + '</td><td class="l wrap">' + desc + '</td><td>' + fmt(c, 3, true) + '</td><td>' + fmt(cpi, 3, true) + '</td><td class="' + cls(vk) + '">' + fmt(vk, unit === 'kN' ? 0 : 3, true) + '</td><td class="' + cls(vk) + '">' + fmt(vk * o.P.gammaQ * o.P.KFI, unit === 'kN' ? 0 : 3, true) + '</td><td>' + unit + '</td></tr>'); }
    o.parts.forEach(function (pid) {
      var e = o.partEnv[pid], t = o.partTot[pid], isRoof = pid[0] === 'R', r = o.vb.red;
      var card = kpi(PN[pid] + ': max. druk', fmt(k(e.maxLoc, 'wLoc'), 2, true), 'kN/m²', rdesc(e.maxLoc), 'pos') + kpi(PN[pid] + ': max. zuiging', fmt(k(e.minLoc, 'wLoc'), 2, true), 'kN/m²', rdesc(e.minLoc), 'neg');
      if (isRoof) h += card; else hw.push(card);
      row(PN[pid], 'lokale druk (' + cn(o.P.Aloc) + ')', rdesc(e.maxLoc), e.maxLoc.cpeLoc, e.maxLoc.cpi, e.maxLoc.wLoc * r, 'kN/m²');
      row(PN[pid], 'lokale zuiging (' + cn(o.P.Aloc) + ')', rdesc(e.minLoc), e.minLoc.cpeLoc, e.minLoc.cpi, e.minLoc.wLoc * r, 'kN/m²');
      row(PN[pid], 'globale zuiging (' + cn(e.minGlob.A) + ')', rdesc(e.minGlob), e.minGlob.cpeGlob, e.minGlob.cpi, e.minGlob.wGlob * r, 'kN/m²');
      if (isRoof) { if (t.max) row(PN[pid], 'totaal opwaarts F<sub>z</sub>', DIRN[t.max.dir].short + ' · ' + t.max.caseId + ' · ' + t.max.scen, null, null, t.max.F[2] * r, 'kN'); }
      else { if (t.max) row(PN[pid], 'totaal naar het vlak', DIRN[t.max.dir].short + ' · ' + t.max.scen + (t.max.Mbase !== null ? ' · M<sub>voet</sub> ' + fmt(t.max.Mbase * r, 0) + ' kNm' : ''), null, null, t.max.Fn * r, 'kN'); if (t.min) row(PN[pid], 'totaal van het vlak af', DIRN[t.min.dir].short + ' · ' + t.min.scen, null, null, t.min.Fn * r, 'kN'); }
    });
    o.canopies.forEach(function (e) {
      var c = e.gov, red = o.vb.red;
      h += kpi(PN[c.part] + ' (overkapping): lokaal opwaarts', fmt(k({ w: c.zMin.wMin, red: red, gF: o.P.gammaQ * o.P.KFI }, 'w'), 2, true), 'kN/m²', 'zone ' + c.zMin.name + ' · ' + window.WindUI.DIRN[c.dir].short + ' · φ = ' + fmt(c.P.phi, 0) + ' %', 'neg');
      h += kpi(PN[c.part] + ' (overkapping): totaal opwaarts', fmt(k({ w: c.aUp.Fz, red: red, gF: o.P.gammaQ * o.P.KFI }, 'w'), 0), 'kN', 'c<sub>f</sub> · fig. 7.17 ' + c.aUp.lay, 'neg');
      row(PN[c.part], 'lokaal c<sub>p,net</sub> neerwaarts', 'zone ' + c.zMax.name + ', veld ' + c.zMax.bay, c.zMax.cpMax, null, c.zMax.wMax * red, 'kN/m²');
      row(PN[c.part], 'lokaal c<sub>p,net</sub> opwaarts', 'zone ' + c.zMin.name + ', veld ' + c.zMin.bay, c.zMin.cpMin, null, c.zMin.wMin * red, 'kN/m²');
      row(PN[c.part], 'totaal F<sub>z</sub> opwaarts', 'fig. 7.17 – ' + c.aUp.lay, null, null, c.aUp.Fz * red, 'kN');
      row(PN[c.part], 'totaal F<sub>z</sub> neerwaarts', 'fig. 7.17 – ' + c.aDown.lay, null, null, c.aDown.Fz * red, 'kN');
    });
    var fw = {}; o.free.forEach(function (z) { if (!fw[z.part] || Math.abs(z.w) > Math.abs(fw[z.part].w)) fw[z.part] = z; });
    Object.keys(fw).forEach(function (pid) { var z = fw[pid]; hw.push(kpi(PN[pid] + ' (vrijstaand): max. ± netto', '±' + fmt(k({ w: z.w, red: o.vb.red, gF: o.P.gammaQ * o.P.KFI }, 'w'), 2), 'kN/m²', 'zone ' + z.name + ', c<sub>p,net</sub> = ' + fmt(z.cp, 2), 'pos')); row(PN[pid], 'netto ± (7.4)', 'zone ' + z.name + ' · φ = ' + fmt(z.phi, 2), z.cp, null, z.w * o.vb.red, 'kN/m²'); });
    $('kpiRoof').innerHTML = h || '<p class="small">Geen daken belast.</p>';
    $('kpiWall').innerHTML = mergeAP(hw).join('') || '<p class="small">Geen wanden belast.</p>';
    $('tblGov').innerHTML = T + mergeAP(TR).join('');
  }


  /* ---------- rapport per zone ---------- */
  var RPOS = [[0, '#fff0de'], [0.35, '#fdae61'], [0.7, '#e8552e'], [1, '#a50f15']], RNEG = [[0, '#e4eef8'], [0.35, '#8fbfe0'], [0.7, '#4575b4'], [1, '#23317a']];
  function hex2(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function rampC(st, t) { t = Math.max(0, Math.min(1, t)); for (var i = 0; i < st.length - 1; i++) if (t <= st[i + 1][0]) { var a = hex2(st[i][1]), b = hex2(st[i + 1][1]), f = (t - st[i][0]) / (st[i + 1][0] - st[i][0]); return 'rgb(' + a.map(function (v, k) { return Math.round(v + (b[k] - v) * f); }).join(',') + ')'; } return st[st.length - 1][1]; }
  function colW(w, m) { return Math.abs(w) < 1e-9 ? '#eeeeee' : w > 0 ? rampC(RPOS, w / m) : rampC(RNEG, -w / m); }
  function txtCol(w, m) { return Math.abs(w) / m > 0.6 ? '#fff' : '#1c2733'; }
  var LGN = 0;
  function renderReport() {
    var rd0 = $('r_dir').value;
    $('reportBox').innerHTML = reportHTML({ scen: $('r_scen').value, meas: $('r_meas').value, signs: $('r_sign').value === 'both' ? ['min', 'max'] : [$('r_sign').value], mode: $('r_mode').value, dirs: rd0 === 'all' ? ['R', 'L', 'A', 'P'] : [rd0], cases: [0, 1, 2, 3], walls: true });
  }
  function reportHTML(opts) {
    var o = OUT; if (!o) return;
    var rs = opts.scen, meas = opts.meas, signs = opts.signs || [opts.sign], mode = opts.mode, sign = signs[0] || 'min';
    var loc = meas === 'loc', up = sign === 'min', mf = o.vb.red * (mode === 'd' ? o.P.gammaQ * o.P.KFI : 1);
    var X = o.X, B = o.B, sp = o.spans;
    var wm = 0;
    o.rows.forEach(function (r) { if (r.scen === rs) wm = Math.max(wm, Math.abs(loc ? r.wLoc : r.wGlob)); });
    o.canopies.forEach(function (e) { WE.DIRS.forEach(function (d) { var c = e.byDir[d.id]; if (loc) c.zones.forEach(function (z) { wm = Math.max(wm, Math.abs(z.wMax), Math.abs(z.wMin)); }); else c.pitches.forEach(function (p) { wm = Math.max(wm, Math.abs(p.wMax), Math.abs(p.wMin)); }); }); });
    o.free.forEach(function (z) { wm = Math.max(wm, Math.abs(z.w)); });
    wm = (wm || 1) * mf;
    var legend = '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12px;margin:4px 0 8px"><span>' + fmt(-wm, 2) + '</span><svg width="220" height="12" viewBox="0 0 220 12" aria-hidden="true"><defs><linearGradient id="lg' + (++LGN) + '">' + RNEG.slice().reverse().map(function (s2) { return '<stop offset="' + ((1 - s2[0]) * 50) + '%" stop-color="' + s2[1] + '"/>'; }).concat(RPOS.map(function (s2) { return '<stop offset="' + (50 + s2[0] * 50) + '%" stop-color="' + s2[1] + '"/>'; })).join('') + '</linearGradient></defs><rect width="220" height="12" rx="3" fill="url(#lg' + LGN + ')"/></svg><span>' + fmt(wm, 2, true) + ' kN/m²</span><span class="small">· blauw = zuiging / opwaarts · rood = druk / neerwaarts</span></div>';
    function lab(x, y, w, h, lines, wv) {
      var fs = 11, lh = 13, need = lines.length * lh + 2, maxw = Math.max.apply(null, lines.map(function (l) { return l.replace(/<[^>]+>/g, '').length; })) * 5.6;
      var c = txtCol(wv, wm);
      if (w >= maxw && h >= need) { var y0 = y + h / 2 - (lines.length - 1) * lh / 2 + 4; return lines.map(function (l, i) { return '<text x="' + (x + w / 2) + '" y="' + (y0 + i * lh) + '" text-anchor="middle" font-size="' + fs + '" fill="' + c + '">' + l + '</text>'; }).join(''); }
      var one = lines.join(' · ').replace(/<tspan font-size="8" dy="2">f<\/tspan><tspan dy="-2">/g, 'f').replace(/<\/tspan>/g, '').replace(/<tspan[^>]*>/g, ''), len = one.length * 5.6;
      if (h >= len + 4 && w >= 12) { var cx = x + w / 2 + 4, cy = y + h / 2; return '<text x="' + cx + '" y="' + cy + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" text-anchor="middle" font-size="' + fs + '" fill="' + c + '">' + one + '</text>'; }
      if (w >= len + 4 && h >= 12) return '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4) + '" text-anchor="middle" font-size="' + fs + '" fill="' + c + '">' + one + '</text>';
      var first = lines[0].replace(/<tspan[^>]*>/g, '').replace(/<\/tspan>/g, '').split(' ')[0];
      if (w >= 10 && h >= 12) return '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4) + '" text-anchor="middle" font-size="10" font-weight="700" fill="' + c + '">' + first + '</text>';
      return '';
    }
    function planSVG(dir, cid, sgn, canopyOnly) {
      var W = 680, mg = 46, sc = (W - 2 * mg) / X[3], H = B * sc + 2 * mg, ox = mg, oy = mg;
      var PX = function (x) { return ox + x * sc; }, PY = function (y) { return oy + (B - y) * sc; };
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,Arial">';
      s += '<rect x="' + PX(0) + '" y="' + PY(B) + '" width="' + X[3] * sc + '" height="' + B * sc + '" fill="#f7f8fa" stroke="#bbb"/>';
      sp.forEach(function (q) { if (q.rem > 0) s += '<rect x="' + PX(q.x0) + '" y="' + PY(q.yr[1]) + '" width="' + q.w * sc + '" height="' + (q.yr[1] - q.yr[0]) * sc + '" fill="none" stroke="#9db4d6" stroke-dasharray="5 4"/><text x="' + PX(q.xm) + '" y="' + PY((q.yr[0] + q.yr[1]) / 2) + '" text-anchor="middle" font-size="12" fill="#2b5fb3">dak ' + q.name + ' afwezig</text>'; });
      var rows = [];
      o.zones.filter(function (z) { return !canopyOnly && z.kind === 'roof' && z.dir === dir; }).forEach(function (z) {
        var rr = z.res[cid], p = rr && rr.per[rs]; if (!p) return;
        var w = (loc ? p.wLoc : p.wGlob) * mf, cpe = loc ? rr.cLoc : rr.cGlob;
        var x = PX(z.x0), y = PY(z.y1), ww = (z.x1 - z.x0) * sc, hh = (z.y1 - z.y0) * sc;
        s += '<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + hh + '" fill="' + colW(w, wm) + '" stroke="#34495e" stroke-width="0.8"/>';
        s += lab(x, y, ww, hh, ['<tspan font-weight="700">' + z.name + '</tspan> ' + fmt(cpe, 2, true) + ' / ' + fmt(p.cpi, 2, true), fmt(w, 2, true)], w);
        rows.push([PN[z.part] + ' (' + z.pitch + ')', z.name, z.A, cpe, p.cpi, w]);
      });
      o.canopies.forEach(function (e) {
        if (!sgn) return;
        var c = e.byDir[dir], up = sgn === 'min', sTxt = up ? 'opwaarts' : 'neerwaarts';
        if (loc) c.zones.forEach(function (z) {
          var w = (up ? z.wMin : z.wMax) * mf, cp = up ? z.cpMin : z.cpMax;
          var x = PX(e.x0 + z.x0), y = PY(e.y0 + z.y1), ww = (z.x1 - z.x0) * sc, hh = (z.y1 - z.y0) * sc;
          s += '<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + hh + '" fill="' + colW(w, wm) + '" stroke="#34495e" stroke-width="0.8"/>';
          s += lab(x, y, ww, hh, ['<tspan font-weight="700">' + z.name + '</tspan> ' + fmt(cp, 2, true), fmt(w, 2, true)], w);
          rows.push(['Overkapping ' + (o.canopies.length > 1 ? o.spans[e.span].name + ' ' : '') + sTxt + (c.geo.n > 1 ? ', veld ' + z.bay : '') + ' (' + z.pitch + ')', z.name, z.A, cp, null, w]);
        });
        else c.pitches.forEach(function (pt) {
          var Bb = c.bays[pt.bay - 1], x0 = pt.pitch === 'L' ? Bb.x0 : Bb.xm, x1 = pt.pitch === 'L' ? Bb.xm : Bb.x1;
          var w = (up ? pt.wMin : pt.wMax) * mf, cf = up ? pt.cfMin : pt.cfMax, F = (up ? pt.FMin : pt.FMax) * mf;
          var x = PX(e.x0 + x0), y = PY(e.y0 + c.geo.b), ww = (x1 - x0) * sc, hh = c.geo.b * sc;
          s += '<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + hh + '" fill="' + colW(w, wm) + '" stroke="#34495e" stroke-width="0.8"/>';
          s += lab(x, y, ww, hh, ['c<tspan font-size="8" dy="2">f</tspan><tspan dy="-2">·ψ ' + fmt(cf, 2, true) + '</tspan>', 'w ' + fmt(w, 2, true), 'F ' + fmt(F, 0, true) + ' kN'], w);
          rows.push(['Overkapping ' + (o.canopies.length > 1 ? o.spans[e.span].name + ' ' : '') + sTxt + (c.geo.n > 1 ? ', veld ' + pt.bay : '') + ' (' + pt.pitch + ')', 'c_f', pt.A, cf, null, w]);
        });
      });
      [[0, '1'], [X[1], '7'], [X[2], '13'], [X[3], '14']].forEach(function (q) { s += '<text x="' + PX(q[0]) + '" y="' + (oy - 6) + '" text-anchor="middle" font-size="11" fill="#555">as ' + q[1] + '</text>'; });
      s += '<text x="' + (ox + X[3] * sc + 4) + '" y="' + (PY(0) + 4) + '" font-size="11" fill="#555">A</text><text x="' + (ox + X[3] * sc + 4) + '" y="' + (PY(B) + 4) + '" font-size="11" fill="#555">P</text>';
      // windpijl
      var dv = WE.DIRS.filter(function (q) { return q.id === dir; })[0].vec, arr = '';
      [0.25, 0.5, 0.75].forEach(function (f) {
        var tx, ty, fx, fy;
        if (dir === 'L') { tx = ox - 4; ty = oy + f * B * sc; fx = tx - 34; fy = ty; }
        else if (dir === 'R') { tx = ox + X[3] * sc + 4; ty = oy + f * B * sc; fx = tx + 34; fy = ty; }
        else if (dir === 'A') { tx = ox + f * X[3] * sc; ty = oy + B * sc + 4; fx = tx; fy = ty + 34; }
        else { tx = ox + f * X[3] * sc; ty = oy - 4; fx = tx; fy = ty - 34; }
        var ang = Math.atan2(ty - fy, tx - fx), hx = tx - 9 * Math.cos(ang), hy = ty - 9 * Math.sin(ang);
        arr += '<line x1="' + fx + '" y1="' + fy + '" x2="' + hx + '" y2="' + hy + '" stroke="#138a8a" stroke-width="3"/><polygon points="' + tx + ',' + ty + ' ' + (hx - 5 * Math.sin(ang)) + ',' + (hy + 5 * Math.cos(ang)) + ' ' + (hx + 5 * Math.sin(ang)) + ',' + (hy - 5 * Math.cos(ang)) + '" fill="#138a8a"/>';
      });
      s += arr + '<text x="' + (dir === 'L' ? 6 : dir === 'R' ? W - 6 : W / 2) + '" y="' + (dir === 'A' ? H - 4 : dir === 'P' ? 12 : oy - 26) + '" text-anchor="' + (dir === 'L' ? 'start' : dir === 'R' ? 'end' : 'middle') + '" font-size="12" font-weight="700" fill="#0d6e6e">WIND</text>';
      return { svg: s + '</svg>', rows: rows };
    }
    function wallSVG(dir, pid, zs, isFree) {
      var w = o.walls[pid], L = w.kind === 'end' ? B : (o.spans[w.span] ? 0 : 0), x0 = 0, x1 = B, Hm;
      var prof;
      if (w.kind === 'end') { x0 = 0; x1 = B; Hm = w.H; prof = function () { return w.H; }; }
      else {
        var vol = o.vols[zs[0].vol], span0 = isFree ? o.spans[w.span] : null;
        x0 = isFree ? span0.x0 : Math.min.apply(null, zs.map(function (z) { return z.a0; }));
        x1 = isFree ? span0.x1 : Math.max.apply(null, zs.map(function (z) { return z.a1; }));
        Hm = Math.max.apply(null, o.spans.map(function (q) { return q.top; }));
        prof = function (x) { for (var i = 0; i < 3; i++) { var q = o.spans[i]; if (x <= q.x1 + 1e-9) { if (q.luifel) { var dd = q.w / q.nb, u = (x - q.x0) - Math.floor(Math.min(x - q.x0, q.w - 1e-9) / dd) * dd; return q.zl + Math.min(u, dd - u) * Math.tan(o.P.can.alpha * Math.PI / 180); } return x <= q.xm ? q.zl + (x - q.x0) / (q.xm - q.x0) * (q.zt - q.zl) : q.zt + (x - q.xm) / (q.x1 - q.xm) * (q.zr - q.zt); } } return 0; };
      }
      var Wd = 420, sc = (Wd - 20) / (x1 - x0), Hd = Hm * sc + 26, PX = function (x) { return 10 + (x - x0) * sc; }, PZ = function (z) { return Hd - 14 - z * sc; };
      var s = '<svg viewBox="0 0 ' + Wd + ' ' + Hd + '" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,Arial">', rows = [];
      zs.forEach(function (z) {
        var a0 = isFree ? (w.kind === 'end' ? z.a0 : x0 + z.a0) : z.a0, a1 = isFree ? (w.kind === 'end' ? z.a1 : x0 + z.a1) : z.a1, wv, l1, l2, cpe, cpi;
        if (isFree) { wv = z.w * mf; l1 = '<tspan font-weight="700">' + z.name + '</tspan> ±' + fmt(z.cp, 2); l2 = '±' + fmt(wv, 2); cpe = z.cp; cpi = null; }
        else { var rr = z.res['-'], p = rr.per[rs]; if (!p) return; wv = (loc ? p.wLoc : p.wGlob) * mf; cpe = loc ? rr.cLoc : rr.cGlob; cpi = p.cpi; l1 = '<tspan font-weight="700">' + z.name + '</tspan> ' + fmt(cpe, 2, true) + ' / ' + fmt(cpi, 2, true); l2 = fmt(wv, 2, true); }
        var pts = [[a0, 0], [a1, 0]], xs = [a1];
        if (w.kind !== 'end') { for (var k = 0; k <= 24; k++) { var xx = a0 + (a1 - a0) * k / 24; xs.push(xx); } xs = xs.sort(function (p1, p2) { return p2 - p1; }); xs.forEach(function (xx) { pts.push([xx, prof(xx)]); }); }
        else { pts.push([a1, w.H], [a0, w.H]); }
        s += '<polygon points="' + pts.map(function (q) { return PX(q[0]) + ',' + PZ(q[1]); }).join(' ') + '" fill="' + colW(wv, wm) + '" stroke="#34495e" stroke-width="0.8"/>';
        var hz = (w.kind === 'end' ? w.H : prof((a0 + a1) / 2)) * 0.8;
        s += lab(PX(a0), PZ(hz), (a1 - a0) * sc, hz * sc, [l1, l2], wv);
        rows.push([PN[pid] + (isFree ? ' (vrijstaand)' : ''), z.name, z.A, cpe, cpi, wv]);
      });
      if (pid === 'W0' && o.P.fase2.on && w.on) { var f = o.P.fase2, zb = Math.max(0, w.H - f.H); s += '<rect x="' + PX(f.y0) + '" y="' + PZ(w.H) + '" width="' + f.L * sc + '" height="' + (w.H - zb) * sc + '" fill="#fff" fill-opacity="0.55" stroke="#d62728" stroke-dasharray="4 3"/><text x="' + PX(f.y0 + f.L / 2) + '" y="' + (PZ(w.H) + 12) + '" text-anchor="middle" font-size="10" fill="#d62728">opening</text>'; }
      s += '<line x1="6" y1="' + PZ(0) + '" x2="' + (Wd - 6) + '" y2="' + PZ(0) + '" stroke="#555"/>';
      var axn = function (x) { var nm = ['1', '7', '13', '14']; for (var i = 0; i < 4; i++) if (Math.abs(o.X[i] - x) < 0.05) return 'as ' + nm[i]; return 'x = ' + fmt(x, 2); };
      s += '<text x="10" y="' + (Hd - 2) + '" font-size="10" fill="#555">' + (w.kind === 'end' ? 'as A' : axn(x0)) + '</text><text x="' + (Wd - 10) + '" y="' + (Hd - 2) + '" text-anchor="end" font-size="10" fill="#555">' + (w.kind === 'end' ? 'as P' : axn(x1)) + '</text>';
      return { svg: s + '</svg>', rows: rows };
    }
    function dedup(list) { var n = {}, out = []; list.forEach(function (t) { if (!n[t]) out.push(t); n[t] = (n[t] || 0) + 1; }); return out.map(function (t) { return t.replace('@@', n[t] > 1 ? ' (' + n[t] + '×)' : ''); }).join(''); }
    function table(rows) {
      return '<div class="tablewrap"><table><tr><th class="l">Vlak</th><th>Zone</th><th>A [m²]</th><th>c<sub>pe</sub> / c<sub>p,net</sub> / c<sub>f</sub></th><th>c<sub>pi</sub></th><th>w [kN/m²]</th></tr>' + dedup(rows.map(function (r) { return '<tr><td class="l">' + r[0] + '</td><td>' + r[1] + '@@</td><td>' + fmt(r[2], 1) + '</td><td>' + (r[4] !== null ? '<span class="small">' + cn(loc ? o.P.Aloc : r[2]) + '</span> ' : '') + (r[1] === 'A' || r[1] === 'B' || r[1] === 'C' || r[1] === 'D' ? (String(r[0]).indexOf('vrijstaand') >= 0 ? '±' + fmt(r[3], 2) : fmt(r[3], 3, true)) : fmt(r[3], 3, true)) + '</td><td>' + (r[4] === null ? '–' : fmt(r[4], 2, true)) + '</td><td class="' + cls(r[5]) + '">' + (String(r[0]).indexOf('vrijstaand') >= 0 ? '±' + fmt(Math.abs(r[5]), 3) : fmt(r[5], 3, true)) + '</td></tr>'; })) + '</table></div>';
    }
    var scName = { S1: 'S1 gesloten gebouw', S2: 'S2 gesloten gebouw', S3: 'S3 openingen (7.2.9)', S4: 'S4 handmatig', S5: 'S5 open grensvlak (WInt)' }[rs];
    var h = '<p class="small"><b>Instellingen:</b> ' + scName + ' · ' + (loc ? 'lokale' : 'globale') + ' coëfficiënten · overkapping ' + (signs.length ? signs.map(function (q) { return q === 'min' ? 'opwaarts' : 'neerwaarts'; }).join(' en ') : 'niet weergegeven') + ' · ' + (mode === 'd' ? 'ontwerpwaarden (γ<sub>Q</sub>·K<sub>FI</sub>·r)' : 'karakteristieke waarden') + '. Labels: zone, ' + (loc ? cn(o.P.Aloc) : cn(10)) + ' / c<sub>pi</sub>, daaronder w in kN/m².</p>' + legend;
    var cvol = o.vols.filter(function (v) { return v.closed; })[0];
    WE.DIRS.filter(function (d) { return opts.dirs.indexOf(d.id) >= 0; }).forEach(function (d) {
      var wallsDone = false, canDone = false, firstCase = null;
      var cases = (d.id === 'L' || d.id === 'R') ? ['FGH−/IJ−', 'FGH−/IJ+', 'FGH+/IJ−', 'FGH+/IJ+'] : ['θ=90°'];
      var det = cvol ? o.cpiDetail[cvol.i][d.id] : null, cpiTxt = det ? ' · c<sub>pi</sub> (' + rs + ') = ' + fmt(det.cpiS[rs], 3, true) : '';
      var phiTxt = o.canopies.length ? ' · φ overkapping = ' + fmt(o.canopies[0].byDir[d.id].P.phi, 0) + ' %' : '';
      cases.forEach(function (cid, ci) {
        if (cases.length > 1 && opts.cases.indexOf(ci) < 0) return;
        if (firstCase === null) firstCase = ci + 1;
        var pl = planSVG(d.id, cid, signs[0] || null, false), rows = pl.rows.slice();
        h += '<div class="rcase"><h3>' + d.name + ' – ' + (cid === 'θ=90°' ? 'θ = 90° (één geval)' : 'dakgeval ' + (ci + 1) + '/4: ' + cid) + '</h3><p class="small">' + cpiTxt.replace(/^ · /, '') + phiTxt + '</p><div class="rgrid"><div>' + pl.svg + '</div><div>';
        var wallHtml = '';
        if (opts.walls && !wallsDone) {
          wallsDone = true;
          var byPart = {};
          o.zones.filter(function (z) { return z.kind !== 'roof' && z.dir === d.id; }).forEach(function (z) { (byPart[z.part] = byPart[z.part] || []).push(z); });
          var fparts = {}; o.free.forEach(function (z) { (fparts[z.part] = fparts[z.part] || []).push(z); });
          var figs = '';
          Object.keys(byPart).forEach(function (pid) { var r = wallSVG(d.id, pid, byPart[pid], false); figs += '<figure>' + r.svg + '<figcaption>' + PN[pid] + ' (aanzicht; ' + (o.walls[pid].kind === 'end' ? 'as A links, as P rechts' : 'as 1-zijde links') + ')</figcaption></figure>'; rows = rows.concat(r.rows); });
          Object.keys(fparts).forEach(function (pid) { var r = wallSVG(d.id, pid, fparts[pid], true); figs += '<figure>' + r.svg + '<figcaption>' + PN[pid] + ' – vrijstaande wand (7.4)</figcaption></figure>'; rows = rows.concat(r.rows); });
          if (figs) wallHtml = '<div class="rwalls">' + figs + '</div>';
        } else wallHtml = '';
        var canHtml = '';
        if (signs.length > 1 && o.canopies.length) {
          if (!canDone) { canDone = true; var p2 = planSVG(d.id, cid, signs[1], true); rows = rows.concat(p2.rows); canHtml = '<div class="rcanfig"><figure>' + p2.svg + '<figcaption>Overkapping – ' + (signs[1] === 'min' ? 'opwaarts' : 'neerwaarts') + ' (onafhankelijk van het dakgeval)</figcaption></figure></div>'; }
          else canHtml = '';
        }
        h += table(rows) + '</div></div>' + canHtml + wallHtml + '</div>';
      });
    });
    return h;
  }
  /* ---------- geometrie ---------- */
  /* ---------- belastingen per constructie-element ---------- */
  var SCN = { S1: 'S1 gesloten (+0,2)', S2: 'S2 gesloten (−0,3)', S3: 'S3 openingen (7.2.9)', S4: 'S4 handmatig', S5: 'S5 open grensvlak (WInt)' };
  function eopt(id, list, pref) {
    var el = $(id), cur = el.value, vals = list.map(function (o) { return o[0]; });
    el.innerHTML = list.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
    el.value = vals.indexOf(cur) >= 0 ? cur : (pref !== undefined && vals.indexOf(pref) >= 0 ? pref : (vals[0] || ''));
    el.disabled = list.length < 2 && id === 'e_case';
  }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }
  // identieke tabelrijen samenvoegen: items [label, rij-HTML met @@ op de plaats van het label]
  function mergeRows(items) {
    var G = [], idx = {};
    items.forEach(function (it) {
      var gov = it[1].indexOf(' class="gov"') >= 0, key = it[1].replace(' class="gov"', '');
      if (!(key in idx)) { idx[key] = G.length; G.push({ key: key, labels: [], gov: false }); }
      var g = G[idx[key]]; g.labels.push(it[0]); g.gov = g.gov || gov;
    });
    return G.map(function (g) { return (g.gov ? g.key.replace('<tr', '<tr class="gov"') : g.key).replace('@@', g.labels.join(' / ')); }).join('');
  }
  // gevel P weglaten als ze (gespiegeld) identiek is aan gevel A: rijen/kaarten als HTML-strings
  function mergeAP(list) {
    var dA = DIRN.A.short, dP = DIRN.P.short;
    function swap(t) { return t.split(dP).join('\u0001').split(dA).join(dP).split('\u0001').join(dA); }
    [0, 1, 2].forEach(function (i) {
      var nA = PN['A' + i], nP = PN['P' + i];
      var ia = [], ip = [];
      list.forEach(function (t, j) { if (t === null) return; if (t.indexOf(nA) >= 0) ia.push(j); else if (t.indexOf(nP) >= 0) ip.push(j); });
      if (!ia.length || ia.length !== ip.length) return;
      if (!ia.every(function (j, n) { return swap(list[ip[n]].split(nP).join(nA)) === list[j]; })) return;
      ia.forEach(function (j) { list[j] = list[j].split(nA).join('Gevel A/P · ' + nA.split(' · ')[1]).split(dA).join('\u0001').split(dP).join('Van as P/A ∥ gevel').split('\u0001').join('Van as A/P ∥ gevel'); });
      ip.forEach(function (j) { list[j] = null; });
    });
    return list.filter(function (t) { return t !== null; });
  }
  var EV = null, EVC = { out: null };
  function elOf(mode) { if (!EL || EL.err || !mode || mode === 'A') return EL; if (EVC.out !== OUT) EVC = { out: OUT }; return EVC[mode] || (EVC[mode] = WEL.compute(OUT, { cpe: mode })); }
  var CPEB = { A: 'c<sub>pe</sub> volgens belaste oppervlakte (fig. 7.2): A ≥ 10 m² → c<sub>pe,10</sub>, A ≤ 1 m² → c<sub>pe,1</sub>, daartussen logaritmisch; spanten en kolommen met de zoneoppervlakte, gordingen, regels en gevelkolommen met A = L·h.o.h.', '10': 'c<sub>pe,10</sub> voor alle elementen', '1': 'c<sub>pe,1</sub> (lokaal) voor alle elementen – zeer veilig' };
  function elemSel() {
    var E = EV || EL, d = $('e_dir').value || 'R', cc = E.closedCombos(d).filter(Boolean);
    eopt('e_case', uniq(cc.map(function (c) { return c.cid; })).map(function (c) { return [c, c === 'θ=90°' ? 'θ = 90° (wind ∥ nok)' : c]; }), 'FGH−/IJ−');
    eopt('e_scen', uniq(cc.map(function (c) { return c.scen; })).map(function (s) { return [s, SCN[s]]; }), 'S3');
    var hasC = OUT.canopies.length > 0; $('e_sign').disabled = $('e_lay').disabled = !hasC;
    var closed = cc.filter(function (c) { return c.cid === $('e_case').value && c.scen === $('e_scen').value; })[0] || null;
    return { dir: d, closed: closed, can: hasC ? { sign: $('e_sign').value, lay: $('e_lay').value } : null };
  }
  function elemSVG(T, fr, fac) {
    var o = OUT, sp = o.spans, E = EV || EL, xmax = Math.max.apply(null, E.lines.map(function (l) { return l.x; }));
    var zmax = Math.max.apply(null, sp.map(function (s) { return s.top; })), sc = 860 / xmax, ml = 132, mr = 96, mt = 150, mb = 80, Wd = ml + xmax * sc + mr, Hd = mt + zmax * sc + mb;
    var X = function (x) { return ml + x * sc; }, Y = function (z) { return mt + (zmax - z) * sc; }, f1 = function (v) { return fmt(v, 1); };
    function zAt(s, x) {
      if (s.nb > 1 || s.luifel) { var d = s.w / s.nb, u = (x - s.x0) - Math.floor(Math.min(x - s.x0, s.w - 1e-9) / d) * d, t = (s.zt - s.zl) / (d / 2); return s.zl + Math.min(u, d - u) * t; }
      return x <= s.xm ? s.zl + (s.zt - s.zl) * (x - s.x0) / (s.xm - s.x0) : s.zt + (s.zr - s.zt) * (x - s.xm) / (s.x1 - s.xm);
    }
    function prof(s, a, b, n) { var pts = []; for (var i = 0; i <= n; i++) { var x = a + (b - a) * i / n; pts.push([x, zAt(s, Math.min(x, s.x1 - 1e-9))]); } return pts; }
    var POS = '#c2410c', NEG = '#1d4ed8', h = '';
    function arrow(x1, y1, x2, y2, col, w) {
      var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L, a = 6;
      return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + (x2 - ux * a).toFixed(1) + '" y2="' + (y2 - uy * a).toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1.2) + '"/><polygon points="' + x2.toFixed(1) + ',' + y2.toFixed(1) + ' ' + (x2 - ux * a - uy * 3.2).toFixed(1) + ',' + (y2 - uy * a + ux * 3.2).toFixed(1) + ' ' + (x2 - ux * a + uy * 3.2).toFixed(1) + ',' + (y2 - uy * a - ux * 3.2).toFixed(1) + '" fill="' + col + '"/>';
    }
    function txt(x, y, t, anc, col, sz, bold) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + (sz || 11) + '" text-anchor="' + (anc || 'middle') + '" fill="' + (col || '#1f2933') + '"' + (bold ? ' font-weight="600"' : '') + '>' + t + '</text>'; }
    // grond, wanden, kolommen, dakprofiel
    h += '<line x1="' + (ml - 60) + '" y1="' + Y(0) + '" x2="' + (Wd - mr + 60) + '" y2="' + Y(0) + '" stroke="#8a96a3" stroke-width="1.5"/>';
    ['W0', 'W1', 'W2', 'W3'].forEach(function (id, k) { var w = o.walls[id]; if (w.on) h += '<rect x="' + (X(o.X[k]) - 3) + '" y="' + Y(w.H) + '" width="6" height="' + (w.H * sc) + '" fill="#cbd5e1"/>'; });
    E.lines.forEach(function (l) {
      var zt = 0; sp.forEach(function (s) { if (Math.abs(s.x0 - l.x) < 1e-6 || Math.abs(s.x1 - l.x) < 1e-6 || (l.x > s.x0 && l.x < s.x1)) zt = Math.max(zt, zAt(s, Math.min(l.x, s.x1 - 1e-9))); });
      h += '<line x1="' + X(l.x) + '" y1="' + Y(0) + '" x2="' + X(l.x) + '" y2="' + Y(zt) + '" stroke="#334155" stroke-width="2"/>';
      h += txt(X(l.x), Hd - 8, l.name.replace('as 13–14 kolom', 'k'), 'middle', '#5f6b7a', 10);
    });
    sp.forEach(function (s) { var pts = prof(s, s.x0, s.x1, 8 * Math.max(1, s.nb)); h += '<polyline points="' + pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '" fill="none" stroke="' + (s.roofOn ? '#334155' : '#94a3b8') + '" stroke-width="' + (s.roofOn ? 2.2 : 1.2) + '"' + (s.roofOn ? '' : ' stroke-dasharray="5 4"') + '/>'; if (!s.roofOn) h += txt(X(s.xm), Y(s.top) - 6, 'dak verwijderd', 'middle', '#94a3b8', 10.5); });
    // daklasten (band boven het dak)
    var qm = 1e-9; T.segs.forEach(function (g) { qm = Math.max(qm, Math.abs(g.q)); }); T.pts.forEach(function (p) { qm = Math.max(qm, Math.abs(p.q)); });
    function band(span, a, b, q, light, label, sub, lpos) {
      var s = sp[span], pts = prof(s, a, b, 6), hh = Math.abs(q) / qm * 40, col = q >= 0 ? POS : NEG;
      var top = pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + (Y(p[1]) - 4 - hh).toFixed(1); }), bot = pts.slice().reverse().map(function (p) { return X(p[0]).toFixed(1) + ',' + (Y(p[1]) - 4).toFixed(1); });
      var r = '<polygon points="' + top.concat(bot).join(' ') + '" fill="' + col + '" fill-opacity="' + (light ? 0.10 : 0.18) + '" stroke="' + col + '" stroke-opacity="0.6" stroke-width="0.8"/>';
      var n = Math.max(1, Math.round((b - a) * sc / 26));
      if (!light) for (var i = 0; i < n; i++) { var x = a + (b - a) * (i + 0.5) / n, y0 = Y(zAt(s, x)) - 4; r += q >= 0 ? arrow(X(x), y0 - hh, X(x), y0, col) : arrow(X(x), y0, X(x), y0 - hh, col); }
      var wd = (b - a) * sc, xm = a + (b - a) * (lpos === undefined ? 0.5 : lpos), yt = Y(zAt(s, xm)) - 4 - hh;
      if (label && wd >= 70) { r += txt(X(xm), yt - (sub ? 15 : 5), label, 'middle', col, 9.5, true); if (sub) r += txt(X(xm), yt - 5, sub, 'middle', '#5f6b7a', 8.5); }
      else if (label) r += '<text transform="translate(' + (X(xm) + 3).toFixed(1) + ',' + (yt - 4).toFixed(1) + ') rotate(-90)" font-size="9" font-weight="600" text-anchor="start" fill="' + col + '">' + label + '</text>';
      return r;
    }
    T.segs.forEach(function (g) { var wd = (g.x1 - g.x0) * sc; h += band(g.span, g.x0, g.x1, g.q * fac, false, fmt(g.q * fac, 2, true) + ' kN/m', (wd > 230 ? 'w ' + fmt(g.w * fac, 3, true) + ' kN/m² · ' + g.cl + ' ' + fmt(g.cpe, 2, true) + ' · c_pi ' + fmt(g.cpi, 2, true) : wd > 110 ? 'w ' + fmt(g.w * fac, 3, true) + ' kN/m²' : '')); });
    T.pts.forEach(function (p) {
      h += band(p.span, p.x0, p.x1, p.q * fac, true, fmt(p.q * fac, 2, true) + ' kN/m', 'w ' + fmt(p.w * fac, 3, true) + ' kN/m²', p.pitch === 'L' ? 0.2 : 0.8);
      var s = sp[p.span], y0 = Y(zAt(s, p.x)) - 4, col = p.F >= 0 ? POS : NEG, L = 46;
      h += p.F >= 0 ? arrow(X(p.x), y0 - L, X(p.x), y0, col, 2.4) : arrow(X(p.x), y0, X(p.x), y0 - L, col, 2.4);
      h += txt(X(p.x) + (p.pitch === 'L' ? 6 : -6), y0 - L + 9, 'F = ' + fmt(p.F * fac, 1, true) + ' kN', p.pitch === 'L' ? 'start' : 'end', col, 9.5, true);
    });
    // kolommen kopgevels
    var cm = 1e-9; T.cols.forEach(function (c) { c.segs.forEach(function (g) { cm = Math.max(cm, Math.abs(g.q)); }); });
    T.cols.forEach(function (c) {
      var side = c.side < 0 ? -1 : 1, x0 = X(c.x) + side * 6;
      c.segs.forEach(function (g) {
        var ww = Math.abs(g.q) / cm * 44, col = g.q * side <= 0 ? POS : NEG, xa = x0, xb = x0 + side * ww; // kleur: druk (rood) / zuiging (blauw)
        if (ww > 0.5) {
          h += '<rect x="' + Math.min(xa, xb).toFixed(1) + '" y="' + Y(g.z1).toFixed(1) + '" width="' + ww.toFixed(1) + '" height="' + ((g.z1 - g.z0) * sc).toFixed(1) + '" fill="' + col + '" fill-opacity="0.18" stroke="' + col + '" stroke-opacity="0.6" stroke-width="0.8"/>';
          var n = Math.max(1, Math.round((g.z1 - g.z0) * sc / 22));
          for (var i = 0; i < n; i++) { var yy = Y(g.z0 + (g.z1 - g.z0) * (i + 0.5) / n); h += g.q >= 0 ? arrow(Math.min(xa, xb), yy, Math.max(xa, xb), yy, col) : arrow(Math.max(xa, xb), yy, Math.min(xa, xb), yy, col); }
        }
        if (Math.abs(g.q) > 1e-9) h += txt(xb + side * 4, Y((g.z0 + g.z1) / 2) + 3, fmt(g.q * fac, 2, true) + ' kN/m', side < 0 ? 'end' : 'start', col, 9.5, true);
        else if (g.z1 - g.z0 > 1.5) h += txt(x0 + side * 4, Y((g.z0 + g.z1) / 2) + 3, 'opening · 0 kN/m', side < 0 ? 'end' : 'start', '#5f6b7a', 9);
      });
    });
    // reacties
    E.lineOrder.forEach(function (i) {
      var l = E.lines[i], V = T.V[i] * fac, Hb = T.Hb[i] * fac, x = X(l.x), y = Y(0) + 4;
      if (Math.abs(V) > 0.05) { var col = V >= 0 ? POS : NEG; h += V >= 0 ? arrow(x, y, x, y + 30, col, 2) : arrow(x, y + 30, x, y, col, 2); h += txt(x + 5, y + 44, 'V ' + f1(V) + ' kN', 'middle', col, 9.5, true); }
      if (Math.abs(Hb) > 0.05) { var c2 = '#475569'; h += Hb >= 0 ? arrow(x - 26, y + 10, x - 4, y + 10, c2) : arrow(x - 4, y + 10, x - 26, y + 10, c2); h += txt(x - 30, y + 13, 'H ' + f1(Hb) + ' kN', 'end', c2, 9); }
    });
    h += txt(8, 16, 'Spant ' + fr.name + ' · y = ' + fmt(fr.y, 3) + ' m · invloedsbreedte ' + fmt(fr.dy, 3) + ' m', 'start', '#1f2933', 12, true);
    h += txt(8, 32, 'Σ H op spantniveau = ' + fmt(T.Htop * fac, 1, true) + ' kN (+ = richting as 14) · Σ V = ' + fmt(T.Vsum * fac, 1, true) + ' kN · lijnlasten q in kN/m (⊥ dak, per m), puntlasten F en reacties in kN', 'start', '#5f6b7a', 10);
    return '<svg viewBox="0 0 ' + Wd.toFixed(0) + ' ' + Hd.toFixed(0) + '" role="img" aria-label="Belastingen en reacties spant ' + fr.name + '" font-family="system-ui,Segoe UI,Arial,sans-serif">' + h + '</svg>';
  }
  function elemReport(r) {
    if (!EL || EL.err) return '<p class="small">Belastingen per element niet beschikbaar</p>';
    EV = elOf($('e_cpe').value); var E = EV, O = OUT, P = O.P, fac = O.vb.red * (r.mode === 'd' ? P.gammaQ * P.KFI : 1), un = r.mode === 'd' ? 'ontwerp' : 'karakteristiek';
    var k = Math.min(E.frames.length - 1, Math.max(0, parseInt(r.frame, 10) || 0)), CIDS = ['FGH−/IJ−', 'FGH−/IJ+', 'FGH+/IJ−', 'FGH+/IJ+'];
    var signs = O.canopies.length ? (r.signs.length ? r.signs : ['min']) : [null];
    var h = '<p class="small">Spant ' + E.frames[k].name + ' (y = ' + fmt(E.frames[k].y, 3) + ' m) · ' + SCN[r.scen] + ' · waarden ' + un + ' · ' + CPEB[E.mode] + '.</p>';
    r.dirs.forEach(function (d) {
      var cc = E.closedCombos(d).filter(Boolean), lr = d === 'L' || d === 'R';
      var cids = !cc.length ? [null] : lr ? r.cases.map(function (i) { return CIDS[i]; }) : ['θ=90°'];
      cids.forEach(function (cid, ci) {
        var closed = cid === null ? null : cc.filter(function (c) { return c.cid === cid && c.scen === r.scen; })[0];
        var t0 = DIRN[d].name + (cid ? ' – dakgeval ' + (lr ? (r.cases[ci] + 1) + '/4: ' : '') + cid : '');
        if (cid !== null && !closed) { h += '<div class="rcase"><h3>' + t0 + '</h3><p class="small">' + SCN[r.scen] + ': c_pi-scenario niet van toepassing.</p></div>'; return; }
        signs.forEach(function (sg) {
          var sel = { dir: d, closed: closed, can: sg ? { sign: sg, lay: 'beide' } : null };
          h += '<div class="rcase"><h3>' + t0 + (sg ? ' – overkapping ' + (sg === 'min' ? 'opwaarts' : 'neerwaarts') : '') + '</h3>' + elemCase(k, sel, fac, un) + '</div>';
        });
      });
    });
    return h + '<div class="rcase">' + elemCommon(fac) + '</div>';
  }
  function renderElem() {
    var box = $('elemInfo');
    if (!EL || EL.err) { box.innerHTML = '<div class="banner err">Belastingen per element niet beschikbaar' + (EL && EL.err ? ': ' + EL.err : '') + '</div>'; return; }
    EV = elOf($('e_cpe').value); var E = EV, o = OUT, P = o.P, fsel = $('e_frame'), cur = fsel.value;
    eopt('e_frame', E.frames.map(function (f, k) { return [String(k), f.name + ' · y = ' + fmt(f.y, 3) + ' m']; }), String(Math.floor(E.frames.length / 2)));
    if (cur && +cur >= E.frames.length) fsel.value = String(Math.floor(E.frames.length / 2));
    var sel = elemSel(), k = +fsel.value;
    var dmode = $('e_mode').value === 'd', fac = o.vb.red * (dmode ? P.gammaQ * P.KFI : 1), un = dmode ? 'ontwerp' : 'karakteristiek';
    box.innerHTML = elemCase(k, sel, fac, un) + elemCommon(fac);
    if (SEL.frame !== k) { SEL.frame = k; if (window.View3D && OUT) View3D.update(OUT, SEL); }
  }
  function elemCase(k, sel, fac, un) {
    var E = EV || EL, o = OUT, P = o.P, fr = E.frames[k], T = E.frameLoads(k, sel);
    var LO = E.lineOrder.map(function (i) { return E.lines[i]; }), PNs = function (id) { return PN[id] || id; };
    var c = function (v, d) { return '<td class="' + cls(v) + '">' + fmt(v, d === undefined ? 1 : d, true) + '</td>'; };
    var h = '<p class="small">Combinatie: <b>' + DIRN[sel.dir].name + '</b>' + (sel.closed ? ' · dakgeval ' + sel.closed.cid + ' · ' + SCN[sel.closed.scen] : '') + (sel.can ? ' · overkapping ' + (sel.can.sign === 'min' ? 'opwaarts' : 'neerwaarts') + ' (' + sel.can.lay + ')' : '') + ' · waarden ' + un + (o.vb.red < 1 ? ' (incl. r = ' + fmt(o.vb.red, 3) + ')' : '') + '. Teken: q en F + = naar het vlak toe (dak: neerwaarts), V + = druk op de fundering, − = trek/opwaarts; H + = richting as 14.</p>';
    h += '<div class="svgbox elemfig">' + elemSVG(T, fr, fac) + '</div>';
    // lijnlasten
    h += '<h3>Lijnlasten op spant ' + fr.name + '</h3><div class="tablewrap"><table><tr><th class="l">Deel</th><th class="l">Helling</th><th class="l">Zone(s)</th><th>x van</th><th>x tot</th><th>' + (uniq(T.segs.map(function (g) { return g.clh; })).length === 1 && T.segs.length ? T.segs[0].clh : 'c<sub>pe</sub>') + (T.pts.length ? ' / ψ·c<sub>f</sub>' : '') + '</th><th>c<sub>pi</sub></th><th>w<br>[kN/m²]</th><th>q<sub>⊥</sub> = q<sub>v</sub><br>[kN/m]</th><th>q<sub>h</sub><br>[kN/m]</th><th>Resultante<br>[kN]</th></tr>';
    T.segs.forEach(function (g) { h += '<tr><td class="l">' + PNs('R' + g.span) + '</td><td class="l">' + (g.pitch === 'W' ? 'links' : 'rechts') + '</td><td class="l">' + g.zones + '</td><td>' + fmt(g.x0, 2) + '</td><td>' + fmt(g.x1, 2) + '</td><td>' + (uniq(T.segs.map(function (q) { return q.clh; })).length > 1 ? '<span class="small">' + g.clh + '</span> ' : '') + fmt(g.cpe, 3, true) + '</td><td>' + fmt(g.cpi, 3, true) + '</td>' + c(g.w * fac, 3) + c(g.q * fac, 2) + c(g.qh * fac, 2) + c(g.q * fac * (g.x1 - g.x0), 1) + '</tr>'; });
    T.pts.forEach(function (p) { h += '<tr><td class="l">' + PNs('R' + p.span) + ' · veld ' + p.bay + '</td><td class="l">' + (p.pitch === 'L' ? 'links' : 'rechts') + '</td><td class="l">ψ·c<sub>f</sub> = ' + fmt(p.cf, 3, true) + ' · F op x = ' + fmt(p.x, 2) + '</td><td>' + fmt(p.x0, 2) + '</td><td>' + fmt(p.x1, 2) + '</td><td>' + fmt(p.cf, 3, true) + '</td><td>–</td>' + c(p.w * fac, 3) + c(p.q * fac, 2) + c(p.Fh / (p.x1 - p.x0) * fac, 2) + c(p.F * fac * p.ca, 1) + '</tr>'; });
    if (!T.segs.length && !T.pts.length) h += '<tr><td class="l" colspan="11">Geen dakbelasting op dit spant.</td></tr>';
    h += '</table></div><p class="small">Overkapping (EN 7.3): puntlast per helling in het drukpunt (fig. 7.16/7.17).</p>';
    if (T.cols.length) {
      h += '<h3>Kolommen in de kopgevels (spant ' + fr.name + ')</h3><div class="tablewrap"><table><tr><th class="l">Kolom</th><th class="l">Zone(s)</th><th>z van–tot [m]</th><th>q [kN/m]</th><th>R<sub>top</sub> [kN]</th><th>R<sub>voet</sub> [kN]</th><th>M<sub>max</sub> [kNm]</th></tr>';
      T.cols.forEach(function (cl) { cl.segs.forEach(function (g, i) { h += '<tr><td class="l">' + (i ? '' : PNs(cl.part) + ' (H = ' + fmt(cl.H, 2) + ' m)') + '</td><td class="l">' + (i ? '' : cl.names.join('+')) + '</td><td>' + fmt(g.z0, 2) + '–' + fmt(g.z1, 2) + '</td>' + c(g.q * fac, 2) + (i ? '<td></td><td></td><td></td>' : c(cl.Rt * fac) + c(cl.Rb * fac) + c(cl.M * fac)) + '</tr>'; }); });
      h += '</table></div><p class="small">Kolom scharnierend in voet en op spanthoogte; + = richting as 14.</p>';
    }
    h += '<h3>Steunpuntsreacties spant ' + fr.name + '</h3><div class="tablewrap"><table><tr><th class="l">Kolomlijn</th><th>x [m]</th><th>V [kN]</th><th>H<sub>voet</sub> uit gevel [kN]</th><th>H<sub>top</sub> uit gevel [kN]</th></tr>';
    LO.forEach(function (l) { h += '<tr><td class="l">' + l.name + '</td><td>' + fmt(l.x, 2) + '</td>' + c(T.V[l.i] * fac) + c(T.Hb[l.i] * fac) + c(T.Ht[l.i] * fac) + '</tr>'; });
    h += '<tr><td class="l" colspan="4"><b>Σ horizontaal op spantniveau</b></td>' + c(T.Htop * fac) + '</tr></table></div>';
    // alle spanten, gekozen combinatie
    h += '<h3>Alle spanten – gekozen combinatie</h3><div class="tablewrap"><table><tr><th class="l">Spant</th><th>y [m]</th><th>b<sub>inv</sub> [m]</th>' + LO.map(function (l) { return '<th>V ' + l.name + '</th>'; }).join('') + '<th>Σ H<sub>top</sub></th></tr>';
    E.frames.forEach(function (f, j) { var t = E.frameLoads(j, sel); h += '<tr' + (j === k ? ' class="gov"' : '') + '><td class="l">' + f.name + '</td><td>' + fmt(f.y, 3) + '</td><td>' + fmt(f.dy, 3) + '</td>' + LO.map(function (l) { return c(t.V[l.i] * fac); }).join('') + c(t.Htop * fac) + '</tr>'; });
    h += '</table></div>';
    var nd = T.segs.filter(function (g) { return g.w > 1e-6 && g.cpe < 0; });
    if (nd.length) h = h.replace('<h3>Lijnlasten op spant', '<p class="banner info small">Netto neerwaarts ondanks negatieve ' + nd[0].clh + ' (zone ' + uniq(nd.map(function (g) { return g.zones; })).join(', ') + '): c<sub>pi</sub> = ' + fmt(nd[0].cpi, 2, true) + ' &lt; c<sub>pe</sub> = ' + fmt(nd[0].cpe, 2, true) + '.</p><h3>Lijnlasten op spant');
    return h;
  }
  function elemCommon(fac) {
    var E = EV || EL, o = OUT, P = o.P, h = '';
    var LO = E.lineOrder.map(function (i) { return E.lines[i]; }), PNs = function (id) { return PN[id] || id; };
    var c = function (v, d) { return '<td class="' + cls(v) + '">' + fmt(v, d === undefined ? 1 : d, true) + '</td>'; };
    // omhullende
    h += '<h3>Omhullende reacties per spant (alle richtingen, dakgevallen, actieve c<sub>pi</sub>-scenario’s' + (o.canopies.length ? ', overkapping op/neer en opstellingen' : '') + ')</h3><div class="tablewrap"><table><tr><th class="l" rowspan="2">Spant</th>' + LO.map(function (l) { return '<th colspan="2">' + l.name + ' V [kN]</th>'; }).join('') + '<th colspan="2">Σ H<sub>top</sub> [kN]</th></tr><tr>' + LO.map(function () { return '<th>max</th><th>min</th>'; }).join('') + '<th>max</th><th>min</th></tr>';
    E.env.forEach(function (en, j) { h += '<tr><td class="l">' + E.frames[j].name + '</td>' + LO.map(function (l) { return '<td class="' + cls(en.Vmax[l.i].v) + '" title="' + en.Vmax[l.i].d + '">' + fmt(en.Vmax[l.i].v * fac, 1, true) + '</td><td class="' + cls(en.Vmin[l.i].v) + '" title="' + en.Vmin[l.i].d + '">' + fmt(en.Vmin[l.i].v * fac, 1, true) + '</td>'; }).join('') + '<td title="' + en.Htmax.d + '">' + fmt(en.Htmax.v * fac, 1, true) + '</td><td title="' + en.Htmin.d + '">' + fmt(en.Htmin.v * fac, 1, true) + '</td></tr>'; });
    h += '</table></div>';
    h += '<h3>Maatgevend per kolomlijn</h3><div class="tablewrap"><table><tr><th class="l">Kolomlijn</th><th>max druk V [kN]</th><th class="l">spant · combinatie</th><th>max trek V [kN]</th><th class="l">spant · combinatie</th><th>max |H<sub>voet</sub>| [kN]</th><th class="l">spant · combinatie</th></tr>';
    E.lineGov.slice().sort(function (a, b) { return a.line.x - b.line.x; }).forEach(function (g) { h += '<tr><td class="l">' + g.line.name + '</td>' + c(g.max.v * fac) + '<td class="l wrap">' + g.max.f + ' · ' + g.max.d + '</td>' + c(g.min.v * fac) + '<td class="l wrap">' + g.min.f + ' · ' + g.min.d + '</td>' + c(g.hb.v * fac) + '<td class="l wrap">' + g.hb.f + ' · ' + g.hb.d + '</td></tr>'; });
    h += '</table></div>';
    // gordingen, gevelregels, gevelkolommen
    function secTable(title, rows, span, note, isCol) {
      var r = '<h3>' + title + '</h3><div class="tablewrap"><table><tr><th class="l">Deel</th><th class="l">Zone</th><th>' + span + ' [m]</th><th>h.o.h. [m]</th><th>A [m²]</th><th>coëfficiënt max / min</th><th>w max [kN/m²]</th><th>w min [kN/m²]</th><th>q max [kN/m]</th><th>q min [kN/m]</th><th>M max [kNm]</th><th>M min [kNm]</th><th>R max / min [kN]</th><th class="l">maatgevend (min)</th></tr>';
      var TR = [];
      rows.forEach(function (x) {
        var L = isCol ? x.H : x.L, qx = x.max.w * x.s * fac, qn = x.min.w * x.s * fac;
        TR.push('<tr><td class="l">' + PNs(x.part) + (x.kind ? ' <span class="small">(' + x.kind + ')</span>' : '') + '</td><td class="l">' + x.zone + '</td><td>' + fmt(L, 2) + '</td><td>' + fmt(x.s, 2) + '</td><td>' + fmt(x.A, 1) + '</td><td><span class="small">' + (x.kind === 'overkapping' ? 'ψ·c<sub>p,net</sub>' : /vrijstaand/.test(x.kind || '') ? 'c<sub>p,net</sub>' : E.mode === '10' ? cn(10) : E.mode === '1' ? cn(1) : cn(x.A)) + '</span> ' + fmt(x.max.cpe, 2, true) + ' / ' + fmt(x.min.cpe, 2, true) + '</td>' + c(x.max.w * fac, 3) + c(x.min.w * fac, 3) + c(qx, 2) + c(qn, 2) + c(qx * L * L / 8, 1) + c(qn * L * L / 8, 1) + '<td>' + fmt(qx * L / 2, 1, true) + ' / ' + fmt(qn * L / 2, 1, true) + '</td><td class="l wrap small">' + x.min.d + '</td></tr>');
      });
      return r + mergeAP(TR).join('') + '</table></div><p class="small">' + note + '</p>';
    }
    h += secTable('Gordingen', E.purlins, 'L', 'Ligger op twee steunpunten: M = qL²/8, R = qL/2; c<sub>pe</sub> bij A = L·h.o.h.; zonder c<sub>s</sub>c<sub>d</sub>.', false);
    h += secTable('Gevelregels', E.rails, 'L', 'Ligger op twee steunpunten: M = qL²/8, R = qL/2; c<sub>pe</sub> bij A = L·h.o.h.; zonder c<sub>s</sub>c<sub>d</sub>.', false);
    if (E.gcols.length) h += secTable('Gevelkolommen langsgevels A en P', E.gcols, 'H', 'Kolom scharnierend in voet en dakrand; incl. c<sub>s</sub>c<sub>d</sub>.', true);
    // langsrichting
    if (E.long.length) {
      h += '<h3>Windverbanden in langsrichting (wind van as A / as P)</h3><div class="tablewrap"><table><tr><th class="l">Richting</th><th class="l">c<sub>pi</sub></th><th>loefgevel [kN]</th><th>lijgevel [kN]</th><th>wrijving gebouw [kN]</th><th>wrijving overkapping [kN]</th><th>totaal [kN]</th></tr>';
      var gmax = null; E.long.forEach(function (r) { if (!gmax || r.F > gmax.F) gmax = r; });
      E.long.forEach(function (r) { h += '<tr' + (r === gmax ? ' class="gov"' : '') + '><td class="l">' + DIRN[r.dir].short + '</td><td class="l">' + r.scen + '</td>' + c(r.Fw * fac) + c(r.Fl * fac) + '<td>' + fmt(r.Ffr * fac, 1) + (r.FfrAll > 0 && r.Ffr === 0 ? ' <span class="small">(' + fmt(r.FfrAll * fac, 1) + ' verwaarloosd)</span>' : '') + '</td>' + c(r.Fcan * fac) + c(r.F * fac) + '</tr>'; });
      h += '</table></div>';
      var fA = E.fricA || [];
      h += '<p class="small">+ = in windrichting. Wrijving EN 5.3(3), 7.5: c<sub>fr</sub> = ' + fmt(P.str.cfrB, 2) + ' op dak en kopgevels voorbij min(2b; 4h) vanaf de loefrand' + fA.map(function (f) { return ' (' + f.name + ': grens ' + fmt(f.lim, 2) + ' m, A<sub>fr</sub> = ' + fmt(f.Afr, 0) + ' m²; evenwijdig ' + fmt(f.Apar, 0) + ' m² ' + (f.neg ? '≤' : '>') + ' 4 × loodrecht ' + fmt(f.Aperp, 0) + ' m² → ' + (f.neg ? 'mag verwaarloosd worden, EN 5.3(4)' : 'in rekening gebracht') + ')'; }).join('') + '.</p>';
    }
    return h;
  }

  function renderGeo() {
    var G = OUT.P.geo, o = OUT;
    var rows = [
      ['Overspanningen as 1–7 / 7–13 / 13–14', fmt(G.s1, 2) + ' / ' + fmt(G.s2, 2) + ' / ' + fmt(G.sL, 3) + ' m', 'rode kaders 4476 (2×), 2260,5 + 2253,5', 'conf'],
      ['Lengte as A–P', fmt(G.B, 3) + ' m (bk wandplaten 110,00 m)', 'rode kaders 43,674 + 36,661 + 29,104', 'conf'],
      ['Niveaus as 1 / 7 / nok / 13', '+' + fmt(G.hE1, 2) + ' / +' + fmt(G.hV7, 2) + ' / +' + fmt(G.hR, 2) + ' / +' + fmt(G.hV13, 2) + ' m', 'rode kaders, bovenkant dakspanten', 'conf'],
      ['As 13–14', o.spans[2].nb + ' veld(en), α = ' + fmt(o.spans[2].alpha, 2) + '°, goot +' + fmt(o.spans[2].zl, 2) + ', top +' + fmt(o.spans[2].top, 2) + ' m', 'plan: nok +17,48, goot +14,23 / +14,28', 'der'],
      ['Dakhelling as 1–13', fmt(o.spans[1].alpha, 2) + '° (uit niveaus ' + fmt(o.spans[1].aGeom, 2) + '°)', '“helling 15%”', 'ass'],
      ['Gevelopening fase 2', fmt(OUT.P.fase2.L, 3) + ' × ' + fmt(OUT.P.fase2.H, 3) + ' m', 'rode kaders; hoogteligging onzeker (onderrand +3,62 berekend vs. +6,00 tekening)', 'ass'],
      ['Wanden', 'as 1 (keerwand + bekleding), as 13 gesloten, as 7 geen, as 14 open', 'grondplan 2161/A', 'conf'],
      ['Oriëntatie', 'geen noordpijl', '→ c<sub>dir</sub> = 1,0', 'ass'],
      ['Stabiliteit tijdens fasen 1–3', 'niet uit plannen af te leiden', 'apart na te gaan', 'ass']
    ];
    var chip = { conf: '<span class="chip conf">afgelezen</span>', der: '<span class="chip der">afgeleid</span>', ass: '<span class="chip ass">te bevestigen</span>' };
    $('tblGeo').innerHTML = '<tr><th class="l">Grootheid</th><th class="l">Waarde</th><th class="l">Bron</th><th>Status</th></tr>' + rows.map(function (r) { return '<tr><td class="l">' + r[0] + '</td><td class="l">' + r[1] + '</td><td class="l wrap">' + r[2] + '</td><td>' + chip[r[3]] + '</td></tr>'; }).join('');
  }

  /* ---------- stuwdruk ---------- */
  function renderQp() {
    var o = OUT, v = o.vb, P = o.P;
    var pr = o.vols.filter(function (q) { return q.closed; }).map(function (q) { return q.prof; })[0] || WE.windProfile(Math.max.apply(null, o.spans.map(function (s) { return s.top; })), { cat: P.cat, c0: P.c0, vbBase: v.vbBase, vbRed: v.vbRed, kIformula: P.kIformula });
    var h = '<div class="formula">'
      + 'c_dir = ' + fmt(v.cdir, 3) + '  (ANB tabel 4.3)  ;  v_b = c_dir · v_b,0 = ' + fmt(v.vbBase, 3) + ' m/s   [EN (4.1)]\n'
      + 'q_b   = ½ ρ v_b² = 0,625 · ' + fmt(v.vbBase, 3) + '² = ' + fmt(pr.qb, 1) + ' N/m²   [EN (4.10), ANB ρ = 1,25]\n'
      + 'cat. ' + P.cat + ': z_0 = ' + fmt(pr.z0, 3) + ' m, z_min = ' + fmt(pr.zmin, 0) + ' m, k_r = 0,19·(z_0/0,05)^0,07 = ' + fmt(pr.kr, 5) + '   [EN tabel 4.1, (4.5)]\n'
      + 'z_e   = ' + fmt(pr.z, 2) + ' m → c_r = k_r·ln(z/z_0) = ' + fmt(pr.cr, 5) + ' ; v_m = c_r·c_0·v_b = ' + fmt(pr.vm, 3) + ' m/s   [EN (4.3), (4.4)]\n'
      + 'I_v   = k_I / (c_0·ln(z/z_0)) = ' + fmt(pr.kI, 3) + ' / ' + fmt(Math.log(pr.zc / pr.z0), 5) + ' = ' + fmt(pr.Iv, 5) + '   [EN (4.7), ANB 4.4]\n'
      + 'q_p   = (1 + 7 I_v)·½ρ v_m² = ' + fmt(pr.qp, 1) + ' N/m² = ' + fmt(pr.qp / 1000, 4) + ' kN/m²   [EN (4.8)]\n'
      + 'tijdelijk: c_season = ' + fmt(v.cseason, 2) + ', c_prob = ' + fmt(v.cprob, 3) + ' → r = ' + fmt(v.red, 4) + '\n';
    o.vols.forEach(function (q) { if (q.closed) h += q.name + ': h = ' + fmt(q.h, 2) + ' m, z_e = ' + fmt(q.ze, 2) + ' m → q_p = ' + fmt(q.prof.qp / 1000, 4) + ' kN/m² ; z_i = ' + fmt(q.zi, 2) + ' m\n'; });
    o.canopies.forEach(function (e) { var c = e.gov; h += 'Overkapping ' + o.spans[e.span].name + ': z_e = ' + fmt(c.geo.ze, 2) + ' m (' + (o.P.can.zeMode === 'eave' ? 'h tot dakrand, fig. 7.17' : o.P.can.zeMode === 'top' ? 'bovenkant' : 'handmatig') + ') → q_p = ' + fmt(c.prof.qp / 1000, 4) + ' kN/m²\n'; });
    var fr = {}; o.free.forEach(function (z) { fr[z.part] = z; }); Object.keys(fr).forEach(function (p) { h += PN[p] + ' (vrijstaand): z_e = h = ' + fmt(fr[p].ze, 2) + ' m → q_p = ' + fmt(fr[p].qp / 1000, 4) + ' kN/m²\n'; });
    $('qpSteps').innerHTML = h + '</div>';
    $('tblProf').innerHTML = '<tr><th>z [m]</th><th>c<sub>r</sub></th><th>v<sub>m</sub> [m/s]</th><th>I<sub>v</sub></th><th>c<sub>e</sub></th><th>q<sub>p</sub> [kN/m²]</th></tr>' + o.profileTable.map(function (q) { return '<tr><td>' + fmt(q.z, 2) + '</td><td>' + fmt(q.cr, 4) + '</td><td>' + fmt(q.vm, 2) + '</td><td>' + fmt(q.Iv, 4) + '</td><td>' + fmt(q.ce, 3) + '</td><td>' + fmt(q.qp / 1000, 4) + '</td></tr>'; }).join('');
  }

  /* ---------- coëfficiënten ---------- */
  function renderCpe() {
    var o = OUT, h = '';
    var cv = o.vols.filter(function (v) { return v.closed; });
    if (!cv.length) { $('cpeInfo').innerHTML = '<p>Geen gesloten volumes.</p>'; return; }
    cv.forEach(function (v) {
      h += '<h3>' + v.name + '</h3><div class="formula">h = ' + fmt(v.h, 2) + ' m ; breedte (x) = ' + fmt(v.Vx, 2) + ' m ; lengte b = ' + fmt(o.B, 3) + ' m\n'
        + 'wind ⟂ nok (links/rechts): dak e = min(b; 2h) = ' + fmt(Math.min(o.B, 2 * v.h), 2) + ' m ; gevels h/d = ' + fmt(v.hdLR, 3) + ', zijgevels e = ' + fmt(v.eLR, 2) + ' m\n'
        + 'wind ∥ nok (A/P): dak e = min(overspanning; 2h) ; gevels h/d = ' + fmt(v.hdAP, 3) + ', zijgevels e = ' + fmt(v.eAP, 2) + ' m\n'
        + 'geschakeld dak (fig. 7.10d, 7.2.7(2)): eerste aanwezige overspanning aan loefzijde F/G/H/J/I × 1,0 ; tweede H/I × 0,8 ; volgende × 0,6</div>';
      v.spans.forEach(function (i) {
        var s = o.spans[i]; if (!s.c74) return;
        var a = s.c74.a, b = s.c74.b;
        h += '<p><b>Overspanning ' + s.name + '</b> – α = ' + fmt(s.alpha, 2) + '°' + (s.roofOn ? '' : ' (dak afwezig: enkel voor c<sub>pe</sub> ter plaatse van de opening)') + '</p><div class="tablewrap"><table><tr><th>Zone</th><th>7.4a c<sub>pe,10</sub> (−)</th><th>c<sub>pe,1</sub> (−)</th><th>c<sub>pe,10</sub> (+)</th><th>c<sub>pe,1</sub> (+)</th><th>7.4b c<sub>pe,10</sub></th><th>c<sub>pe,1</sub></th></tr>' + ['F', 'G', 'H', 'I', 'J'].map(function (z) { return '<tr><td>' + z + '</td><td>' + fmt(a[z].n[0], 3, true) + '</td><td>' + fmt(a[z].n[1], 3, true) + '</td><td>' + fmt(a[z].p[0], 3, true) + '</td><td>' + fmt(a[z].p[1], 3, true) + '</td><td>' + (b[z] ? fmt(b[z][0], 3, true) : '–') + '</td><td>' + (b[z] ? fmt(b[z][1], 3, true) : '–') + '</td></tr>'; }).join('') + '</table></div>';
      });
      h += '<p><b>Tabel 7.1</b> (wind ⟂ / ∥ nok)</p><div class="tablewrap"><table><tr><th>Zone</th><th>c<sub>pe,10</sub> ⟂</th><th>c<sub>pe,1</sub> ⟂</th><th>c<sub>pe,10</sub> ∥</th><th>c<sub>pe,1</sub> ∥</th></tr>' + ['A', 'B', 'C', 'D', 'E'].map(function (z) { return '<tr><td>' + z + '</td><td>' + fmt(v.t71LR[z][0], 2, true) + '</td><td>' + fmt(v.t71LR[z][1], 2, true) + '</td><td>' + fmt(v.t71AP[z][0], 2, true) + '</td><td>' + fmt(v.t71AP[z][1], 2, true) + '</td></tr>'; }).join('') + '</table></div>';
    });
    h += '<p class="ref">ANB 5.3(5): geen correlatiereductie 0,85. ANB 7.2.2(1): z<sub>e</sub> = h voor lij- en zijgevels.</p>';
    $('cpeInfo').innerHTML = h;
  }

  /* ---------- inwendige druk ---------- */
  function renderCpi() {
    var o = OUT, h = '<p class="small">S3: dominante zijde (EN 7.2.9(4)–(5)) of fig. 7.13 (7.2.9(6)). S1/S2: gesloten gebouw (+0,2/−0,3). S5: grensvlak met het verwijderde dak als volledig open gevel.</p>';
    var cv = o.vols.filter(function (v) { return v.closed; });
    if (!cv.length) h += '<p>Geen gesloten volumes – inwendige druk niet van toepassing.</p>';
    cv.forEach(function (v) {
      h += '<h3>' + v.name + '</h3><div class="tablewrap"><table><tr><th class="l">Richting</th><th class="l">Methode</th><th class="l">Grootste vlak</th><th>Verhouding</th><th>k</th><th>c<sub>pe</sub> dom.</th><th>μ</th><th>c<sub>pi</sub> S3</th><th>S1</th><th>S2</th><th>S5 (h/d)</th></tr>';
      WE.DIRS.forEach(function (d) {
        var x = o.cpiDetail[v.i][d.id];
        h += '<tr><td class="l">' + d.short + '</td><td class="l">' + (x.method === 'dominant' ? '<span class="chip ok">dominante zijde</span>' : x.method === 'mu' ? '<span class="chip der">fig. 7.13</span>' : '<span class="chip ass">geen openingen</span>') + '</td><td class="l">' + x.domName + '</td><td>' + fmt(x.ratio, 2) + '</td><td>' + fmt(x.k, 3) + '</td><td>' + fmt(x.cpeDom, 3, true) + '</td><td>' + fmt(x.mu, 3) + '</td><td><b>' + fmt(x.cpi, 3, true) + '</b></td><td>' + fmt(o.P.cpiPos, 2, true) + '</td><td>' + fmt(o.P.cpiNeg, 2, true) + '</td><td>' + (x.s5 ? '<b>' + fmt(x.s5.cpi, 3, true) + '</b> (' + fmt(x.s5.hd, 3) + ')' : '–') + '</td></tr>';
      });
      h += '</table></div><details><summary class="small">Openingen per richting (detail)</summary>';
      WE.DIRS.forEach(function (d) {
        var x = o.cpiDetail[v.i][d.id];
        h += '<p class="small"><b>' + d.short + '</b></p><div class="tablewrap"><table><tr><th class="l">Opening</th><th class="l">Vlak</th><th>A [m²]</th><th>c<sub>pe</sub></th></tr>' + x.ops.map(function (q) { return '<tr><td class="l">' + q.label + '</td><td class="l">' + q.face + '</td><td>' + fmt(q.A, 2) + '</td><td>' + fmt(q.cpe, 3, true) + '</td></tr>'; }).join('') + '</table></div>';
      });
      h += '</details>';
    });
    $('cpiInfo').innerHTML = h;
  }

  /* ---------- resultaten ---------- */
  function resRow(r, type) {
    return '<tr><td class="l">' + PN[r.part] + (r.pitch !== '-' ? ' (' + r.pitch + ')' : '') + '</td><td class="l">' + DIRN[r.dir].short + '</td><td>' + r.zone + '</td><td class="l">' + r.pos + '</td><td>' + fmt(r.A, 1) + '</td><td>' + fmt(r.ze, 2) + '</td><td>' + fmt(r.qp, 4) + '</td><td>' + fmt(r.cpe1, 3, true) + '</td><td>' + fmt(r.cpe10, 3, true) + '</td><td>' + fmt(r.cpeLoc, 3, true) + '</td><td>' + fmt(r.cpeGlob, 3, true) + '</td><td>' + fmt(r.cpi, 3, true) + '</td><td class="' + cls(r.wLoc) + '">' + fmt(r.wLoc, 3, true) + '</td><td class="' + cls(r.wGlob) + '">' + fmt(r.wGlob, 3, true) + '</td><td>' + fmt(r.Fk, 1, true) + '</td><td>' + fmt(r.red, 3) + '</td><td>' + fmt(r.gF, 2) + '</td><td class="' + cls(r.wLocD) + '">' + fmt(r.wLocD, 3, true) + '</td><td class="' + cls(r.wGlobD) + '">' + fmt(r.wGlobD, 3, true) + '</td><td>' + fmt(r.Fd, 1, true) + '</td><td class="l">' + (r.caseId !== '-' ? r.caseId + ' · ' : '') + r.scen + '</td><td class="l">' + (type || '') + '</td></tr>';
  }
  function renderRes() {
    var fs = $('f_surf').value, fd = $('f_dir').value;
    var h = '<tr><th class="l">Deel</th><th class="l">Richting</th><th>Zone</th><th class="l">Positie</th><th>A [m²]</th><th>z<sub>e</sub></th><th>q<sub>p</sub></th><th>c<sub>pe,1</sub></th><th>c<sub>pe,10</sub></th><th>c<sub>pe</sub> lok.</th><th>c<sub>pe</sub> glob.</th><th>c<sub>pi</sub></th><th>w lok.</th><th>w glob.</th><th>F<sub>k</sub> [kN]</th><th>r</th><th>γ·K</th><th>w<sub>d</sub> lok.</th><th>w<sub>d</sub> glob.</th><th>F<sub>d</sub> [kN]</th><th class="l">Geval</th><th class="l">Type</th></tr>';
    OUT.rows.filter(function (r) { return (fs === 'all' || r.part === fs) && (fd === 'all' || r.dir === fd); }).forEach(function (r) { h += resRow(r, r.scenOn ? '' : 'niet in omhullende'); });
    $('tblRes').innerHTML = h;
  }
  function renderTot() {
    var h = '<p class="small">F<sub>x</sub> + richting as 14, F<sub>y</sub> + richting as P, F<sub>z</sub> + omhoog.</p><div class="tablewrap"><table><tr><th class="l">Deel</th><th class="l">Richting</th><th class="l">Geval</th><th>c<sub>pi</sub></th><th>A [m²]</th><th>ΣF<sub>n</sub></th><th>F<sub>x</sub></th><th>F<sub>y</sub></th><th>F<sub>z</sub></th><th>x<sub>R</sub></th><th>y<sub>R</sub></th><th>M<sub>voet</sub> [kNm]</th></tr>';
    OUT.parts.forEach(function (pid) { var pt = OUT.partTot[pid]; [pt.max, pt.min].forEach(function (t, j) {
      if (!t || (j && t === pt.max)) return;
      h += '<tr><td class="l">' + PN[t.part] + '</td><td class="l">' + DIRN[t.dir].short + '</td><td class="l">' + t.caseId + '</td><td>' + t.scen + '</td><td>' + fmt(t.A, 0) + '</td><td class="' + cls(t.Fn) + '">' + fmt(t.Fn, 1, true) + '</td><td>' + fmt(t.F[0], 1, true) + '</td><td>' + fmt(t.F[1], 1, true) + '</td><td>' + fmt(t.F[2], 1, true) + '</td><td>' + fmt(t.xc, 2) + '</td><td>' + fmt(t.yc, 2) + '</td><td>' + fmt(t.Mbase, 0, true) + '</td></tr>';
    }); });
    $('totInfo').innerHTML = h + '</table></div><p class="ref">Karakteristieke waarden zonder tijdelijke reductie.</p>';
  }

  /* ---------- open delen ---------- */
  function renderOpen() {
    var o = OUT, red = o.vb.red, gF = o.P.gammaQ * o.P.KFI, h = '';
    if (!o.canopies.length && !o.free.length) { $('openInfo').innerHTML = '<p>Geen open delen in de huidige configuratie.</p>'; return; }
    o.canopies.forEach(function (e) {
      var c = e.gov, g = c.geo;
      h += '<h3>' + PN[e.part] + ' – blokkering per windrichting</h3><div class="tablewrap"><table><tr><th class="l">Richting</th><th>φ [%]</th><th>c<sub>f,min</sub></th><th>min c<sub>p,net</sub> (A/B/C/D)</th><th>ΣF<sub>z</sub> opwaarts [kN]</th></tr>' + mergeRows(WE.DIRS.map(function (d) { var r = e.byDir[d.id]; return [d.short, '<tr' + (r === c ? ' class="gov"' : '') + '><td class="l">@@</td><td>' + fmt(r.P.phi, 0) + '</td><td>' + fmt(r.coef.min[0], 3, true) + '</td><td>' + r.coef.min.slice(1).map(function (x) { return fmt(x, 2, true); }).join(' / ') + '</td><td>' + fmt(r.aUp.Fz, 0, true) + '</td></tr>']; })) + '</table></div><p class="ref">EN 7.3(4): φ = 0 aan lijzijde van de maximale blokkering. Gemarkeerd = maatgevend.</p>';
      h += '<h3>' + PN[c.part] + ' – open overkapping (EN 7.3), maatgevend: ' + window.WindUI.DIRN[c.dir].short + '</h3><p>' + g.n + ' veld(en) van d = ' + fmt(g.d, 2) + ' m, b = ' + fmt(g.b, 2) + ' m, α = ' + fmt(c.P.alpha, 2) + '°, φ = ' + fmt(c.P.phi, 0) + ' %, z<sub>e</sub> = ' + fmt(g.ze, 2) + ' m, q<sub>p</sub> = ' + fmt(c.prof.qp / 1000, 4) + ' kN/m². Tabel 7.7 geïnterpoleerd: c<sub>f</sub> max ' + fmt(c.coef.max[0], 3, true) + ', min ' + fmt(c.coef.min[0], 3, true) + ' · A/B/C/D max ' + c.coef.max.slice(1).map(function (v) { return fmt(v, 2, true); }).join(' / ') + ' · min ' + c.coef.min.slice(1).map(function (v) { return fmt(v, 2, true); }).join(' / ') + '.</p>';
      h += '<div class="tablewrap"><table><tr><th>Veld</th><th>Positie (fig. 7.18)</th><th>Helling</th><th>x<sub>R</sub> [m]</th><th>ψ<sub>max</sub>·c<sub>f</sub></th><th>F<sub>max</sub> [kN]</th><th>ψ<sub>min</sub>·c<sub>f</sub></th><th>F<sub>min</sub> [kN]</th></tr>' + c.pitches.map(function (p) { return '<tr><td>' + p.bay + '</td><td>' + p.cls + '</td><td>' + (p.pitch === 'L' ? 'links' : 'rechts') + '</td><td>' + fmt(c.x0 + p.xc, 2) + '</td><td>' + fmt(p.cfMax, 3, true) + '</td><td class="pos">' + fmt(p.FMax, 1, true) + '</td><td>' + fmt(p.cfMin, 3, true) + '</td><td class="neg">' + fmt(p.FMin, 1, true) + '</td></tr>'; }).join('') + '</table></div>';
      h += '<div class="tablewrap" style="margin-top:6px"><table><tr><th class="l">Opstelling fig. 7.17</th><th class="l">c<sub>f</sub></th><th>ΣF<sub>z</sub> [kN] (+ omhoog)</th><th>ΣF<sub>x</sub> [kN]</th><th>ΣF<sub>z,d</sub> [kN]</th></tr>' + c.arrangements.map(function (a) { return '<tr' + (a === c.aUp || a === c.aDown ? ' class="gov"' : '') + '><td class="l">' + (a.lay === 'beide' ? 'beide hellingen' : (a.lay === 'links' ? 'enkel linker' : 'enkel rechter') + ' helling') + '</td><td class="l">' + a.sign + '</td><td>' + fmt(a.Fz, 1, true) + '</td><td>' + fmt(a.Fx, 1, true) + '</td><td>' + fmt(a.Fz * red * gF, 0, true) + '</td></tr>'; }).join('') + '</table></div>';
      var seen = {}; c.zones.forEach(function (z) { var key = z.bay + z.name; if (!seen[key]) seen[key] = { z: z, A: 0 }; seen[key].A += z.A; });
      h += '<div class="tablewrap" style="margin-top:6px"><table><tr><th>Veld</th><th>Zone</th><th>A [m²]</th><th>ψ·c<sub>p,net</sub> max</th><th>w<sub>max</sub> [kN/m²]</th><th>ψ·c<sub>p,net</sub> min</th><th>w<sub>min</sub> [kN/m²]</th><th>w<sub>d,max</sub> / w<sub>d,min</sub></th></tr>' + Object.keys(seen).map(function (key) { var s = seen[key], z = s.z; return '<tr><td>' + z.bay + '</td><td><b>' + z.name + '</b></td><td>' + fmt(s.A, 1) + '</td><td>' + fmt(z.cpMax, 3, true) + '</td><td class="pos">' + fmt(z.wMax, 3, true) + '</td><td>' + fmt(z.cpMin, 3, true) + '</td><td class="neg">' + fmt(z.wMin, 3, true) + '</td><td>' + fmt(z.wMaxD, 3, true) + ' / ' + fmt(z.wMinD, 3, true) + '</td></tr>'; }).join('') + '</table></div>';
      h += '<p class="ref">Wrijving (7.3(7), 7.5): wind ∥ nok ' + fmt(c.fric.langs.F, 1) + ' kN, wind ⟂ nok ' + fmt(c.fric.dwars.F, 1) + ' kN (c<sub>fr</sub> = ' + fmt(c.P.cfr, 2) + ').</p>';
    });
    if (o.free.length) {
      h += '<h3>Vrijstaande wanden (EN 7.4.1, tabel 7.9, fig. 7.19)</h3><p class="small">c<sub>p,net</sub> werkt in beide richtingen; z<sub>e</sub> = h (7.4.1(2)).</p><div class="tablewrap"><table><tr><th class="l">Wand</th><th>Zone</th><th class="l">s [m]</th><th>A [m²]</th><th>l/h</th><th>φ</th><th>c<sub>p,net</sub></th><th>q<sub>p</sub></th><th>w [kN/m²]</th><th>F<sub>k</sub> [kN]</th><th>w<sub>d</sub></th></tr>' + o.free.map(function (z) { return '<tr><td class="l">' + PN[z.part] + '</td><td>' + z.name + '</td><td class="l">' + fmt(z.a0, 2) + '–' + fmt(z.a1, 2) + '</td><td>' + fmt(z.A, 1) + '</td><td>' + fmt(z.lh, 2) + '</td><td>' + fmt(z.phi, 2) + '</td><td>±' + fmt(z.cp, 2) + '</td><td>' + fmt(z.qp / 1000, 3) + '</td><td>±' + fmt(z.w, 3) + '</td><td>±' + fmt(z.Fk, 1) + '</td><td>±' + fmt(z.wD, 3) + '</td></tr>'; }).join('') + '</table></div>';
    }
    $('openInfo').innerHTML = h;
  }

  /* ---------- tijdelijk ---------- */
  function renderTemp() {
    var P = OUT.P, dur = WE.DURATIONS.filter(function (d) { return d.id === P.duration; })[0];
    var rows = [
      ['c<sub>prob</sub>', 'EN 4.2(2)P Opm. 4, (4.2); ANB tabel 4.5', 'andere overschrijdingskans dan 0,02/jaar; T voor uitvoeringsfase volgt uit EN 1991-1-6 §3.1(5) (niet aangeleverd)', P.useProb ? fmt(P.cprob, 3) + ' (T = ' + dur.T + ' j)' : '1,00 (T = 50 j)', 'apart scenario'],
      ['c<sub>season</sub>', 'EN 4.2(2)P Opm. 3; ANB tabel 4.4', 'vaste kalenderperiode; 1 mnd–1 jaar: hoogste maandwaarde', P.useSeason ? fmt(P.cseason, 2) : '1,00', 'periode onbekend'],
      ['c<sub>dir</sub>', 'ANB tabel 4.3', 'oriëntatie gekend', fmt(OUT.vb.cdir, 3), 'noordpijl ontbreekt → 1,0'],
      ['γ<sub>Q</sub>', 'EN 1990 tabel A1.2(B) (niet aangeleverd)', 'tijdelijke = blijvende ontwerpsituatie in set B', fmt(P.gammaQ, 2), 'geen basis voor lagere waarde'],
      ['ψ<sub>0</sub> / ψ<sub>1</sub> / ψ<sub>2</sub>', 'EN 1990 tabel A1.1', 'wind als begeleidende belasting', '0,6 / 0,2 / 0', 'hier hoofdbelasting'],
      ['K<sub>FI</sub>', 'EN 1990 bijlage B', 'gevolgklasse, projectbeslissing', fmt(P.KFI, 2), 'standaard 1,0'],
      ['c<sub>s</sub>c<sub>d</sub>', 'EN 6.2(1); ANB 6.3.1', 'h < 15 m of bijlage B', fmt(P.cscd, 2), 'te verantwoorden']
    ];
    var q0 = (OUT.vols.filter(function (v) { return v.closed; })[0] || { prof: { qp: 0 } }).prof.qp / 1000;
    $('tempInfo').innerHTML = '<div class="tablewrap"><table><tr><th class="l">Factor</th><th class="l">Norm</th><th class="l">Voorwaarden</th><th class="l">Gekozen</th><th class="l">Opmerking</th></tr>' + rows.map(function (r) { return '<tr><td class="l">' + r[0] + '</td><td class="l wrap">' + r[1] + '</td><td class="l wrap">' + r[2] + '</td><td class="l"><b>' + r[3] + '</b></td><td class="l wrap">' + r[4] + '</td></tr>'; }).join('') + '</table></div>'
      + '<h3>Effect van de duur (informatief)</h3><div class="tablewrap"><table><tr><th class="l">Duur</th><th>T</th><th>c<sub>prob</sub></th><th>r</th><th>q<sub>p</sub>·r [kN/m²]</th></tr>' + mergeRows(WE.DURATIONS.map(function (d) { var c = WE.cprobFromT(d.T); return [d.label, '<tr' + (d.id === P.duration ? ' class="gov"' : '') + '><td class="l">@@</td><td>' + d.T + '</td><td>' + fmt(c, 2) + '</td><td>' + fmt(c * c, 3) + '</td><td>' + fmt(q0 * c * c, 4) + '</td></tr>']; })) + '</table></div>';
  }

  /* ---------- verificatie ---------- */
  function renderChecks() { $('checks').innerHTML = OUT.checks.map(function (c) { return '<li class="' + (c.ok ? 'ok' : 'bad') + '">' + (c.ok ? '✔' : '✘') + ' <b>' + c.name + '</b> <span class="small">– ' + c.detail + '</span></li>'; }).join(''); }
  var HAND = { qp: 853.089, wF: -2.15274, wD: 0.85309, FD: 1328.53, M: 9452.5 };
  function renderHand() {
    var h = '<div class="formula">Standaardinvoer: v_b,0 = 26 m/s, cat. III, c_dir = c_0 = 1, volume 1 gesloten (h = 17,44 m)\n'
      + '  k_r = 0,19·(0,30/0,05)^0,07 = 0,215389 ; ln(17,44/0,30) = 4,062739 ; c_r = 0,875071 ; v_m = 22,7518 m/s\n'
      + '  I_v = 0,95/4,062739 = 0,233832 ; q_p = 2,636827 · 0,625 · 22,7518² = 853,09 N/m²\n'
      + 'Dak as 7–13, zone F (hoek as 13/A), wind van rechts, FGH−/IJ−, S1 (c_pi = +0,2), A = 1 m²:\n'
      + '  α = 8,53° → t = (8,53 − 5)/10 = 0,353 ; dak as 7–13 = eerste aanwezige overspanning → factor 1,0 ; c_pe,1 = −2,5 + 0,5·0,353 = −2,3235\n'
      + '  w = 0,85309 · (−2,3235 − 0,20) = −2,1527 kN/m²\n'
      + 'Wand as 13, zone D, wind van rechts, S2 (c_pi = −0,3), globaal:\n'
      + '  h/d = 17,44/89,52 = 0,195 → c_pe,10 = +0,70 ; w = 0,85309 · 1,00 = 0,8531 kN/m²\n'
      + '  A = 109,439 · 14,23 = 1557,32 m² → F = 1328,5 kN ; M_voet = 1328,5 · 14,23/2 = 9452 kNm</div>';
    var rF = OUT.rows.filter(function (r) { return r.part === 'R1' && r.dir === 'R' && r.zone === 'F' && r.caseId === 'FGH−/IJ−' && r.scen === 'S1'; })[0];
    var rD = OUT.rows.filter(function (r) { return r.part === 'W2' && r.dir === 'R' && r.scen === 'S2'; })[0];
    var tD = OUT.totals.filter(function (t) { return t.part === 'W2' && t.dir === 'R' && t.scen === 'S2'; })[0];
    var v1 = OUT.vols[0];
    if (rF && rD && tD && v1.closed && Math.abs(v1.h - 17.44) < 1e-9 && OUT.P.vb0 === 26 && OUT.P.cat === 'III' && OUT.vb.cdir === 1 && OUT.P.Aloc === 1 && OUT.P.cpiPos === 0.2 && OUT.P.cpiNeg === -0.3 && OUT.P.pitchMode === 'plan' && OUT.P.pitchDeg === 8.53) {
      var cmp = [['q_p [N/m²]', HAND.qp, v1.prof.qp, 0.01], ['w zone F [kN/m²]', HAND.wF, rF.wLoc, 1e-4], ['w zone D [kN/m²]', HAND.wD, rD.wGlob, 1e-4], ['F wand as 13 [kN]', HAND.FD, tD.Fn, 0.05], ['M_voet [kNm]', HAND.M, tD.Mbase, 0.5]];
      h += '<div class="tablewrap"><table><tr><th class="l">Grootheid</th><th>Hand</th><th>Script</th><th>Status</th></tr>' + cmp.map(function (c) { var ok = Math.abs(c[2] - c[1]) <= c[3]; return '<tr><td class="l">' + c[0] + '</td><td>' + fmt(c[1], 4) + '</td><td>' + c[2].toPrecision(10) + '</td><td>' + (ok ? '<span class="chip ok">OK</span>' : '<span class="chip bad">afwijking</span>') + '</td></tr>'; }).join('') + '</table></div>';
    } else h += '<p class="ref">Vergelijking enkel bij de standaardconfiguratie (Standaardwaarden herstellen).</p>';
    h += compareRef();
    $('handCalc').innerHTML = h;
  }
  function compareRef() {
    var c = WE.c74Ref(8.25, OUT.P.i5pos), t = WE.t71Ref(17.4 / 44.7), q = WE.windProfile(17.4, { cat: 'III', c0: 1, vbBase: 26, vbRed: 26, kIformula: false }).qp;
    var W = { qp: 852.4245409333421, F: [-1.44, -2.3375, 0.065], G: [-1.07, -1.8375, 0.065], H: [-0.5025, -0.9075, 0.065], I: [-0.535, -0.535, 0.135], J: [-0.73, -0.8925, 0.135], D: 0.7185682326621924, E: -0.3371364653243848, cpi: 0.646711409395973 };
    var M = { F: [-1.44, -2.3375], G: [-1.07, -1.8375], H: [-0.5025, -0.9075], I: [-0.535, -0.535], J: [-0.73, -0.8925], cpi: -0.5244664025 };
    var Pd = JSON.parse(JSON.stringify(DEFAULTS)); Pd.pitchMode = 'plan'; Pd.pitchDeg = 8.25;
    var od = WE.compute(Pd), s3 = od.cpiDetail[0] && od.cpiDetail[0].L ? od.cpiDetail[0].L : null;
    var rows = [['q<sub>p</sub>(17,4 m) [N/m²]', W.qp, null, q]];
    ['F', 'G', 'H', 'I', 'J'].forEach(function (z) { rows.push([z + ' c<sub>pe,10</sub> (−)', W[z][0], M[z][0], c[z].n[0]]); rows.push([z + ' c<sub>pe,1</sub> (−)', W[z][1], M[z][1], c[z].n[1]]); rows.push([z + ' c<sub>pe</sub> (+)', W[z][2], null, c[z].p[0]]); });
    rows.push(['D (h/d = 17,4/44,7)', W.D, null, t.D[0]]); rows.push(['E (h/d = 17,4/44,7)', W.E, null, t.E[0]]);
    rows.push(['c<sub>pi</sub> dominante dakopening, wind van links (S3)', null, M.cpi, s3 ? s3.cpi : null]);
    rows.push(['c<sub>pi</sub> open loefgevel (S5)', W.cpi, null, s3 && s3.s5 ? s3.s5.cpi : null]);
    var h = '<h3>Vergelijking met WInt v1.3.2 en handberekening (Wind.xlsx)</h3><p class="small">Referentie: α = 8,25°, θ = 0° (wind van links), v<sub>b,0</sub> = 26 m/s, cat. III. Dit programma met dezelfde invoer (los van de huidige invoer).</p><div class="tablewrap"><table><tr><th class="l">Grootheid</th><th>WInt</th><th>Wind.xlsx</th><th>Dit programma</th><th>Status</th></tr>';
    rows.forEach(function (r) {
      var ok = true, ref = [r[1], r[2]].filter(function (v) { return v !== null; });
      ref.forEach(function (v) { if (r[3] === null || Math.abs(v - r[3]) > Math.max(1e-3, Math.abs(v) * 0.002)) ok = false; });
      h += '<tr><td class="l">' + r[0] + '</td><td>' + fmt(r[1], 4, true) + '</td><td>' + fmt(r[2], 4, true) + '</td><td>' + fmt(r[3], 4, true) + '</td><td>' + (ok ? '<span class="chip ok">gelijk</span>' : '<span class="chip ass">verschil</span>') + '</td></tr>';
    });
    h += '</table></div><p class="ref">Verschillen: zone I (+) bij 5°: WInt +0,2 (vinkje “tabel 7.4a zone I bij 5°”), NBN-tekst enkel −0,6. S3 met dezelfde helling: kleine afwijking door b = 109,439 m i.p.v. 110 m in Wind.xlsx. S5: h/d = 17,44/44,76 i.p.v. 17,4/44,7. WInt neemt voor zone D z<sub>e</sub> = goothoogte 14,159 m (optie “z<sub>e</sub> loefgevel D = bovenkant gevel”).</p>';
    return h;
  }

  function assList() {
    return [
      ['Terreincategorie', 'III volgens opdracht; plan vermeldt WindCAT II (+35 % q<sub>p</sub>).'],
      ['Volumes', 'Een aanwezige tussenwand (as 7, as 13) scheidt volumes; openingen in tussenwanden worden niet als verbinding gerekend. Zonder tussenwand vormen de overspanningen één volume.'],
      ['Theoriekeuze', 'EN 7.2.9(2): ≥ 2 vlakken met > 30 % openingen ⇒ dak als overkapping (7.3), wanden als vrijstaande wand (7.4). De 30 %-toets gebruikt de bruto-oppervlakken per vlak (dak, beide eindwanden, gevel A, gevel P).'],
      ['Inwendige druk', 'S3 per richting uit de ingevoerde openingen; c<sub>pe</sub> van een verwijderd dak = oppervlakgewogen c<sub>pe,10</sub> (negatieve reeks) alsof het dak aanwezig is, met de positie in het geschakelde dak. Poorten en extra openingen gelijkmatig over het vlak verdeeld. S1/S2 blijven als gesloten-gebouwscenario.'],
      ['Geschakeld dak', 'Enkel aanwezige daken van gesloten volumes tellen voor de positie (fig. 7.10d); open overkappingen hebben geen invloed (opgave: luifel zonder invloed).'],
      ['Blokkering', 'φ = 100 % voor overkappingen (veilig voor opwaartse belasting).'],
      ['Gevelopening fase 2', 'Hoogteligging niet eenduidig; enkel van invloed op de openingsverhouding.'],
      ['Stabiliteit', 'Overdracht van de krachten tijdens de fasen niet uit de plannen af te leiden.'],
      ['c<sub>s</sub>c<sub>d</sub> = 1,0', 'h > 15 m: te verantwoorden.']
    ];
  }
  var NOTES = '';
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function notesLines() { return NOTES.split(/\r?\n/).map(function (t) { return t.trim(); }).filter(Boolean); }
  function renderAss() {
    var A = assList();
    var own = notesLines();
    $('assInfo').innerHTML = '<ul class="asslist">' + A.map(function (a) { return '<li><b>' + a[0] + '.</b> ' + a[1] + '</li>'; }).join('') + own.map(function (t) { return '<li><b>Eigen aanname.</b> <span translate="no">' + esc(t) + '</span></li>'; }).join('') + '</ul>' + (own.length ? '' : '<p class="small">Eigen aannames voeg je toe in het venster “Rapport…”; ze worden mee bewaard in het projectbestand.</p>');
  }
  function renderRef() {
    var R = [['EN 1991-1-4 §4.2–4.5 + ANB tabellen 4.2–4.5, 4.9', 'v<sub>b</sub>, c<sub>dir</sub>, c<sub>season</sub>, c<sub>prob</sub>, c<sub>r</sub>, I<sub>v</sub>, q<sub>p</sub>'], ['EN §6.2(1); ANB 6.3.1', 'c<sub>s</sub>c<sub>d</sub>'], ['EN §7.2.1, fig. 7.2; ANB 7.2.1', 'c<sub>pe,1</sub>/c<sub>pe,10</sub>'], ['EN §7.2.2, fig. 7.4–7.5, tabel 7.1; ANB 7.2.2, 5.3(5)', 'gevels'], ['EN §7.2.5, fig. 7.8, tabel 7.4a/b', 'zadeldaken'], ['EN §7.2.7, fig. 7.10', 'geschakelde daken'], ['EN §7.2.9(2)–(7), (7.1)–(7.3), fig. 7.13; ANB 7.2.9', 'inwendige druk, dominante zijde, theoriekeuze'], ['EN §7.3, tabel 7.7–7.8, fig. 7.15–7.18; ANB 7.3', 'open overkappingen'], ['EN §7.4.1, tabel 7.9, fig. 7.19', 'vrijstaande wanden'], ['EN §7.5, tabel 7.10', 'wrijving'], ['EN 1990 (niet aangeleverd)', 'γ<sub>Q</sub>, ψ, K<sub>FI</sub>']];
    $('tblRef').innerHTML = '<tr><th class="l">Artikel</th><th class="l">Onderwerp</th></tr>' + R.map(function (r) { return '<tr><td class="l">' + r[0] + '</td><td class="l">' + r[1] + '</td></tr>'; }).join('');
  }
  var PAGE = false;
  function renderHelp() {
    $('helpInfo').innerHTML = '<ol><li>Het tabblad <b>1 · Invoer en model</b> bevat alle invoer; het model ernaast toont meteen de volumes en de gekozen theorie. Schakel <b>daken</b> en <b>wanden</b> in of uit en geef openingen in m². Het programma vormt volumes en kiest per volume automatisch de theorie (zie §1). Het tabblad <b>2 · Resultaten</b> bevat alle uitkomsten; de knoppen bovenaan springen naar een onderdeel.</li><li>Gesloten volumes: c<sub>pe</sub> volgens 7.2, c<sub>pi</sub> volgens 7.2.9 (S3) of als gesloten gebouw (S1/S2). Open volumes: overkapping (7.3, velden, helling, blokkering) en vrijstaande wanden (7.4).</li><li>3D: kies richting, c<sub>pi</sub>-scenario, dakgeval, lokaal/globaal, opwaarts/neerwaarts en de opstelling van fig. 7.17. Draaien = linkermuis, verschuiven = rechtermuis/Shift/pijltjes, zoomen = scroll, dubbelklik = centreren. Maatvoering van de overspanningen staat in het model.</li><li>§3c rekent de wind om naar de draagconstructie: lijnlasten en reacties per spant, maatgevende reacties per kolomlijn, gordingen, gevelregels, gevelkolommen en windverbanden. Geef de spantposities en h.o.h.-afstanden in de groep <b>Draagconstructie</b>.</li><li>' + 'Menu <b>Bestand</b>: <b>Project opslaan</b> bewaart alle invoer als .json-bestand; <b>Project openen</b> (of het bestand op het invoerpaneel slepen) laadt het terug. <b>CSV</b> en <b>JSON</b> bewaren de resultaten. <b>Rapport…</b> opent een venster waarin je kiest welke onderdelen, windrichtingen en dakgevallen in het rapport komen' + (PAGE ? '; exporteer het als HTML en druk het af vanuit je browser.' : ', om af te drukken (of als PDF te bewaren) of als HTML te exporteren.') + '</li></ol>';
  }
  var dlP = null;
  function dlCap() { if (!dlP) dlP = (window.claude && window.claude.use) ? window.claude.use('downloads').catch(function () { return null; }) : Promise.resolve(null); return dlP; }
  function note(msg, kind) { var b = $('fileMsg'); b.hidden = false; b.className = 'banner ' + (kind || 'info'); b.textContent = msg; clearTimeout(note.t); note.t = setTimeout(function () { b.hidden = true; }, 7000); }
  var MEM = {};   // laatst gebruikte bestandshandle per soort ('project', 'export')
  function idb(mode, key, val) {
    return new Promise(function (res) {
      try {
        var rq = indexedDB.open('windtool', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
        rq.onerror = function () { res(null); };
        rq.onsuccess = function () {
          try {
            var tx = rq.result.transaction('kv', mode === 'get' ? 'readonly' : 'readwrite'), st = tx.objectStore('kv');
            var r2 = mode === 'get' ? st.get(key) : st.put(val, key);
            r2.onsuccess = function () { res(mode === 'get' ? r2.result || null : true); };
            r2.onerror = function () { res(null); };
          } catch (e) { res(null); }
        };
      } catch (e) { res(null); }
    });
  }
  function lsGet(k) { try { return localStorage.getItem('windtool.' + k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem('windtool.' + k, v); } catch (e) { } }
  function rememberHandle(kind, h) { MEM[kind] = h; idb('put', 'handle.' + kind, h); if (h && h.name) { lsSet('name.' + kind, h.name); showProjName(kind); } }
  function lastHandle(kind) { return MEM[kind] ? Promise.resolve(MEM[kind]) : idb('get', 'handle.' + kind).then(function (h) { if (h) MEM[kind] = h; return h; }); }
  function showProjName(kind) { if (kind !== 'project') return; var n = lsGet('name.project'), el = $('projName'); if (el) { el.innerHTML = n ? 'project: <span translate="no">' + esc(n) + '</span>' : ''; el.hidden = !n; } }
  function mimeFor(name) { var e = name.split('.').pop(); return { json: ['application/json', 'Projectbestand / JSON'], csv: ['text/csv', 'CSV-bestand'], html: ['text/html', 'HTML-rapport'] }[e] || ['text/plain', 'Bestand']; }
  function deliver(name, text, type, kind) {
    kind = kind || 'export';
    var lastN = lsGet('name.' + kind);
    if (kind === 'project' && lastN) name = lastN;
    if (PAGE) {
      dlCap().then(function (dl) {
        if (!dl) { clip(name, text); return; }
        dl.save({ filename: name, data: text }).then(function () { lsSet('name.' + kind, name); showProjName(kind); note(name + ' opgeslagen.'); }, function (e) {
          var c = e && e.code;
          if (c === 'declined') note('Opslaan van ' + name + ' geannuleerd.', 'warn');
          else if (c === 'rate_limited') note('Er staat al een opslagvenster open; probeer zo dadelijk opnieuw.', 'warn');
          else if (c === 'host_unavailable') note('Deze app kan geen bestanden opslaan; open de pagina in een browser of op een computer.', 'warn');
          else clip(name, text);
        });
      });
      return;
    }
    // offline: venster “Opslaan als” (map en naam kiezen) waar de browser dat ondersteunt (Chrome, Edge)
    if (window.showSaveFilePicker) {
      var m = mimeFor(name), ext = '.' + name.split('.').pop(), acc = {}; acc[m[0]] = [ext];
      var picked = false;
      lastHandle(kind).then(function (lh) {
        var opt = { id: kind === 'project' ? 'windproject' : 'windexport', suggestedName: name, types: [{ description: m[1], accept: acc }] };
        if (lh) opt.startIn = lh;   // zelfde map als de laatste keer
        var pick = function (o) { return window.showSaveFilePicker(o); };
        return pick(opt).catch(function (e) { if (e && e.name !== 'AbortError' && opt.startIn) { delete opt.startIn; return pick(opt); } throw e; });
      }).then(function (h) {
        picked = true;
        return h.createWritable().then(function (w) { return w.write(new Blob([text], { type: type })).then(function () { return w.close(); }); }).then(function () { rememberHandle(kind, h); note((h.name || name) + ' opgeslagen.'); });
      }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        if (!picked) askName(name, text, type, kind); else note('Opslaan mislukt: ' + (e && e.message ? e.message : e), 'err');
      });
      return;
    }
    askName(name, text, type, kind);
  }
  // browsers zonder “Opslaan als”-venster (bv. Firefox, Safari): eerst bestandsnaam vragen, dan downloaden
  function askName(name, text, type, kind) {
    var d = $('saveDlg'), inp = $('saveName');
    inp.value = name;
    $('saveInfo').textContent = 'Deze browser laat een pagina geen map kiezen. Het bestand gaat naar je downloadmap, of de browser vraagt zelf waar het moet komen als dat zo is ingesteld (“Altijd vragen waar bestanden moeten worden opgeslagen”).';
    $('saveOk').onclick = function () {
      var n = inp.value.trim() || name, ext = '.' + name.split('.').pop();
      n = n.replace(/[\\/:*?"<>|]/g, '_');
      if (n.toLowerCase().slice(-ext.length) !== ext) n += ext;
      if (d.close) d.close(); else d.removeAttribute('open');
      lsSet('name.' + (kind || 'export'), n); showProjName(kind); download(n, text, type);
    };
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    inp.focus(); inp.select();
  }
  function download(name, text, type) {
    var b = new Blob([text], { type: type }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); note(name + ' gedownload.');
  }
  function clip(name, text) {
    var box = $('exportBox'), ta = $('exportText'), msg = $('exportMsg'); box.hidden = false; ta.value = text; msg.textContent = name + ' wordt gekopieerd…';
    var fb = function () { ta.focus(); ta.select(); msg.textContent = name + ': tekst geselecteerd – kopieer met Ctrl/Cmd+C.'; };
    try { navigator.clipboard.writeText(text).then(function () { msg.textContent = name + ' gekopieerd naar het klembord.'; }, fb); } catch (e) { fb(); }
  }
  function csv() {
    var c = ['part', 'pitch', 'dir', 'zone', 'pos', 'A', 'ze', 'qp', 'cpe1', 'cpe10', 'cpeLoc', 'cpeGlob', 'caseId', 'scen', 'scenOn', 'cpi', 'wLoc', 'wGlob', 'Fk', 'red', 'gF', 'wLocD', 'wGlobD', 'Fd'];
    var L = [c.join(';')];
    OUT.rows.forEach(function (r) { L.push(c.map(function (k2) { var v = r[k2]; return typeof v === 'number' ? String(v) : '"' + String(v).replace(/"/g, '""') + '"'; }).join(';')); });
    OUT.canopies.forEach(function (e) { var cn = e.gov; cn.zones.forEach(function (z) { L.push(['overkapping ' + cn.part, z.pitch, '*', z.name, 'veld ' + z.bay, z.A, cn.geo.ze, cn.prof.qp / 1000, z.cpMax, z.cpMin, '', '', '', '', '', '', z.wMax, z.wMin, '', OUT.vb.red, OUT.P.gammaQ * OUT.P.KFI, z.wMaxD, z.wMinD, ''].join(';')); }); });
    OUT.free.forEach(function (z) { L.push(['vrijstaand ' + z.part, '', '*', z.name, z.a0 + '-' + z.a1, z.A, z.ze, z.qp / 1000, z.cp, z.cp, '', '', '', '', '', '', z.w, z.w, z.Fk, OUT.vb.red, OUT.P.gammaQ * OUT.P.KFI, z.wD, z.wD, ''].join(';')); });
    deliver('windbelasting_loods_gent.csv', '﻿' + L.join('\r\n'), 'text/csv;charset=utf-8');
  }
  function json() { deliver('windbelasting_loods_gent.json', JSON.stringify({ programmaversie: APP_VERSION, invoer: OUT.P, volumes: OUT.vols.map(function (v) { return { naam: v.name, gesloten: v.closed, theorie: v.theory, vlakken: v.faces }; }), wind: OUT.vb, inwendigeDruk: OUT.cpiDetail, zones: OUT.rows, totalen: OUT.totals, overkappingen: OUT.canopies.map(function (e) { var c = e.gov; return { deel: c.part, maatgevendeRichting: c.dir, perRichting: WE.DIRS.map(function (d) { var r = e.byDir[d.id]; return { richting: d.id, phi: r.P.phi, coef: r.coef, opstellingen: r.arrangements }; }), geo: c.geo, coef: c.coef, zones: c.zones, hellingen: c.pitches, opstellingen: c.arrangements, wrijving: c.fric }; }), vrijstaandeWanden: OUT.free, elementen: EL && !EL.err ? { spanten: EL.frames, kolomlijnen: EL.lines, omhullendeReacties: EL.env.map(function (e, k) { return { spant: EL.frames[k].name, Vmax: e.Vmax, Vmin: e.Vmin, HvoetMax: e.Hbmax, HvoetMin: e.Hbmin, HtopMax: e.Htmax, HtopMin: e.Htmin }; }), maatgevendPerKolomlijn: EL.lineGov, gordingen: EL.purlins, gevelregels: EL.rails, gevelkolommen: EL.gcols, langsrichting: EL.long, opmerking: 'karakteristiek (zonder r en γ_Q); V + = druk, H + = richting as 14' } : null, controles: OUT.checks, waarschuwingen: OUT.warnings }, null, 2), 'application/json'); }

  /* ---------- project opslaan / openen ---------- */
  var FORMAT = 'windbelasting-loods-gent';
  function reportSettings() {
    var f = $('rForm'), q = function (sel) { return [].map.call(f.querySelectorAll(sel), function (c) { return c.value; }); };
    return {
      onderdelen: q('input[name=part]:checked'), richtingen: q('input[name=dir]:checked'), dakgevallen: q('input[name=case]:checked').map(Number),
      gevelaanzichten: f.walls.checked, cpi: f.scen.value, coefficienten: f.meas.value, overkapping: q('input[name=csign]:checked'), waarde: f.mode.value,
      aannames: q('input[name=ass]:checked').map(Number), spant: f.frame.value,
      sectieRapportPerZone: { cpi: $('r_scen').value, coefficienten: $('r_meas').value, overkapping: $('r_sign').value, waarde: $('r_mode').value, richting: $('r_dir').value }
    };
  }
  function applyReportSettings(r) {
    if (!r || typeof r !== 'object') return false;
    var f = $('rForm');
    function boxes(name, list, num) { if (!Array.isArray(list)) return; f.querySelectorAll('input[name=' + name + ']').forEach(function (c) { c.checked = list.map(String).indexOf(num ? String(+c.value) : c.value) >= 0; }); }
    function sel(el, v) { if (typeof v === 'string' && [].some.call(el.options, function (o) { return o.value === v; })) el.value = v; }
    boxes('part', r.onderdelen); boxes('dir', r.richtingen); boxes('case', r.dakgevallen, true); boxes('csign', r.overkapping); boxes('ass', r.aannames, true);
    if (typeof r.gevelaanzichten === 'boolean') f.walls.checked = r.gevelaanzichten;
    if (r.spant !== undefined && r.spant !== '') { RFRAME = String(r.spant); if (f.frame.options.length) sel(f.frame, RFRAME); }
    sel(f.scen, r.cpi); sel(f.meas, r.coefficienten); sel(f.mode, r.waarde);
    var z = r.sectieRapportPerZone;
    if (z && typeof z === 'object') { sel($('r_scen'), z.cpi); sel($('r_meas'), z.coefficienten); sel($('r_sign'), z.overkapping); sel($('r_mode'), z.waarde); sel($('r_dir'), z.richting); }
    return true;
  }
  function saveProject() {
    var R = readInputs(), P = R.P;
    ['cseason', 'T', 'monthsDur'].forEach(function (k) { delete P[k]; });
    P.notes = NOTES;
    deliver('windproject_loods_gent.json', JSON.stringify({ formaat: FORMAT, versie: 1, programmaversie: APP_VERSION, opgeslagen: new Date().toISOString(), opmerking: 'Invoer en rapportinstellingen van de windtool (NBN EN 1991-1-4 + ANB). Openen via “Project openen”.', invoer: P, rapport: reportSettings() }, null, 2), 'application/json', 'project');
  }
  function mergeKnown(base, src, path, skipped) {
    Object.keys(src || {}).forEach(function (k) {
      var p = path ? path + '.' + k : k;
      if (!(k in base)) { skipped.push(p); return; }
      var b = base[k], v = src[k];
      if (b !== null && typeof b === 'object' && !Array.isArray(b)) { if (v && typeof v === 'object' && !Array.isArray(v)) mergeKnown(b, v, p, skipped); else skipped.push(p); }
      else if (Array.isArray(b)) { if (Array.isArray(v)) v.forEach(function (it, i) { if (i < b.length && b[i] && typeof b[i] === 'object' && it && typeof it === 'object') mergeKnown(b[i], it, p + '.' + i, skipped); }); else skipped.push(p); }
      else if (typeof v === typeof b) base[k] = v;
      else skipped.push(p);
    });
  }
  function openProject(file) {
    if (!file) return;
    if (file.size > 2e6) { note('Bestand te groot voor een projectbestand (> 2 MB).', 'err'); return; }
    var rd = new FileReader();
    rd.onerror = function () { note('Bestand kon niet gelezen worden.', 'err'); };
    rd.onload = function () {
      var obj;
      try { obj = JSON.parse(String(rd.result)); } catch (e) { note('Geen geldig JSON-bestand: ' + e.message, 'err'); return; }
      var inv = obj && obj.formaat === FORMAT ? obj.invoer : (obj && obj.invoer ? obj.invoer : null);
      if (!inv || typeof inv !== 'object') { note('Dit bestand bevat geen invoer van deze tool (veld “invoer” ontbreekt).', 'err'); return; }
      var P = clone(DEFAULTS), skipped = [];
      if (typeof inv.pitchPct === 'number' && typeof inv.pitchDeg !== 'number') { inv.pitchDeg = Math.round(Math.atan(inv.pitchPct / 100) * 180 / Math.PI * 100) / 100; delete inv.pitchPct; }
      mergeKnown(P, inv, '', skipped);
      NOTES = typeof inv.notes === 'string' ? inv.notes : ''; if ($('rNotes')) $('rNotes').value = NOTES;
      var rOk = applyReportSettings(obj.rapport);
      setInputs(P); recalc();
      note('Project “' + file.name + '” geopend' + (rOk ? ' (met rapportinstellingen)' : '') + (skipped.length ? '; genegeerd: ' + skipped.slice(0, 6).join(', ') + (skipped.length > 6 ? '…' : '') : '') + '.', skipped.length ? 'warn' : 'info');
    };
    rd.readAsText(file);
  }

  /* ---------- rapportdialoog ---------- */
  var RSECT = [['sec-model', 'Model en gekozen theorie'], ['sec-summary', 'Samenvatting maatgevende waarden'], ['snap3d', '3D-afbeelding (huidig beeld)'], ['zones', 'Rapport per zone (dak- en gevelaanzichten)'], ['sec-elem', 'Belastingen per constructie-element'], ['sec-geo', 'Geometrie'], ['sec-qp', 'Stuwdruk'], ['sec-cpe', 'Coëfficiënten en zones'], ['sec-cpi', 'Inwendige druk'], ['sec-res', 'Resultaten per zone (tabel, huidige filter)'], ['sec-tot', 'Totale krachten'], ['sec-open', 'Open delen (7.3 / 7.4)'], ['sec-temp', 'Tijdelijke situatie'], ['sec-ver', 'Verificatie'], ['inputs', 'Invoergegevens (uitgangspunten)'], ['sec-ref', 'Normartikelen']];
  var RDEF = { 'sec-model': true, 'sec-summary': true, snap3d: true, zones: true, 'sec-elem': true, inputs: true };
  function buildDialog() {
    var h = '<form method="dialog" id="rForm"><h2 style="margin-top:0">Rapport samenstellen</h2><div class="dlgcols"><fieldset><legend>Onderdelen</legend>' + RSECT.map(function (q) { return '<label><input type="checkbox" name="part" value="' + q[0] + '"' + (RDEF[q[0]] ? ' checked' : '') + '> ' + q[1] + '</label>'; }).join('') + '</fieldset>';
    h += '<fieldset><legend>Rapport per zone en per element</legend><div class="small">Windrichtingen</div>' + WE.DIRS.map(function (d) { return '<label><input type="checkbox" name="dir" value="' + d.id + '" checked> ' + d.short + '</label>'; }).join('');
    h += '<div class="small" style="margin-top:6px">Dakgevallen (wind ⟂ nok, tabel 7.4a)</div>' + ['FGH−/IJ−', 'FGH−/IJ+', 'FGH+/IJ−', 'FGH+/IJ+'].map(function (c, i) { return '<label><input type="checkbox" name="case" value="' + i + '" checked> ' + (i + 1) + ': ' + c + '</label>'; }).join('');
    h += '<label style="margin-top:6px"><input type="checkbox" name="walls" checked> gevelaanzichten</label>';
    h += '<div class="small" style="margin-top:6px">Instellingen</div><label>c<sub>pi</sub> <select name="scen">' + [['S1', 'S1 gesloten (+0,2)'], ['S2', 'S2 gesloten (−0,3)'], ['S3', 'S3 openingen'], ['S4', 'S4 handmatig'], ['S5', 'S5 open grensvlak']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === 'S3' ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>';
    h += '<label>Coëfficiënten <select name="meas"><option value="loc">lokaal</option><option value="glob">globaal</option></select></label><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">Overkapping <label><input type="checkbox" name="csign" value="min" checked> opwaarts</label><label><input type="checkbox" name="csign" value="max" checked> neerwaarts</label></div><label>Waarde <select name="mode"><option value="k">karakteristiek</option><option value="d">ontwerp</option></select></label><label>Spant (§3c) <select name="frame"></select></label></fieldset></div>';
    h += '<fieldset class="dlgwide"><legend>Aannames</legend>' + assList().map(function (a, i) { return '<label><input type="checkbox" name="ass" value="' + i + '" checked> ' + a[0] + '</label>'; }).join('') + '<label for="rNotes" style="margin-top:6px">Eigen aannames en opmerkingen (één per regel; worden mee bewaard in het projectbestand)</label><textarea id="rNotes" rows="4"></textarea></fieldset>';
    h += '<p class="small" id="rHint"></p><div class="dlgbtns"><button type="button" id="rAll">Alles</button><button type="button" id="rNone">Niets</button><span style="flex:1"></span><button type="button" id="rCancel">Annuleren</button><button type="button" id="rSave">Opslaan en sluiten</button>' + (PAGE ? '' : '<button type="button" id="rPrint" class="primary">Afdrukken / PDF</button>') + '<button type="button" id="rExport"' + (PAGE ? ' class="primary"' : '') + '>Exporteren als HTML</button></div></form>';
    $('reportDlg').innerHTML = h;
    $('rHint').textContent = PAGE ? 'Deze weergave kan niet rechtstreeks afdrukken: exporteer het rapport als HTML-bestand, open het in een browser en druk af of bewaar als PDF (A4).' : 'Afdrukken opent het afdrukvenster van de browser: kies “Opslaan als PDF” en papierformaat A4; de witranden zitten in het rapport zelf (Marges “Standaard” of “Geen”). Exporteren bewaart een losstaand HTML-rapport.';
    $('rNotes').value = NOTES; $('rNotes').oninput = function () { NOTES = this.value; renderAss(); };
    $('rAll').onclick = function () { $('reportDlg').querySelectorAll('input[type=checkbox]').forEach(function (c) { c.checked = true; }); };
    $('rNone').onclick = function () { $('reportDlg').querySelectorAll('input[name=part]').forEach(function (c) { c.checked = false; }); };
    $('rCancel').onclick = function () { revertDlg(); closeDlg(); };
    $('rSave').onclick = function () { lsSet('report', JSON.stringify(reportSettings())); lsSet('notes', NOTES); DLGSNAP = null; closeDlg(); note('Rapportinstellingen bewaard (ook in het projectbestand bij Project opslaan).'); };
    $('reportDlg').oncancel = function () { revertDlg(); };
    if ($('rPrint')) $('rPrint').onclick = function () { var d = docBody(); if (!d) return; closeDlg(); printDoc(d); };
    $('rExport').onclick = function () { var d = docBody(); if (!d) return; closeDlg(); deliver('windrapport_loods_gent.html', '<!doctype html><html lang="' + I18N.get() + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + I18N.Lt('Windrapport loods Gent') + '</title><style>' + document.querySelector('style').textContent + '\nbody{background:#fff}main.rep{max-width:1100px;margin:0 auto;padding:16px;display:flex;flex-direction:column;gap:12px}@media print{.card{break-inside:auto}}</style></head><body><main class="rep">' + pageWrap(d) + '</main></body></html>', 'text/html'); };
  }
  var DLGSNAP = null, RFRAME = null;
  function fillFrameSel() {
    var f = $('rForm'); if (!f || !EL || EL.err) return;
    var cur = f.frame.value || RFRAME || $('e_frame').value;
    f.frame.innerHTML = EL.frames.map(function (fr, k) { return '<option value="' + k + '">' + fr.name + ' · y = ' + fmt(fr.y, 3) + ' m</option>'; }).join('');
    f.frame.value = cur !== null && cur !== '' && +cur < EL.frames.length ? String(cur) : String(Math.floor(EL.frames.length / 2));
  }
  function openDlg() { fillFrameSel(); DLGSNAP = { rs: reportSettings(), notes: NOTES }; var d = $('reportDlg'); if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  function revertDlg() { if (!DLGSNAP) return; applyReportSettings(DLGSNAP.rs); NOTES = DLGSNAP.notes; $('rNotes').value = NOTES; renderAss(); DLGSNAP = null; }
  function closeDlg() { var d = $('reportDlg'); if (d.close) d.close(); else d.removeAttribute('open'); }
  function docBody() {
    var f = $('rForm'), parts = [].map.call(f.querySelectorAll('input[name=part]:checked'), function (c) { return c.value; });
    var assSel = [].map.call(f.querySelectorAll('input[name=ass]:checked'), function (c) { return +c.value; }), own = notesLines();
    if (!parts.length && !assSel.length && !own.length) { $('rHint').textContent = 'Kies minstens één onderdeel.'; return null; }
    var o = OUT, head = '<section class="card"><h1 style="font-size:20px">Windbelasting tijdelijke bouwfase – loods met luifel, Gent</h1><p class="small">Windtool versie ' + APP_VERSION + ' · NBN EN 1991-1-4:2005 + ANB:2010 · rapport opgemaakt op ' + new Date().toLocaleString('nl-BE') + ' · terreincategorie ' + o.P.cat + ' · ' + o.vols.map(function (v) { return v.name + ': ' + (v.closed ? 'gesloten' : 'open'); }).join(' · ') + '</p><p class="small">Technisch rekenhulpmiddel – vervangt niet de controle en goedkeuring door een bevoegd stabiliteitsingenieur.</p></section>';
    var html = head;
    var rDirs = [].map.call(f.querySelectorAll('input[name=dir]:checked'), function (c) { return c.value; }), rCases = [].map.call(f.querySelectorAll('input[name=case]:checked'), function (c) { return +c.value; }), rSigns = [].map.call(f.querySelectorAll('input[name=csign]:checked'), function (c) { return c.value; });
    parts.forEach(function (id) {
      if (id === 'sec-elem') { html += '<section class="card zonesec"><h2>Belastingen per constructie-element</h2>' + elemReport({ dirs: rDirs, cases: rCases, signs: rSigns, scen: f.scen.value, mode: f.mode.value, frame: f.frame.value }) + '</section>'; return; }
      if (id === 'snap3d') {
        var cv = document.querySelector('#viewer canvas'), img = null;
        try { img = cv ? cv.toDataURL('image/png') : null; } catch (e) { img = null; }
        html += '<section class="card"><h2>3D-model</h2>' + (img ? '<img alt="3D-model van de loods" src="' + img + '" style="width:100%;border:1px solid #d6dde5;border-radius:6px">' : '<p class="small">3D-afbeelding niet beschikbaar.</p>') + '<p class="small">' + $('viewInfo').innerHTML.replace(/<br\s*\/?>/g, ' · ') + '</p></section>';
        return;
      }
      if (id === 'inputs') { html += '<section class="card newpage"><h2>Invoergegevens (uitgangspunten)</h2>' + inputsTable() + '</section>'; return; }
      if (id === 'zones') {
        var dirs = [].map.call(f.querySelectorAll('input[name=dir]:checked'), function (c) { return c.value; }), cases = [].map.call(f.querySelectorAll('input[name=case]:checked'), function (c) { return +c.value; });
        html += '<section class="card zonesec"><h2>Rapport per zone</h2>' + reportHTML({ scen: f.scen.value, meas: f.meas.value, signs: [].map.call(f.querySelectorAll('input[name=csign]:checked'), function (c) { return c.value; }), mode: f.mode.value, dirs: dirs, cases: cases, walls: f.walls.checked }) + '</section>';
        return;
      }
      var sec = document.getElementById(id); if (!sec) return;
      var c = sec.cloneNode(true);
      if (id === 'sec-model') c.querySelector('h2').insertAdjacentHTML('afterend', I18N.MARK + '<div class="grid2"><div><div class="svgbox">' + $('svgPlan').innerHTML + '</div></div><div><div class="svgbox">' + $('svgSec').innerHTML + '</div></div></div>');
      c.querySelectorAll('.filterbar, button, nav, select, input').forEach(function (n) { n.remove(); });
      c.querySelectorAll('details').forEach(function (n) { n.setAttribute('open', ''); });
      c.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      c.removeAttribute('id');
      html += c.outerHTML;
    });
    if (assSel.length || own.length) {
      var A = assList();
      html += '<section class="card"><h2>Aannames en te bevestigen gegevens</h2><ul class="asslist">' + assSel.map(function (k) { return '<li><b>' + A[k][0] + '.</b> ' + A[k][1] + '</li>'; }).join('') + own.map(function (t) { return '<li><b>Eigen aanname.</b> <span translate="no">' + esc(t) + '</span></li>'; }).join('') + '</ul></section>';
    }
    return I18N.L(html);
  }
  function inputsTable() {
    var h = '<div class="tablewrap"><table><tr><th class="l">Parameter</th><th class="l">Waarde</th></tr>';
    FIELDS.forEach(function (f) {
      if (f.g) { h += '<tr><td class="l" colspan="2"><b>' + f.g + '</b></td></tr>'; return; }
      if (!f.k) return;
      var id = iid(f.k), v;
      if (f.t === 'pair') v = $(id + '_on').checked ? 'aanwezig · openingen ' + esc($(id + '_op').value) + ' m²' : 'afwezig';
      else if (f.t === 'chk') v = $(id).checked ? 'ja' : 'nee';
      else if (f.t === 'sel') { var el = $(id); v = esc(el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : el.value); }
      else if (f.t === 'txt') v = esc($(id).value);
      else v = esc(String($(id).value).replace('.', ','));
      if ($(id) && $(id).disabled) return;
      h += '<tr><td class="l">' + f.l.replace(/^· /, '') + '</td><td class="l">' + v + '</td></tr>';
    });
    var nl2 = notesLines();
    return h + '</table></div>' + (nl2.length ? '<p class="small">Eigen aannames: zie onderdeel Aannames.</p>' : '');
  }
  // vaste witrand boven/onder op elke pagina (herhaalde thead/tfoot), onafhankelijk van de marge-instelling van de browser
  function pageWrap(html) { return '<table class="pgwrap" role="presentation"><thead><tr><td><div class="pgsp"></div></td></tr></thead><tfoot><tr><td><div class="pgsp"></div></td></tr></tfoot><tbody><tr><td>' + html + '</td></tr></tbody></table>'; }
  function printDoc(html) {
    var a = $('printArea'); a.innerHTML = pageWrap(html); document.body.classList.add('printing');
    var done = function () { document.body.classList.remove('printing'); a.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); setTimeout(done, 1500); }, 60);
  }

  /* ---------- tabbladen ---------- */
  var TAB = 'in', SCROLL = { in: 0, out: 0 };
  function showTab(t, noScroll) {
    if (t !== 'in' && t !== 'out') t = 'in';
    if (t !== TAB) SCROLL[TAB] = window.scrollY;
    var prev = TAB; TAB = t;
    ['in', 'out'].forEach(function (k) {
      var on = k === t, b = $('tab-' + k), p = $('pane-' + k);
      b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      p.classList.toggle('off', !on); if (on) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true');
    });
    lsSet('tab', t);
    try { history.replaceState(null, '', t === 'out' ? '#resultaten' : '#invoer'); } catch (e) { }
    if (!noScroll && prev !== t) window.scrollTo(0, SCROLL[t] || 0);
  }
  function goSection(id) {
    var el = document.getElementById(id); if (!el) return;
    var pane = el.closest('.pane'); if (pane) showTab(pane.id === 'pane-out' ? 'out' : 'in', true);
    requestAnimationFrame(function () { el.scrollIntoView({ block: 'start' }); });
  }
  function initTabs() {
    var hdr = document.querySelector('header'), setH = function () { document.documentElement.style.setProperty('--hdr', hdr.offsetHeight + 'px'); };
    setH(); if (window.ResizeObserver) new ResizeObserver(setH).observe(hdr);
    ['in', 'out'].forEach(function (k) {
      var b = $('tab-' + k);
      b.onclick = function () { showTab(k); };
      b.onkeydown = function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var o = k === 'in' ? 'out' : 'in'; showTab(o); $('tab-' + o).focus(); } };
    });
    $('grpOpen').onclick = function () { setGroups(true); }; $('grpClose').onclick = function () { setGroups(false); };
    $('btnToOut').onclick = function () { showTab('out'); window.scrollTo(0, 0); };
    document.querySelectorAll('nav.toc a').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); goSection(a.getAttribute('href').slice(1)); }; });
    var h = (location.hash || '').slice(1);
    showTab(h === 'resultaten' ? 'out' : h === 'invoer' ? 'in' : /^sec-/.test(h) ? ($(h) && $(h).closest('#pane-out') ? 'out' : 'in') : (lsGet('tab') || 'in'), true);
    // menu Bestand: sluiten na een keuze of bij klik ernaast
    var m = $('fileMenu');
    if (m) {
      m.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { m.open = false; }); });
      document.addEventListener('click', function (e) { if (m.open && !m.contains(e.target)) m.open = false; });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && m.open) { m.open = false; m.querySelector('summary').focus(); } });
    }
  }
  function fillSelects() {
    function fill(id, list) { var el = $(id), v = el.value; el.innerHTML = list.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join(''); if (v && list.some(function (o) { return o[0] === v; })) el.value = v; }
    var dn = WE.DIRS.map(function (d) { return [d.id, d.name]; });
    fill('v_dir', dn); fill('e_dir', dn);
    fill('f_dir', [['all', 'alle']].concat(WE.DIRS.map(function (d) { return [d.id, d.short]; })));
    fill('v_scen', Object.keys(SCN).map(function (k) { return [k, SCN[k]]; }));
  }
  /* ---------- taal ---------- */
  function setLang(l) {
    var vals = {};
    document.querySelectorAll('#inputs input, #inputs select').forEach(function (el) { vals[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
    var rs = $('rForm') ? reportSettings() : null;
    l = I18N.set(l); lsSet('lang', l); $('langSel').value = l;
    buildInputs();
    Object.keys(vals).forEach(function (id) { var el = $(id); if (!el) return; if (el.type === 'checkbox') el.checked = vals[id]; else el.value = vals[id]; });
    fillSelects(); buildDialog(); if (rs) applyReportSettings(rs);
    showProjName('project'); renderRef(); renderHelp(); recalc();
  }
  function init() {
    I18N.collect(); I18N.set(lsGet('lang') || 'en'); $('langSel').value = I18N.get();
    $('langSel').onchange = function () { setLang(this.value); };
    $('panel').insertAdjacentHTML('beforeend', '<div id="inputs"></div>');
    buildInputs(); setInputs(DEFAULTS);
    PAGE = !$('btnPrint');
    if (PAGE) dlCap();
    fillSelects(); $('v_scen').value = 'S3';
    var t = null;
    $('panel').addEventListener('input', function () { clearTimeout(t); t = setTimeout(recalc, 250); });
    $('panel').addEventListener('change', function () { clearTimeout(t); recalc(); });
    $('btnReset').onclick = function () { setInputs(DEFAULTS); recalc(); };
    if ($('btnPrint')) $('btnPrint').onclick = function () { window.print(); };
    $('btnCsv').onclick = csv; $('btnJson').onclick = json;
    $('exportClose').onclick = function () { $('exportBox').hidden = true; };
    ['f_surf', 'f_dir'].forEach(function (id) { $(id).onchange = renderRes; });
    ['e_frame', 'e_dir', 'e_case', 'e_scen', 'e_sign', 'e_lay', 'e_mode', 'e_cpe'].forEach(function (id) { $(id).onchange = function () { if (OUT) renderElem(); }; });
    initTabs();
    ['r_scen', 'r_meas', 'r_sign', 'r_mode', 'r_dir'].forEach(function (id) { $(id).onchange = renderReport; });
    buildDialog();
    try { var lr = JSON.parse(lsGet('report') || 'null'); if (lr) applyReportSettings(lr); } catch (e) { }
    if (lsGet('notes')) { NOTES = lsGet('notes'); $('rNotes').value = NOTES; }
    $('btnReportDlg').onclick = openDlg; if ($('btnReport2')) $('btnReport2').onclick = openDlg;
    $('btnSave').onclick = saveProject;
    $('btnOpen').onclick = function () {
      if (!PAGE && window.showOpenFilePicker) {
        lastHandle('project').then(function (lh) {
          var opt = { id: 'windproject', types: [{ description: 'Projectbestand', accept: { 'application/json': ['.json'] } }] };
          if (lh) opt.startIn = lh;
          return window.showOpenFilePicker(opt).catch(function (e) { if (e && e.name !== 'AbortError' && opt.startIn) { delete opt.startIn; return window.showOpenFilePicker(opt); } throw e; });
        }).then(function (hs) { var h = hs[0]; return h.getFile().then(function (file) { rememberHandle('project', h); openProject(file); }); })
          .catch(function (e) { if (e && e.name === 'AbortError') return; $('fileIn').value = ''; $('fileIn').click(); });
        return;
      }
      $('fileIn').value = ''; $('fileIn').click();
    };
    showProjName('project');
    $('fileIn').onchange = function () { openProject(this.files && this.files[0]); };
    var panel = $('panel');
    panel.addEventListener('dragover', function (e) { e.preventDefault(); });
    panel.addEventListener('drop', function (e) { e.preventDefault(); var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) openProject(f); });
    function sel() {
      SEL.dir = $('v_dir').value; SEL.scen = $('v_scen').value; SEL.caseId = $('v_case').value;
      ['meas', 'sign', 'lay', 'mode'].forEach(function (n) { SEL[n] = document.querySelector('input[name=' + n + ']:checked').value; });
      $('v_case').disabled = !(SEL.dir === 'L' || SEL.dir === 'R');
      $('s_lay').classList.toggle('dis', SEL.meas !== 'glob');
      if ($('in_mode').value !== SEL.mode) $('in_mode').value = SEL.mode;
      if (OUT) { renderSummary(); if (window.View3D) View3D.update(OUT, SEL); }
    }
    ['v_dir', 'v_scen', 'v_case'].forEach(function (id) { $(id).onchange = sel; });
    document.querySelectorAll('.ctrlbar input').forEach(function (i) { i.onchange = sel; });
    $('s_lay').classList.add('dis');
    renderRef(); renderHelp(); recalc();
  }
  window.WindUI = { fmt: fmt, PN: PN, DIRN: DIRN, cn: cn };
  document.addEventListener('DOMContentLoaded', init);
})();
