(function () {
  "use strict";

  // ---------- Theme toggle ----------
  var root = document.documentElement;
  var themeBtn = document.getElementById("theme-toggle");
  var stored = localStorage.getItem("theme");
  if (stored) root.setAttribute("data-theme", stored);

  themeBtn.addEventListener("click", function () {
    var current = root.getAttribute("data-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var effectiveIsDark = current ? current === "dark" : prefersDark;
    var next = effectiveIsDark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
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
    nav.classList.toggle("open");
  });
  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("open");
    });
  });

  // ---------- Active nav link on scroll ----------
  var navLinks = document.querySelectorAll("[data-nav]");
  var sections = Array.prototype.map.call(navLinks, function (link) {
    return document.querySelector(link.getAttribute("href"));
  }).filter(Boolean);

  var setActive = function () {
    var scrollPos = window.scrollY + window.innerHeight * 0.3;
    var current = sections[0];
    sections.forEach(function (sec) {
      if (sec.offsetTop <= scrollPos) current = sec;
    });
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + current.id);
    });
  };
  document.addEventListener("scroll", setActive, { passive: true });
  setActive();

  // ---------- Reveal on scroll ----------
  var revealEls = document.querySelectorAll(".reveal");
  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach(function (el) { revealObserver.observe(el); });

  // ---------- SAT bar fill on scroll ----------
  var satBars = document.querySelectorAll(".sat-bar-fill");
  var barObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          barObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  satBars.forEach(function (el) { barObserver.observe(el); });

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

  // ---------- Footer year ----------
  document.getElementById("year").textContent = new Date().getFullYear();
})();
