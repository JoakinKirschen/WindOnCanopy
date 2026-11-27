/* 3D-weergave universeel model – plan (x dwars, y langs, z omhoog) → three (x−cx, z, −(y−cy)) */
window.View3D = (function () {
  'use strict';
  var scene, camera, renderer, controls, root, ray, mouse, wrap, labelsDiv, tooltip;
  var OUT = null, SEL = null, built = false, failed = false, dirty = true, tween = null, first = true, lastKey = '';
  var C = { x: 0, y: 0 }, R = 80, picks = [], labels = [], G = {}, hovered = null, selected = null, GEO = {};
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fmt(v, d, s) { return window.WindUI.fmt(v, d, s); }
  function V(x, y, z) { return new THREE.Vector3(x - C.x, z, -(y - C.y)); }
  function Nv(nx, ny, nz) { return new THREE.Vector3(nx, nz, -ny).normalize(); }

  function init() {
    wrap = document.getElementById('viewerWrap'); labelsDiv = document.getElementById('labels'); tooltip = document.getElementById('tooltip');
    var host = document.getElementById('viewer');
    if (typeof THREE === 'undefined' || !THREE.OrbitControls) { failed = true; host.innerHTML = '<p style="padding:20px">De 3D-bibliotheek kon niet geladen worden. De berekening blijft volledig bruikbaar.</p>'; return; }
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); }
    catch (e) { failed = true; host.innerHTML = '<p style="padding:20px">WebGL is niet beschikbaar – 3D uitgeschakeld.</p>'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0xe9eef3, 1);
    host.appendChild(renderer.domElement);
    scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xe9eef3, 500, 1600);
    camera = new THREE.PerspectiveCamera(38, 1, 0.3, 5000);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !RM; controls.dampingFactor = 0.12; controls.screenSpacePanning = true;
    controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.9; controls.panSpeed = 0.9; controls.maxPolarAngle = Math.PI * 0.495; controls.keyPanSpeed = 25;
    controls.listenToKeyEvents(wrap);
    controls.addEventListener('change', function () { dirty = true; });
    controls.addEventListener('start', function () { tween = null; });
    scene.add(new THREE.HemisphereLight(0xffffff, 0xaab4c0, 0.8));
    var d1 = new THREE.DirectionalLight(0xffffff, 0.55); d1.position.set(150, 260, 120); scene.add(d1);
    var d2 = new THREE.DirectionalLight(0xffffff, 0.22); d2.position.set(-180, -60, -140); scene.add(d2);
    root = new THREE.Group(); scene.add(root);
    ray = new THREE.Raycaster(); mouse = new THREE.Vector2();
    GEO.cyl = new THREE.CylinderGeometry(1, 1, 1, 10); GEO.cone = new THREE.ConeGeometry(1, 1, 16); GEO.box = new THREE.BoxGeometry(1, 1, 1);
    new ResizeObserver(resize).observe(wrap); resize();
    var cv = renderer.domElement, down = null;
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerleave', function () { tooltip.style.display = 'none'; setHover(null); });
    cv.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; wrap.focus({ preventScroll: true }); });
    cv.addEventListener('pointerup', function (e) { if (down && Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) < 5) onClick(e); down = null; });
    cv.addEventListener('dblclick', onDbl);
    document.querySelectorAll('.viewbtns button').forEach(function (b) { b.onclick = function () { setView(b.getAttribute('data-view')); }; });
    ['t_roof', 't_can', 't_wall', 't_labels', 't_arrows', 't_wind', 't_ctx', 't_dims', 't_frames'].forEach(function (id) { document.getElementById(id).onchange = applyToggles; });
    built = true; requestAnimationFrame(tick);
  }
  function resize() { if (!renderer) return; var w = wrap.clientWidth, h = wrap.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); dirty = true; }
  function tick(t) {
    requestAnimationFrame(tick);
    if (tween) { var k = Math.min(1, (t - tween.t0) / tween.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.q0, tween.q1, e); if (k >= 1) tween = null; dirty = true; }
    if (controls.update()) dirty = true;
    if (dirty && OUT) { renderer.render(scene, camera); placeLabels(); dirty = false; }
  }
  function goTo(pos, target) { if (RM) { camera.position.copy(pos); controls.target.copy(target); controls.update(); dirty = true; return; } tween = { t0: performance.now(), dur: 550, p0: camera.position.clone(), p1: pos, q0: controls.target.clone(), q1: target }; }
  function viewDist() { var f = camera.fov * Math.PI / 180, fh = 2 * Math.atan(Math.tan(f / 2) * camera.aspect); return R / Math.sin(Math.min(f, fh) / 2) * 1.02; }
  function setView(v) {
    var tgt = new THREE.Vector3(0, 7, 0), dir;
    if (v === 'top') dir = new THREE.Vector3(0, 1, 0.0001); else if (v === 'front') dir = new THREE.Vector3(0, 0.12, 1); else if (v === 'right') dir = new THREE.Vector3(1, 0.15, 0); else if (v === 'fit') dir = camera.position.clone().sub(controls.target); else dir = new THREE.Vector3(0.95, 0.72, 1.15);
    goTo(tgt.clone().addScaledVector(dir.normalize(), viewDist()), tgt);
  }
  var POS = [[0, '#fff0de'], [0.35, '#fdae61'], [0.7, '#e8552e'], [1, '#a50f15']], NEG = [[0, '#e4eef8'], [0.35, '#8fbfe0'], [0.7, '#4575b4'], [1, '#23317a']];
  function ramp(st, t) { t = Math.max(0, Math.min(1, t)); for (var i = 0; i < st.length - 1; i++) if (t <= st[i + 1][0]) return new THREE.Color(st[i][1]).lerp(new THREE.Color(st[i + 1][1]), (t - st[i][0]) / (st[i + 1][0] - st[i][0])); return new THREE.Color(st[st.length - 1][1]); }
  function col(w, m) { return Math.abs(w) < 1e-9 ? new THREE.Color('#eeeeee') : (w > 0 ? ramp(POS, w / m) : ramp(NEG, -w / m)); }
  function cssRamp() { return 'linear-gradient(90deg,' + NEG.slice().reverse().map(function (s) { return s[1] + ' ' + ((1 - s[0]) * 50) + '%'; }).concat(POS.map(function (s) { return s[1] + ' ' + (50 + s[0] * 50) + '%'; })).join(',') + ')'; }
  function dispose(o) { o.traverse(function (c) { if (c.geometry && c.geometry !== GEO.cyl && c.geometry !== GEO.cone && c.geometry !== GEO.box) c.geometry.dispose(); if (c.material) [].concat(c.material).forEach(function (m) { m.dispose(); }); }); }
  function poly(p, color, opa) {
    var g = new THREE.BufferGeometry(), a = [];
    for (var i = 1; i < p.length - 1; i++) [0, i, i + 1].forEach(function (k) { a.push(p[k].x, p[k].y, p[k].z); });
    g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); g.computeVertexNormals();
    return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: color, side: THREE.DoubleSide, transparent: opa < 1, opacity: opa, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  }
  function outline(p, color) { return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: color })); }
  function dline(p, color) { var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineDashedMaterial({ color: color, dashSize: 2, gapSize: 1.4 })); l.computeLineDistances(); return l; }
  function rod(a, b, r, color) { var d = new THREE.Vector3().subVectors(b, a), L = d.length(), m = new THREE.Mesh(GEO.cyl, new THREE.MeshLambertMaterial({ color: color })); m.scale.set(r, L, r); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; }
  function arrow(from, dir, len, color, rs) {
    rs = rs || 1; var g = new THREE.Group(), head = Math.min(2.2 * rs, len * 0.42), shaft = Math.max(0.01, len - head), m = new THREE.MeshLambertMaterial({ color: color });
    var s = new THREE.Mesh(GEO.cyl, m); s.scale.set(0.15 * rs, shaft, 0.15 * rs); s.position.y = shaft / 2;
    var c = new THREE.Mesh(GEO.cone, m); c.scale.set(0.55 * rs, head, 0.55 * rs); c.position.y = shaft + head / 2;
    g.add(s); g.add(c); g.position.copy(from); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); return g;
  }
  function addLabel(pos, html, prio, grp, cls) { var el = document.createElement('div'); el.className = 'zlabel ' + (cls || ''); el.innerHTML = html; labelsDiv.appendChild(el); labels.push({ pos: pos, el: el, prio: prio, grp: grp, w: 0, h: 0 }); }
  function dim(a, b, off, text, grp) { // maatlijn met eindstreepjes
    var D = G.dims, c = 0x34495e; D.add(rod(a, b, 0.07, c));
    var dir = new THREE.Vector3().subVectors(b, a).normalize(), up = new THREE.Vector3(0, 1, 0), perp = new THREE.Vector3().crossVectors(dir, up); if (perp.length() < 0.1) perp.set(1, 0, 0); perp.normalize().multiplyScalar(1.2);
    [a, b].forEach(function (p) { D.add(rod(p.clone().sub(perp), p.clone().add(perp), 0.06, c)); });
    addLabel(a.clone().add(b).multiplyScalar(0.5).add(off || new THREE.Vector3()), text, 950, grp || 'dims', 'big');
  }

  function rebuild() {
    if (failed) return;
    dispose(root); while (root.children.length) root.remove(root.children[0]);
    labelsDiv.innerHTML = ''; labels = []; picks = []; hovered = selected = null;
    var o = OUT, X = o.X, B = o.B, sp = o.spans, P = o.P, taL = Math.tan(P.can.alpha * Math.PI / 180);
    C.x = X[3] / 2; C.y = B / 2;
    var hT = Math.max.apply(null, sp.map(function (s) { return s.top; }));
    R = 0.5 * Math.sqrt(X[3] * X[3] + B * B + hT * hT) + 8;
    G = { roof: new THREE.Group(), wall: new THREE.Group(), open: new THREE.Group(), arrows: new THREE.Group(), wind: new THREE.Group(), ctx: new THREE.Group(), dims: new THREE.Group(), frames: new THREE.Group() };
    Object.keys(G).forEach(function (k) { root.add(G[k]); });
    function zAt(s, x) {
      if (s.luifel) { var d = s.w / s.nb, u = (x - s.x0) - Math.floor(Math.min(x - s.x0, s.w - 1e-9) / d) * d; return s.zl + Math.min(u, d - u) * taL; }
      return x <= s.xm ? s.zl + (x - s.x0) / (s.xm - s.x0) * (s.zt - s.zl) : s.zt + (x - s.xm) / (s.x1 - s.xm) * (s.zr - s.zt);
    }
    function spanAt(x) { for (var i = 0; i < 3; i++) if (x <= sp[i].x1 + 1e-9) return sp[i]; return sp[2]; }
    function topPts(s, a, b) { var xs = [a, b]; var N = s.luifel ? s.nb * 2 : 2; for (var k = 0; k <= N; k++) xs.push(s.x0 + k * s.w / N); xs = xs.filter(function (x) { return x >= a - 1e-9 && x <= b + 1e-9; }).sort(function (p, q) { return p - q; }); return xs.filter(function (x, i) { return i === 0 || Math.abs(x - xs[i - 1]) > 1e-9; }); }
    var mf = SEL.mode === 'd' ? P.gammaQ * P.KFI * o.vb.red : o.vb.red, loc = SEL.meas === 'loc', up = SEL.sign === 'min';
    // kleurschaal: één schaal voor alle delen
    var wm = 0;
    o.rows.forEach(function (r) { if (r.scenOn) wm = Math.max(wm, Math.abs(loc ? r.wLoc : r.wGlob)); });
    o.canopies.forEach(function (e) { WE.DIRS.forEach(function (d) { var c = e.byDir[d.id]; if (loc) c.zones.forEach(function (z) { wm = Math.max(wm, Math.abs(z.wMax), Math.abs(z.wMin)); }); else c.pitches.forEach(function (p) { wm = Math.max(wm, Math.abs(p.wMax), Math.abs(p.wMin)); }); }); });
    o.free.forEach(function (z) { wm = Math.max(wm, Math.abs(z.w)); });
    wm = (wm || 1) * mf;
    var Lmax = Math.max(4, Math.min(11, Math.max(X[3], B) * 0.07)), off = 0.06;
    function arrowsOn(pts, n, w, grp) { var L = 0.8 + (Lmax - 0.8) * Math.abs(w) / wm; pts.forEach(function (q) { var a = w > 0 ? arrow(q.clone().addScaledVector(n, L), n.clone().negate(), L, 0xb8401a) : arrow(q, n, L, 0x1f4e9a); a.userData.grp = grp; G.arrows.add(a); }); }
    function grid(a0, a1, b0, b1, s) { var nx = Math.max(1, Math.round((a1 - a0) / s)), ny = Math.max(1, Math.round((b1 - b0) / s)), r = []; for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) r.push([a0 + (i + 0.5) * (a1 - a0) / nx, b0 + (j + 0.5) * (b1 - b0) / ny]); return r; }
    var spacing = Math.max(3, Math.min(10, Math.max(X[3], B) / 16));

    /* --- gesloten delen (zones van de gekozen richting) --- */
    o.zones.filter(function (z) { return z.dir === SEL.dir; }).forEach(function (z) {
      var key = z.kind === 'roof' ? ((SEL.dir === 'L' || SEL.dir === 'R') ? SEL.caseId : 'θ=90°') : '-';
      var rr = z.res[key], p = rr && rr.per[SEL.scen], w = p ? (loc ? p.wLoc : p.wGlob) * mf : 0;
      var color = p ? col(w, wm) : new THREE.Color('#cfcfcf'), n = new THREE.Vector3().fromArray([0, 0, 0]), pts, lab, grpName;
      var nn = o.normal(z); n = Nv(nn[0], nn[1], nn[2]);
      if (z.kind === 'roof') {
        var s = sp[z.span];
        pts = [V(z.x0, z.y0, zAt(s, z.x0) + off), V(z.x1, z.y0, zAt(s, z.x1) + off), V(z.x1, z.y1, zAt(s, z.x1) + off), V(z.x0, z.y1, zAt(s, z.x0) + off)];
        var xc = (z.x0 + z.x1) / 2; lab = V(xc, (z.y0 + z.y1) / 2, zAt(s, xc) + 0.5); grpName = 'roof';
        if (p) arrowsOn(grid(z.x0, z.x1, z.y0, z.y1, spacing).map(function (q) { return V(q[0], q[1], zAt(s, q[0]) + off); }), n, w, 'roof');
      } else if (z.kind === 'end') {
        var x = o.walls[z.part].x + (z.part === o.vols[z.vol].left ? -off : off);
        pts = [V(x, z.a0, 0), V(x, z.a1, 0), V(x, z.a1, z.H), V(x, z.a0, z.H)]; lab = V(x, (z.a0 + z.a1) / 2, z.H / 2); grpName = 'wall';
        if (p) arrowsOn(grid(z.a0, z.a1, 0, z.H, spacing).map(function (q) { return V(x, q[0], q[1]); }), n, w, 'wall');
      } else {
        var y = z.kind === 'A' ? -off : B + off, s2 = spanAt((z.a0 + z.a1) / 2), xs = topPts(s2, z.a0, z.a1);
        pts = [V(z.a0, y, 0), V(z.a1, y, 0)].concat(xs.slice().reverse().map(function (xx) { return V(xx, y, zAt(s2, xx)); }));
        lab = V((z.a0 + z.a1) / 2, y, zAt(s2, (z.a0 + z.a1) / 2) / 2); grpName = 'wall';
        if (p) arrowsOn(grid(z.a0, z.a1, 0, s2.zl, spacing).filter(function (q) { return q[1] < zAt(s2, q[0]) - 0.5; }).map(function (q) { return V(q[0], y, q[1]); }), n, w, 'wall');
      }
      var m = poly(pts, color, 0.97); m.userData = { kind: 'closed', z: z, p: p, rr: rr, w: w, key: key }; G[grpName].add(m); picks.push(m); G[grpName].add(outline(pts, 0x34495e));
      if (p) addLabel(lab, '<b>' + z.name + '</b> ' + window.WindUI.cn(loc ? P.Aloc : z.A) + window.WindUI.pm(z.name, key) + ' = ' + fmt(loc ? rr.cLoc : rr.cGlob, 2, true) + ' · c<sub>pi</sub> = ' + fmt(p.cpi, 2, true) + '<br>w = ' + fmt(w, 2, true) + ' kN/m²', 100 + Math.abs(w) * 30 + Math.log(z.A + 1), grpName);
    });
    // gevelopening fase 2
    var f2 = P.fase2;
    if (f2.on && o.walls.W0.on) { var zb = Math.max(0, o.walls.W0.H - f2.H); G.ctx.add(outline([V(-0.15, f2.y0, zb), V(-0.15, f2.y0 + f2.L, zb), V(-0.15, f2.y0 + f2.L, o.walls.W0.H), V(-0.15, f2.y0, o.walls.W0.H)], 0xd62728)); var op = poly([V(-0.2, f2.y0, zb), V(-0.2, f2.y0 + f2.L, zb), V(-0.2, f2.y0 + f2.L, o.walls.W0.H), V(-0.2, f2.y0, o.walls.W0.H)], new THREE.Color('#2b2b2b'), 0.35); G.ctx.add(op); addLabel(V(-0.2, f2.y0 + f2.L / 2, zb + f2.H / 2), 'opening fase 2', 400, 'ctx'); }

    /* --- open delen: overkappingen en vrijstaande wanden --- */
    o.canopies.forEach(function (e) {
      var c = e.byDir[SEL.dir], s = sp[c.span], d = c.geo.d, ta = Math.tan(c.P.alpha * Math.PI / 180);
      function zc(xl) { var u = xl - Math.floor(Math.min(xl, c.geo.W - 1e-9) / d) * d; return c.P.he + Math.min(u, d - u) * ta; }
      var sa = Math.sin(c.P.alpha * Math.PI / 180), ca = Math.cos(c.P.alpha * Math.PI / 180);
      if (loc) c.zones.forEach(function (z) {
        var w = (up ? z.wMin : z.wMax) * mf, cp = up ? z.cpMin : z.cpMax, n = z.pitch === 'L' ? Nv(-sa, 0, ca) : Nv(sa, 0, ca);
        var pts = [V(c.x0 + z.x0, c.y0 + z.y0, zc(z.x0) + off), V(c.x0 + z.x1, c.y0 + z.y0, zc(z.x1) + off), V(c.x0 + z.x1, c.y0 + z.y1, zc(z.x1) + off), V(c.x0 + z.x0, c.y0 + z.y1, zc(z.x0) + off)];
        var m = poly(pts, col(w, wm), 0.97); m.userData = { kind: 'can', c: c, z: z, w: w, cp: cp }; G.open.add(m); picks.push(m); G.open.add(outline(pts, 0x34495e));
        var xc = (z.x0 + z.x1) / 2; addLabel(V(c.x0 + xc, c.y0 + (z.y0 + z.y1) / 2, zc(xc) + 0.5), '<b>' + z.name + '</b> ψ·c<sub>p,net</sub> = ' + fmt(cp, 2, true) + '<br>w = ' + fmt(w, 2, true) + ' kN/m²', 100 + Math.abs(w) * 30, 'open');
        arrowsOn(grid(z.x0, z.x1, z.y0, z.y1, spacing).map(function (q) { return V(c.x0 + q[0], c.y0 + q[1], zc(q[0]) + off); }), n, w, 'open');
      });
      else {
        var Fm = 0; c.pitches.forEach(function (p) { Fm = Math.max(Fm, Math.abs(p.FMax), Math.abs(p.FMin)); }); Fm = (Fm || 1) * mf;
        c.pitches.forEach(function (pt) {
          var Bb = c.bays[pt.bay - 1], x0 = pt.pitch === 'L' ? Bb.x0 : Bb.xm, x1 = pt.pitch === 'L' ? Bb.xm : Bb.x1;
          var on = SEL.lay === 'beide' || (SEL.lay === 'links' && pt.pitch === 'L') || (SEL.lay === 'rechts' && pt.pitch === 'R');
          var w = (up ? pt.wMin : pt.wMax) * mf, F = (up ? pt.FMin : pt.FMax) * mf, n = pt.pitch === 'L' ? Nv(-sa, 0, ca) : Nv(sa, 0, ca);
          var pts = [V(c.x0 + x0, c.y0, zc(x0) + off), V(c.x0 + x1, c.y0, zc(x1) + off), V(c.x0 + x1, c.y0 + c.geo.b, zc(x1) + off), V(c.x0 + x0, c.y0 + c.geo.b, zc(x0) + off)];
          var m = poly(pts, on ? col(w, wm) : new THREE.Color('#d3d9df'), on ? 0.97 : 0.6); m.userData = { kind: 'canP', c: c, p: pt, on: on, w: w, F: F }; G.open.add(m); picks.push(m); G.open.add(outline(pts, 0x34495e));
          if (on) { var q = V(c.x0 + pt.xc, c.y0 + c.geo.b / 2, zc(pt.xc) + off), L = 3 + (Lmax * 1.9 - 3) * Math.abs(F) / Fm; var a = F > 0 ? arrow(q.clone().addScaledVector(n, L), n.clone().negate(), L, 0xb8401a, 2.6) : arrow(q, n, L, 0x1f4e9a, 2.6); a.userData.grp = 'open'; G.arrows.add(a); addLabel(q.clone().addScaledVector(n, L + 2.5).add(new THREE.Vector3((pt.pitch === 'L' ? -1 : 1) * d / 8, 0, 0)), '<b>F = ' + fmt(F, 0, true) + ' kN</b><br>c<sub>f</sub>·ψ = ' + fmt(up ? pt.cfMin : pt.cfMax, 2, true), 500 + Math.abs(F), 'open', 'big'); }
        });
      }
    });
    o.free.forEach(function (z) {
      var w = o.walls[z.part], wv = z.w * mf, pts;
      if (w.kind === 'end') pts = [V(w.x, z.a0, 0), V(w.x, z.a1, 0), V(w.x, z.a1, z.H), V(w.x, z.a0, z.H)];
      else { var s = sp[w.span], y = w.kind === 'A' ? 0 : B, a0 = s.x0 + z.a0, a1 = s.x0 + z.a1, xs = topPts(s, a0, a1); pts = [V(a0, y, 0), V(a1, y, 0)].concat(xs.slice().reverse().map(function (xx) { return V(xx, y, zAt(s, xx)); })); }
      var m = poly(pts, col(wv, wm), 0.95); m.userData = { kind: 'free', z: z, w: wv }; G.open.add(m); picks.push(m); G.open.add(outline(pts, 0x34495e));
      var c = pts[0].clone().add(pts[2]).multiplyScalar(0.5); addLabel(c, '<b>' + z.name + '</b> vrijstaand c<sub>p,net</sub> = ±' + fmt(z.cp, 2) + '<br>w = ±' + fmt(wv, 2) + ' kN/m²', 90 + Math.abs(wv) * 30, 'open');
    });

    /* --- context: afwezige daken, binnenwanden, kolommen, grond --- */
    sp.forEach(function (s) {
      if (s.rem > 0) {
        var ys = [s.yr[0], s.yr[1]], xs = topPts(s, s.x0, s.x1);
        ys.forEach(function (y) { G.ctx.add(dline(xs.map(function (x) { return V(x, y, zAt(s, x)); }), 0x2b5fb3)); });
        G.ctx.add(dline([V(s.xm, s.yr[0], s.zt), V(s.xm, s.yr[1], s.zt)], 0x2b5fb3));
        addLabel(V(s.xm, (s.yr[0] + s.yr[1]) / 2, s.zt + 1), 'dak ' + s.name + (s.rem >= B - 1e-9 ? ' afwezig' : ' deels verwijderd'), 300, 'ctx');
      }
    });
    // aanwezige wanden zonder belasting in deze weergave (binnenwanden) grijs
    ['W0', 'W1', 'W2', 'W3'].forEach(function (id) {
      var w = o.walls[id]; if (!w.on) return;
      var loaded = o.zones.some(function (z) { return z.part === id; }) || o.free.some(function (z) { return z.part === id; });
      if (!loaded) { var m = poly([V(w.x, 0, 0), V(w.x, B, 0), V(w.x, B, w.H), V(w.x, 0, w.H)], new THREE.Color('#c9d1da'), 0.5); G.ctx.add(m); addLabel(V(w.x, B / 2, w.H / 2), 'binnenwand ' + window.WindUI.PN[id], 200, 'ctx'); }
    });
    var EL = o.EL && !o.EL.err ? o.EL : null;
    if (!EL) {
      var ny = Math.max(1, Math.round(B / 7.3));
      [0, 1, 2, 3].forEach(function (k) {
        if (o.walls['W' + k].on) return;
        var hh = k === 0 ? sp[0].zl : k === 3 ? sp[2].zr : Math.min(sp[k - 1].zr, sp[k].zl);
        for (var j = 0; j <= ny; j++) { var c = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ color: 0x6c7783 })); c.scale.set(0.4, hh, 0.4); c.position.copy(V(X[k], j * B / ny, hh / 2)); G.ctx.add(c); }
      });
    } else {
      /* --- spanten (posities uit de invoer Draagconstructie) --- */
      var zLine = function (x) { var z = 0; sp.forEach(function (s) { if (x >= s.x0 - 1e-6 && x <= s.x1 + 1e-6) z = Math.max(z, zAt(s, Math.min(Math.max(x, s.x0), s.x1 - 1e-9))); }); return z; };
      EL.frames.forEach(function (fr, k) {
        var selF = SEL.frame === k, c = selF ? 0xe07a1f : 0x334155, r = selF ? 0.26 : 0.13, y = fr.y;
        sp.forEach(function (s) {
          var xs = topPts(s, s.x0, s.x1), pts = xs.map(function (x) { return V(x, y, zAt(s, x) + 0.12); });
          if (s.roofOn) for (var i = 0; i < pts.length - 1; i++) G.frames.add(rod(pts[i], pts[i + 1], r, c));
          else G.frames.add(dline(pts, selF ? 0xe07a1f : 0x7b8794));
        });
        EL.lines.forEach(function (l) { var zt = zLine(l.x); if (zt > 0) G.frames.add(rod(V(l.x, y, 0), V(l.x, y, zt), r * 1.15, c)); });
        addLabel(V(X[3] + 4, y, 0.4), (selF ? '<b>' : '') + fr.name + (selF ? '</b>' : ''), selF ? 700 : 120, 'frames', selF ? 'big' : '');
      });
    }
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(R * 8, R * 8), new THREE.MeshLambertMaterial({ color: 0xdfe5eb })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; G.ctx.add(ground); ground.userData.ground = true;
    var gr = new THREE.GridHelper(R * 8, Math.round(R * 8 / 10), 0xbfc9d3, 0xd1d8df); gr.position.y = -0.01; G.ctx.add(gr);
    sp.forEach(function (s) { addLabel(V(s.xm, -3, 0.2), s.name, 60, 'ctx'); });
    addLabel(V(-4, 0, 0.2), 'A', 60, 'ctx'); addLabel(V(-4, B, 0.2), 'P', 60, 'ctx');

    /* --- maatvoering van de hoofdoverspanningen --- */
    var yd = -9;
    sp.forEach(function (s) { dim(V(s.x0, yd, 0.1), V(s.x1, yd, 0.1), new THREE.Vector3(0, 1.6, 0), fmt(s.w, 2) + ' m'); });
    dim(V(0, yd - 7, 0.1), V(X[3], yd - 7, 0.1), new THREE.Vector3(0, 1.6, 0), 'totaal ' + fmt(X[3], 2) + ' m');
    dim(V(-9, 0, 0.1), V(-9, B, 0.1), new THREE.Vector3(0, 1.6, 0), 'b = ' + fmt(B, 3) + ' m');
    sp.forEach(function (s) {
      var xh = s.luifel ? s.x0 + s.w / (2 * s.nb) : s.xm;
      dim(V(xh, yd + 3, 0), V(xh, yd + 3, s.top), new THREE.Vector3(1.5, 0, 0), '+' + fmt(s.top, 2) + ' m');
    });
    dim(V(X[0], yd + 3, 0), V(X[0], yd + 3, sp[0].zl), new THREE.Vector3(-1.5, 0, 0), '+' + fmt(sp[0].zl, 2));
    dim(V(X[2], yd + 3, 0), V(X[2], yd + 3, sp[1].zr), new THREE.Vector3(-1.5, 0, 0), '+' + fmt(sp[1].zr, 2));

    /* --- windpijlen --- */
    var dd = WE.DIRS.filter(function (q) { return q.id === SEL.dir; })[0], dv = Nv(dd.vec[0], dd.vec[1], 0), Lw = 24, starts;
    if (SEL.dir === 'R') starts = [0.2, 0.5, 0.8].map(function (f) { return V(X[3] + 14 + Lw, B * f, 9); });
    else if (SEL.dir === 'L') starts = [0.2, 0.5, 0.8].map(function (f) { return V(-14 - Lw, B * f, 9); });
    else if (SEL.dir === 'A') starts = [0.2, 0.5, 0.8].map(function (f) { return V(X[3] * f, -22 - Lw, 9); });
    else starts = [0.2, 0.5, 0.8].map(function (f) { return V(X[3] * f, B + 14 + Lw, 9); });
    starts.forEach(function (s) { G.wind.add(arrow(s, dv, Lw, 0x138a8a, 2.4)); });
    addLabel(starts[1].clone().addScaledVector(dv, Lw * 0.45).add(new THREE.Vector3(0, 5, 0)), '<b style="color:#0d6e6e">WIND</b> · ' + dd.short, 3000, 'wind');

    var unit = SEL.mode === 'd' ? 'ontwerp' : 'karakteristiek';
    document.getElementById('legend').innerHTML = '<b>w<sub>net</sub> [kN/m²]</b> · ' + (loc ? 'lokaal' : 'globaal') + ' · ' + unit + '<div class="bar" style="background:' + cssRamp() + '"></div><div class="ticks"><span>' + fmt(-wm, 2) + '</span><span>' + fmt(-wm / 2, 2) + '</span><span>0</span><span>' + fmt(wm / 2, 2, true) + '</span><span>' + fmt(wm, 2, true) + '</span></div><div class="small">blauw = zuiging / opwaarts · rood = druk / neerwaarts</div>';
    var cvol = o.vols.filter(function (v) { return v.closed; })[0], det = cvol && o.cpiDetail[cvol.i][SEL.dir], cpiV = det ? det.cpiS[SEL.scen] : null;
    document.getElementById('viewInfo').innerHTML = '<b>' + dd.name + '</b><br>' + o.vols.map(function (v) { return 'V' + (v.i + 1) + ': ' + (v.closed ? 'gesloten' : 'open'); }).join(' · ') + '<br>' + (cvol ? 'c<sub>pi</sub> (' + SEL.scen + ', V' + (cvol.i + 1) + ') = ' + fmt(cpiV, 3, true) + (det && SEL.scen === 'S3' ? ' – ' + (det.method === 'dominant' ? 'dominant: ' + det.domName : det.method === 'mu' ? 'fig. 7.13' : 'n.v.t.') : '') + '<br>' : '') + 'Dak: ' + ((SEL.dir === 'L' || SEL.dir === 'R') ? SEL.caseId : 'θ = 90°') + (o.canopies.length ? ' · overkapping ' + (up ? 'opwaarts' : 'neerwaarts') + ', φ = ' + fmt(o.canopies[0].byDir[SEL.dir].P.phi, 0) + ' %' + (loc ? '' : ' · ' + SEL.lay) : '');
    labels.forEach(function (l) { l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; });
    applyToggles();
    var key = X.join('|') + '|' + B;
    if (first || key !== lastKey) { setView(first ? 'iso' : 'fit'); first = false; }
    lastKey = key; dirty = true;
  }
  function applyToggles() {
    var c = function (id) { return document.getElementById(id).checked; };
    G.roof.visible = c('t_roof'); G.wall.visible = c('t_wall'); G.open.visible = c('t_can'); G.arrows.visible = c('t_arrows'); G.wind.visible = c('t_wind'); G.ctx.visible = c('t_ctx'); G.dims.visible = c('t_dims'); G.frames.visible = c('t_frames');
    G.arrows.children.forEach(function (a) { a.visible = (a.userData.grp === 'roof' && c('t_roof')) || (a.userData.grp === 'wall' && c('t_wall')) || (a.userData.grp === 'open' && c('t_can')); });
    dirty = true;
  }
  function placeLabels() {
    var vis = { roof: G.roof.visible, wall: G.wall.visible, open: G.open.visible, ctx: G.ctx.visible, wind: G.wind.visible, dims: G.dims.visible, frames: G.frames.visible }, show = document.getElementById('t_labels').checked;
    var Wd = wrap.clientWidth, Hd = wrap.clientHeight, placed = [];
    labels.slice().sort(function (a, b) { return b.prio - a.prio; }).forEach(function (l) {
      var ok = vis[l.grp] !== false && (show || l.grp === 'wind' || l.grp === 'dims' || l.grp === 'frames');
      if (!ok) { l.el.classList.add('hidden'); return; }
      var p = l.pos.clone().project(camera);
      if (p.z > 1 || p.z < -1) { l.el.classList.add('hidden'); return; }
      var x = (p.x + 1) / 2 * Wd, y = (1 - p.y) / 2 * Hd, r = { a: x - l.w / 2 - 3, b: x + l.w / 2 + 3, c: y - l.h / 2 - 2, d: y + l.h / 2 + 2 };
      if (r.b < 0 || r.a > Wd || r.d < 0 || r.c > Hd) { l.el.classList.add('hidden'); return; }
      for (var i = 0; i < placed.length; i++) { var q = placed[i]; if (r.a < q.b && r.b > q.a && r.c < q.d && r.d > q.c) { l.el.classList.add('hidden'); return; } }
      placed.push(r); l.el.classList.remove('hidden'); l.el.style.left = x + 'px'; l.el.style.top = y + 'px';
    });
  }
  function pickAt(e, objs) { var r = renderer.domElement.getBoundingClientRect(); mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1; ray.setFromCamera(mouse, camera); return ray.intersectObjects(objs, false)[0] || null; }
  function visPicks() { return picks.filter(function (m) { return m.parent.visible; }); }
  function setHover(m) { if (hovered && hovered !== selected) hovered.material.emissive.setHex(0); hovered = m; if (m && m !== selected) m.material.emissive.setHex(0x262626); dirty = true; }
  function info(m) {
    var u = m.userData, PN = window.WindUI.PN, DN = window.WindUI.DIRN, rows;
    if (u.kind === 'closed') {
      var z = u.z, p = u.p;
      rows = [['Deel', PN[z.part] + (z.pitch !== '-' ? ' (' + z.pitch + '-helling)' : '')], ['Zone', '<b>' + z.name + '</b> · ' + DN[z.dir].short + (z.pos > 1 ? ' · positie ' + z.pos + ' (×' + fmt(z.f, 1) + ')' : '')], ['A / z<sub>e</sub>', fmt(z.A, 1) + ' m² / ' + fmt(z.ze, 2) + ' m'], ['q<sub>p</sub>', fmt(z.qp / 1000, 3) + ' kN/m²']];
      if (p) rows = rows.concat([['c<sub>pe,1</sub>' + window.WindUI.pm(z.name, u.key) + ' / c<sub>pe,10</sub>' + window.WindUI.pm(z.name, u.key), fmt(u.rr.c1, 3, true) + ' / ' + fmt(u.rr.c10, 3, true)], ['c<sub>pi</sub> (' + p.scen + ')', fmt(p.cpi, 3, true)], ['w lok. / glob.', fmt(p.wLoc * p.red, 3, true) + ' / ' + fmt(p.wGlob * p.red, 3, true) + ' kN/m²'], ['w<sub>d</sub> lok. / glob.', fmt(p.wLocD, 3, true) + ' / ' + fmt(p.wGlobD, 3, true)], ['F<sub>k</sub> / F<sub>d</sub>', fmt(p.Fk * p.red, 1, true) + ' / ' + fmt(p.Fd, 1, true) + ' kN']]);
      else rows.push(['c<sub>pi</sub>', 'scenario niet van toepassing']);
    } else if (u.kind === 'can') { var z2 = u.z; rows = [['Overkapping', PN[u.c.part] + ' · veld ' + z2.bay + (z2.cls !== '–' ? ' (positie ' + z2.cls + ')' : '')], ['Zone', '<b>' + z2.name + '</b> · ' + fmt(z2.A, 1) + ' m²'], ['ψ·c<sub>p,net</sub> max / min', fmt(z2.cpMax, 3, true) + ' / ' + fmt(z2.cpMin, 3, true)], ['w max / min', fmt(z2.wMax, 3, true) + ' / ' + fmt(z2.wMin, 3, true) + ' kN/m²'], ['Getoond', '<b>' + fmt(u.w, 3, true) + ' kN/m²</b>']]; }
    else if (u.kind === 'canP') { var p2 = u.p; rows = [['Overkapping', PN[u.c.part] + ' · veld ' + p2.bay + ', ' + (p2.pitch === 'L' ? 'linker' : 'rechter') + ' helling'], ['ψ·c<sub>f</sub> max / min', fmt(p2.cfMax, 3, true) + ' / ' + fmt(p2.cfMin, 3, true)], ['F max / min', fmt(p2.FMax, 1, true) + ' / ' + fmt(p2.FMin, 1, true) + ' kN'], ['Getoond', u.on ? '<b>F = ' + fmt(u.F, 0, true) + ' kN</b>' : 'onbelast']]; }
    else { var z3 = u.z; rows = [['Vrijstaande wand', PN[z3.part]], ['Zone', '<b>' + z3.name + '</b> · l/h = ' + fmt(z3.lh, 2) + ' · φ = ' + fmt(z3.phi, 2)], ['c<sub>p,net</sub>', '±' + fmt(z3.cp, 2)], ['w', '±' + fmt(u.w, 3) + ' kN/m²']]; }
    return '<table>' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('') + '</table>';
  }
  function onMove(e) {
    if (e.buttons) return;
    var h = pickAt(e, visPicks()), m = h ? h.object : null; if (m !== hovered) setHover(m);
    if (m) { var r = wrap.getBoundingClientRect(); tooltip.innerHTML = info(m); tooltip.style.display = 'block'; var x = e.clientX - r.left + 14, y = e.clientY - r.top + 14; if (x + 320 > r.width) x = Math.max(4, e.clientX - r.left - 330); if (y + 240 > r.height) y = Math.max(4, e.clientY - r.top - 250); tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px'; }
    else tooltip.style.display = 'none';
  }
  function onClick(e) {
    var h = pickAt(e, visPicks()), m = h ? h.object : null, si = document.getElementById('selinfo');
    if (selected) selected.material.emissive.setHex(0); selected = m;
    if (m) { m.material.emissive.setHex(0x4a4a00); si.innerHTML = '<b>Geselecteerd:</b> ' + info(m).replace(/<\/?table>|<\/?tr>/g, ' ').replace(/<td>/g, '').replace(/<\/td>/g, ' · '); }
    else si.textContent = 'Beweeg over een zone voor alle waarden; klik om te selecteren.';
    dirty = true;
  }
  function onDbl(e) {
    var objs = visPicks(); G.ctx.children.forEach(function (c) { if (c.userData && c.userData.ground) objs.push(c); });
    var h = pickAt(e, objs); if (!h) return;
    goTo(h.point.clone().add(camera.position.clone().sub(controls.target).multiplyScalar(0.75)), h.point.clone());
  }
  return { update: function (out, sel) { OUT = out; SEL = sel; if (!built && !failed) init(); if (!failed) rebuild(); } };
})();
