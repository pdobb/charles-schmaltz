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

  /* ---------- Lightbox ---------- */
  function setupLightbox() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".gallery button"));
    var lb = $("#lightbox"), img = $("#lb-img"), pos = $("#lb-pos");
    if (!items.length || !lb) return;
    var i = 0, lastFocus = null, x0 = null, y0 = null;
    function preload(k) { var it = items[(k + items.length) % items.length]; var p = new Image(); p.src = it.dataset.full; }
    function go(k) {
      i = (k + items.length) % items.length;
      img.src = items[i].dataset.full;
      img.alt = "Photo " + (i + 1) + " of " + items.length;
      pos.textContent = (i + 1) + " / " + items.length;
      preload(i + 1); preload(i - 1);
    }
    function open(k) { lastFocus = document.activeElement; go(k); lb.hidden = false; document.body.style.overflow = "hidden"; $("#lb-close").focus(); }
    function close() { lb.hidden = true; img.removeAttribute("src"); document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
    items.forEach(function (b, k) { b.addEventListener("click", function () { open(k); }); });
    $("#lb-close").addEventListener("click", close);
    $("#lb-prev").addEventListener("click", function () { go(i - 1); });
    $("#lb-next").addEventListener("click", function () { go(i + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.tagName === "FIGURE") close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "Tab") { // keep focus inside
        var f = lb.querySelectorAll("button"), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    lb.addEventListener("touchstart", function (e) { var t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? i + 1 : i - 1);
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) close();
    }, { passive: true });
  }

  function init() { setupVideo(); setupCounter(); setupAlbum(); setupLightbox(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
