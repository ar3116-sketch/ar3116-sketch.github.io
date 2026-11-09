(function () {
  "use strict";

  // ---------- Theme toggle ----------
  var root = document.documentElement;
  var themeBtn = document.getElementById("theme-toggle");
  var stored = localStorage.getItem("portfolio-theme-v2");
  if (stored) root.setAttribute("data-theme", stored);

  themeBtn.addEventListener("click", function () {
    var current = root.getAttribute("data-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var effectiveIsDark = current ? current === "dark" : prefersDark;
    var next = effectiveIsDark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("portfolio-theme-v2", next);
  });

  // ---------- Header scroll state ----------
  var header = document.getElementById("site-header");
  var onScroll = function () {
    header.classList.toggle("scrolled", window.scrollY > 10);
  };
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- Mobile nav ----------
  var navToggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("nav");
  navToggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  // ---------- Active nav link on scroll ----------
  var navLinks = document.querySelectorAll("[data-nav]");
  var sections = Array.prototype.map.call(navLinks, function (link) {
    return document.querySelector(link.getAttribute("href"));
  }).filter(Boolean);

  var setActive = function () {
    var scrollPos = window.scrollY + window.innerHeight * 0.3;
    // The nav order differs from the page order, so take the lowest section already passed.
    var current = { id: "", offsetTop: -1 };
    sections.forEach(function (sec) {
      if (sec.offsetTop <= scrollPos && sec.offsetTop > current.offsetTop) current = sec;
    });
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + current.id);
    });
  };
  document.addEventListener("scroll", setActive, { passive: true });
  setActive();

  // ---------- Reveal on scroll ----------
  // Threshold 0 so very tall project cards still reveal; items arriving together stagger slightly.
  var revealEls = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.filter(function (entry) { return entry.isIntersecting; }).forEach(function (entry, i) {
          var el = entry.target;
          if (i > 0) el.style.transitionDelay = Math.min(i, 5) * 70 + "ms";
          el.classList.add("in-view");
          revealObserver.unobserve(el);
          // Drop the stagger afterwards so hover transitions aren't delayed.
          setTimeout(function () { el.style.transitionDelay = ""; }, 1300);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  // ---------- Counting stat numbers ----------
  var counters = document.querySelectorAll("[data-count]");
  var animateCount = function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var duration = 1400;
    var startTime = null;

    var step = function (timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = target.toLocaleString();
      }
    };
    window.requestAnimationFrame(step);
  };

  var counterObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach(function (el) { counterObserver.observe(el); });

  // ---------- Funding contact: independent of a device email handler ----------
  var copyFunding = document.getElementById("copy-funding-email");
  var fundingEmail = document.getElementById("funding-email");
  var fundingStatus = document.getElementById("funding-copy-status");
  copyFunding.addEventListener("click", async function () {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(fundingEmail.value);
      fundingStatus.textContent = "Email copied";
    } catch (_) {
      fundingEmail.focus();
      fundingEmail.select();
      fundingStatus.textContent = "Email selected. Copy it to use in your email app.";
    }
  });

  // ---------- Footer year ----------
  document.getElementById("year").textContent = new Date().getFullYear();
})();

// ---------- 3D art: loop videos only while on screen; honour reduced motion ----------
(function () {
  var videos = document.querySelectorAll(".art-grid video");
  if (!videos.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    videos.forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); v.controls = true; });
    return;
  }
  if (!("IntersectionObserver" in window)) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var v = entry.target;
      if (entry.isIntersecting) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        v.pause();
      }
    });
  }, { rootMargin: "200px 0px" });
  videos.forEach(function (v) { observer.observe(v); });
})();

// ---------- Interactive CAD workbench (model-viewer, loaded only when needed) ----------
(function () {
  var root = document.querySelector("[data-cad]");
  if (!root) return;

  var MV_SRC = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.4.0/dist/model-viewer.min.js";
  var MESHOPT_SRC = "https://cdn.jsdelivr.net/npm/meshoptimizer@0.25.0/meshopt_decoder.js";
  var MODELS = {
    bluebird: {
      src: "assets/models/bluebird.glb", orbit: "-35deg 68deg auto", zoom: 0.72, link: "#bluebird",
      kicker: "Survey drone · 2026", name: "BLUEBIRD",
      blurb: "A 1.8 m blended-wing survey aircraft designed around an ordinary Android phone.",
      specs: [["Span", "1.8 m"], ["Status", "Designed & simulated"], ["CAD", "FreeCAD"]]
    },
    samson: {
      src: "assets/models/samson.glb", orbit: "35deg 68deg auto", zoom: 0.8, link: "#samson",
      kicker: "Bicopter prototype · 2026", name: "Samson",
      blurb: "Tilting twin-rotor nacelles, the printed shell and the structure inside, in one assembly.",
      specs: [["Size", "1.06 × 0.99 m"], ["Bodies", "1,154"], ["CAD", "FreeCAD · revision P6"]]
    },
    kestrel: {
      src: "assets/models/kestrel.glb", orbit: "30deg 62deg auto", zoom: 0.8, link: "#samson",
      kicker: "Bicopter prototype · 2026", name: "Kestrel Mini",
      blurb: "The smaller bicopter with its shell off: airframe, electronics, wiring and both tilt rotors.",
      specs: [["Size", "0.38 × 0.32 m"], ["Bodies", "146"], ["CAD", "FreeCAD · revision R4"]]
    },
    fancar: {
      src: "assets/models/rc-fan-car.glb", orbit: "40deg 70deg auto", zoom: 0.85, link: "#fan-car",
      kicker: "Active-aero testbed · 2026", name: "RC Fan Car V2",
      blurb: "A 1/10 TT-02 turned fan car: twin blowers, a skirted floor, a DRS wing and servo ride height.",
      specs: [["Length", "0.49 m"], ["Bodies", "339"], ["CAD", "Scripted FreeCAD from one parameter file"]]
    }
  };

  var mv = root.querySelector("model-viewer");
  var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-model]"));
  var stage = root.querySelector("#cad-stage");
  var field = function (n) { return root.querySelector('[data-cad-field="' + n + '"]'); };
  var rotateBtn = root.querySelector('[data-cad-action="rotate"]');
  var bar = root.querySelector(".cad-loading");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var current = "bluebird", ready = false, requested = false, framed = {};

  if (reduceMotion) { mv.removeAttribute("auto-rotate"); rotateBtn.setAttribute("aria-pressed", "false"); }

  function render(key) {
    var m = MODELS[key];
    field("kicker").textContent = m.kicker;
    field("name").textContent = m.name;
    field("blurb").textContent = m.blurb;
    field("link").setAttribute("href", m.link);
    var dl = field("specs"); dl.textContent = "";
    m.specs.forEach(function (row) {
      var dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = row[0]; dd.textContent = row[1]; dl.appendChild(dt); dl.appendChild(dd);
    });
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-model") === key;
      t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
      if (on) stage.setAttribute("aria-labelledby", t.id);
    });
    mv.setAttribute("alt", "Interactive 3D model of " + m.name + ". Drag to rotate.");
    if (ready) {
      if (bar) { bar.classList.remove("is-done"); bar.firstElementChild.style.transform = "scaleX(0)"; }
      mv.cameraOrbit = m.orbit; mv.cameraTarget = "auto"; mv.fieldOfView = "auto";
      mv.src = m.src;
    }
  }

  function select(key) {
    if (!MODELS[key]) return;
    current = key; render(key); load();
  }

  function load() {
    if (requested) return;
    requested = true;
    var s = document.createElement("script");
    s.type = "module"; s.src = MV_SRC; document.head.appendChild(s);
    customElements.whenDefined("model-viewer").then(function () {
      customElements.get("model-viewer").meshoptDecoderLocation = MESHOPT_SRC;
      ready = true; render(current);
    });
  }

  mv.addEventListener("progress", function (e) {
    if (!bar) return;
    var p = e.detail.totalProgress;
    bar.firstElementChild.style.transform = "scaleX(" + p + ")";
    bar.classList.toggle("is-done", p >= 1);
  });
  // Tighten the automatic framing once per model, then remember it for "Reset view".
  mv.addEventListener("load", function () {
    var m = MODELS[current];
    if (!framed[current]) {
      var o = mv.getCameraOrbit();
      framed[current] = m.orbit.replace(/auto$/, (o.radius * (m.zoom || 1)).toFixed(3) + "m");
    }
    mv.cameraOrbit = framed[current]; mv.jumpCameraToGoal();
  });
  mv.addEventListener("error", function () { field("blurb").textContent = "This model could not be loaded. Try reloading the page."; });

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t.getAttribute("data-model")); });
    t.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus(); select(next.getAttribute("data-model"));
    });
  });

  rotateBtn.addEventListener("click", function () {
    var on = rotateBtn.getAttribute("aria-pressed") !== "true";
    rotateBtn.setAttribute("aria-pressed", String(on));
    mv.autoRotate = on;
  });
  root.querySelector('[data-cad-action="reset"]').addEventListener("click", function () {
    if (!ready) return;
    mv.cameraOrbit = framed[current] || MODELS[current].orbit; mv.cameraTarget = "auto"; mv.fieldOfView = "auto";
    mv.resetTurntableRotation(); mv.jumpCameraToGoal();
  });

  document.querySelectorAll("[data-cad-open]").forEach(function (a) {
    a.addEventListener("click", function () { select(a.getAttribute("data-cad-open")); });
  });

  render(current);
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { load(); io.disconnect(); }
    }, { rootMargin: "600px 0px" });
    io.observe(root);
  } else {
    load();
  }
})();
