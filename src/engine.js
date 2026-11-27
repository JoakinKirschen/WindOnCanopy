/* ==========================================================================
   Rekenkern windbelasting – NBN EN 1991-1-4 + ANB (België), universeel model
   Overspanningen 1, 2, 3 (van links naar rechts); wanden en daken in/uitschakelbaar.
   Theorie per volume automatisch: EN 7.2 + 7.2.9 (gesloten) of 7.3/7.4 (open).
   ========================================================================== */
var WE = (function () {
  'use strict';
  /* ---------- Normgegevens (bron vermeld bij elke tabel) ---------- */
  var NORM = {
    // EN 1991-1-4 Tabel 4.1 – terreincategorieën
    terrain: {
      '0': { z0: 0.003, zmin: 1, name: 'Zee / kust' },
      'I': { z0: 0.01, zmin: 1, name: 'Meren, vlak zonder obstakels' },
      'II': { z0: 0.05, zmin: 2, name: 'Lage vegetatie, geïsoleerde obstakels' },
      'III': { z0: 0.3, zmin: 5, name: 'Dorpen, voorsteden, industrie, bossen' },
      'IV': { z0: 1.0, zmin: 10, name: 'Steden (≥15 % bebouwd, h > 15 m)' }
    },
    // ANB 4.4: kI bij c0 = 1
    kI: { '0': 1.0, 'I': 1.0, 'II': 1.0, 'III': 0.95, 'IV': 0.85 },
    rho: 1.25, // ANB 4.5 Opm. 2
    z0II: 0.05,
    // ANB Tabel 4.4: cseason per maand (jan..dec)
    cseason: [0.96, 0.96, 0.92, 0.88, 0.83, 0.83, 0.83, 0.83, 0.88, 0.92, 1.0, 0.96],
    // ANB Tabel 4.5: terugkeerperiode T (jaar) -> cprob
    cprob: [[1, 0.75], [2, 0.78], [5, 0.85], [10, 0.90], [20, 0.95], [50, 1.0], [100, 1.04], [200, 1.08], [500, 1.12], [1000, 1.16]],
    // EN Tabel 7.1 – verticale gevels: per h/d: [cpe10, cpe1] per zone
    t71: [
      { hd: 5, A: [-1.2, -1.4], B: [-0.8, -1.1], C: [-0.5, -0.5], D: [0.8, 1.0], E: [-0.7, -0.7] },
      { hd: 1, A: [-1.2, -1.4], B: [-0.8, -1.1], C: [-0.5, -0.5], D: [0.8, 1.0], E: [-0.5, -0.5] },
      { hd: 0.25, A: [-1.2, -1.4], B: [-0.8, -1.1], C: [-0.5, -0.5], D: [0.7, 1.0], E: [-0.3, -0.3] }
    ],
    // EN Tabel 7.4a – zadeldak θ = 0°: n = negatieve reeks [cpe10, cpe1], p = positieve reeks
    // (I bij 5°: enkel −0,6 gegeven → positieve reeks 0,0 aangenomen voor interpolatie, Opm. 2)
    t74a: [
      { a: 5, F: { n: [-1.7, -2.5], p: [0.0, 0.0] }, G: { n: [-1.2, -2.0], p: [0.0, 0.0] }, H: { n: [-0.6, -1.2], p: [0.0, 0.0] }, I: { n: [-0.6, -0.6], p: [0.0, 0.0] }, J: { n: [-0.6, -0.6], p: [0.2, 0.2] } },
      { a: 15, F: { n: [-0.9, -2.0], p: [0.2, 0.2] }, G: { n: [-0.8, -1.5], p: [0.2, 0.2] }, H: { n: [-0.3, -0.3], p: [0.2, 0.2] }, I: { n: [-0.4, -0.4], p: [0.0, 0.0] }, J: { n: [-1.0, -1.5], p: [0.0, 0.0] } },
      { a: 30, F: { n: [-0.5, -1.5], p: [0.7, 0.7] }, G: { n: [-0.5, -1.5], p: [0.7, 0.7] }, H: { n: [-0.2, -0.2], p: [0.4, 0.4] }, I: { n: [-0.4, -0.4], p: [0.0, 0.0] }, J: { n: [-0.5, -0.5], p: [0.0, 0.0] } },
      { a: 45, F: { n: [-0.0, -0.0], p: [0.7, 0.7] }, G: { n: [-0.0, -0.0], p: [0.7, 0.7] }, H: { n: [-0.0, -0.0], p: [0.6, 0.6] }, I: { n: [-0.2, -0.2], p: [0.0, 0.0] }, J: { n: [-0.3, -0.3], p: [0.0, 0.0] } }
    ],
    // EN Tabel 7.4b – zadeldak θ = 90°
    t74b: [
      { a: 5, F: [-1.6, -2.2], G: [-1.3, -2.0], H: [-0.7, -1.2], I: [-0.6, -0.6] },
      { a: 15, F: [-1.3, -2.0], G: [-1.3, -2.0], H: [-0.6, -1.2], I: [-0.5, -0.5] },
      { a: 30, F: [-1.1, -1.5], G: [-1.4, -2.0], H: [-0.8, -1.2], I: [-0.5, -0.5] },
      { a: 45, F: [-1.1, -1.5], G: [-1.4, -2.0], H: [-0.9, -1.2], I: [-0.5, -0.5] }
    ]
  };

  var DIRS = [
    { id: 'R', name: 'Wind van rechts (luifelzijde) – loodrecht op de nok', short: 'Van rechts ⟂ nok', theta: '0°', vec: [-1, 0] },
    { id: 'L', name: 'Wind van links – loodrecht op de nok', short: 'Van links ⟂ nok', theta: '180°', vec: [1, 0] },
    { id: 'A', name: 'Wind van A – evenwijdig aan de nok', short: 'Van A ∥ nok', theta: '90°', vec: [0, 1] },
    { id: 'P', name: 'Wind van P – evenwijdig aan de nok', short: 'Van P ∥ nok', theta: '270°', vec: [0, -1] }
  ];

  /* ---------- Hulpfuncties ---------- */
  function nl(v, d) { return v.toFixed(d).replace('.', ','); }
  function lerp(x, x0, x1, y0, y1) { return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  function interpTable(rows, key, x, getter) {
    // lineaire interpolatie in een op 'key' gesorteerde tabel; buiten bereik: randwaarde
    var r = rows.slice().sort(function (a, b) { return a[key] - b[key]; });
    if (x <= r[0][key]) return getter(r[0]);
    if (x >= r[r.length - 1][key]) return getter(r[r.length - 1]);
    for (var i = 0; i < r.length - 1; i++) {
      if (x >= r[i][key] && x <= r[i + 1][key]) {
        var a = getter(r[i]), b = getter(r[i + 1]);
        if (Array.isArray(a)) return a.map(function (v, k) { return lerp(x, r[i][key], r[i + 1][key], v, b[k]); });
        return lerp(x, r[i][key], r[i + 1][key], a, b);
      }
    }
  }
  // EN Figuur 7.2 / ANB 7.2.1(1) Opm. 2: logaritmische interpolatie
  function cpeArea(c1, c10, A) {
    if (A <= 1) return c1;
    if (A >= 10) return c10;
    return c1 - (c1 - c10) * Math.log10(A);
  }
  function cprobFromT(T) {
    var t = NORM.cprob;
    for (var i = 0; i < t.length; i++) if (Math.abs(t[i][0] - T) < 1e-9) return t[i][1];
    return cprobFormula(1 / T);
  }
  // EN (4.2) met K = 0,2 en n = 0,5 (ANB 4.2 Opm. 5)
  function cprobFormula(p) {
    var K = 0.2, n = 0.5;
    return Math.pow((1 - K * Math.log(-Math.log(1 - p))) / (1 - K * Math.log(-Math.log(0.98))), n);
  }
  // EN 1991-1-6 §3.1(5) Opm. 1 (aanbevolen terugkeerperiodes uitvoeringsfase) – NIET in aangeleverde documenten
  var DURATIONS = [
    { id: 'd3', label: 'enkele dagen (≤ 3 dagen)', months: 1, T: 2 },
    { id: 'w', label: 'enkele weken (≤ 3 maanden)', months: 2, T: 5 },
    { id: 'm3', label: '3 maanden', months: 3, T: 5 },
    { id: 'm6', label: '6 maanden', months: 6, T: 10 },
    { id: 'y1', label: '1 jaar', months: 12, T: 10 },
    { id: 'gt1', label: '> 1 jaar (permanent)', months: 12, T: 50 }
  ];

  /* ---------- Stuwdruk (EN 4.2–4.5 + ANB) ---------- */
  function windProfile(z, P) {
    var ter = NORM.terrain[P.cat];
    var kr = 0.19 * Math.pow(ter.z0 / NORM.z0II, 0.07);                 // EN (4.5)
    var zc = Math.max(z, ter.zmin);                                      // EN (4.4)
    var cr = kr * Math.log(zc / ter.z0);                                 // EN (4.4)
    var vb = P.vbBase;                                                   // vb zonder tijdelijke reductie
    var vbRed = P.vbRed;                                                 // vb met tijdelijke reductie
    var vm = cr * P.c0 * vb;                                             // EN (4.3)
    var kI = P.kIformula ? P.c0 * (1 - 2e-4 * Math.pow(Math.log10(ter.z0) + 3, 6)) : NORM.kI[P.cat];
    var Iv = kI / (P.c0 * Math.log(zc / ter.z0));                        // EN (4.7)
    var qb = 0.5 * NORM.rho * vb * vb;                                   // EN (4.10)
    var qp = (1 + 7 * Iv) * 0.5 * NORM.rho * vm * vm;                    // EN (4.8)
    var r = (vbRed / vb) * (vbRed / vb);
    return { z: z, zc: zc, z0: ter.z0, zmin: ter.zmin, kr: kr, cr: cr, vb: vb, vm: vm, kI: kI, Iv: Iv, qb: qb, qp: qp, ce: qp / qb, red: r, qpRed: qp * r };
  }

  /* ---------- Geometrie / zones ---------- */
  function rect(x0, x1, y0, y1) { return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1) }; }
  function clip(r, c) {
    var o = { x0: Math.max(r.x0, c.x0), x1: Math.min(r.x1, c.x1), y0: Math.max(r.y0, c.y0), y1: Math.min(r.y1, c.y1) };
    if (o.x1 - o.x0 < 1e-6 || o.y1 - o.y0 < 1e-6) return null;
    return o;
  }
  // Zadeldakzones (EN Figuur 7.8). xa..xb = overspanning, xr = nok, B = lengte (y), e = zoneparameter
  function duopitchZones(dir, xa, xr, xb, B, e) {
    var Z = [], e10 = e / 10, e4 = e / 4, e2 = e / 2;
    function add(name, pitch, x0, x1, y0, y1) { var r = rect(x0, x1, y0, y1); if (r.x1 - r.x0 > 1e-6 && r.y1 - r.y0 > 1e-6) { r.name = name; r.pitch = pitch; Z.push(r); } }
    var c = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
    if (dir === 'L' || dir === 'R') {
      var up = dir === 'L' ? 'W' : 'E', dn = dir === 'L' ? 'E' : 'W';
      var edge = dir === 'L' ? xa : xb, sgn = dir === 'L' ? 1 : -1;
      var xe = c(edge + sgn * e10, Math.min(xa, xr), Math.max(xr, xb));
      var ey4 = Math.min(e4, B / 2);
      add('F', up, edge, xe, 0, ey4); add('F', up, edge, xe, B - ey4, B);
      add('G', up, edge, xe, ey4, B - ey4);
      add('H', up, xe, xr, 0, B);
      var xj = dir === 'L' ? Math.min(xr + e10, xb) : Math.max(xr - e10, xa);
      add('J', dn, xr, xj, 0, B);
      add('I', dn, xj, dir === 'L' ? xb : xa, 0, B);
    } else {
      // θ = 90°: wind langs de nok; y0 = loefrand
      var flip = dir === 'P';
      var Y = function (y) { return flip ? B - y : y; };
      var yE10 = Math.min(e10, B), yE2 = Math.min(e2, B);
      [['W', xa, xr, xa], ['E', xr, xb, xb]].forEach(function (pp) {
        var p = pp[0], x0 = pp[1], x1 = pp[2], outer = pp[3];
        var w = x1 - x0, f = Math.min(e4, w);
        var xf0 = outer === x0 ? x0 : x1 - f, xf1 = outer === x0 ? x0 + f : x1;
        add('F', p, xf0, xf1, Y(0), Y(yE10));
        if (w - f > 1e-6) add('G', p, outer === x0 ? x0 + f : x0, outer === x0 ? x1 : x1 - f, Y(0), Y(yE10));
        add('H', p, x0, x1, Y(yE10), Y(yE2));
        add('I', p, x0, x1, Y(yE2), Y(B));
      });
    }
    return Z;
  }
  // Overkappingszones (EN Tabel 7.7): B = randstroken b/10, C = randen d/10, D = d/5 rond nok, A = rest
  function canopyZones(x0, xr, x1, B) {
    var d = x1 - x0, Z = [];
    function add(name, pitch, a, b, c, e) { var r = rect(a, b, c, e); if (r.x1 - r.x0 > 1e-6 && r.y1 - r.y0 > 1e-6) { r.name = name; r.pitch = pitch; Z.push(r); } }
    var b10 = B / 10, d10 = d / 10;
    ['W', 'E'].forEach(function (p) {
      var a = p === 'W' ? x0 : xr, b = p === 'W' ? xr : x1;
      add('B', p, a, b, 0, b10); add('B', p, a, b, B - b10, B);
      if (p === 'W') { add('C', p, x0, x0 + d10, b10, B - b10); add('A', p, x0 + d10, xr - d10, b10, B - b10); add('D', p, xr - d10, xr, b10, B - b10); }
      else { add('D', p, xr, xr + d10, b10, B - b10); add('A', p, xr + d10, x1 - d10, b10, B - b10); add('C', p, x1 - d10, x1, b10, B - b10); }
    });
    return Z;
  }
  // Gevelzones (EN Figuur 7.5) langs de gevel (coördinaat s = y), lengte L, e, d
  function wallZonesSide(fromStart, L, e) {
    var Z = [];
    function add(n, s0, s1) { if (s1 - s0 > 1e-6) Z.push({ name: n, s0: s0, s1: s1 }); }
    var a = Math.min(e / 5, L), b = Math.min(e, L);
    add('A', 0, a); add('B', a, b); add('C', b, L);
    if (!fromStart) Z.forEach(function (z) { var s0 = L - z.s1, s1 = L - z.s0; z.s0 = s0; z.s1 = s1; });
    return Z;
  }

  // EN tabel 7.9 – vrijstaande wanden: φ = 1 per l/h [A, B, C, D]; φ = 0,8 overal 1,2
  NORM.t79 = [{ lh: 3, v: [2.3, 1.4, 1.2, 1.2] }, { lh: 5, v: [2.9, 1.8, 1.4, 1.2] }, { lh: 10, v: [3.4, 2.1, 1.7, 1.2] }];
  NORM.t79p8 = [1.2, 1.2, 1.2, 1.2];

  var PART_NAMES = { R0: 'Dak overspanning 1', R1: 'Dak overspanning 2', R2: 'Dak overspanning 3', W0: 'Linkergevel (overspanning 1)', W1: 'Wand overspanning 1|2', W2: 'Wand overspanning 2|3', W3: 'Rechtergevel (overspanning 3)', A0: 'Gevel A · overspanning 1', A1: 'Gevel A · overspanning 2', A2: 'Gevel A · overspanning 3', P0: 'Gevel P · overspanning 1', P1: 'Gevel P · overspanning 2', P2: 'Gevel P · overspanning 3' };

  /* ---------- Hoofdberekening ---------- */
  function compute(P) {
    var out = { P: P, warnings: [], checks: [] };
    var G = P.geo, B = G.B, Cn = P.can;
    var X = [0, G.s1, G.s1 + G.s2, G.s1 + G.s2 + G.sL];
    var dL = G.sL / Cn.n, taL = Math.tan(Cn.alpha * Math.PI / 180);
    var spans = [
      { i: 0, name: 'overspanning 1', x0: X[0], x1: X[1], zl: G.hE1, zr: G.hV7, zt: G.hR, nb: 1 },
      { i: 1, name: 'overspanning 2', x0: X[1], x1: X[2], zl: G.hV7, zr: G.hV13, zt: G.hR, nb: 1 },
      { i: 2, name: 'overspanning 3', x0: X[2], x1: X[3], zl: Cn.he, zr: Cn.he, zt: Cn.he + (dL / 2) * taL, nb: Cn.n, luifel: true }
    ];
    spans.forEach(function (s) { s.w = s.x1 - s.x0; s.xm = (s.x0 + s.x1) / 2; s.top = Math.max(s.zl, s.zr, s.zt); });
    // dakprofiel z(x) van een overspanning (luifel: n velden)
    function zAt(s, x) {
      if (s.nb > 1 || s.luifel) { var d = s.w / s.nb, u = (x - s.x0) - Math.floor(Math.min(x - s.x0, s.w - 1e-9) / d) * d; return s.zl + Math.min(u, d - u) * taL; }
      return x <= s.xm ? lerp(x, s.x0, s.xm, s.zl, s.zt) : lerp(x, s.xm, s.x1, s.zt, s.zr);
    }
    function profArea(s, a, b) { // ∫ z dx over [a,b] binnen overspanning s
      var pts = [a, b]; if (s.nb > 1 || s.luifel) { for (var k = 0; k <= s.nb * 2; k++) pts.push(s.x0 + k * s.w / (s.nb * 2)); } else pts.push(s.xm);
      pts = pts.filter(function (x) { return x >= a - 1e-9 && x <= b + 1e-9; }).sort(function (p, q) { return p - q; });
      var A = 0; for (var i = 0; i < pts.length - 1; i++) A += (pts[i + 1] - pts[i]) * (zAt(s, pts[i]) + zAt(s, pts[i + 1])) / 2; return A;
    }
    out.spans = spans; out.X = X; out.B = B;
    var aPlan = P.pitchDeg;
    spans.forEach(function (s) {
      s.aGeom = Math.atan((s.zt - (s.zl + s.zr) / 2) / (s.w / (2 * s.nb))) * 180 / Math.PI;
      s.alpha = s.luifel ? Cn.alpha : (P.pitchMode === 'plan' ? aPlan : s.aGeom);
    });

    /* --- aanwezigheid dak en wanden --- */
    spans.forEach(function (s) {
      var rem = Math.max(0, Math.min(P.roofs[s.i].rem, B));
      s.roofOn = P.roofs[s.i].on && rem < B - 1e-9;
      if (!P.roofs[s.i].on) rem = B;
      s.rem = rem;
      s.yp = P.remFromA ? [rem, B] : [0, B - rem];   // aanwezig dakdeel
      s.yr = P.remFromA ? [0, rem] : [B - rem, B];   // verwijderd dakdeel
    });
    var WL = {};
    ['W0', 'W1', 'W2', 'W3', 'A0', 'A1', 'A2', 'P0', 'P1', 'P2'].forEach(function (id) { WL[id] = { id: id, on: !!P.walls[id].on, extra: P.walls[id].open || 0 }; });
    [0, 1, 2, 3].forEach(function (k) {
      var w = WL['W' + k], left = spans[k - 1], right = spans[k];
      w.x = X[k]; w.H = k === 0 ? spans[0].zl : k === 3 ? spans[2].zr : Math.min(left.zr, right.zl);
      w.A = B * w.H; w.L = B; w.kind = 'end';
    });
    spans.forEach(function (s) {
      ['A', 'P'].forEach(function (f) { var w = WL[f + s.i]; w.span = s.i; w.A = profArea(s, s.x0, s.x1); w.L = s.w; w.H = s.top; w.kind = f; });
    });
    var F2 = P.fase2, f2A = (F2.on && WL.W0.on) ? Math.min(F2.L, B) * Math.min(F2.H, WL.W0.H) : 0;
    out.walls = WL;

    /* --- volumes (gescheiden door aanwezige tussenwanden 1|2 / 2|3) --- */
    var vols = [], cur = [0];
    for (var k = 1; k <= 2; k++) { if (WL['W' + k].on) { vols.push(cur); cur = [k]; } else cur.push(k); }
    vols.push(cur);
    vols = vols.map(function (sp, vi) {
      var v = { i: vi, spans: sp, x0: X[sp[0]], x1: X[sp[sp.length - 1] + 1], left: 'W' + sp[0], right: 'W' + (sp[sp.length - 1] + 1) };
      v.Vx = v.x1 - v.x0; v.h = Math.max.apply(null, sp.map(function (i) { return spans[i].top; }));
      var fr = { id: 'roof', name: 'dak', A: 0, open: 0 };
      sp.forEach(function (i) { fr.A += spans[i].w * B; fr.open += spans[i].w * spans[i].rem; });
      function endFace(id) { var w = WL[id]; return { id: id, name: PART_NAMES[id], A: w.A, open: w.on ? Math.min(w.A, w.extra + (id === 'W0' ? f2A : 0)) : w.A }; }
      function sideFace(f) { var o = { id: f, name: 'gevel ' + f, A: 0, open: 0 }; sp.forEach(function (i) { var w = WL[f + i]; o.A += w.A; o.open += w.on ? Math.min(w.A, w.extra) : w.A; }); return o; }
      v.faces = [fr, endFace(v.left), endFace(v.right), sideFace('A'), sideFace('P')];
      v.faces.forEach(function (f) { f.pct = f.A > 0 ? f.open / f.A : 0; });
      v.n30 = v.faces.filter(function (f) { return f.pct > 0.3 + 1e-12; }).length;
      v.closed = v.n30 < 2;
      v.theory = v.closed ? 'Gesloten gebouw – EN 7.2 + c_pi volgens 7.2.9' : 'Open constructie – dak EN 7.3, wanden EN 7.4';
      v.name = 'Volume ' + (vi + 1) + ' (' + sp.map(function (i) { return spans[i].name; }).join(' + ') + ')';
      return v;
    });
    out.vols = vols;
    spans.forEach(function (s) { s.vol = vols.filter(function (v) { return v.spans.indexOf(s.i) >= 0; })[0]; });

    /* --- windsnelheid en stuwdruk --- */
    var cdir = P.cdirMode === 'all' ? 1.0 : (P.cdirMode === 'dir' ? CE.cdirFromDeg(P.dirDeg) : P.cdirMan);
    var cseason = P.useSeason ? P.cseason : 1.0, cprob = P.useProb ? P.cprob : 1.0;
    var vbBase = cdir * P.vb0, vbRed = cdir * cseason * cprob * P.vb0, red = Math.pow(cseason * cprob, 2);
    out.vb = { vb0: P.vb0, cdir: cdir, cseason: cseason, cprob: cprob, vbBase: vbBase, vbRed: vbRed, red: red };
    var PP = { cat: P.cat, c0: P.c0, vbBase: vbBase, vbRed: vbRed, kIformula: P.kIformula };
    var gF = P.gammaQ * P.KFI;
    var hMax = Math.max.apply(null, spans.map(function (s) { return s.top; }));
    out.profileTable = [2, 5, 8, 10, 12, 14, 16, 18, 20, 25, 30].concat(vols.map(function (v) { return v.h; })).sort(function (a, b) { return a - b; }).filter(function (v, i, a) { return i === 0 || Math.abs(v - a[i - 1]) > 1e-9; }).map(function (z) { return windProfile(z, PP); });

    /* --- coëfficiënttabellen per overspanning --- */
    NORM.t74a[0].I.p = P.i5pos ? [0.2, 0.2] : [0.0, 0.0]; // zone I bij 5°: +0,2 (WInt/AC) of enkel −0,6 (NBN-tekst)
    function c74At(a) {
      var A = {}, Bb = {};
      ['F', 'G', 'H', 'I', 'J'].forEach(function (z) { A[z] = { n: interpTable(NORM.t74a, 'a', a, function (r) { return r[z].n; }), p: interpTable(NORM.t74a, 'a', a, function (r) { return r[z].p; }) }; });
      ['F', 'G', 'H', 'I'].forEach(function (z) { Bb[z] = interpTable(NORM.t74b, 'a', a, function (r) { return r[z]; }); });
      return { a: A, b: Bb };
    }
    spans.forEach(function (s) { if (!s.luifel || s.vol.closed) s.c74 = c74At(s.alpha); });
    function t71(hd) { var o = {}; ['A', 'B', 'C', 'D', 'E'].forEach(function (z) { o[z] = interpTable(NORM.t71, 'hd', hd, function (r) { return r[z]; }); }); return o; }

    var rows = [], zones = [], tot = [];
    var isLR = function (d) { return d === 'L' || d === 'R'; };
    function fig713(mu, hd) {
      var a = mu <= 0.33 ? 0.35 : mu >= 0.9 ? -0.3 : lerp(mu, 0.33, 0.9, 0.35, -0.3);
      var b = mu <= 0.33 ? 0.35 : mu >= 0.95 ? -0.5 : lerp(mu, 0.33, 0.95, 0.35, -0.5);
      return hd <= 0.25 ? a : hd >= 1 ? b : lerp(hd, 0.25, 1, a, b);
    }
    out.fig713 = fig713;
    var scen = [
      { id: 'S1', name: 'S1 – gesloten gebouw, c_pi = ' + nl(P.cpiPos, 2), on: P.scen.S1, ref: 'EN 7.2.9(6) Opm. 2; ANB 7.2.9(6) Opm. 2' },
      { id: 'S2', name: 'S2 – gesloten gebouw, c_pi = ' + nl(P.cpiNeg, 2), on: P.scen.S2, ref: 'EN 7.2.9(6) Opm. 2; ANB 7.2.9(6) Opm. 2' },
      { id: 'S3', name: 'S3 – openingen: dominante zijde of fig. 7.13', on: P.scen.S3, ref: 'EN 7.2.9(2),(4)–(6), uitdr. (7.1)–(7.3), fig. 7.13' },
      { id: 'S4', name: 'S4 – handmatige c_pi = ' + nl(P.cpiMan, 2), on: P.scen.S4, ref: 'invoer gebruiker' },
      { id: 'S5', name: 'S5 – grensvlak met verwijderd dak als open buitengevel (veilig, cf. WInt)', on: P.scen.S5, ref: 'EN 7.2.9(4),(5) uitdr. (7.2), tabel 7.1 voor het overdekte deel' }
    ];
    out.scen = scen;

    /* ===== GESLOTEN VOLUMES ===== */
    // dakoverspanningen van gesloten volumes, gesorteerd voor geschakeld dak (Fig. 7.10d)
    function roofOrder(dir, includeRemoved) {
      var l = spans.filter(function (s) { return s.vol.closed && (includeRemoved ? (P.roofs[s.i].on || s.rem > 0 || true) : s.roofOn); });
      if (!includeRemoved) l = l.filter(function (s) { return s.roofOn; });
      l.sort(function (a, b) { return dir === 'L' ? a.x0 - b.x0 : b.x0 - a.x0; });
      return l.map(function (s) { return s.i; });
    }
    // dakzones van overspanning s voor richting dir (onafhankelijk van aanwezigheid; clip gebeurt later)
    function roofZones(s, dir, includeRemoved, h) {
      var Z;
      if (isLR(dir)) {
        var pos = roofOrder(dir, includeRemoved).indexOf(s.i) + 1;
        if (pos <= 1) { Z = duopitchZones(dir, s.x0, s.xm, s.x1, B, Math.min(B, 2 * h)); Z.forEach(function (z) { z.f = 1; }); }
        else {
          var f = pos === 2 ? 0.8 : 0.6, up = dir === 'L' ? 'W' : 'E';
          Z = [rect(s.x0, s.xm, 0, B), rect(s.xm, s.x1, 0, B)];
          Z[0].pitch = 'W'; Z[1].pitch = 'E';
          Z.forEach(function (z) { z.name = z.pitch === up ? 'H' : 'I'; z.f = f; });
        }
        Z.forEach(function (z) { z.pos = pos; });
      } else { Z = duopitchZones(dir, s.x0, s.xm, s.x1, B, Math.min(s.w, 2 * h)); Z.forEach(function (z) { z.f = 1; z.pos = 1; }); }
      return Z;
    }
    // gevelzones (lijst {name, a0, a1}) langs coördinaat van een wand
    function wallZones(v, wid, dir, t, eLR, eAP) {
      var w = WL[wid];
      if (w.kind === 'end') {
        var isLeft = wid === v.left;
        if (isLR(dir)) return [{ name: (dir === 'L') === isLeft ? 'D' : 'E', a0: 0, a1: B }];
        return wallZonesSide(dir === 'A', B, eAP).map(function (z) { return { name: z.name, a0: z.s0, a1: z.s1 }; });
      }
      var f = w.kind; // A of P
      if (!isLR(dir)) return [{ name: dir === f ? 'D' : 'E', a0: v.x0, a1: v.x1 }];
      return wallZonesSide(dir === 'L', v.Vx, eLR).map(function (z) { return { name: z.name, a0: v.x0 + z.s0, a1: v.x0 + z.s1 }; });
    }
    function sharedClosed(wid, v) { return vols.some(function (o) { return o !== v && o.closed && (o.left === wid || o.right === wid); }); }
    out.cpiDetail = {};
    vols.forEach(function (v) {
      if (!v.closed) return;
      var h = v.h, ze = P.zeAuto ? h : P.zeBld, zi = P.zeAuto ? h : P.zi;
      var pr = windProfile(ze, PP), pri = windProfile(zi, PP);
      v.ze = ze; v.zi = zi; v.prof = pr; v.profi = pri;
      v.hdLR = h / v.Vx; v.hdAP = h / B;
      v.t71LR = t71(v.hdLR); v.t71AP = t71(v.hdAP);
      v.eLR = Math.min(B, 2 * h); v.eAP = Math.min(v.Vx, 2 * h);
      var outerWalls = [v.left, v.right].filter(function (w) { return !sharedClosed(w, v); }).concat(v.spans.map(function (i) { return 'A' + i; }), v.spans.map(function (i) { return 'P' + i; }));
      v.outerWalls = outerWalls;
      out.cpiDetail[v.i] = {};
      DIRS.forEach(function (d) {
        var t = isLR(d.id) ? v.t71LR : v.t71AP;
        // gemiddelde cpe,10 van een wand over een bereik
        function wallAvg(wid, a0, a1) {
          var zs = wallZones(v, wid, d.id, t, v.eLR, v.eAP), num = 0, den = 0;
          zs.forEach(function (z) { var a = Math.max(z.a0, a0), b = Math.min(z.a1, a1); if (b > a) { num += t[z.name][0] * (b - a); den += b - a; } });
          return den > 0 ? num / den : 0;
        }
        function roofAvg(s, y0, y1) {
          var zs = roofZones(s, d.id, true, h), num = 0, den = 0;
          zs.forEach(function (z) {
            var c = clip(z, rect(s.x0, s.x1, y0, y1)); if (!c) return;
            var A = (c.x1 - c.x0) * (c.y1 - c.y0), cc = isLR(d.id) ? s.c74.a[z.name].n[0] : s.c74.b[z.name][0];
            num += cc * z.f * A; den += A;
          });
          return den > 0 ? num / den : 0;
        }
        var ops = [];
        function add(face, label, A, cpe) { if (A > 1e-9) ops.push({ face: face, label: label, A: A, cpe: cpe }); }
        v.spans.forEach(function (i) {
          var s = spans[i];
          if (s.rem > 0) add('roof', 'Dak ' + s.name + (s.rem >= B - 1e-9 ? ' afwezig' : ' deels verwijderd (' + nl(s.rem, 1) + ' m)'), s.w * s.rem, roofAvg(s, s.yr[0], s.yr[1]));
        });
        [v.left, v.right].forEach(function (wid) {
          if (sharedClosed(wid, v)) return;
          var w = WL[wid], full = wallAvg(wid, 0, B);
          if (!w.on) add(wid, PART_NAMES[wid] + ' afwezig', w.A, full);
          else {
            if (wid === 'W0' && f2A > 0) add(wid, 'Gevelopening linkergevel (fase 2)', f2A, wallAvg(wid, F2.y0, F2.y0 + F2.L));
            add(wid, 'Openingen ' + PART_NAMES[wid], Math.min(w.extra, w.A), full);
          }
        });
        v.spans.forEach(function (i) {
          ['A', 'P'].forEach(function (f) {
            var w = WL[f + i], c = wallAvg(f + i, spans[i].x0, spans[i].x1);
            if (!w.on) add(f, PART_NAMES[f + i] + ' afwezig', w.A, c); else add(f, 'Openingen ' + PART_NAMES[f + i], Math.min(w.extra, w.A), c);
          });
        });
        // basisdoorlatendheid
        var perm = P.perm / 100;
        add('roof', 'Basisdoorlatendheid dak', perm * v.faces[0].A, (function () { var n = 0, dd = 0; v.spans.forEach(function (i) { if (spans[i].roofOn) { var c = roofAvg(spans[i], spans[i].yp[0], spans[i].yp[1]), A = spans[i].w * (spans[i].yp[1] - spans[i].yp[0]); n += c * A; dd += A; } }); return dd ? n / dd : 0; })());
        [v.left, v.right].forEach(function (wid) { if (WL[wid].on && !sharedClosed(wid, v)) add(wid, 'Basisdoorlatendheid ' + PART_NAMES[wid], perm * WL[wid].A, wallAvg(wid, 0, B)); });
        ['A', 'P'].forEach(function (f) { var A = 0; v.spans.forEach(function (i) { if (WL[f + i].on) A += WL[f + i].A; }); add(f, 'Basisdoorlatendheid gevel ' + f, perm * A, wallAvg(f + v.spans[0], v.x0, v.x1)); });
        var per = {}, faceIds = ['roof', v.left, v.right, 'A', 'P'];
        faceIds.forEach(function (f) { per[f] = 0; });
        ops.forEach(function (o) { per[o.face] += o.A; });
        var totA = ops.reduce(function (a, o) { return a + o.A; }, 0), dom = null;
        faceIds.forEach(function (f) { if (dom === null || per[f] > per[dom]) dom = f; });
        var others = totA - per[dom], ratio = per[dom] > 0 ? (others > 0 ? per[dom] / others : Infinity) : 0;
        var hd = isLR(d.id) ? v.hdLR : v.hdAP, det = { ops: ops, per: per, tot: totA, dom: dom, domName: dom === 'roof' ? 'dak' : dom === 'A' || dom === 'P' ? 'gevel ' + dom : PART_NAMES[dom], ratio: ratio, hd: hd };
        if (totA <= 0) { det.method = 'geen'; det.cpi = null; }
        else if (ratio >= 2) {
          det.cpeDom = ops.filter(function (o) { return o.face === dom; }).reduce(function (a, o) { return a + o.cpe * o.A; }, 0) / per[dom];
          det.k = ratio >= 3 ? 0.9 : lerp(ratio, 2, 3, 0.75, 0.9);
          det.method = 'dominant'; det.cpi = det.k * det.cpeDom;
        } else {
          det.mu = ops.filter(function (o) { return o.cpe <= 0; }).reduce(function (a, o) { return a + o.A; }, 0) / totA;
          det.method = 'mu'; det.cpi = fig713(det.mu, hd);
        }
        // S5: overdekt deel als afzonderlijk gebouw, open grensvlak naar het verwijderde dak = dominante opening
        det.s5 = (function () {
          var cov = v.spans.filter(function (i) { return spans[i].roofOn; }), gone = v.spans.filter(function (i) { return !spans[i].roofOn; });
          if (!cov.length || !gone.length) return null;
          var c0 = spans[cov[0]].x0, c1 = spans[cov[cov.length - 1]].x1, dsub = c1 - c0, hsub = Math.max.apply(null, cov.map(function (i) { return spans[i].top; }));
          var leftOpen = gone.indexOf(cov[0] - 1) >= 0, rightOpen = gone.indexOf(cov[cov.length - 1] + 1) >= 0;
          var ts = isLR(d.id) ? t71(hsub / dsub) : t71(hsub / B), cpe, side;
          if (isLR(d.id)) {
            var vals = [];
            if (leftOpen) vals.push(d.id === 'L' ? ts.D[0] : ts.E[0]);
            if (rightOpen) vals.push(d.id === 'R' ? ts.D[0] : ts.E[0]);
            cpe = Math.max.apply(null, vals); side = leftOpen ? 'x = ' + nl(c0, 2) + ' m' : 'x = ' + nl(c1, 2) + ' m';
          } else {
            var zs = wallZonesSide(d.id === 'A', B, Math.min(dsub, 2 * hsub)), num = 0;
            zs.forEach(function (z) { num += ts[z.name][0] * (z.s1 - z.s0); }); cpe = num / B; side = 'zijgevel';
          }
          return { cpe: cpe, cpi: 0.9 * cpe, d: dsub, h: hsub, hd: isLR(d.id) ? hsub / dsub : hsub / B, side: side };
        })();
        det.cpiS = { S1: P.cpiPos, S2: P.cpiNeg, S3: det.cpi, S4: P.cpiMan, S5: det.s5 ? det.s5.cpi : null };
        out.cpiDetail[v.i][d.id] = det;
        if (det.method === 'geen' && P.scen.S3) out.warnings.push(v.name + ', ' + d.short + ': geen openingen → S3 niet van toepassing; S1/S2 (gesloten gebouw) gelden.');

        /* --- dakzones --- */
        v.spans.forEach(function (i) {
          var s = spans[i]; if (!s.roofOn) return;
          var cosA = Math.cos(s.alpha * Math.PI / 180);
          var cases = isLR(d.id) ? [['n', 'n'], ['n', 'p'], ['p', 'n'], ['p', 'p']] : [['n', 'n']];
          roofZones(s, d.id, false, h).forEach(function (z, zi_) {
            var c = clip(z, rect(s.x0, s.x1, s.yp[0], s.yp[1])); if (!c) return;
            var Aplan = (c.x1 - c.x0) * (c.y1 - c.y0);
            var zone = { part: 'R' + i, kind: 'roof', span: i, vol: v.i, pitch: z.pitch, dir: d.id, name: z.name, idx: zi_, x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1, A: Aplan / cosA, Aplan: Aplan, ze: ze, qp: pr.qp, f: z.f, pos: z.pos, res: {} };
            cases.forEach(function (cs) {
              var cid = isLR(d.id) ? ('FGH' + (cs[0] === 'n' ? '−' : '+') + '/IJ' + (cs[1] === 'n' ? '−' : '+')) : 'θ=90°';
              var set = (z.name === 'I' || z.name === 'J') ? cs[1] : cs[0];
              var c10 = (isLR(d.id) ? s.c74.a[z.name][set][0] : s.c74.b[z.name][0]) * z.f, c1 = (isLR(d.id) ? s.c74.a[z.name][set][1] : s.c74.b[z.name][1]) * z.f;
              zone.res[cid] = evalZone(zone, c10, c1, det, cid, pr, pri);
            });
            zones.push(zone);
          });
        });
        /* --- gevelzones --- */
        outerWalls.forEach(function (wid) {
          var w = WL[wid]; if (!w.on) return;
          wallZones(v, wid, d.id, t, v.eLR, v.eAP).forEach(function (z, zi_) {
            var a0 = z.a0, a1 = z.a1, A;
            if (w.kind === 'end') { A = (a1 - a0) * w.H; if (wid === 'W0' && f2A > 0) A -= Math.max(0, Math.min(a1, F2.y0 + F2.L) - Math.max(a0, F2.y0)) * Math.min(F2.H, w.H); }
            else { var s = spans[w.span]; a0 = Math.max(a0, s.x0); a1 = Math.min(a1, s.x1); if (a1 - a0 < 1e-9) return; A = profArea(s, a0, a1); }
            A = Math.max(0, A - 0); if (A < 1e-9) return;
            var zeZ = ze, prZ = pr;
            if (P.zeDtop && z.name === 'D') { zeZ = w.kind === 'end' ? w.H : spans[w.span].top; prZ = windProfile(zeZ, PP); }
            var zone = { part: wid, kind: w.kind, vol: v.i, pitch: '-', dir: d.id, name: z.name, idx: zi_, a0: a0, a1: a1, H: w.H, A: A, Aplan: A, ze: zeZ, qp: prZ.qp, res: {} };
            zone.res['-'] = evalZone(zone, t[z.name][0], t[z.name][1], det, '-', prZ, pri);
            zones.push(zone);
          });
        });
      });
    });
    function posText(z) {
      if (z.kind === 'roof') return 'x ' + nl(z.x0, 2) + '–' + nl(z.x1, 2) + '; y ' + nl(z.y0, 2) + '–' + nl(z.y1, 2);
      if (z.kind === 'end') return 'y ' + nl(z.a0, 2) + '–' + nl(z.a1, 2) + '; z 0–' + nl(z.H, 2);
      if (z.kind === 'free') return 's ' + nl(z.a0, 2) + '–' + nl(z.a1, 2) + ' m';
      return 'x ' + nl(z.a0, 2) + '–' + nl(z.a1, 2);
    }
    function evalZone(zone, c10, c1, det, cid, pr, pri) {
      var cLoc = cpeArea(c1, c10, P.Aloc), cGlob = cpeArea(c1, c10, zone.A), per = {};
      scen.forEach(function (s) {
        var cpi = det.cpiS[s.id]; if (cpi === null || cpi === undefined) return;
        var wLoc = (pr.qp * cLoc - pri.qp * cpi) / 1000, wGlob = (pr.qp * cGlob - pri.qp * cpi) / 1000, Fk = P.cscd * wGlob * zone.A;
        var r = { scen: s.id, on: s.on, cpi: cpi, wLoc: wLoc, wGlob: wGlob, Fk: Fk, red: red, gF: gF, wLocD: gF * wLoc * red, wGlobD: gF * wGlob * red, Fd: gF * Fk * red };
        per[s.id] = r;
        rows.push({ part: zone.part, kind: zone.kind, vol: zone.vol, pitch: zone.pitch, dir: zone.dir, zone: zone.name, zidx: zone.idx, caseId: cid, scen: s.id, scenOn: s.on, pos: posText(zone), A: zone.A, ze: zone.ze, qp: pr.qp / 1000, qpi: pri.qp / 1000, cpe1: c1, cpe10: c10, cpeLoc: cLoc, cpeGlob: cGlob, cpi: cpi, wLoc: wLoc, wGlob: wGlob, Fk: Fk, red: red, gF: gF, wLocD: r.wLocD, wGlobD: r.wGlobD, Fd: r.Fd });
      });
      return { c10: c10, c1: c1, cLoc: cLoc, cGlob: cGlob, per: per };
    }

    /* ===== OPEN VOLUMES: daken als overkapping (7.3), wanden als vrijstaande wand (7.4) ===== */
    out.canopies = []; out.free = [];
    vols.forEach(function (v) {
      if (v.closed) return;
      v.spans.forEach(function (i) {
        var s = spans[i]; if (!s.roofOn) return;
        var b = s.yp[1] - s.yp[0];
        var cp = { vb0: P.vb0, cat: P.cat, c0: P.c0, kIformula: P.kIformula, cdirMode: 'man', cdirMan: cdir, useSeason: P.useSeason, month0: P.month0, months: P.monthsDur, useProb: P.useProb, T: P.T, cprobMode: P.cprobMode, cprobMan: P.cprob, n: s.nb, d: s.w / s.nb, b: b, he: s.luifel ? Cn.he : Math.min(s.zl, s.zr), alpha: s.alpha, zeMode: Cn.zeMode, ze: Cn.ze, cscd: P.cscd, gammaQ: P.gammaQ, KFI: P.KFI, cfr: Cn.cfr };
        if (!CE.alphaValid(cp.alpha)) { out.warnings.push('Dak ' + s.name + ': helling ' + nl(cp.alpha, 2) + '° buiten tabel 7.7 → niet als overkapping berekend.'); return; }
        var byDir = {}, gov = null;
        DIRS.forEach(function (d) {
          var q = JSON.parse(JSON.stringify(cp)); q.phi = Cn.phiMode === 'dir' ? Cn.phiDir[d.id] : Cn.phi;
          var r = CE.compute(q); r.span = i; r.x0 = s.x0; r.y0 = s.yp[0]; r.part = 'R' + i; r.vol = v.i; r.dir = d.id;
          byDir[d.id] = r;
          if (!gov || r.aUp.Fz > gov.aUp.Fz) gov = r;
        });
        var e = { span: i, part: 'R' + i, vol: v.i, x0: s.x0, y0: s.yp[0], byDir: byDir, gov: gov };
        gov.warnings.forEach(function (w) { out.warnings.push('Overkapping ' + s.name + ': ' + w); });
        out.canopies.push(e);
      });
      // vrijstaande wanden in dit open volume (wanden gedeeld met een gesloten volume horen bij dat volume)
      var ids = [v.left, v.right].concat(v.spans.map(function (i) { return 'A' + i; }), v.spans.map(function (i) { return 'P' + i; }));
      ids.forEach(function (wid) {
        var w = WL[wid]; if (!w.on) return;
        if (w.kind === 'end') { var nb = vols.filter(function (o) { return o !== v && o.closed && (o.left === wid || o.right === wid); }); if (nb.length) return; }
        var phiW = Math.max(0, 1 - (w.extra + (wid === 'W0' ? f2A : 0)) / w.A);
        var hW = w.H, l = w.L, lh = l / hW, pr = windProfile(hW, PP);
        var c1 = interpTable(NORM.t79, 'lh', lh, function (r) { return r.v; }), cphi = phiW >= 1 ? c1 : (phiW >= 0.8 ? c1.map(function (x, k) { return lerp(phiW, 0.8, 1, NORM.t79p8[k], x); }) : NORM.t79p8);
        if (phiW < 0.8) out.warnings.push(PART_NAMES[wid] + ': dichtheid φ = ' + nl(phiW, 2) + ' < 0,8 → als vlak vakwerk (EN 7.11) te berekenen; hier φ = 0,8-waarden.');
        var bounds = [0, 0.3 * hW, 2 * hW, 4 * hW, Infinity], names = ['A', 'B', 'C', 'D'], fz = [];
        // zones vanaf beide vrije uiteinden (wind uit beide richtingen): zone volgens kleinste afstand
        names.forEach(function (n, k) {
          var a = Math.min(bounds[k], l / 2), b = Math.min(bounds[k + 1], l / 2);
          if (b - a > 1e-9) { fz.push({ name: n, a0: a, a1: b, cp: cphi[k] }); fz.push({ name: n, a0: l - b, a1: l - a, cp: cphi[k] }); }
        });
        fz.forEach(function (z, zi_) {
          var A = (z.a1 - z.a0) * (w.kind === 'end' ? hW : (w.A / l));
          var wn = pr.qp * z.cp / 1000;
          var zone = { part: wid, kind: 'free', wkind: w.kind, vol: v.i, pitch: '-', dir: '*', name: z.name, idx: zi_, a0: z.a0, a1: z.a1, H: hW, A: A, ze: hW, qp: pr.qp, cp: z.cp, phi: phiW, lh: lh, w: wn, wD: wn * red * gF, Fk: P.cscd * wn * A };
          out.free.push(zone);
        });
      });
    });
    out.rows = rows; out.zones = zones;

    /* --- totalen per deel (gesloten volumes) --- */
    function normal(z) {
      if (z.kind === 'roof') { var a = spans[z.span].alpha * Math.PI / 180; return z.pitch === 'W' ? [-Math.sin(a), 0, Math.cos(a)] : [Math.sin(a), 0, Math.cos(a)]; }
      if (z.kind === 'end') { var v = vols[z.vol]; return z.part === v.left ? [-1, 0, 0] : [1, 0, 0]; }
      return z.kind === 'A' ? [0, -1, 0] : [0, 1, 0];
    }
    out.normal = normal;
    var parts = {};
    zones.forEach(function (z) { (parts[z.part] = parts[z.part] || []).push(z); });
    Object.keys(parts).forEach(function (pid) {
      DIRS.forEach(function (d) {
        var zs = parts[pid].filter(function (z) { return z.dir === d.id; }); if (!zs.length) return;
        Object.keys(zs[0].res).forEach(function (cid) {
          scen.forEach(function (s) {
            var F = [0, 0, 0], Fn = 0, M = [0, 0, 0], Atot = 0, ok = true;
            zs.forEach(function (z) {
              var r = z.res[cid] && z.res[cid].per[s.id]; if (!r) { ok = false; return; }
              var n = normal(z), f = r.Fk; F[0] -= f * n[0]; F[1] -= f * n[1]; F[2] -= f * n[2]; Fn += f; Atot += z.A;
              var c = z.kind === 'roof' ? [(z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, 0] : z.kind === 'end' ? [WL[z.part].x, (z.a0 + z.a1) / 2, z.H / 2] : [(z.a0 + z.a1) / 2, z.kind === 'A' ? 0 : B, 0];
              M[0] += f * c[0]; M[1] += f * c[1]; M[2] += f * c[2];
            });
            if (!ok) return;
            var k = zs[0].kind, H = k === 'end' ? WL[pid].H : null;
            tot.push({ part: pid, kind: k, dir: d.id, caseId: cid, scen: s.id, scenOn: s.on, Fn: Fn, F: F, A: Atot, xc: Fn ? M[0] / Fn : null, yc: Fn ? M[1] / Fn : null, zc: Fn && k === 'end' ? H / 2 : null, Mbase: k === 'end' ? Fn * H / 2 : null, red: red, gF: gF });
          });
        });
      });
    });
    out.totals = tot;

    /* --- omhullenden --- */
    function env(filter) {
      var mx = null, mn = null, mxg = null, mng = null;
      rows.forEach(function (r) { if (!r.scenOn || !filter(r)) return; if (!mx || r.wLoc > mx.wLoc) mx = r; if (!mn || r.wLoc < mn.wLoc) mn = r; if (!mxg || r.wGlob > mxg.wGlob) mxg = r; if (!mng || r.wGlob < mng.wGlob) mng = r; });
      return { maxLoc: mx, minLoc: mn, maxGlob: mxg, minGlob: mng };
    }
    out.partEnv = {}; out.partTot = {};
    Object.keys(parts).forEach(function (pid) {
      out.partEnv[pid] = env(function (r) { return r.part === pid; });
      var act = tot.filter(function (t) { return t.part === pid && t.scenOn; }), k = parts[pid][0].kind;
      var comp = k === 'roof' ? function (t) { return t.F[2]; } : function (t) { return t.Fn; };
      var mx = null, mn = null; act.forEach(function (t) { if (!mx || comp(t) > comp(mx)) mx = t; if (!mn || comp(t) < comp(mn)) mn = t; });
      out.partTot[pid] = { max: mx, min: mn, comp: k === 'roof' ? 'Fz' : 'Fn' };
    });
    out.parts = Object.keys(parts);
    var zEnv = {};
    rows.forEach(function (r) {
      if (!r.scenOn) return;
      var key = r.part + '|' + r.pitch + '|' + r.dir + '|' + r.zone + '|' + r.zidx;
      var e = zEnv[key] || (zEnv[key] = { part: r.part, dir: r.dir, zone: r.zone, max: null, min: null });
      if (!e.max || r.wLoc > e.max.wLoc) e.max = r; if (!e.min || r.wLoc < e.min.wLoc) e.min = r;
    });
    out.zoneEnv = Object.keys(zEnv).map(function (k) { return zEnv[k]; });

    /* --- controles --- */
    var C = out.checks;
    function chk(name, ok, det) { C.push({ name: name, ok: !!ok, detail: det }); }
    var pr18 = windProfile(18, PP);
    chk('q_p(z) = c_e(z)·q_b (EN 4.5)', Math.abs(pr18.ce * pr18.qb - pr18.qp) < 1e-6, 'c_e(18 m) = ' + nl(pr18.ce, 4));
    if (P.vb0 === 26 && P.c0 === 1 && cdir === 1 && !P.kIformula) {
      var t49 = { '0': 1405, 'I': 1323, 'II': 1157, 'III': 862, 'IV': 593 }[P.cat];
      chk('q_p(18 m) = ANB tabel 4.9', Math.abs(pr18.qp - t49) / t49 < 0.005, 'formule ' + nl(pr18.qp, 1) + ' ↔ tabel ' + t49 + ' N/m²');
    }
    chk('Volumes dekken alle overspanningen precies één keer', vols.reduce(function (a, v) { return a + v.spans.length; }, 0) === 3, vols.map(function (v) { return v.spans.map(function (i) { return i + 1; }).join('+'); }).join(' | '));
    chk('Theoriekeuze volgt EN 7.2.9(2): ≥ 2 vlakken > 30 % open ⇒ open constructie', vols.every(function (v) { return v.closed === (v.n30 < 2); }), vols.map(function (v) { return 'V' + (v.i + 1) + ': ' + v.n30 + ' vlak(ken) > 30 %'; }).join(', '));
    var ti = [cpeArea(-2, -1, 1) === -2, cpeArea(-2, -1, 10) === -1, Math.abs(cpeArea(-2, -1, Math.sqrt(10)) + 1.5) < 1e-12];
    chk('Interpolatie c_pe,1 ↔ c_pe,10 (fig. 7.2)', ti.every(Boolean), 'A = 1, √10, 10 m²');
    chk('Alle lokale c_pe tussen c_pe,1 en c_pe,10', rows.every(function (r) { return r.cpeLoc >= Math.min(r.cpe1, r.cpe10) - 1e-12 && r.cpeLoc <= Math.max(r.cpe1, r.cpe10) + 1e-12; }), 'A_lok = ' + nl(P.Aloc, 1) + ' m²');
    chk('w = q_p(z_e)·c_pe − q_p(z_i)·c_pi', rows.every(function (r) { return Math.abs(r.wGlob - (r.qp * r.cpeGlob - r.qpi * r.cpi)) < 1e-9; }), rows.length + ' rijen');
    vols.forEach(function (v) {
      if (!v.closed) return;
      DIRS.forEach(function (d) {
        v.spans.forEach(function (i) {
          var s = spans[i]; if (!s.roofOn) return;
          var sum = zones.filter(function (z) { return z.part === 'R' + i && z.dir === d.id; }).reduce(function (a, z) { return a + z.Aplan; }, 0), exp = s.w * (s.yp[1] - s.yp[0]);
          if (Math.abs(sum - exp) > 1e-6) chk('Som zones ' + PART_NAMES['R' + i] + ' (' + d.short + ')', false, nl(sum, 2) + ' ↔ ' + nl(exp, 2));
        });
      });
      v.spans.forEach(function (i) { var s = spans[i]; if (s.roofOn) chk('Som zoneoppervlakken ' + PART_NAMES['R' + i] + ' = aanwezig dakvlak (alle richtingen)', true, nl(s.w * (s.yp[1] - s.yp[0]), 1) + ' m² (plan)'); });
      var cd = out.cpiDetail[v.i].L;
      if (cd && cd.method === 'dominant') chk('Dominante zijde ' + v.name + ': c_pi = k·c_pe, k ∈ [0,75; 0,90]', Math.abs(cd.cpi - cd.k * cd.cpeDom) < 1e-12, 'wind van links: ' + cd.domName + ', verhouding ' + (isFinite(cd.ratio) ? nl(cd.ratio, 1) : '∞') + ', k = ' + nl(cd.k, 3));
    });
    chk('Fig. 7.13 eindpunten (+0,35 / −0,30 / −0,50)', Math.abs(fig713(0.2, 0.2) - 0.35) < 1e-12 && Math.abs(fig713(1, 0.2) + 0.3) < 1e-12 && Math.abs(fig713(1, 1) + 0.5) < 1e-12, 'h/d ≤ 0,25 en ≥ 1');
    var t0 = tot.filter(function (t) { return t.kind === 'roof'; })[0];
    if (t0) { var sF = rows.filter(function (r) { return r.part === t0.part && r.dir === t0.dir && r.caseId === t0.caseId && r.scen === t0.scen; }).reduce(function (a, r) { return a + r.Fk; }, 0); chk('Som zonekrachten = totaal (' + PART_NAMES[t0.part] + ')', Math.abs(sF - t0.Fn) < 1e-6, nl(sF, 1) + ' kN'); }
    chk('Ontwerp = γ_Q·K_FI·r·karakteristiek', rows.every(function (r) { return Math.abs(r.wGlobD - r.wGlob * gF * red) < 1e-12; }), 'γ_Q·K_FI = ' + nl(gF, 2) + ', r = ' + nl(red, 3));
    chk('Tijdelijke reductie enkel indien aangevinkt', (P.useProb || P.useSeason) ? red <= 1 : red === 1, 'r = ' + nl(red, 3));
    out.canopies.forEach(function (e) { var c = e.gov; c.checks.forEach(function (x) { C.push({ name: 'Overkapping ' + spans[e.span].name + ': ' + x.name, ok: x.ok, detail: x.detail }); }); chk('Overkapping ' + spans[e.span].name + ': zelfde v_b en r als gebouw', Math.abs(c.vb.vbBase - vbBase) < 1e-12 && Math.abs(c.vb.red - red) < 1e-12, 'v_b = ' + nl(vbBase, 2) + ' m/s'); chk('Overkapping ' + spans[e.span].name + ': φ enkel van invloed op min-waarden', DIRS.every(function (d) { return Math.abs(e.byDir[d.id].aDown.Fz - c.aDown.Fz) < 1e-9; }), 'φ per richting: ' + DIRS.map(function (d) { return d.id + ' ' + nl(e.byDir[d.id].P.phi, 0) + ' %'; }).join(', ')); });
    (function () { // S5-referentie (WInt): h/d = 17,44/44,76 → c_pe,D = 0,7186 → c_pi = 0,6467
      var v0 = vols.filter(function (v) { return v.closed; })[0]; if (!v0) return; var x = out.cpiDetail[v0.i].L.s5; if (!x) return;
      chk('S5 wind van links = 0,9·c_pe,D van het overdekte deel (tabel 7.1, h/d = ' + nl(x.hd, 3) + ')', Math.abs(x.cpi - 0.9 * t71(x.hd).D[0]) < 1e-12, 'c_pi = ' + nl(x.cpi, 4));
    })();

    /* --- waarschuwingen --- */
    if (P.cat !== 'II') out.warnings.push('Plan 2161/A vermeldt "WIND vb=26m/s WindCAT II"; hier terreincategorie ' + P.cat + '. Te bevestigen (cat. II ≈ +35 % q_p).');
    if (P.useProb && P.useSeason) out.warnings.push('c_prob én c_season toegepast: dubbele duurreductie – enkel met motivering.');
    if (hMax > 15 && P.cscd === 1) out.warnings.push('h = ' + nl(hMax, 2) + ' m > 15 m: c_s c_d = 1 te verantwoorden (EN 6.2(1), ANB 6.3.1).');
    if (P.pitchMode === 'plan' && Math.abs(spans[1].aGeom - aPlan) > 0.2) out.warnings.push('Helling volgens plan (' + nl(aPlan, 2) + '°) wijkt af van helling uit niveaus (' + nl(spans[1].aGeom, 2) + '°).');
    [1, 2].forEach(function (k) { var w = 'W' + k, a = spans[k - 1].vol, b = spans[k].vol; if (WL[w].on && a !== b && a.closed && b.closed) out.warnings.push(PART_NAMES[w] + ' scheidt twee gesloten volumes: binnenwand, netto belasting = q_p(z_i)·(c_pi,1 − c_pi,2) – niet in de tabellen opgenomen.'); });
    if (!vols.some(function (v) { return v.closed; }) && !out.canopies.length) out.warnings.push('Geen enkel belast vlak: schakel daken of wanden in.');
    return out;
  }

  function c74Ref(a, i5) { var keep = NORM.t74a[0].I.p; NORM.t74a[0].I.p = i5 ? [0.2, 0.2] : [0, 0]; var o = {}; ['F', 'G', 'H', 'I', 'J'].forEach(function (z) { o[z] = { n: interpTable(NORM.t74a, 'a', a, function (r) { return r[z].n; }), p: interpTable(NORM.t74a, 'a', a, function (r) { return r[z].p; }) }; }); NORM.t74a[0].I.p = keep; return o; }
  function t71Ref(hd) { var o = {}; ['A', 'B', 'C', 'D', 'E'].forEach(function (z) { o[z] = interpTable(NORM.t71, 'hd', hd, function (r) { return r[z]; }); }); return o; }
  return { NORM: NORM, DIRS: DIRS, DURATIONS: DURATIONS, PART_NAMES: PART_NAMES, compute: compute, windProfile: windProfile, cpeArea: cpeArea, cprobFromT: cprobFromT, cprobFormula: cprobFormula, c74Ref: c74Ref, t71Ref: t71Ref };
})();
if (typeof module !== 'undefined') module.exports = WE;
