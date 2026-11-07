/* ===== Site settings: edit these ===== */
// Slideshow video. A YouTube or Vimeo link is embedded on the page; any other link
// (e.g. an iCloud share) shows a "Watch the slideshow" button. Leave "" to hide the section.
var VIDEO_URL = "https://www.icloud.com/iclouddrive/0e8A4Y83qFVGmk_Ji4YpEN8Kw#Charles_Schmaltz_Memorial";
var VIDEO_NOTE = "Opens in iCloud \u00b7 about 32 minutes";
// Shared family photo album (opens in a new tab). Leave "" to hide the "Share a photo" section.
var ALBUM_URL = "";
// "Missing you" counter (Abacus, free, no sign-up). Set COUNTER_KEY to "" to hide the button.
var COUNTER_API = "https://abacus.jasoncameron.dev";
var COUNTER_NAMESPACE = "charles-schmaltz-memorial";
var COUNTER_KEY = "missing-you";
/* ===================================== */

(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ---------- Video ---------- */
  function videoEmbed(url) {
    var m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return "https://www.youtube-nocookie.com/embed/" + m[1] + "?rel=0";
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/);
    if (m) return "https://player.vimeo.com/video/" + m[1] + (m[2] ? "?h=" + m[2] : "");
    return null;
  }
  function setupVideo() {
    var sec = $("#slideshow"), navLink = $("#nav-slideshow");
    var url = (VIDEO_URL || "").trim();
    if (!sec || !url) return;
    var embed = videoEmbed(url), holder = $("#video-holder");
    if (embed) {
      var box = document.createElement("div"); box.className = "embed";
      var f = document.createElement("iframe");
      f.src = embed; f.title = "Memorial slideshow"; f.loading = "lazy";
      f.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
      f.setAttribute("allowfullscreen", "");
      box.appendChild(f); holder.appendChild(box);
      $("#video-note").hidden = true;
    } else {
      var a = $("#video-link");
      a.href = url; a.hidden = false;
      $("#video-note").textContent = VIDEO_NOTE || "";
    }
    sec.hidden = false; if (navLink) navLink.hidden = false;
  }

  /* ---------- Shared album ---------- */
  function setupAlbum() {
    var sec = $("#share"), a = $("#album-link"), url = (ALBUM_URL || "").trim();
    if (!sec || !a || !url) return;
    a.href = url; sec.hidden = false;
  }

  /* ---------- Missing you counter ---------- */
  function setupCounter() {
    var sec = $("#missing"), btn = $("#miss-btn"), cnt = $("#miss-count"), note = $("#miss-note"), label = $("#miss-label");
    if (!sec || !btn) return;
    if (!COUNTER_KEY) { sec.hidden = true; return; }
    var LS = "csm:" + COUNTER_NAMESPACE + ":" + COUNTER_KEY;
    var base = COUNTER_API.replace(/\/$/, "") + "/";
    var path = encodeURIComponent(COUNTER_NAMESPACE) + "/" + encodeURIComponent(COUNTER_KEY);
    var done = false; try { done = localStorage.getItem(LS) === "1"; } catch (e) {}

    function show(n) {
      if (typeof n === "number" && n > 0) { cnt.textContent = n.toLocaleString(); cnt.hidden = false; btn.setAttribute("aria-label", label.textContent + ", " + n + " so far"); }
      else { cnt.hidden = true; }
    }
    function thank() {
      btn.classList.add("done"); btn.disabled = true; label.textContent = "Thank you";
      note.textContent = "Thank you for remembering Charles";
    }
    function get(endpoint) {
      var ctl = window.AbortController ? new AbortController() : null;
      var t = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
      return fetch(base + endpoint + "/" + path, { cache: "no-store", signal: ctl ? ctl.signal : undefined })
        .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) { if (typeof j.value !== "number") throw new Error("bad"); return j.value; });
    }
    if (done) thank();
    get("get").then(show, function () { show(null); });
    btn.addEventListener("click", function () {
      if (btn.disabled) return;
      btn.disabled = true;
      get("hit").then(function (n) {
        try { localStorage.setItem(LS, "1"); } catch (e) {}
        show(n); thank();
      }, function () {
        btn.disabled = false; show(null);
        note.textContent = "Sorry, that didn\u2019t go through. Please try again later.";
      });
    });
  }

  /* ---------- Lightbox (pinch/double-tap zoom, pan, swipe) ---------- */
  function setupLightbox() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".gallery button"));
    var lb = $("#lightbox"), stage = $("#lb-stage"), img = $("#lb-img"), pos = $("#lb-pos");
    if (!items.length || !lb || !stage) return;
    var MAX = 5, DTAP = 2.5;
    var i = 0, lastFocus = null, scrollY = 0;
    var s = 1, tx = 0, ty = 0;            // current zoom + pan (px, relative to centre)
    var pts = {};                         // active pointers
    var g = null;                         // current gesture
    var lastTap = { t: 0, x: 0, y: 0 };

    function count() { return Object.keys(pts).length; }
    function rect() { return stage.getBoundingClientRect(); }
    function bounds(sc) {
      var r = rect(), w = img.offsetWidth * sc, h = img.offsetHeight * sc;
      return { x: Math.max(0, (w - r.width) / 2), y: Math.max(0, (h - r.height) / 2) };
    }
    function clamp() {
      var b = bounds(s);
      tx = Math.min(b.x, Math.max(-b.x, tx)); ty = Math.min(b.y, Math.max(-b.y, ty));
    }
    function apply(anim) {
      img.style.transition = anim ? "transform .25s ease" : "none";
      img.style.transform = "translate3d(" + tx + "px," + ty + "px,0) scale(" + s + ")";
      lb.classList.toggle("zoomed", s > 1.01);
      img.dataset.scale = s.toFixed(3);
    }
    // zoom to scale ns keeping the screen point (cx,cy) fixed
    function zoomAt(ns, cx, cy, anim) {
      ns = Math.max(1, Math.min(MAX, ns));
      var r = rect(), px = cx - (r.left + r.width / 2), py = cy - (r.top + r.height / 2);
      tx = px - (px - tx) * (ns / s); ty = py - (py - ty) * (ns / s); s = ns;
      if (s <= 1.001) { s = 1; tx = 0; ty = 0; }
      clamp(); apply(anim);
    }
    function reset(anim) { s = 1; tx = 0; ty = 0; apply(anim); }

    function preload(k) { var p = new Image(); p.src = items[(k + items.length) % items.length].dataset.full; }
    function go(k) {
      i = (k + items.length) % items.length;
      reset(false);
      img.src = items[i].dataset.full;
      img.alt = "Photo " + (i + 1) + " of " + items.length;
      pos.textContent = (i + 1) + " / " + items.length;
      preload(i + 1); preload(i - 1);
    }
    function open(k) {
      lastFocus = document.activeElement; scrollY = window.scrollY;
      document.documentElement.classList.add("lb-open");
      document.body.style.top = -scrollY + "px";
      lb.hidden = false; go(k); $("#lb-close").focus();
    }
    function close() {
      lb.hidden = true; img.removeAttribute("src"); reset(false); pts = {}; g = null;
      document.documentElement.classList.remove("lb-open");
      document.body.style.top = ""; window.scrollTo(0, scrollY);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    items.forEach(function (b, k) { b.addEventListener("click", function () { open(k); }); });
    $("#lb-close").addEventListener("click", close);
    $("#lb-prev").addEventListener("click", function () { go(i - 1); });
    $("#lb-next").addEventListener("click", function () { go(i + 1); });

    function mid() {
      var a = Object.keys(pts).map(function (k) { return pts[k]; });
      return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1 };
    }
    stage.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      try { stage.setPointerCapture(e.pointerId); } catch (x) {}
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (count() === 2) { var m = mid(); g = { type: "pinch", d0: m.d, s0: s, mx: m.x, my: m.y }; }
      else if (count() === 1) g = { type: "drag", x0: e.clientX, y0: e.clientY, tx0: tx, ty0: ty, t0: Date.now(), moved: false, onImg: e.target === img };
    });
    stage.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId] || !g) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (g.type === "pinch" && count() >= 2) {
        var m = mid();
        // follow the fingers: pan by midpoint movement, then zoom about midpoint
        tx += m.x - g.mx; ty += m.y - g.my; g.mx = m.x; g.my = m.y;
        zoomAt(g.s0 * m.d / g.d0, m.x, m.y, false);
      } else if (g.type === "drag") {
        var dx = e.clientX - g.x0, dy = e.clientY - g.y0;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) g.moved = true;
        if (s > 1) { tx = g.tx0 + dx; ty = g.ty0 + dy; clamp(); apply(false); }
        else if (g.moved) {   // swipe preview
          var vert = Math.abs(dy) > Math.abs(dx);
          img.style.transition = "none";
          img.style.transform = vert && dy > 0 ? "translate3d(0," + dy + "px,0) scale(" + Math.max(.8, 1 - dy / 1500) + ")" : "translate3d(" + dx + "px,0,0)";
          lb.style.setProperty("--fade", vert && dy > 0 ? Math.max(.4, 1 - dy / 500) : 1);
        }
      }
    });
    function end(e) {
      if (!pts[e.pointerId]) return;
      var p = pts[e.pointerId]; delete pts[e.pointerId];
      if (!g) return;
      if (g.type === "pinch") {
        if (count() === 1) { var k = Object.keys(pts)[0]; g = { type: "drag", x0: pts[k].x, y0: pts[k].y, tx0: tx, ty0: ty, t0: 0, moved: true }; }
        else g = null;
        if (s < 1.05) reset(true);
        return;
      }
      if (count() > 0) return;
      var dx = p.x - g.x0, dy = p.y - g.y0, gg = g; g = null;
      lb.style.setProperty("--fade", 1);
      if (!gg.moved) {                      // tap
        var now = Date.now();
        if (now - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 40) {
          lastTap.t = 0;
          if (s > 1.01) reset(true); else zoomAt(DTAP, p.x, p.y, true);
        } else {
          lastTap = { t: now, x: p.x, y: p.y };
          if (!gg.onImg && s <= 1.01 && e.pointerType === "mouse") close(); // click on backdrop (desktop)
        }
        return;
      }
      if (s > 1.01) return;                 // was panning
      var fast = Date.now() - gg.t0 < 300;
      if (Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) > 60 || (fast && Math.abs(dx) > 25))) go(dx < 0 ? i + 1 : i - 1);
      else if (dy > 110 || (fast && dy > 50 && dy > Math.abs(dx))) close();
      else reset(true);
    }
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    stage.addEventListener("wheel", function (e) {
      e.preventDefault();
      zoomAt(s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)), e.clientX, e.clientY, false);
    }, { passive: false });
    // stop iOS Safari from zooming/scrolling the page underneath
    ["gesturestart", "gesturechange"].forEach(function (t) { lb.addEventListener(t, function (e) { e.preventDefault(); }); });
    lb.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });
    window.addEventListener("resize", function () { if (!lb.hidden) { clamp(); apply(false); } });

    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "+" || e.key === "=") { var r = rect(); zoomAt(s * 1.5, r.left + r.width / 2, r.top + r.height / 2, true); }
      else if (e.key === "-") { var r2 = rect(); zoomAt(s / 1.5, r2.left + r2.width / 2, r2.top + r2.height / 2, true); }
      else if (e.key === "Tab") {
        var f = lb.querySelectorAll("button"), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function init() { setupVideo(); setupCounter(); setupAlbum(); setupLightbox(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
