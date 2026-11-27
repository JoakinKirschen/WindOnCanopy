/* Belastingen per constructie-element (uit de resultaten van WE.compute):
   spanten (lijnlasten per spant, steunpuntsreacties per kolomlijn), kolommen in kopgevels,
   gordingen, gevelregels, gevelkolommen en windverbanden in langsrichting.
   Coördinaten: x dwars (as 1 = 0), y langs (as A = 0), z omhoog. Teken w: + = druk naar het vlak toe. */
var WEL = (function () {
  'use strict';
  function nl(v, d) { return v.toFixed(d).replace('.', ','); }
  function ov(a0, a1, b0, b1) { return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); }
  var LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function frameNames(n) { var o = []; for (var i = 0; i < n; i++) o.push(i < 26 ? LET[i] : 'S' + (i + 1)); return o; }

  /* spantposities uit tekst: scheiding ";" of spatie, decimaalteken komma of punt */
  function parseFrames(txt) {
    var parts = String(txt || '').trim().split(/[;\s]+/).filter(Boolean), ys = [];
    for (var i = 0; i < parts.length; i++) { var v = parseFloat(parts[i].replace(',', '.')); if (!isFinite(v) || !/^-?\d+([.,]\d+)?$/.test(parts[i])) return { err: '“' + parts[i] + '” is geen getal.' }; ys.push(v); }
    if (ys.length < 2) return { err: 'Geef minstens twee spantposities.' };
    for (var k = 1; k < ys.length; k++) if (ys[k] <= ys[k - 1] + 1e-6) return { err: 'Posities moeten strikt stijgend zijn.' };
    if (ys[0] < -1e-6) return { err: 'Posities ≥ 0 (as A = 0).' };
    return { ys: ys };
  }
  // standaard: spantassen uit grondplan 2161/A (A–B 7,034; B–G 5 vakken; G–L 5 vakken; L–O 3 vakken; O–P 7,034)
  function planFrames() {
    var y = [0, 7.034], k;
    for (k = 1; k <= 5; k++) y.push(7.034 + k * (43.674 - 7.034) / 5);
    for (k = 1; k <= 5; k++) y.push(43.674 + k * 36.661 / 5);
    for (k = 1; k <= 3; k++) y.push(80.335 + k * (109.439 - 7.034 - 80.335) / 3);
    y.push(109.439);
    return y.map(function (v) { return Math.round(v * 1000) / 1000; });
  }
  function fmtFrames(ys) { return ys.map(function (v) { return nl(v, 3); }).join('; '); }

  function compute(O) {
    var P = O.P, S = P.str, B = O.B, spans = O.spans, X = O.X, W = O.walls;
    var cscd = P.cscd, res = { checks: [], warnings: [] };
    var pf = parseFrames(S.frames); if (pf.err) { res.err = pf.err; return res; }
    var ys = pf.ys.filter(function (y) { return y <= B + 1e-6; }), nm = frameNames(ys.length);
    if (ys.length < pf.ys.length) res.warnings.push('Spantposities voorbij de lengte B = ' + nl(B, 3) + ' m genegeerd.');
    if (ys.length < 2) { res.err = 'Minstens twee spanten binnen de lengte B nodig.'; return res; }
    if (ys[0] > 0.01 || ys[ys.length - 1] < B - 0.01) res.warnings.push('Eerste/laatste spant ligt niet op de kopgevel: de randstrook wordt aan het eerste/laatste spant toegekend.');
    var frames = ys.map(function (y, k) { var ya = k ? (ys[k - 1] + y) / 2 : 0, yb = k < ys.length - 1 ? (y + ys[k + 1]) / 2 : B; return { k: k, name: nm[k], y: y, ya: ya, yb: yb, dy: yb - ya }; });
    var bays = []; for (var k = 0; k < ys.length - 1; k++) bays.push({ k: k, name: nm[k] + '–' + nm[k + 1], y0: ys[k], y1: ys[k + 1], L: ys[k + 1] - ys[k] });
    if (ys[0] > 1e-6) bays.unshift({ k: -1, name: 'rand A', y0: 0, y1: ys[0], L: ys[0] });
    if (ys[ys.length - 1] < B - 1e-6) bays.push({ k: -2, name: 'rand P', y0: ys[ys.length - 1], y1: B, L: B - ys[ys.length - 1] });
    function bayL(y0, y1) { var L = 0; bays.forEach(function (b) { if (ov(b.y0, b.y1, y0, y1) > 1e-6) L = Math.max(L, b.L); }); return L; }
    res.frames = frames; res.bays = bays; res.Lmax = Math.max.apply(null, bays.map(function (b) { return b.L; }));

    /* kolomlijnen en spanten (vakwerkliggers, scharnierend opgelegd per overspanning / per luifelveld) */
    var LN = ['as 1', 'as 7', 'as 13', 'as 14'];
    var lines = X.map(function (x, i) { return { i: i, x: x, name: LN[i] }; });
    var trusses = [];
    spans.forEach(function (s) {
      var nb = (s.nb > 1 || s.luifel) ? s.nb : 1, d = s.w / nb;
      var idx = [s.i];
      for (var b = 1; b < nb; b++) { lines.push({ i: lines.length, x: s.x0 + b * d, name: 'as 13–14 kolom ' + b }); idx.push(lines.length - 1); }
      idx.push(s.i + 1);
      for (var t = 0; t < nb; t++) trusses.push({ span: s.i, bay: t + 1, x0: s.x0 + t * d, x1: s.x0 + (t + 1) * d, l0: idx[t], l1: idx[t + 1], on: s.roofOn });
    });
    var order = lines.slice().sort(function (a, b) { return a.x - b.x; });
    res.lines = lines; res.lineOrder = order.map(function (l) { return l.i; }); res.trusses = trusses;
    function trussAt(span, x) { var c = trusses.filter(function (t) { return t.span === span && x >= t.x0 - 1e-9 && x <= t.x1 + 1e-9; }); return c[0]; }

    /* --- combinaties --- */
    var closedRoof = O.zones.filter(function (z) { return z.kind === 'roof'; }), closedEnd = O.zones.filter(function (z) { return z.kind === 'end'; });
    var anyClosed = O.zones.length > 0;
    function closedCombos(d) {
      if (!anyClosed) return [null];
      var zr = closedRoof.filter(function (z) { return z.dir === d; }), zall = O.zones.filter(function (z) { return z.dir === d; });
      var cids = zr.length ? Object.keys(zr[0].res) : ['-'];
      var sc = O.scen.filter(function (s) { return s.on && zall.every(function (z) { var r = z.res[z.kind === 'roof' ? cids[0] : '-']; return r && r.per[s.id]; }); }).map(function (s) { return s.id; });
      var o = []; cids.forEach(function (c) { sc.forEach(function (s) { o.push({ dir: d, cid: c, scen: s }); }); });
      return o.length ? o : [null];
    }
    function canCombos() { if (!O.canopies.length) return [null]; var o = []; ['min', 'max'].forEach(function (s) { ['beide', 'links', 'rechts'].forEach(function (l) { o.push({ sign: s, lay: l }); }); }); return o; }
    res.closedCombos = closedCombos; res.canCombos = canCombos;

    /* --- belastingen op één spant --- */
    function zeroC() { return { V: lines.map(function () { return 0; }), Hb: lines.map(function () { return 0; }), Ht: lines.map(function () { return 0; }), Hroof: 0, Vsum: 0, Hwall: 0, segs: [], pts: [], cols: [] }; }
    function addPoint(C, span, x, Fv, Fh) {
      var t = trussAt(span, x); if (!t) return;
      var L = t.x1 - t.x0; C.V[t.l0] += Fv * (t.x1 - x) / L; C.V[t.l1] += Fv * (x - t.x0) / L; C.Vsum += Fv; C.Hroof += Fh;
    }
    function closedFrame(fr, cb) {
      var C = zeroC(); if (!cb) return C;
      spans.forEach(function (s) {
        var zs = closedRoof.filter(function (z) { return z.span === s.i && z.dir === cb.dir && ov(z.y0, z.y1, fr.ya, fr.yb) > 1e-9 && z.res[cb.cid] && z.res[cb.cid].per[cb.scen]; });
        if (!zs.length) return;
        var xs = []; zs.forEach(function (z) { xs.push(z.x0, z.x1); }); xs.sort(function (a, b) { return a - b; });
        xs = xs.filter(function (v, i, a) { return i === 0 || v - a[i - 1] > 1e-9; });
        var ca = Math.cos(s.alpha * Math.PI / 180);
        for (var i = 0; i < xs.length - 1; i++) {
          var a = xs[i], b = xs[i + 1], xm = (a + b) / 2, q = 0, qh = 0, names = [], wsum = 0, wdy = 0, pitch = null, csum = 0, cpi = null;
          zs.forEach(function (z) {
            if (xm < z.x0 || xm > z.x1) return;
            var dy = ov(z.y0, z.y1, fr.ya, fr.yb), w = z.res[cb.cid].per[cb.scen].wGlob, n = O.normal(z), qq = cscd * w * dy;
            q += qq; qh += -qq / ca * n[0]; wsum += w * dy; wdy += dy; pitch = z.pitch; csum += z.res[cb.cid].cGlob * dy; cpi = z.res[cb.cid].per[cb.scen].cpi;
            if (names.indexOf(z.name) < 0) names.push(z.name);
          });
          if (wdy < 1e-9) continue;
          var last = C.segs[C.segs.length - 1];
          if (last && last.span === s.i && Math.abs(last.x1 - a) < 1e-9 && Math.abs(last.q - q) < 1e-9 && last.pitch === pitch && last.zones === names.join('+')) { last.x1 = b; }
          else C.segs.push({ span: s.i, pitch: pitch, zones: names.join('+'), x0: a, x1: b, w: wsum / wdy, q: q, qh: qh, ca: ca, cpe: csum / wdy, cpi: cpi });
        }
      });
      C.segs.forEach(function (g) { addPoint(C, g.span, (g.x0 + g.x1) / 2, g.q * (g.x1 - g.x0), g.qh * (g.x1 - g.x0)); });
      // kolommen in kopgevels (gesloten volumes): scharnierend in voet en op spanthoogte
      var walls = {};
      closedEnd.forEach(function (z) {
        if (z.dir !== cb.dir || !z.res['-'].per[cb.scen]) return;
        var dy = ov(z.a0, z.a1, fr.ya, fr.yb); if (dy < 1e-9) return;
        var wl = W[z.part], H = wl.H, w = z.res['-'].per[cb.scen].wGlob, n = O.normal(z), sgn = -n[0];
        var o = walls[z.part] || (walls[z.part] = { part: z.part, x: wl.x, line: X.indexOf(wl.x), H: H, side: n[0], segs: [], names: [] });
        if (o.names.indexOf(z.name) < 0) o.names.push(z.name);
        var hO = 0, dyo = 0;
        if (z.part === 'W0' && P.fase2.on) { dyo = ov(z.a0, z.a1, Math.max(fr.ya, P.fase2.y0), Math.min(fr.yb, P.fase2.y0 + P.fase2.L)); hO = Math.min(P.fase2.H, H); }
        if (dyo > 1e-9 && hO > 0) { o.segs.push({ z0: 0, z1: hO, q: cscd * w * (dy - dyo) * sgn, w: w }); o.segs.push({ z0: hO, z1: H, q: cscd * w * dy * sgn, w: w }); }
        else o.segs.push({ z0: 0, z1: H, q: cscd * w * dy * sgn, w: w });
      });
      Object.keys(walls).forEach(function (pid) {
        var o = walls[pid], br = [0, o.H];
        o.segs.forEach(function (g) { br.push(g.z0, g.z1); }); br.sort(function (a, b) { return a - b; }); br = br.filter(function (v, i, a) { return i === 0 || v - a[i - 1] > 1e-9; });
        var segs = [];
        for (var i = 0; i < br.length - 1; i++) { var zm = (br[i] + br[i + 1]) / 2, q = 0; o.segs.forEach(function (g) { if (zm >= g.z0 && zm <= g.z1) q += g.q; }); segs.push({ z0: br[i], z1: br[i + 1], q: q }); }
        o.segs = segs;
        var Rt = 0, Rb = 0, F = 0;
        segs.forEach(function (g) { var Fq = g.q * (g.z1 - g.z0), zc = (g.z0 + g.z1) / 2; F += Fq; Rt += Fq * zc / o.H; Rb += Fq * (o.H - zc) / o.H; });
        var Mmax = 0; for (var j = 0; j <= 80; j++) { var zz = o.H * j / 80, M = Rb * zz; segs.forEach(function (g) { var a = g.z0, b = Math.min(g.z1, zz); if (b > a) M -= g.q * (b - a) * (zz - (a + b) / 2); }); if (Math.abs(M) > Math.abs(Mmax)) Mmax = M; }
        o.F = F; o.Rt = Rt; o.Rb = Rb; o.M = Mmax;
        if (o.line >= 0) { C.Hb[o.line] += Rb; C.Ht[o.line] += Rt; }
        C.Hwall += F; C.cols.push(o);
      });
      return C;
    }
    function canFrame(fr, d, cb) {
      var C = zeroC(); if (!cb) return C;
      O.canopies.forEach(function (e) {
        var r = e.byDir[d], b = r.P.b, dyc = ov(e.y0, e.y0 + b, fr.ya, fr.yb); if (dyc < 1e-9) return;
        var ca = Math.cos(r.P.alpha * Math.PI / 180), dd = r.P.d;
        r.pitches.forEach(function (p) {
          var on = cb.lay === 'beide' || (cb.lay === 'links' && p.pitch === 'L') || (cb.lay === 'rechts' && p.pitch === 'R'); if (!on) return;
          var w = cb.sign === 'max' ? p.wMax : p.wMin, Fn = cscd * w * (dd / 2) / ca * dyc, Fv = Fn * p.n[1], Fh = -Fn * p.n[0];
          var x0 = e.x0 + (p.bay - 1) * dd + (p.pitch === 'L' ? 0 : dd / 2);
          C.pts.push({ span: e.span, bay: p.bay, pitch: p.pitch, x: e.x0 + p.xc, x0: x0, x1: x0 + dd / 2, w: w, cf: cb.sign === 'max' ? p.cfMax : p.cfMin, q: cscd * w * dyc, F: Fn, Fv: Fv, Fh: Fh, ca: ca });
          addPoint(C, e.span, e.x0 + p.xc, Fv, Fh);
        });
      });
      return C;
    }
    function sum(a, b) { var C = zeroC(); ['V', 'Hb', 'Ht'].forEach(function (k) { C[k] = a[k].map(function (v, i) { return v + b[k][i]; }); }); C.Hroof = a.Hroof + b.Hroof; C.Vsum = a.Vsum + b.Vsum; C.Hwall = a.Hwall + b.Hwall; C.segs = a.segs; C.pts = b.pts; C.cols = a.cols; C.Htop = C.Hroof + C.Ht.reduce(function (s, v) { return s + v; }, 0); return C; }
    res.frameLoads = function (k, sel) { var fr = frames[k]; return sum(closedFrame(fr, sel.closed), canFrame(fr, sel.dir, sel.can)); };
    res.trussOf = trussAt;

    /* --- omhullende per spant en kolomlijn --- */
    var DN = {}; WE.DIRS.forEach(function (d) { DN[d.id] = d; });
    function desc(d, cc, kc) { return DN[d].short + (cc ? (cc.cid !== 'θ=90°' && cc.cid !== '-' ? ' · ' + cc.cid : '') + ' · ' + cc.scen : '') + (kc ? ' · overk. ' + (kc.sign === 'min' ? 'opw.' : 'neerw.') + (kc.lay !== 'beide' ? ' (' + kc.lay + ')' : '') : ''); }
    var env = frames.map(function (fr) {
      var E = { Vmax: lines.map(function () { return null; }), Vmin: lines.map(function () { return null; }), Hbmax: lines.map(function () { return null; }), Hbmin: lines.map(function () { return null; }), Htmax: null, Htmin: null };
      WE.DIRS.forEach(function (d) {
        var cl = closedCombos(d.id).map(function (cc) { return { cc: cc, C: closedFrame(fr, cc) }; }), kn = canCombos().map(function (kc) { return { kc: kc, C: canFrame(fr, d.id, kc) }; });
        cl.forEach(function (a) {
          kn.forEach(function (b) {
            var T = sum(a.C, b.C), ds = null, g = function () { return ds || (ds = desc(d.id, a.cc, b.kc)); };
            lines.forEach(function (l, i) {
              if (!E.Vmax[i] || T.V[i] > E.Vmax[i].v) E.Vmax[i] = { v: T.V[i], d: g() };
              if (!E.Vmin[i] || T.V[i] < E.Vmin[i].v) E.Vmin[i] = { v: T.V[i], d: g() };
              if (!E.Hbmax[i] || T.Hb[i] > E.Hbmax[i].v) E.Hbmax[i] = { v: T.Hb[i], d: g() };
              if (!E.Hbmin[i] || T.Hb[i] < E.Hbmin[i].v) E.Hbmin[i] = { v: T.Hb[i], d: g() };
            });
            if (!E.Htmax || T.Htop > E.Htmax.v) E.Htmax = { v: T.Htop, d: g() };
            if (!E.Htmin || T.Htop < E.Htmin.v) E.Htmin = { v: T.Htop, d: g() };
          });
        });
      });
      return E;
    });
    res.env = env;
    // maatgevend per kolomlijn over alle spanten
    res.lineGov = lines.map(function (l, i) {
      var o = { line: l, max: null, min: null, hb: null };
      env.forEach(function (E, k) {
        if (!o.max || E.Vmax[i].v > o.max.v) o.max = { v: E.Vmax[i].v, d: E.Vmax[i].d, f: frames[k].name };
        if (!o.min || E.Vmin[i].v < o.min.v) o.min = { v: E.Vmin[i].v, d: E.Vmin[i].d, f: frames[k].name };
        var hb = Math.abs(E.Hbmax[i].v) >= Math.abs(E.Hbmin[i].v) ? E.Hbmax[i] : E.Hbmin[i];
        if (!o.hb || Math.abs(hb.v) > Math.abs(o.hb.v)) o.hb = { v: hb.v, d: hb.d, f: frames[k].name };
      });
      return o;
    });

    /* --- gordingen (dak) --- */
    var sP = S.sP, sR = S.sR, sC = S.sCol;
    function grp(map, key, base) { return map[key] || (map[key] = base); }
    function upd(o, w, L, s, A, cpe, d) { if (!o.max || w > o.max.w) o.max = { w: w, cpe: cpe, d: d }; if (!o.min || w < o.min.w) o.min = { w: w, cpe: cpe, d: d }; o.L = Math.max(o.L, L); o.A = Math.max(o.A, A); }
    var pg = {};
    closedRoof.forEach(function (z) {
      var L = bayL(z.y0, z.y1), A = L * sP, o = grp(pg, z.part + '|' + z.name, { part: z.part, zone: z.name, kind: 'gesloten', L: 0, A: 0, s: sP, max: null, min: null });
      Object.keys(z.res).forEach(function (cid) {
        var r = z.res[cid], cpe = WE.cpeArea(r.c1, r.c10, A);
        Object.keys(r.per).forEach(function (sid) { var p = r.per[sid]; if (!p.on) return; upd(o, p.wGlob + z.qp * (cpe - r.cGlob) / 1000, L, sP, A, cpe, DN[z.dir].short + (cid !== 'θ=90°' ? ' · ' + cid : '') + ' · ' + sid); });
      });
    });
    O.canopies.forEach(function (e) {
      WE.DIRS.forEach(function (d) {
        e.byDir[d.id].zones.forEach(function (z) {
          var L = bayL(e.y0 + z.y0, e.y0 + z.y1), o = grp(pg, e.part + '|' + z.name, { part: e.part, zone: z.name, kind: 'overkapping', L: 0, A: 0, s: sP, max: null, min: null });
          upd(o, z.wMax, L, sP, L * sP, z.cpMax, d.short + ' · ψ·c_p,net max');
          upd(o, z.wMin, L, sP, L * sP, z.cpMin, d.short + ' · ψ·c_p,net min');
        });
      });
    });
    res.purlins = Object.keys(pg).map(function (k) { return pg[k]; }).sort(function (a, b) { return a.part < b.part ? -1 : a.part > b.part ? 1 : (a.zone < b.zone ? -1 : 1); });

    /* --- gevelregels en gevelkolommen --- */
    var rg = {}, gc = {};
    O.zones.forEach(function (z) {
      if (z.kind === 'roof') return;
      var r = z.res['-'], end = z.kind === 'end';
      var L = end ? bayL(z.a0, z.a1) : sC, A = L * sR, cpe = WE.cpeArea(r.c1, r.c10, A);
      var o = grp(rg, z.part + '|' + z.name, { part: z.part, zone: z.name, kind: end ? 'kopgevel' : 'langsgevel', L: 0, A: 0, s: sR, max: null, min: null });
      Object.keys(r.per).forEach(function (sid) { var p = r.per[sid]; if (!p.on) return; upd(o, p.wGlob + z.qp * (cpe - r.cGlob) / 1000, L, sR, A, cpe, DN[z.dir].short + ' · ' + sid); });
      if (!end) {
        var H = z.H, Ac = H * sC, cpc = WE.cpeArea(r.c1, r.c10, Ac), g = grp(gc, z.part + '|' + z.name, { part: z.part, zone: z.name, H: 0, A: 0, L: 0, s: sC, max: null, min: null });
        Object.keys(r.per).forEach(function (sid) { var p = r.per[sid]; if (!p.on) return; upd(g, cscd * (p.wGlob + z.qp * (cpc - r.cGlob) / 1000), H, sC, Ac, cpc, DN[z.dir].short + ' · ' + sid); });
        g.H = Math.max(g.H, H);
      }
    });
    O.free.forEach(function (z) {
      var L = z.wkind === 'end' ? bayL(z.a0, z.a1) : sC, o = grp(rg, z.part + '|' + z.name, { part: z.part, zone: z.name, kind: 'vrijstaand (7.4)', L: 0, A: 0, s: sR, max: null, min: null });
      upd(o, Math.abs(z.w), L, sR, L * sR, Math.abs(z.cp), 'c_p,net ±'); upd(o, -Math.abs(z.w), L, sR, L * sR, -Math.abs(z.cp), 'c_p,net ±');
    });
    var PO = ['W0', 'W1', 'W2', 'W3', 'A0', 'A1', 'A2', 'P0', 'P1', 'P2'], srt = function (a, b) { return PO.indexOf(a.part) - PO.indexOf(b.part) || (a.zone < b.zone ? -1 : a.zone > b.zone ? 1 : 0); };
    res.rails = Object.keys(rg).map(function (k) { return rg[k]; }).sort(srt);
    res.gcols = Object.keys(gc).map(function (k) { return gc[k]; }).sort(srt);

    /* --- langsrichting: windverbanden (wind van as A / as P) --- */
    var lon = [];
    ['A', 'P'].forEach(function (d) {
      var sgn = d === 'A' ? 1 : -1;
      // wrijving gesloten volumes (EN 5.3(3)-(4), 7.5)
      var fr = [];
      O.vols.forEach(function (v) {
        if (!v.closed) return;
        var zq = closedRoof.filter(function (z) { return z.vol === v.i && z.dir === d; })[0] || O.zones.filter(function (z) { return z.vol === v.i && z.dir === d; })[0]; if (!zq) return;
        var lim = Math.min(2 * v.Vx, 4 * v.h), y0 = d === 'A' ? lim : 0, y1 = d === 'A' ? B : B - lim, Afr = 0, Apar = 0, Aperp = 0;
        v.spans.forEach(function (i) {
          var s = spans[i], ca = Math.cos(s.alpha * Math.PI / 180);
          if (s.roofOn) { Afr += s.w / ca * ov(s.yp[0], s.yp[1], y0, y1); Apar += s.w / ca * (s.yp[1] - s.yp[0]); }
          ['A', 'P'].forEach(function (f) { var w = W[f + i]; if (w.on) Aperp += w.A; });
        });
        [v.left, v.right].forEach(function (wid) { var w = W[wid]; if (w.on) { Afr += w.H * Math.max(0, y1 - y0); Apar += w.H * B; } });
        var F = P.str.cfrB * zq.qp * Afr / 1000, neg = Apar <= 4 * Aperp;
        fr.push({ vol: v.i, name: v.name, lim: lim, Lf: Math.max(0, y1 - y0), Afr: Afr, Apar: Apar, Aperp: Aperp, qp: zq.qp, F: F, neg: neg });
      });
      var canF = O.canopies.reduce(function (a, e) { return a + e.byDir[d].fric.langs.F; }, 0);
      O.scen.forEach(function (s) {
        if (!s.on) return;
        var ts = O.totals.filter(function (t) { return t.dir === d && t.scen === s.id && (t.kind === 'A' || t.kind === 'P'); }); if (!ts.length && !canF) return;
        var Fw = 0, Fl = 0; ts.forEach(function (t) { if ((d === 'A' && t.kind === 'A') || (d === 'P' && t.kind === 'P')) Fw += sgn * t.F[1]; else Fl += sgn * t.F[1]; });
        var Ff = fr.reduce(function (a, f) { return a + (f.neg ? 0 : f.F); }, 0);
        lon.push({ dir: d, scen: s.id, Fw: Fw, Fl: Fl, Ffr: Ff, FfrAll: fr.reduce(function (a, f) { return a + f.F; }, 0), Fcan: canF, F: Fw + Fl + Ff + canF });
      });
      res['fric' + d] = fr;
    });
    res.long = lon;

    /* --- controles --- */
    var C = res.checks;
    function chk(name, ok, det) { C.push({ name: name, ok: !!ok, detail: det }); }
    var nOK = 0, nAll = 0, worst = 0;
    WE.DIRS.forEach(function (d) {
      closedCombos(d.id).forEach(function (cc) {
        if (!cc) return;
        var sV = 0, sW = {};
        frames.forEach(function (fr) { var c = closedFrame(fr, cc); sV += c.Vsum; c.cols.forEach(function (o) { sW[o.part] = (sW[o.part] || 0) + o.F; }); });
        var tV = -O.totals.filter(function (t) { return t.kind === 'roof' && t.dir === d.id && t.caseId === cc.cid && t.scen === cc.scen; }).reduce(function (a, t) { return a + t.F[2]; }, 0);
        var e1 = Math.abs(sV - tV), e2 = 0;
        O.totals.filter(function (t) { return t.kind === 'end' && t.dir === d.id && t.scen === cc.scen; }).forEach(function (t) { e2 = Math.max(e2, Math.abs(Math.abs(sW[t.part] || 0) - Math.abs(t.Fn)) / Math.max(1, Math.abs(t.Fn))); });
        worst = Math.max(worst, e1); nAll++; if (e1 < 1e-6 * Math.max(1, Math.abs(tV)) && e2 < 1e-9) nOK++;
      });
    });
    if (nAll) chk('Σ lijnlasten alle spanten = totale dak- en kopgevelkracht (alle richtingen, gevallen, scenario’s)', nOK === nAll, nOK + '/' + nAll + ' combinaties, max. verschil ' + nl(worst, 6) + ' kN');
    if (O.canopies.length) {
      var okc = true, nc = 0;
      WE.DIRS.forEach(function (d) { canCombos().forEach(function (kc) { var sV = 0; frames.forEach(function (fr) { sV += canFrame(fr, d.id, kc).Vsum; }); var a = O.canopies.reduce(function (s, e) { return s - e.byDir[d.id].arrangements.filter(function (r) { return r.sign === kc.sign && r.lay === kc.lay; })[0].Fz; }, 0); nc++; if (Math.abs(sV - a) > 1e-6 * Math.max(1, Math.abs(a))) okc = false; }); });
      chk('Σ spantbelastingen overkapping = globale kracht fig. 7.17 (alle opstellingen)', okc, nc + ' combinaties');
    }
    var eqOK = true;
    frames.forEach(function (fr, k) { var T = res.frameLoads(k, { dir: 'R', closed: closedCombos('R')[0], can: canCombos()[0] }), sR2 = T.V.reduce(function (a, v) { return a + v; }, 0); if (Math.abs(sR2 - T.Vsum) > 1e-6 * Math.max(1, Math.abs(T.Vsum))) eqOK = false; });
    chk('Evenwicht per spant: Σ verticale reacties = Σ verticale belasting', eqOK, frames.length + ' spanten');
    chk('Invloedsbreedtes spanten sluiten aan en dekken de lengte B', Math.abs(frames.reduce(function (a, f) { return a + f.dy; }, 0) - B) < 1e-9 && frames.every(function (f, k) { return !k || Math.abs(f.ya - frames[k - 1].yb) < 1e-12; }), frames.length + ' spanten, Σ = ' + nl(B, 3) + ' m');
    return res;
  }
  return { compute: compute, parseFrames: parseFrames, planFrames: planFrames, fmtFrames: fmtFrames, frameNames: frameNames };
})();
if (typeof module !== 'undefined') module.exports = WEL;
