// Chassis optimizer: "How the math works" explainer.
// A native <dialog> with ten steps, KaTeX loaded only when needed, and three small calculators.
(function () {
  "use strict";
  var dialog = document.getElementById("math-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;

  var KATEX = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/";
  var steps = Array.prototype.slice.call(dialog.querySelectorAll(".math-step"));
  var navBtns = Array.prototype.slice.call(dialog.querySelectorAll(".math-nav [data-step]"));
  var body = dialog.querySelector(".math-body");
  var prev = dialog.querySelector("[data-math-prev]");
  var next = dialog.querySelector("[data-math-next]");
  var count = dialog.querySelector("[data-math-count]");
  var bar = dialog.querySelector(".math-progress span");
  var loading = dialog.querySelector("[data-math-loading]");
  var current = 0, opener = null, typeset = false, katexPromise = null, widgetsReady = false;

  // ---------- KaTeX, fetched on first intent ----------
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = false; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  function loadKatex() {
    if (katexPromise) return katexPromise;
    var css = document.createElement("link");
    css.rel = "stylesheet"; css.href = KATEX + "katex.min.css";
    document.head.appendChild(css);
    katexPromise = loadScript(KATEX + "katex.min.js").then(function () {
      return loadScript(KATEX + "contrib/auto-render.min.js");
    });
    return katexPromise;
  }
  function renderMath() {
    if (typeset) return;
    if (loading) loading.hidden = false;
    loadKatex().then(function () {
      window.renderMathInElement(dialog, {
        delimiters: [
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option", "output"],
        throwOnError: false
      });
      typeset = true;
      if (loading) loading.hidden = true;
    }).catch(function () {
      if (loading) loading.textContent = "Equations could not be typeset offline; showing their source.";
    });
  }

  // ---------- Steps ----------
  function show(i, focusBody) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach(function (s, k) { s.hidden = k !== current; });
    navBtns.forEach(function (b, k) {
      if (k === current) {
        b.setAttribute("aria-current", "step");
        if (b.scrollIntoView && window.matchMedia("(max-width: 800px)").matches) b.scrollIntoView({ block: "nearest", inline: "center" });
      } else {
        b.removeAttribute("aria-current");
      }
    });
    count.textContent = (current + 1) + " / " + steps.length;
    bar.style.setProperty("--p", ((current + 1) / steps.length).toFixed(3));
    prev.disabled = current === 0;
    next.textContent = current === steps.length - 1 ? "Done ✓" : "Next →";
    body.scrollTop = 0;
    if (focusBody) body.focus({ preventScroll: true });
  }
  navBtns.forEach(function (b) { b.addEventListener("click", function () { show(Number(b.getAttribute("data-step")), true); }); });
  prev.addEventListener("click", function () { show(current - 1, true); });
  next.addEventListener("click", function () {
    if (current === steps.length - 1) dialog.close(); else show(current + 1, true);
  });
  dialog.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;
    if (e.key === "ArrowRight") { e.preventDefault(); if (current < steps.length - 1) show(current + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); show(current - 1); }
  });

  // ---------- Open / close ----------
  function open(trigger) {
    opener = trigger || document.activeElement;
    renderMath();
    if (!widgetsReady) { initWidgets(); widgetsReady = true; }
    show(current);
    dialog.showModal();
    document.documentElement.classList.add("dialog-open");
    body.focus({ preventScroll: true });
  }
  dialog.addEventListener("close", function () {
    document.documentElement.classList.remove("dialog-open");
    if (location.hash === "#how-the-math-works") history.replaceState(null, "", location.pathname + location.search + "#chassis");
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  });
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  dialog.querySelector("[data-math-close]").addEventListener("click", function () { dialog.close(); });
  document.querySelectorAll("[data-math-open]").forEach(function (b) {
    b.addEventListener("click", function () { open(b); });
    b.addEventListener("pointerenter", loadKatex, { once: true });
    b.addEventListener("focus", loadKatex, { once: true });
  });
  if (location.hash === "#how-the-math-works") open(null);

  // ---------- Calculators ----------
  function $(root, sel) { return root.querySelector(sel); }
  function fmt(x, d) { return x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function pct(x) { return (x >= 0 ? "+" : "−") + fmt(Math.abs(x) * 100, 1) + "%"; }

  function initWidgets() {
    // Torsion score: average the probe rotations, then 545 / angle.
    var tw = dialog.querySelector('[data-widget="torsion"]');
    if (tw) {
      var t1 = $(tw, '[data-in="t1"]'), t2 = $(tw, '[data-in="t2"]'), w = $(tw, '[data-in="w"]');
      var paintT = function () {
        var a = +t1.value, b = +t2.value, W = +w.value, tp = (a + b) / 2, K = 545 / tp, bad = (545 / a + 545 / b) / 2;
        $(tw, '[data-out="t1"]').textContent = fmt(a, 4) + "°";
        $(tw, '[data-out="t2"]').textContent = fmt(b, 4) + "°";
        $(tw, '[data-out="w"]').textContent = fmt(W, 2) + " lb";
        $(tw, '[data-out="tp"]').textContent = fmt(tp, 4) + "°";
        $(tw, '[data-out="k"]').innerHTML = fmt(K, 0) + "<small>lb·ft/deg</small>";
        $(tw, '[data-out="q"]').innerHTML = fmt(K / W, 2) + "<small>lb·ft/deg per lb</small>";
        $(tw, '[data-out="kbad"]').innerHTML = fmt(bad, 0) + "<small>" + (bad - K >= 0.5 ? "overstates by " + fmt(bad - K, 1) : "same only when θ₁ = θ₂") + "</small>";
      };
      [t1, t2, w].forEach(function (el) { el.addEventListener("input", paintT); });
      paintT();
    }

    // Tube section: A, I, J, mass, comparison with 1.000 × 0.065, and the Timoshenko shear parameter.
    var sw = dialog.querySelector('[data-widget="section"]');
    if (sw) {
      var E = 205e9, G = 80e9, RHO = 7850, KAPPA = 0.5, IN = 0.0254;
      var I0 = Math.PI / 64 * (Math.pow(IN, 4) - Math.pow(IN - 2 * 0.065 * IN, 4));
      var M0 = RHO * Math.PI / 4 * (IN * IN - Math.pow(IN - 2 * 0.065 * IN, 2));
      var dIn = $(sw, '[data-in="d"]'), tIn = $(sw, '[data-in="t"]'), lIn = $(sw, '[data-in="l"]'), ring = $(sw, "[data-ring]");
      var circle = function (r) { return "M" + (100 - r) + " 100a" + r + " " + r + " 0 1 0 " + 2 * r + " 0a" + r + " " + r + " 0 1 0 " + -2 * r + " 0Z"; };
      var paintS = function () {
        var Dn = +dIn.value, tn = +tIn.value, Ln = +lIn.value;
        var D = Dn * IN, t = tn * IN, d = D - 2 * t, L = Ln * IN;
        var A = Math.PI / 4 * (D * D - d * d), I = Math.PI / 64 * (Math.pow(D, 4) - Math.pow(d, 4)), J = 2 * I, m = RHO * A;
        var phi = 12 * E * I / (KAPPA * G * A * L * L);
        $(sw, '[data-out="d"]').textContent = fmt(Dn, 3) + " in";
        $(sw, '[data-out="l"]').textContent = fmt(Ln, 1) + " in";
        $(sw, '[data-out="a"]').innerHTML = fmt(A * 1e6, 1) + "<small>mm²</small>";
        $(sw, '[data-out="m"]').innerHTML = fmt(m, 3) + "<small>kg/m</small>";
        $(sw, '[data-out="i"]').innerHTML = fmt(I * 1e12, 0) + "<small>mm⁴</small>";
        $(sw, '[data-out="j"]').innerHTML = fmt(J * 1e12, 0) + "<small>mm⁴ (= 2I)</small>";
        $(sw, '[data-out="cmp"]').innerHTML = "I " + pct(I / I0 - 1) + " · mass " + pct(m / M0 - 1) + "<small>bending stiffness per kg " + pct((I / m) / (I0 / M0) - 1) + "</small>";
        $(sw, '[data-out="phi"]').textContent = fmt(phi, 4);
        $(sw, '[data-out="eb"]').innerHTML = pct(phi) + "<small>too stiff at " + fmt(Ln, 1) + " in</small>";
        ring.setAttribute("d", circle(Dn * 50) + circle(d / IN * 50));
      };
      [dIn, tIn, lIn].forEach(function (el) { el.addEventListener("input", paintS); });
      paintS();
    }

    // Sherman–Morrison on the 2 × 2 example: exact update vs. the first-order (adjoint) prediction.
    var mw = dialog.querySelector('[data-widget="sm"]');
    if (mw) {
      var ds = $(mw, '[data-in="ds"]'), plot = $(mw, "[data-plot]");
      var X0 = -1.6, X1 = 3, Y0 = 0.2, Y1 = 1.6, L = 42, R = 330, T = 10, B = 196;
      var sx = function (x) { return L + (x - X0) / (X1 - X0) * (R - L); };
      var sy = function (y) { return B - (y - Y0) / (Y1 - Y0) * (B - T); };
      var exact = function (s) { return 2 / 3 - (s / 9) / (1 + 2 * s / 3); };
      var lin = function (s) { return 2 / 3 - s / 9; };
      var direct = function (s) { // solve (K + s b bᵀ) u = f directly and read u₁
        var a = 2 + s, b = -1 - s, det = a * a - b * b;
        return a / det;
      };
      var NS = "http://www.w3.org/2000/svg";
      var el = function (tag, attrs, text) {
        var n = document.createElementNS(NS, tag);
        Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
        if (text != null) n.textContent = text;
        plot.appendChild(n); return n;
      };
      [0.4, 0.8, 1.2, 1.6].forEach(function (y) {
        el("line", { x1: L, x2: R, y1: sy(y), y2: sy(y), "class": "gridl" });
        el("text", { x: L - 8, y: sy(y) + 4, "text-anchor": "end" }, y === 1.6 ? "θ′" : y.toFixed(1));
      });
      [-1, 0, 1, 2, 3].forEach(function (x) {
        el("line", { x1: sx(x), x2: sx(x), y1: T, y2: B, "class": "gridl" });
        el("text", { x: sx(x), y: B + 16, "text-anchor": "middle" }, String(x));
      });
      el("line", { x1: L, x2: R, y1: B, y2: B, "class": "ax" });
      el("line", { x1: sx(-1.5), x2: sx(-1.5), y1: T, y2: B, "class": "ax", "stroke-dasharray": "2 4" });
      el("text", { x: sx(-1.5) + 5, y: T + 10 }, "mechanism");
      el("text", { x: R, y: B + 30, "text-anchor": "end" }, "Δs →");
      var pts = [], s;
      for (s = -1.27; s <= 3.0001; s += 0.02) pts.push(sx(s).toFixed(1) + "," + sy(exact(s)).toFixed(1));
      el("polyline", { points: pts.join(" "), "class": "c-exact" });
      el("line", { x1: sx(X0), y1: sy(lin(X0)), x2: sx(X1), y2: sy(lin(X1)), "class": "c-lin" });
      var dotL = el("circle", { r: 4.5, fill: "var(--text-faint)" });
      var dotE = el("circle", { r: 6, fill: "var(--text)", stroke: "var(--surface)", "stroke-width": 2 });
      var paintM = function () {
        var v = +ds.value, e = exact(v), l = lin(v), dd = direct(v);
        $(mw, '[data-out="ds"]').textContent = (v >= 0 ? "+" : "−") + fmt(Math.abs(v), 2);
        $(mw, '[data-out="exact"]').textContent = fmt(e, 4);
        $(mw, '[data-out="lin"]').textContent = fmt(l, 4);
        $(mw, '[data-out="direct"]').textContent = fmt(dd, 4);
        $(mw, '[data-out="err"]').textContent = (l - e >= 0 ? "+" : "−") + fmt(Math.abs(l - e), 4);
        dotL.setAttribute("cx", sx(v)); dotL.setAttribute("cy", sy(l));
        dotE.setAttribute("cx", sx(v)); dotE.setAttribute("cy", sy(Math.min(e, Y1 + 0.04)));
      };
      ds.addEventListener("input", paintM);
      paintM();
    }
  }
})();
