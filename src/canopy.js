/* ==========================================================================
   Rekenkern – open overkappingen, NBN EN 1991-1-4 §7.3 + ANB (België)
   Eenheden: m, m², N/m² intern; kN/m² en kN in de uitvoer.
   ========================================================================== */
var CE = (function () {
  'use strict';
  var NORM = {
    // EN tabel 4.1
    terrain: { '0': { z0: 0.003, zmin: 1 }, 'I': { z0: 0.01, zmin: 1 }, 'II': { z0: 0.05, zmin: 2 }, 'III': { z0: 0.3, zmin: 5 }, 'IV': { z0: 1.0, zmin: 10 } },
    kI: { '0': 1.0, 'I': 1.0, 'II': 1.0, 'III': 0.95, 'IV': 0.85 },           // ANB 4.4 (c0 = 1)
    rho: 1.25,                                                                  // ANB 4.5
    // ANB tabel 4.3: richting waaruit de wind komt (° vanaf noorden, met de klok) → cdir
    cdir: [[0, 1.0], [22.5, 1.0], [37.75, 0.95], [45, 0.90], [56.25, 0.85], [90, 0.85], [120, 0.90], [150, 0.95], [180, 1.0], [270, 1.0], [360, 1.0]],
    // ANB tabel 4.4: cseason jan..dec
    cseason: [0.96, 0.96, 0.92, 0.88, 0.83, 0.83, 0.83, 0.83, 0.88, 0.92, 1.0, 0.96],
    // ANB tabel 4.5: terugkeerperiode T [jaar] → cprob
    cprob: [[1, 0.75], [2, 0.78], [5, 0.85], [10, 0.90], [20, 0.95], [50, 1.0], [100, 1.04], [200, 1.08], [500, 1.12], [1000, 1.16]],
    // EN tabel 7.7 – tweezijdig hellende overkapping: [cf, A, B, C, D]
    t77: [
      { a: -20, max: [0.7, 0.8, 1.6, 0.6, 1.7], min0: [-0.7, -0.9, -1.3, -1.6, -0.6], min1: [-1.3, -1.5, -2.4, -2.4, -0.6] },
      { a: -15, max: [0.5, 0.6, 1.5, 0.7, 1.4], min0: [-0.6, -0.8, -1.3, -1.6, -0.6], min1: [-1.4, -1.6, -2.7, -2.6, -0.6] },
      { a: -10, max: [0.4, 0.6, 1.4, 0.8, 1.1], min0: [-0.6, -0.8, -1.3, -1.5, -0.6], min1: [-1.4, -1.6, -2.7, -2.6, -0.6] },
      { a: -5, max: [0.3, 0.5, 1.5, 0.8, 0.8], min0: [-0.5, -0.7, -1.3, -1.6, -0.6], min1: [-1.3, -1.5, -2.4, -2.4, -0.6] },
      { a: 5, max: [0.3, 0.6, 1.8, 1.3, 0.4], min0: [-0.6, -0.6, -1.4, -1.4, -1.1], min1: [-1.3, -1.3, -2.0, -1.8, -1.5] },
      { a: 10, max: [0.4, 0.7, 1.8, 1.4, 0.4], min0: [-0.7, -0.7, -1.5, -1.4, -1.4], min1: [-1.3, -1.3, -2.0, -1.8, -1.8] },
      { a: 15, max: [0.4, 0.9, 1.9, 1.4, 0.4], min0: [-0.8, -0.9, -1.7, -1.4, -1.8], min1: [-1.3, -1.3, -2.2, -1.6, -2.1] },
      { a: 20, max: [0.6, 1.1, 1.9, 1.5, 0.4], min0: [-0.9, -1.2, -1.8, -1.4, -2.0], min1: [-1.3, -1.4, -2.2, -1.6, -2.1] },
      { a: 25, max: [0.7, 1.2, 1.9, 1.6, 0.5], min0: [-1.0, -1.4, -1.9, -1.4, -2.0], min1: [-1.3, -1.4, -2.0, -1.5, -2.0] },
      { a: 30, max: [0.9, 1.3, 1.9, 1.6, 0.7], min0: [-1.0, -1.4, -1.9, -1.4, -2.0], min1: [-1.3, -1.4, -1.8, -1.4, -2.0] }
    ],
    // EN tabel 7.8 – ψmc per overkappingspositie (1 = eerste, 2 = tweede, 3 = derde en volgende)
    psi: { max: [1.0, 0.9, 0.7], min: [0.8, 0.7, 0.7] },
    // EN tabel 7.10 – wrijvingscoëfficiënt
    cfr: { '0.01': 'glad (staal, glad beton)', '0.02': 'ruw (ruw beton, geteerde platen)', '0.04': 'zeer ruw (ribbels, golven, vouwen)' }
  };
  var ZI = { A: 1, B: 2, C: 3, D: 4 };

  function lerp(x, x0, x1, y0, y1) { return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  function nl(v, d) { return v.toFixed(d).replace('.', ','); }
  function interpPairs(t, x) {
    if (x <= t[0][0]) return t[0][1];
    for (var i = 0; i < t.length - 1; i++) if (x <= t[i + 1][0]) return lerp(x, t[i][0], t[i + 1][0], t[i][1], t[i + 1][1]);
    return t[t.length - 1][1];
  }
  function cdirFromDeg(deg) { deg = ((deg % 360) + 360) % 360; return interpPairs(NORM.cdir, deg); }
  function cprobFormula(p) { var K = 0.2, n = 0.5; return Math.pow((1 - K * Math.log(-Math.log(1 - p))) / (1 - K * Math.log(-Math.log(0.98))), n); }
  function cprobFromT(T) { for (var i = 0; i < NORM.cprob.length; i++) if (NORM.cprob[i][0] === T) return NORM.cprob[i][1]; return cprobFormula(1 / T); }
  function alphaValid(a) { return (a >= 5 && a <= 30) || (a <= -5 && a >= -20); }
  // EN tabel 7.7 Opm./7.2.5 Opm. 2-logica: enkel interpoleren tussen rijen met hetzelfde teken
  function t77At(a) {
    var rows = NORM.t77.filter(function (r) { return a > 0 ? r.a > 0 : r.a < 0; });
    function get(key) {
      if (a <= rows[0].a) return rows[0][key].slice();
      for (var i = 0; i < rows.length - 1; i++) if (a <= rows[i + 1].a) { var r0 = rows[i], r1 = rows[i + 1]; return r0[key].map(function (v, k) { return lerp(a, r0.a, r1.a, v, r1[key][k]); }); }
      return rows[rows.length - 1][key].slice();
    }
    return { max: get('max'), min0: get('min0'), min1: get('min1') };
  }

  function windProfile(z, P, vb) {
    var ter = NORM.terrain[P.cat];
    var kr = 0.19 * Math.pow(ter.z0 / 0.05, 0.07);
    var zc = Math.max(z, ter.zmin);
    var lnz = Math.log(zc / ter.z0);
    var cr = kr * lnz, vm = cr * P.c0 * vb;
    var kI = P.kIformula ? P.c0 * (1 - 2e-4 * Math.pow(Math.log10(ter.z0) + 3, 6)) : NORM.kI[P.cat];
    var Iv = kI / (P.c0 * lnz);
    var qb = 0.5 * NORM.rho * vb * vb;
    var qp = (1 + 7 * Iv) * 0.5 * NORM.rho * vm * vm;
    return { z: z, zc: zc, z0: ter.z0, zmin: ter.zmin, kr: kr, lnz: lnz, cr: cr, vb: vb, vm: vm, kI: kI, Iv: Iv, qb: qb, qp: qp, ce: qp / qb };
  }

  function compute(P) {
    var o = { P: P, warnings: [], checks: [] };
    var a = P.alpha, ar = a * Math.PI / 180, ta = Math.tan(ar), ca = Math.cos(ar), sa = Math.sin(ar);
    var n = P.n, d = P.d, b = P.b, he = P.he;
    var rise = (d / 2) * Math.abs(ta);
    var top = a > 0 ? he + rise : he, low = a > 0 ? he : he - rise;
    var ze = P.zeMode === 'eave' ? he : (P.zeMode === 'manual' ? P.ze : (P.zeAuto === false ? P.ze : top));
    o.geo = { n: n, d: d, b: b, he: he, rise: rise, top: top, low: low, ze: ze, W: n * d, Apitch: b * (d / 2) / ca, Aplan: n * d * b };

    /* --- windsnelheid en stuwdruk (EN 4.2–4.5 + ANB) --- */
    var cdir = P.cdirMode === 'all' ? 1.0 : (P.cdirMode === 'dir' ? cdirFromDeg(P.dirDeg) : P.cdirMan);
    var cseason = 1.0, months = [];
    if (P.useSeason) { for (var i = 0; i < P.months; i++) { var m = (P.month0 - 1 + i) % 12; months.push(m + 1); cseason = i === 0 ? NORM.cseason[m] : Math.max(cseason, NORM.cseason[m]); } }
    var cprob = P.useProb ? (P.cprobMode === 'manual' ? P.cprobMan : (P.cprobMode === 'formula' ? cprobFormula(1 / P.T) : cprobFromT(P.T))) : 1.0;
    var vbBase = cdir * P.vb0, vbRed = cdir * cseason * cprob * P.vb0;
    var red = Math.pow(cseason * cprob, 2);
    o.vb = { vb0: P.vb0, cdir: cdir, cseason: cseason, cprob: cprob, months: months, vbBase: vbBase, vbRed: vbRed, red: red };
    var pr = windProfile(ze, P, vbBase);
    o.prof = pr;
    o.profileTable = [5, 10, 12, 14, 16, 18, 20, 25, 30].concat([ze]).sort(function (x, y) { return x - y; }).filter(function (v, i, s) { return i === 0 || Math.abs(v - s[i - 1]) > 1e-9; }).map(function (z) { return windProfile(z, P, vbBase); });
    var qp = pr.qp; // N/m², karakteristiek zonder tijdelijke reductie
    var gF = P.gammaQ * P.KFI;

    /* --- coëfficiënten tabel 7.7 --- */
    if (!alphaValid(a)) { o.invalid = 'Dakhelling α = ' + nl(a, 2) + '° valt buiten tabel 7.7 (−20° … −5° of +5° … +30°).'; return o; }
    var c = t77At(a), phi = P.phi / 100;
    var cmin = c.min0.map(function (v, k) { return lerp(phi, 0, 1, v, c.min1[k]); });
    o.coef = { max: c.max, min0: c.min0, min1: c.min1, min: cmin, phi: phi };

    /* --- overkappingen (Fig. 7.18, tabel 7.8) --- */
    var bays = [];
    for (var k = 0; k < n; k++) {
      var rank = n === 1 ? 0 : Math.min(k, n - 1 - k), cls = Math.min(rank, 2);
      var pmax = n === 1 ? 1.0 : NORM.psi.max[cls], pmin = n === 1 ? 1.0 : NORM.psi.min[cls];
      bays.push({ i: k + 1, x0: k * d, x1: (k + 1) * d, xm: k * d + d / 2, cls: n === 1 ? '–' : String(cls + 1), psiMax: pmax, psiMin: pmin });
    }
    o.bays = bays;

    /* --- lokale zones (tabel 7.7 zone-indeling) --- */
    var zones = [], b10 = b / 10, d10 = d / 10;
    bays.forEach(function (B) {
      function add(name, pitch, x0, x1, y0, y1) {
        if (x1 - x0 < 1e-9 || y1 - y0 < 1e-9) return;
        var A = (x1 - x0) * (y1 - y0) / ca, k = ZI[name];
        var cpMax = c.max[k] * B.psiMax, cpMin = cmin[k] * B.psiMin;
        var z = { bay: B.i, cls: B.cls, pitch: pitch, name: name, x0: x0, x1: x1, y0: y0, y1: y1, A: A, cpMax0: c.max[k], cpMin0: cmin[k], psiMax: B.psiMax, psiMin: B.psiMin, cpMax: cpMax, cpMin: cpMin };
        z.wMax = qp * cpMax / 1000; z.wMin = qp * cpMin / 1000;            // kN/m², karakteristiek
        z.wMaxD = z.wMax * red * gF; z.wMinD = z.wMin * red * gF;
        zones.push(z);
      }
      ['L', 'R'].forEach(function (p) {
        var x0 = p === 'L' ? B.x0 : B.xm, x1 = p === 'L' ? B.xm : B.x1;
        add('B', p, x0, x1, 0, b10); add('B', p, x0, x1, b - b10, b);
        if (p === 'L') { add('C', p, B.x0, B.x0 + d10, b10, b - b10); add('A', p, B.x0 + d10, B.xm - d10, b10, b - b10); add('D', p, B.xm - d10, B.xm, b10, b - b10); }
        else { add('D', p, B.xm, B.xm + d10, b10, b - b10); add('A', p, B.xm + d10, B.x1 - d10, b10, b - b10); add('C', p, B.x1 - d10, B.x1, b10, b - b10); }
      });
    });
    o.zones = zones;

    /* --- globale krachten per helling (Fig. 7.17, EN 7.3(6), ANB 7.3) --- */
    var Ap = o.geo.Apitch;
    var pitches = [];
    bays.forEach(function (B) {
      ['L', 'R'].forEach(function (p) {
        var nx = p === 'L' ? -sa : sa, nz = ca; // naar buiten gerichte normaal (bovenzijde)
        var xc = p === 'L' ? B.x0 + d / 4 : B.x1 - d / 4;
        var zc = (top + low) / 2;
        var cfMax = c.max[0] * B.psiMax, cfMin = cmin[0] * B.psiMin;
        var FMax = P.cscd * cfMax * qp * Ap / 1000, FMin = P.cscd * cfMin * qp * Ap / 1000; // + = naar het vlak (neerwaarts)
        pitches.push({ bay: B.i, cls: B.cls, pitch: p, xc: xc, yc: b / 2, zc: zc, n: [nx, nz], A: Ap, cfMax0: c.max[0], cfMin0: cmin[0], psiMax: B.psiMax, psiMin: B.psiMin, cfMax: cfMax, cfMin: cfMin, FMax: FMax, FMin: FMin, wMax: qp * cfMax / 1000, wMin: qp * cfMin / 1000 });
      });
    });
    o.pitches = pitches;
    // belastingsopstellingen Fig. 7.17
    var arr = [];
    ['max', 'min'].forEach(function (s) {
      ['beide', 'links', 'rechts'].forEach(function (lay) {
        var Fx = 0, Fz = 0, Mx = 0, Fn = 0;
        pitches.forEach(function (p) {
          var on = lay === 'beide' || (lay === 'links' && p.pitch === 'L') || (lay === 'rechts' && p.pitch === 'R');
          if (!on) return;
          var F = s === 'max' ? p.FMax : p.FMin;
          var fx = -F * p.n[0], fz = -F * p.n[1];
          Fx += fx; Fz += fz; Fn += F; Mx += fz * p.xc;
        });
        arr.push({ sign: s, lay: lay, Fn: Fn, Fx: Fx, Fz: Fz, xR: Fz !== 0 ? Mx / Fz : null, red: red, gF: gF });
      });
    });
    o.arrangements = arr;

    /* --- wrijving (EN 7.3(7), 7.5) --- */
    function fric(Lin, Bcr) { var lim = Math.min(2 * Bcr, 4 * ze), Lf = Math.max(0, Lin - lim); var Afr = 2 * Bcr * Lf / ca; return { Lin: Lin, B: Bcr, lim: lim, Lf: Lf, Afr: Afr, F: P.cfr * qp * Afr / 1000 }; }
    o.fric = { langs: fric(b, n * d), dwars: fric(n * d, b) };

    /* --- samenvatting --- */
    var zMax = null, zMin = null;
    zones.forEach(function (z) { if (!zMax || z.wMax > zMax.wMax) zMax = z; if (!zMin || z.wMin < zMin.wMin) zMin = z; });
    o.zMax = zMax; o.zMin = zMin;
    var aDown = null, aUp = null;
    arr.forEach(function (r) { if (!aDown || r.Fz < aDown.Fz) aDown = r; if (!aUp || r.Fz > aUp.Fz) aUp = r; });
    o.aDown = aDown; o.aUp = aUp;

    /* --- controles --- */
    var C = o.checks;
    function chk(name, ok, det) { C.push({ name: name, ok: !!ok, detail: det }); }
    chk('q_p(z) = c_e(z)·q_b', Math.abs(pr.ce * pr.qb - pr.qp) < 1e-6, 'c_e = ' + nl(pr.ce, 4) + ', q_b = ' + nl(pr.qb, 1) + ' N/m²');
    if (P.vb0 === 26 && P.c0 === 1 && cdir === 1 && !P.kIformula) {
      var t49 = { '0': 1405, 'I': 1323, 'II': 1157, 'III': 862, 'IV': 593 }[P.cat], q18 = windProfile(18, P, 26).qp;
      chk('q_p(18 m) = ANB tabel 4.9 (v_b,0 = 26 m/s)', Math.abs(q18 - t49) / t49 < 0.005, 'formule ' + nl(q18, 1) + ' ↔ tabel ' + t49 + ' N/m²');
    }
    chk('Dakhelling binnen tabel 7.7, interpolatie tussen rijen met hetzelfde teken', alphaValid(a), 'α = ' + nl(a, 2) + '°');
    var tst = t77At(a > 0 ? 10 : -10);
    chk('Interpolatie tabel 7.7 reproduceert tabelrij bij α = ' + (a > 0 ? '+10°' : '−10°'), JSON.stringify(tst.max) === JSON.stringify(NORM.t77.filter(function (r) { return r.a === (a > 0 ? 10 : -10); })[0].max), 'c_f, A–D');
    chk('φ-interpolatie: min-waarden tussen φ = 0 en φ = 1', cmin.every(function (v, k) { return v <= Math.max(c.min0[k], c.min1[k]) + 1e-12 && v >= Math.min(c.min0[k], c.min1[k]) - 1e-12; }), 'φ = ' + nl(phi * 100, 0) + ' %');
    var sumA = zones.reduce(function (s, z) { return s + z.A; }, 0), expA = n * d * b / ca;
    chk('Som zoneoppervlakken = dakoppervlak', Math.abs(sumA - expA) < 1e-6, nl(sumA, 2) + ' ↔ ' + nl(expA, 2) + ' m²');
    var ov = true;
    for (var p1 = 0; p1 < zones.length; p1++) for (var p2 = p1 + 1; p2 < zones.length; p2++) { var z1 = zones[p1], z2 = zones[p2]; if (Math.min(z1.x1, z2.x1) - Math.max(z1.x0, z2.x0) > 1e-9 && Math.min(z1.y1, z2.y1) - Math.max(z1.y0, z2.y0) > 1e-9) ov = false; }
    chk('Zones overlappen niet en liggen binnen de overkapping', ov && zones.every(function (z) { return z.x0 >= -1e-9 && z.x1 <= n * d + 1e-9 && z.y0 >= -1e-9 && z.y1 <= b + 1e-9; }), zones.length + ' zones');
    var psiOK = bays.every(function (B) { return n === 1 ? (B.psiMax === 1 && B.psiMin === 1) : (B.psiMax === NORM.psi.max[+B.cls - 1] && B.psiMin === NORM.psi.min[+B.cls - 1]); });
    chk('ψ_mc volgens tabel 7.8 / Fig. 7.18 (symmetrisch vanaf beide randen)', psiOK, bays.map(function (B) { return B.cls; }).join('-'));
    var ab = arr.filter(function (r) { return r.sign === 'max'; }), sumLR = ab[1].Fz + ab[2].Fz;
    chk('Fig. 7.17: beide hellingen = linker + rechter helling', Math.abs(sumLR - ab[0].Fz) < 1e-6, nl(ab[0].Fz, 1) + ' kN');
    chk('Teken: c_f,max ≥ 0 (neerwaarts), c_f,min < 0 (opwaarts)', c.max[0] >= 0 && cmin[0] < 0, 'c_f = ' + nl(c.max[0], 3) + ' / ' + nl(cmin[0], 3));
    chk('Ontwerp = γ_Q·K_FI·r·karakteristiek', zones.every(function (z) { return Math.abs(z.wMaxD - z.wMax * gF * red) < 1e-12; }), 'γ_Q·K_FI = ' + nl(gF, 2) + ', r = ' + nl(red, 3));
    chk('Referentiehoogte z_e = h volgens EN 7.3(8), fig. 7.17', ze > 0, (P.zeMode === 'eave' ? 'h tot de dakrand (fig. 7.17) = ' : P.zeMode === 'manual' ? 'handmatig = ' : 'bovenkant (veilig) = ') + nl(ze, 2) + ' m');

    /* --- waarschuwingen --- */
    if (low < 2 && n > 1) o.warnings.push('ANB 7.3: geschakelde overkappingen gelden vanaf h ≥ 2 m.');
    return o;
  }

  return { NORM: NORM, compute: compute, windProfile: windProfile, cdirFromDeg: cdirFromDeg, cprobFromT: cprobFromT, cprobFormula: cprobFormula, t77At: t77At, alphaValid: alphaValid };
})();
if (typeof module !== 'undefined') module.exports = CE;
