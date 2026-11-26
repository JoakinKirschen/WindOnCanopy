var DEFAULTS = {
  vb0: 26, cat: 'III', c0: 1.0, kIformula: false,
  cdirMode: 'all', dirDeg: 0, cdirMan: 1.0,
  useSeason: false, month0: 11, duration: 'y1', cseason: 1.0, monthsDur: 12, T: 10,
  useProb: false, cprobMode: 'table', cprob: 1.0, cprobMan: 1.0,
  geo: { s1: 44.76, s2: 44.76, sL: 45.14, B: 109.439, hE1: 14.46, hV7: 14.20, hR: 17.44, hV13: 14.23 },
  pitchMode: 'plan', pitchPct: 15,
  roofs: [{ on: true, rem: 109.439 }, { on: true, rem: 0 }, { on: true, rem: 0 }],
  remFromA: true,
  walls: {
    W0: { on: true, open: 0 }, W1: { on: false, open: 0 }, W2: { on: true, open: 0 }, W3: { on: false, open: 0 },
    A0: { on: true, open: 0 }, A1: { on: true, open: 0 }, A2: { on: false, open: 0 },
    P0: { on: true, open: 0 }, P1: { on: true, open: 0 }, P2: { on: false, open: 0 }
  },
  fase2: { on: true, y0: 43.674, L: 36.661, H: 10.837 },
  perm: 0.05,
  zeAuto: true, zeBld: 17.44, zi: 17.44,
  Aloc: 1.0,
  cpiPos: 0.2, cpiNeg: -0.3, cpiMan: 0.0,
  scen: { S1: true, S2: true, S3: true, S4: false, S5: true },
  i5pos: true, zeDtop: false,
  can: { n: 1, alpha: 8.53, he: 14.23, phiMode: 'dir', phi: 100, phiDir: { R: 100, L: 0, A: 0, P: 0 }, zeMode: 'eave', ze: 14.23, cfr: 0.04 },
  cscd: 1.0, gammaQ: 1.5, KFI: 1.0,
  mode: 'k'
};
if (typeof module !== 'undefined') module.exports = DEFAULTS;
