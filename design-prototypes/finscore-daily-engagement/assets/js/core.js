/* Finscore Daily Engagement (V3) core — state, themes, shell, XP/badges, UI helpers.
   Everything is simulated. No network calls anywhere in this prototype. */
(function(){
"use strict";
var D = window.FD_DATA, KEY = "fd3-state", S, P, listeners = {}, FD = window.FD = {};
FD.D = D;

/* ---------- storage (localStorage with window.name fallback so file:// works) ---------- */
function load(){
  try { var s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch(e){}
  try { if (window.name && window.name.indexOf("FD3:") === 0) return JSON.parse(window.name.slice(4)); } catch(e){}
  return null;
}
function save(){
  var s = JSON.stringify(S);
  try { localStorage.setItem(KEY, s); } catch(e){}
  try { window.name = "FD3:" + s; } catch(e){}
}
FD.save = save;

/* ---------- dates ---------- */
function pad(n){ return (n < 10 ? "0" : "") + n; }
function ymd(d){ return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function addDays(d, n){ var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
function monday(d){ var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var k = (x.getDay() + 6) % 7; return addDays(x, -k); }
function now(){ return new Date(); }
FD.ymd = ymd; FD.addDays = addDays;
FD.today = function(){ return ymd(now()); };
FD.wk = function(d){ return ymd(monday(d || now())); };
FD.weekDates = function(){ var m = monday(now()), a = []; for (var i = 0; i < 7; i++) a.push(addDays(m, i)); return a; };
FD.dayById = function(id){ return D.days.filter(function(x){ return x.id === id; })[0]; };
FD.todayDay = function(){ var g = now().getDay(); return D.days.filter(function(x){ return x.dow === g; })[0]; };
FD.fmtDate = function(d){ return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };

/* ---------- helpers ---------- */
FD.h = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
FD.md = function(s){ return FD.h(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\n/g, "<br>"); };
FD.inr = function(n){ return Math.round(n).toLocaleString("en-IN"); };
FD.inrS = function(n){ n = Math.round(n); if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2).replace(/\.?0+$/, "") + " Cr"; if (n >= 1e5) return "₹" + (n / 1e5).toFixed(1).replace(/\.0$/, "") + " L"; return "₹" + n.toLocaleString("en-IN"); };
FD.clamp = function(v, a, b){ return Math.max(a, Math.min(b, v)); };
FD.$ = function(s, r){ return (r || document).querySelector(s); };
FD.$$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
FD.reduced = function(){ try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch(e){ return false; } };
FD.on = function(e, f){ (listeners[e] = listeners[e] || []).push(f); };
FD.emit = function(e, a){ (listeners[e] || []).forEach(function(f){ try { f(a); } catch(x){ console.error(x); } }); };
FD.shuffle = function(a){ a = a.slice(); for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
FD.qs = function(k){ try { return new URLSearchParams(location.search).get(k); } catch(e){ return null; } };

/* ---------- icons ---------- */
var IC = {
 home:"M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10", calendar:"M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", chat:"M4 5h16v11H9l-5 4z",
 trophy:"M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8",
 target:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
 heart:"M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
 brain:"M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
 trend:"M3 17l6-6 4 4 8-9M15 6h6v6", bolt:"M13 2L4 14h7l-1 8 9-12h-7z",
 dice:"M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01",
 flag:"M5 21V4M5 4h12l-2 4 2 4H5", footprint:"M8 3c2 0 3 2 3 5s-1 4-3 4-3-2-3-4 1-5 3-5zM8 15v2M16 9c2 0 3 2 3 5s-1 7-3 7-3-4-3-6 1-6 3-6z",
 star:"M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", book:"M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7",
 coins:"M12 3c-4 0-7 1.3-7 3v4c0 1.7 3 3 7 3s7-1.3 7-3V6c0-1.7-3-3-7-3zM5 6c0 1.7 3 3 7 3s7-1.3 7-3M5 14v4c0 1.7 3 3 7 3s7-1.3 7-3v-4",
 user:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7", flame:"M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
 map:"M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14", medal:"M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8.5 13.5L7 21l5-3 5 3-1.5-7.5",
 share:"M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
 gift:"M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2 0-4-1-4-3s3-2 4 3zM12 7c2 0 4-1 4-3s-3-2-4 3z",
 rocket:"M14 4c3 0 6 3 6 6-2 3-4 5-7 6l-5-5c1-3 3-5 6-7zM9 11l-4 1-2 3 4 1M13 15l-1 4-3 2-1-4M15 9h.01", crown:"M3 8l4 4 5-7 5 7 4-4-2 11H5z",
 gauge:"M4 17a8 8 0 1 1 16 0M12 17l4-6", shield:"M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4", card:"M3 6h18v12H3zM3 10h18M7 15h4",
 chart:"M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3", plane:"M21 3L3 10l7 3 3 7zM10 13l4-4", scale:"M12 4v16M6 20h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z",
 globe:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
 sun:"M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
 moon:"M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z", cap:"M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5",
 family:"M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 21c0-3.5 2.7-6 6-6s6 2.5 6 6M15 15c3 0 6 1.5 6 5",
 umbrella:"M3 12a9 9 0 0 1 18 0zM12 12v7a2 2 0 0 0 4 0", doc:"M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5",
 compass:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z", spark:"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
 sparkle:"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
 check:"M5 12.5l4.5 4.5L19 7.5", lock:"M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3", arrow:"M5 12h14M13 6l6 6-6 6", arrowl:"M19 12H5M11 6l-6 6 6 6",
 close:"M6 6l12 12M18 6L6 18", menu:"M4 7h16M4 12h16M4 17h16", wallet:"M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 13h2",
 play:"M7 4l13 8-13 8z", clock:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2", refresh:"M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4",
 chev:"M9 6l6 6-6 6", chevd:"M6 9l6 6 6-6", send:"M3 11l18-8-8 18-2-8z", info:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5h.01",
 plus:"M12 5v14M5 12h14", bell:"M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4", download:"M12 4v12M7 11l5 5 5-5M5 20h14", copy:"M9 9h11v11H9zM5 15V4h11",
 more:"M5 12h.01M12 12h.01M19 12h.01", users:"M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 21c0-3.5 2.7-6 6-6s6 2.5 6 6", mic:"M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4"
};
FD.icon = function(n, c){ return '<svg class="ic ' + (c || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + (IC[n] || IC.spark) + '"/></svg>'; };

/* ---------- Fin avatar & illustrations (inline SVG, no external assets) ---------- */
var finId = 0;
FD.fin = function(size, mood){
  var id = "fg" + (++finId), m = mood === "cheer" ? "M31 55q9 11 18 0z" : mood === "think" ? "M33 57h14" : "M32 55q8 8 16 0";
  return '<svg class="fin" width="' + size + '" height="' + size + '" viewBox="0 0 80 80" role="img" aria-label="Fin, your companion"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2BD3B0"/><stop offset="1" stop-color="#0E7C6B"/></linearGradient></defs>' +
   '<circle cx="40" cy="42" r="30" fill="url(#' + id + ')"/><ellipse cx="30" cy="30" rx="10" ry="6" fill="#fff" opacity=".22" transform="rotate(-24 30 30)"/>' +
   '<circle cx="31" cy="42" r="4" fill="#06322C"/><circle cx="49" cy="42" r="4" fill="#06322C"/><circle cx="32.2" cy="40.8" r="1.3" fill="#fff"/><circle cx="50.2" cy="40.8" r="1.3" fill="#fff"/>' +
   '<path d="' + m + '" stroke="#06322C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="' + (mood === "cheer" ? "#06322C" : "none") + '"/>' +
   '<path d="M40 12c0-5 4-8 9-8-1 5-3 8-9 8z" fill="#8CE9C8"/><path d="M40 12v6" stroke="#8CE9C8" stroke-width="2.5" stroke-linecap="round"/></svg>';
};
FD.illo = function(kind){
  var c1 = "var(--brand)", c2 = "var(--brand-2)";
  if (kind === "empty") return '<svg class="illo" viewBox="0 0 160 110" aria-hidden="true"><ellipse cx="80" cy="98" rx="52" ry="7" fill="var(--line)"/><rect x="44" y="62" width="72" height="30" rx="8" fill="var(--soft)" stroke="' + c1 + '" stroke-width="2"/><rect x="54" y="40" width="52" height="22" rx="7" fill="var(--soft)" stroke="' + c1 + '" stroke-width="2"/><circle cx="80" cy="22" r="14" fill="' + c2 + '" opacity=".25"/><path d="M80 34V16M73 22l7-7 7 7" stroke="' + c1 + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
  if (kind === "trophy") return '<svg class="illo" viewBox="0 0 160 110" aria-hidden="true"><ellipse cx="80" cy="100" rx="40" ry="6" fill="var(--line)"/><path d="M58 20h44v28a22 22 0 0 1-44 0z" fill="var(--soft)" stroke="' + c1 + '" stroke-width="2.5"/><path d="M58 28H44v8a14 14 0 0 0 14 14M102 28h14v8a14 14 0 0 1-14 14" stroke="' + c1 + '" stroke-width="2.5" fill="none"/><path d="M80 70v14M62 92h36" stroke="' + c1 + '" stroke-width="3" stroke-linecap="round"/><path d="M80 30l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="' + c2 + '"/></svg>';
  if (kind === "chat") return '<svg class="illo" viewBox="0 0 160 110" aria-hidden="true"><rect x="22" y="18" width="80" height="44" rx="14" fill="var(--soft)" stroke="' + c1 + '" stroke-width="2"/><path d="M40 62l-6 14 18-14z" fill="var(--soft)" stroke="' + c1 + '" stroke-width="2" stroke-linejoin="round"/><rect x="60" y="48" width="78" height="40" rx="14" fill="' + c2 + '" opacity=".28"/><circle cx="42" cy="40" r="3.5" fill="' + c1 + '"/><circle cx="62" cy="40" r="3.5" fill="' + c1 + '"/><circle cx="82" cy="40" r="3.5" fill="' + c1 + '"/></svg>';
  /* hero: sprout on coins */
  return '<svg class="illo" viewBox="0 0 220 160" aria-hidden="true"><ellipse cx="110" cy="146" rx="78" ry="9" fill="#000" opacity=".12"/><g fill="none" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="110" cy="130" rx="50" ry="13" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-opacity=".7" stroke-width="2"/><ellipse cx="110" cy="116" rx="50" ry="13" fill="#fff" fill-opacity=".26" stroke="#fff" stroke-opacity=".8" stroke-width="2"/><ellipse cx="110" cy="102" rx="50" ry="13" fill="#fff" fill-opacity=".34" stroke="#fff" stroke-width="2"/><path d="M110 98V54" stroke="#fff" stroke-width="4"/><path d="M110 70c-22 2-34-10-36-26 22-2 34 8 36 26z" fill="#9CF0D6" stroke="#fff" stroke-width="2.5"/><path d="M110 58c20 0 32-10 34-24-20-2-32 8-34 24z" fill="#C9FAEA" stroke="#fff" stroke-width="2.5"/></g><g fill="#fff" opacity=".85"><circle cx="38" cy="40" r="3"/><circle cx="188" cy="64" r="2.5"/><circle cx="170" cy="22" r="2"/><path d="M52 92l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g></svg>';
};

/* ---------- components ---------- */
var ringId = 0;
FD.ring = function(pct, o){
  o = o || {}; var s = o.size || 120, sw = o.stroke || 9, r = 50 - sw / 2 - 1, circ = 2 * Math.PI * r, id = "rg" + (++ringId);
  return '<div class="ring-wrap" style="width:' + s + 'px;height:' + s + 'px"><svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + (o.c1 || "var(--ring-a)") + '"/><stop offset="1" stop-color="' + (o.c2 || "var(--ring-b)") + '"/></linearGradient></defs>' +
   '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="' + sw + '"/><circle class="ring-bar" cx="50" cy="50" r="' + r + '" fill="none" stroke="url(#' + id + ')" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + circ.toFixed(1) + '" data-pct="' + FD.clamp(pct, 0, 100) + '" data-circ="' + circ.toFixed(1) + '" transform="rotate(-90 50 50)"/></svg><div class="ring-in">' + (o.html || "") + '</div></div>';
};
FD.bar = function(pct, cls){ return '<div class="bar ' + (cls || "") + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '"><i data-w="' + FD.clamp(pct, 0, 100) + '" style="width:0"></i></div>'; };
FD.skel = function(n){ var s = ""; for (var i = 0; i < (n || 3); i++) s += '<div class="card pad sk-card"><div class="sk sk-l w40"></div><div class="sk sk-l w80"></div><div class="sk sk-l w60"></div><div class="sk sk-b"></div></div>'; return '<div class="sk-wrap" aria-busy="true" aria-label="Loading"><div class="sk sk-h"></div><div class="grid g2">' + s + '</div></div>'; };
FD.empty = function(kind, t, d, btn){ return '<div class="empty">' + FD.illo(kind) + '<h3>' + FD.h(t) + '</h3><p class="muted">' + FD.h(d) + '</p>' + (btn || "") + '</div>'; };

/* animate rings, bars and counters inside a root */
FD.animate = function(root){
  root = root || document;
  var rd = FD.reduced();
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    FD.$$(".ring-bar", root).forEach(function(c){ var circ = parseFloat(c.getAttribute("data-circ")), p = parseFloat(c.getAttribute("data-pct")); c.style.strokeDashoffset = (circ * (1 - p / 100)).toFixed(1); });
    FD.$$(".bar > i[data-w]", root).forEach(function(i){ i.style.width = i.getAttribute("data-w") + "%"; });
  }); });
  FD.$$("[data-count]", root).forEach(function(el){
    var to = parseFloat(el.getAttribute("data-count")), pre = el.getAttribute("data-pre") || "", suf = el.getAttribute("data-suf") || "", t0 = null, dur = rd ? 1 : 800;
    function f(t){ if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = pre + Math.round(to * e).toLocaleString("en-IN") + suf; if (k < 1) requestAnimationFrame(f); }
    requestAnimationFrame(f);
  });
};

/* modal (centered on desktop, bottom sheet on mobile). Returns {el, close} */
var modalStack = [];
FD.modal = function(o){
  var prev = document.activeElement, el = document.createElement("div");
  el.className = "modal-back"; el.setAttribute("role", "presentation");
  el.innerHTML = '<div class="modal ' + (o.cls || "") + '" role="dialog" aria-modal="true" aria-label="' + FD.h(o.title || "Dialog") + '" tabindex="-1">' + (o.noClose ? "" : '<button class="x" aria-label="Close dialog">' + FD.icon("close") + '</button>') + '<div class="modal-body">' + o.html + '</div></div>';
  document.body.appendChild(el); document.body.classList.add("noscroll");
  var box = el.firstChild, closed = false;
  function close(){ if (closed) return; closed = true; el.classList.remove("in"); modalStack = modalStack.filter(function(m){ return m !== api; }); setTimeout(function(){ el.remove(); if (!modalStack.length) document.body.classList.remove("noscroll"); }, FD.reduced() ? 0 : 200); document.removeEventListener("keydown", key); if (prev && prev.focus) try { prev.focus(); } catch(e){} if (o.onClose) o.onClose(); FD.emit("modalclose"); }
  function key(e){ if (modalStack[modalStack.length - 1] !== api) return; if (e.key === "Escape" && !o.noClose) close(); if (e.key === "Tab"){ var f = FD.$$("button,a[href],input,select,textarea,[tabindex]:not([tabindex='-1'])", box).filter(function(x){ return !x.disabled && x.offsetParent !== null; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a){ e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z){ e.preventDefault(); a.focus(); } } }
  var api = { el: el, box: box, close: close }; modalStack.push(api);
  document.addEventListener("keydown", key);
  el.addEventListener("mousedown", function(e){ if (e.target === el && !o.noClose) close(); });
  var x = FD.$(".x", el); if (x) x.addEventListener("click", close);
  requestAnimationFrame(function(){ el.classList.add("in"); box.focus(); });
  FD.animate(el);
  return api;
};
FD.modalOpen = function(){ return modalStack.length > 0; };

var tt;
FD.toast = function(msg, kind){
  var t = FD.$("#toast"); if (!t) return;
  t.className = "toast show " + (kind || ""); t.innerHTML = (kind === "xp" ? FD.icon("spark") : kind === "ok" ? FD.icon("check") : FD.icon("info")) + "<span>" + FD.h(msg) + "</span>";
  clearTimeout(tt); tt = setTimeout(function(){ t.classList.remove("show"); }, 2600);
};
FD.confetti = function(){
  if (FD.reduced()) return;
  var w = document.createElement("div"); w.className = "confetti"; w.setAttribute("aria-hidden", "true");
  var cols = ["#0F8F8D", "#1DBA8C", "#F2B04C", "#5A55D6", "#8CE9C8", "#FF8A8A"];
  for (var i = 0; i < 46; i++){ var s = document.createElement("i"); s.style.left = (Math.random() * 100) + "%"; s.style.background = cols[i % cols.length]; s.style.animationDelay = (Math.random() * .35) + "s"; s.style.setProperty("--dx", (Math.random() * 160 - 80) + "px"); s.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg"); s.style.width = (6 + Math.random() * 6) + "px"; w.appendChild(s); }
  document.body.appendChild(w); setTimeout(function(){ w.remove(); }, 2200);
};

/* simulated share: nothing leaves the device */
FD.share = function(o){
  var m = FD.modal({ title: "Share (simulated)", cls: "share", html:
   '<h2 class="h2">Share ' + FD.h(o.title) + '</h2><p class="muted sm">Simulated share. Nothing is sent anywhere; this is a design preview.</p><div class="share-card">' + o.card + '</div>' +
   '<div class="share-actions"><button class="btn btn-primary" data-s="copy">' + FD.icon("copy") + ' Copy summary</button><button class="btn btn-ghost" data-s="img">' + FD.icon("download") + ' Save image (simulated)</button><button class="btn btn-ghost" data-s="friend">' + FD.icon("users") + ' Send to a friend (simulated)</button></div><p class="sm muted" id="sh-msg" role="status"></p>' });
  FD.$$("[data-s]", m.el).forEach(function(b){ b.addEventListener("click", function(){
    var k = b.getAttribute("data-s"), msg = k === "copy" ? "Summary copied (simulated)." : k === "img" ? "Image saved (simulated). No file was created." : "Sent (simulated). Nobody was messaged.";
    if (k === "copy") try { var cp = navigator.clipboard && navigator.clipboard.writeText(o.text || ""); if (cp && cp.catch) cp.catch(function(){}); } catch(e){}
    FD.$("#sh-msg", m.el).textContent = msg; FD.toast(msg, "ok"); if (!FD.$("#sh-msg", m.el).dataset.c){ FD.$("#sh-msg", m.el).dataset.c = 1; FD.bump("shares"); }
  }); });
  return m;
};

/* ---------- state ---------- */
function prof(id){ return D.profiles.filter(function(p){ return p.id === id; })[0] || D.profiles[0]; }
FD.profiles = D.profiles;
var STARTER = [
 { i: "sparkle", t: "Welcome. Start with one small thing", d: "Pick any activity on the Today screen. It takes about three minutes and earns your first XP.", tone: "ai" },
 { i: "target", t: "A goal makes progress visible", d: "Name one goal, an amount and a date in the Goal planner. Everything else gets more useful.", tone: "warn" },
 { i: "gauge", t: "Your wellness score starts neutral", d: "It begins at a neutral baseline and moves only when you build habits: learning, saving and reviewing goals.", tone: "pos" },
 { i: "calendar", t: "Come back tomorrow for something different", d: "Each weekday has its own activity, so the app never repeats itself.", tone: "ai" } ];
FD.profile = function(){
  var b = prof(S.pid); if (!P || !P.fresh) return b;
  var c = Object.create(b), nm = P.name || "there";
  c.first = nm; c.name = nm; c.emoji = nm.charAt(0).toUpperCase(); c.goals = P.customGoals || []; c.greeting = "Welcome. Let's make today count.";
  c.ai = "Welcome, " + nm + "! I'm Fin. We'll start small: one short activity a day, at your pace. No pressure, and every step counts.";
  c.focusWhy = "Small, steady steps beat big plans you never start."; c.insights = STARTER;
  c.dims = { spend: 35, save: 35, safety: 35, debt: 35, goals: 35, learn: 35 }; c.prev = 35; c.trend = [35, 35, 35, 35, 35, 35];
  c.monthly = { acts: 0, quiz: 0, sav: 0, scoreFrom: 35, scoreTo: 35, days: 0, topSkill: "Just getting started" }; c.past = []; c.seedStreak = [];
  return c;
};
/* Start a genuinely empty "brand-new user" run on top of a persona's content. */
FD.startFresh = function(pid, name){ S.pid = pid; S.p[pid] = seedP(pid, true); P = S.p[pid]; P.name = (name || "").trim().slice(0, 24); save(); refreshChrome(); return P; };

function levelOf(xp){ var L = D.levels, cur = L[0], i; for (i = 0; i < L.length; i++) if (xp >= L[i].xp) cur = L[i]; var next = L[cur.n] || null; return { n: cur.n, name: cur.name, from: cur.xp, next: next, pct: next ? Math.round((xp - cur.xp) / (next.xp - cur.xp) * 100) : 100 }; }
FD.levelOf = levelOf;

function seedP(pid, fresh){
  var pr = prof(pid), x = pr.seedXP, t = now(), wk = FD.wk(t), p = { xp: x, done: {}, hist: [], badges: {}, days: {}, goalAdd: {}, jr: {}, cardsSeen: {}, pers: null, live: { learn: 0, quiz: 0, goal: 0, habit: 0, weekly: 0, journey: 0 }, spent: {}, created: Date.now() };
  p.st = { activities: Math.floor(x / 14), quizzes: Math.floor(x / 110), perfectQuiz: x > 300 ? 1 : 0, cards: Math.floor(x / 45), spins: x > 180 ? 2 : (x > 90 ? 1 : 0), savingsGames: x > 350 ? 1 : 0, goalReviews: x > 120 ? 1 : 0, healthChecks: x > 100 ? 1 : 0, challenges: x > 260 ? 1 : 0, sims: x > 400 ? 1 : 0, personality: 0, weeklyReviews: x > 500 ? 1 : 0, journeyModules: x > 400 ? 3 : (x > 200 ? 1 : 0), journeyDone: 0, shares: 0, wrappedViews: 0 };
  pr.seedStreak.forEach(function(off){
    var d = addDays(t, -off); p.days[ymd(d)] = 1;
    if (FD.wk(d) === wk){ var dd = D.days.filter(function(z){ return z.dow === d.getDay(); })[0]; var kk = "a:" + wk + ":" + dd.id; p.done[kk] = { t: d.getTime(), xp: 0, seed: true, title: dd.name, id: dd.id, day: ymd(d) }; }
  });
  pr.past.forEach(function(r){ var d = addDays(t, -r[0]); p.hist.push({ t: d.getTime(), kind: "act", title: r[2], xp: r[3], day: ymd(d), seed: true, dayId: r[1] }); });
  var jm = D.journey.filter(function(m){ return pr.journeyNext.indexOf(m.id) < 0; }); for (var ji = 0; ji < p.st.journeyModules && ji < jm.length; ji++) p.jr[jm[ji].id] = { seed: true };
  D.badges.forEach(function(b){ if (b.stat !== "level" && (p.st[b.stat] || 0) >= b.n) p.badges[b.id] = { t: addDays(t, -9).getTime(), seed: true }; });
  if (fresh){ p.xp = 0; p.done = {}; p.hist = []; p.badges = {}; p.days = {}; p.jr = {}; p.goalAdd = {}; p.cardsSeen = {}; Object.keys(p.st).forEach(function(k){ p.st[k] = 0; }); p.fresh = true; p.customGoals = []; p.name = ""; p.onboarded = false; }
  return p;
}
function init(){
  S = load();
  if (!S || S.v !== 3) S = { v: 3, theme: "auto", pid: "beginner", p: {} };
  var qp = FD.qs("p"); if (qp && D.profiles.some(function(p){ return p.id === qp; })) S.pid = qp;
  var qt = FD.qs("theme"); if (qt === "dark" || qt === "light" || qt === "auto") S.theme = qt;
  if (!S.p[S.pid]) S.p[S.pid] = seedP(S.pid);
  P = S.p[S.pid]; applyTheme(); save();
}
function applyTheme(){
  var t = S.theme, dark = t === "dark" || (t === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", dark ? "#0A1118" : "#F5F8F7");
}
FD.theme = function(){ return document.documentElement.getAttribute("data-theme"); };
FD.setTheme = function(t){ S.theme = t; applyTheme(); save(); FD.emit("theme"); };
FD.setProfile = function(id){ S.pid = id; if (!S.p[id]) S.p[id] = seedP(id); P = S.p[id]; save(); FD.emit("profile"); };
FD.P = function(){ return P; };
FD.reset = function(){ S.p = {}; S.p[S.pid] = seedP(S.pid); P = S.p[S.pid]; save(); FD.emit("profile"); };
FD.resetAll = function(){ try { localStorage.removeItem(KEY); } catch(e){} window.name = ""; location.reload(); };
init();

/* ---------- XP, stats, badges ---------- */
FD.xp = function(){ return P.xp; };
FD.level = function(){ return levelOf(P.xp); };
FD.isDone = function(k){ return !!P.done[k]; };
FD.dayDone = function(id){ var w = FD.wk(); if (id === "sat") return ["sat", "sat-spin", "sat-cards", "sat-save"].some(function(s){ return P.done["a:" + w + ":" + s]; }); return !!P.done["a:" + w + ":" + id]; };
FD.weekAwards = function(){ var w = FD.wk(), n = 0, xp = 0, list = []; Object.keys(P.done).forEach(function(k){ var d = P.done[k]; if (d.seed) return; var dt = new Date(d.t); if (FD.wk(dt) === w){ n++; xp += d.xp; list.push(d); } }); return { n: n, xp: xp, list: list }; };
FD.stats = function(){ var s = {}, k; for (k in P.st) s[k] = P.st[k]; s.level = levelOf(P.xp).n; var w = FD.weekDates(), c = 0; w.forEach(function(d){ if (P.days[ymd(d)] > 0) c++; }); s.activeDays = c; return s; };
FD.activeDaysWeek = function(){ return FD.stats().activeDays; };
FD.streak = function(){ var d = now(), n = 0; if (!P.days[ymd(d)]) d = addDays(d, -1); while (P.days[ymd(d)] > 0){ n++; d = addDays(d, -1); } return n; };
FD.bump = function(stat, n){ P.st[stat] = (P.st[stat] || 0) + (n || 1); save(); checkBadges(); };

var q = [], qBusy = false;
function runQ(){ if (qBusy || !q.length) return; if (modalStack.length){ setTimeout(runQ, 500); return; } qBusy = true; var f = q.shift(); f(function(){ qBusy = false; setTimeout(runQ, 250); }); }
FD.queue = function(f){ q.push(f); setTimeout(runQ, 750); };
function checkBadges(){
  var st = FD.stats();
  D.badges.forEach(function(b){
    if (P.badges[b.id]) return;
    if ((st[b.stat] || 0) >= b.n){
      P.badges[b.id] = { t: Date.now() }; P.hist.unshift({ t: Date.now(), kind: "badge", title: b.name, xp: 0, day: FD.today() }); save();
      FD.queue(function(done){ var m = FD.modal({ title: "Badge unlocked", cls: "celebrate", onClose: done, html: '<div class="cel"><div class="badge-big">' + FD.icon(b.icon) + '</div><p class="eyebrow">Badge unlocked</p><h2 class="h2">' + FD.h(b.name) + '</h2><p class="muted">' + FD.h(b.desc) + '</p><button class="btn btn-primary" data-ok>Nice</button></div>' }); FD.confetti(); FD.$("[data-ok]", m.el).addEventListener("click", m.close); });
      FD.emit("badge", b);
    }
  });
}
/* Award XP once per key. Opening the app or repeating an activity never earns XP. */
FD.award = function(key, o){
  if (P.done[key]){ FD.toast("Practice round. XP is earned once per activity.", "info"); return { gained: 0, repeat: true }; }
  var before = levelOf(P.xp), t = now();
  P.done[key] = { t: t.getTime(), xp: o.xp, title: o.title, id: o.id || key, day: ymd(t), type: o.type };
  P.xp += o.xp; P.days[ymd(t)] = (P.days[ymd(t)] || 0) + 1;
  if (o.type && P.live[o.type] != null) P.live[o.type]++;
  P.hist.unshift({ t: t.getTime(), kind: "act", title: o.title, xp: o.xp, day: ymd(t), dayId: o.id });
  if (o.stat) P.st[o.stat] = (P.st[o.stat] || 0) + 1;
  P.st.activities = (P.st.activities || 0) + 1;
  save();
  var after = levelOf(P.xp);
  FD.toast("+" + o.xp + " XP · " + o.title, "xp"); FD.emit("xp", { gained: o.xp });
  if (after.n > before.n){
    FD.queue(function(done){ var L = D.levels[after.n - 1], m = FD.modal({ title: "Level up", cls: "celebrate", onClose: done, html: '<div class="cel"><div class="badge-big lvl">' + after.n + '</div><p class="eyebrow">Level up</p><h2 class="h2">You are now ' + FD.h(L.name) + '</h2><p class="muted">Unlocked: ' + FD.h(L.unlock) + '</p><button class="btn btn-primary" data-ok>Keep going</button></div>' }); FD.confetti(); FD.$("[data-ok]", m.el).addEventListener("click", m.close); });
  }
  checkBadges();
  return { gained: o.xp, level: after };
};

/* ---------- wellness score (simulated) ---------- */
FD.wellness = function(){
  var pr = FD.profile(), d = {}, k, l = P.live;
  for (k in pr.dims) d[k] = pr.dims[k];
  d.learn = Math.min(100, d.learn + Math.min(25, 4 * (l.learn + l.quiz + l.journey)));
  d.goals = Math.min(100, d.goals + Math.min(20, 6 * l.goal));
  d.save = Math.min(100, d.save + Math.min(12, 3 * l.habit));
  d.spend = Math.min(100, d.spend + Math.min(10, 2 * l.habit));
  var keys = ["spend", "save", "safety", "debt", "goals", "learn"], tot = 0, arr = keys.map(function(kk, i){ tot += d[kk]; return { k: kk, label: pr.dimLabels[i], v: Math.round(d[kk]) }; });
  var score = Math.round(tot / 6), sorted = arr.slice().sort(function(a, b){ return b.v - a.v; });
  var band = score < 40 ? "Getting started" : score < 55 ? "Building" : score < 70 ? "Steady" : score < 85 ? "Strong" : "Thriving";
  return { score: score, prev: pr.prev, dims: arr, band: band, best: sorted[0].label, weak: sorted[sorted.length - 1].label, trend: pr.trend.slice(0, 5).concat([score]) };
};
FD.goalSaved = function(g){ return g.saved + (P.goalAdd[g.id] || 0); };

/* ---------- shared widgets ---------- */
FD.weekStrip = function(){
  var dates = FD.weekDates(), t = FD.today(), w = FD.wk();
  return '<div class="weekstrip" role="list">' + D.days.map(function(d, i){
    var dt = dates[i], done = FD.dayDone(d.id), isT = ymd(dt) === t, fut = ymd(dt) > t;
    return '<a role="listitem" class="wd ' + (done ? "done " : "") + (isT ? "today " : "") + (fut ? "fut" : "") + '" href="daily-activities.html?day=' + d.id + '" aria-label="' + d.name + (done ? ", completed" : isT ? ", today" : "") + '"><span class="wd-n">' + d.short + '</span><span class="wd-ic">' + (done ? FD.icon("check") : FD.icon(d.icon)) + '</span><span class="wd-d">' + dt.getDate() + '</span></a>';
  }).join("") + '</div>';
};
FD.levelCard = function(){
  var L = FD.level(), xp = P.xp;
  return '<div class="lvl-card">' + FD.ring(L.pct, { size: 96, stroke: 9, html: '<b class="lvl-n">' + L.n + '</b><span class="lvl-l">LEVEL</span>' }) + '<div><div class="eyebrow">' + FD.h(L.name) + '</div><div class="xp-line"><b data-count="' + xp + '">' + xp + '</b> XP</div>' + (L.next ? '<p class="sm muted">' + (L.next.xp - xp) + ' XP to ' + FD.h(L.next.name) + '</p>' : '<p class="sm muted">Top level reached</p>') + '</div></div>';
};
FD.badgeTile = function(b, earned){
  var st = FD.stats(), cur = Math.min(st[b.stat] || 0, b.n);
  return '<div class="badge ' + (earned ? "got" : "lock") + '" title="' + FD.h(b.desc) + '"><div class="badge-ic">' + FD.icon(earned ? b.icon : "lock") + '</div><b>' + FD.h(b.name) + '</b><span class="sm muted">' + (earned ? FD.h(b.desc) : cur + "/" + b.n + " · " + FD.h(b.desc)) + '</span></div>';
};
FD.simTag = function(t){ return '<span class="simtag">' + FD.icon("info") + (t || "Simulated") + '</span>'; };

/* ---------- shell ---------- */
var NAV = [
 ["companion-home.html", "Home", "home"], ["daily-activities.html", "Today", "bolt"], ["weekly-engagement.html", "Week", "calendar"], ["ai-companion.html", "Fin AI", "chat"],
 ["quiz-arena.html", "Quiz Arena", "brain"], ["financial-journey.html", "Journey", "map"], ["achievement-center.html", "Achievements", "trophy"], ["monthly-wrapped.html", "Monthly Wrapped", "gift"]
];
var TABS = [["companion-home.html", "Home", "home"], ["daily-activities.html", "Today", "bolt"], ["ai-companion.html", "Fin", "chat", 1], ["quiz-arena.html", "Quiz", "brain"]];

function chrome(){
  var cur = (location.pathname.split("/").pop() || "index.html"), pr = FD.profile();
  var side = NAV.map(function(n){ return '<a class="nav-i' + (cur === n[0] ? " on" : "") + '" href="' + n[0] + '"' + (cur === n[0] ? ' aria-current="page"' : "") + '>' + FD.icon(n[2]) + '<span>' + n[1] + '</span></a>'; }).join("");
  var tabs = TABS.map(function(n){ return '<a class="tab' + (n[3] ? " mid" : "") + (cur === n[0] ? " on" : "") + '" href="' + n[0] + '"' + (cur === n[0] ? ' aria-current="page"' : "") + '>' + (n[3] ? '<span class="tab-fin">' + FD.fin(34, "happy") + '</span>' : FD.icon(n[2])) + '<span>' + n[1] + '</span></a>'; }).join("");
  var moreOn = ["weekly-engagement.html", "financial-journey.html", "achievement-center.html", "monthly-wrapped.html"].indexOf(cur) > -1;
  var shell = document.createElement("div");
  shell.className = "shell";
  shell.innerHTML = '<a class="skip" href="#app">Skip to content</a>' +
   '<aside class="side" aria-label="Primary"><a class="brand" href="index.html"><span class="brand-mk">' + FD.icon("spark") + '</span><span>Finscore<small>Daily Companion</small></span></a><nav class="nav" aria-label="Main">' + side + '</nav><div class="side-foot"><div id="side-lvl"></div><a class="nav-i" href="index.html">' + FD.icon("compass") + '<span>Prototype guide</span></a></div></aside>' +
   '<div class="main"><header class="top"><a class="brand sm-brand" href="index.html" aria-label="Finscore prototype guide"><span class="brand-mk">' + FD.icon("spark") + '</span><span>Finscore</span></a><div class="top-r"><a class="xp-chip" id="xpchip" href="achievement-center.html" aria-label="XP and level"></a><button class="prof-btn" id="profbtn" aria-haspopup="dialog" aria-label="Switch demo profile"></button><button class="icon-btn" id="themebtn" aria-label="Toggle light and dark theme"></button></div></header>' +
   '<div class="simbar" role="note">' + FD.icon("info") + '<span>Prototype · all data, scores, XP and AI replies are simulated. No real accounts, APIs or advice.</span></div>' +
   '<main id="app" class="page" tabindex="-1" data-page="' + (document.body.getAttribute("data-page") || "") + '"></main><footer class="foot sm muted">Finscore Daily Engagement · Prototype V3 · Simulated demo data only · Not financial advice</footer></div>' +
   '<nav class="tabbar" aria-label="Primary mobile">' + tabs + '<button class="tab' + (moreOn ? " on" : "") + '" id="morebtn" aria-haspopup="dialog">' + FD.icon("more") + '<span>More</span></button></nav><div id="toast" class="toast" role="status" aria-live="polite"></div>';
  document.body.insertBefore(shell, document.body.firstChild);
  FD.$("#themebtn").addEventListener("click", function(){ FD.setTheme(FD.theme() === "dark" ? "light" : "dark"); });
  FD.$("#profbtn").addEventListener("click", profileMenu);
  FD.$("#morebtn").addEventListener("click", function(){
    var more = NAV.filter(function(n){ return ["weekly-engagement.html", "financial-journey.html", "achievement-center.html", "monthly-wrapped.html"].indexOf(n[0]) > -1; });
    var m = FD.modal({ title: "More", cls: "sheet", html: '<h2 class="h2">More</h2><div class="more-list">' + more.map(function(n){ return '<a class="more-i" href="' + n[0] + '">' + FD.icon(n[2]) + '<span>' + n[1] + '</span>' + FD.icon("chev") + '</a>'; }).join("") + '<a class="more-i" href="index.html">' + FD.icon("compass") + '<span>Prototype guide</span>' + FD.icon("chev") + '</a></div>' });
  });
  refreshChrome();
}
function refreshChrome(){
  var pr = FD.profile(), L = FD.level(), dark = FD.theme() === "dark";
  var pb = FD.$("#profbtn"); if (pb) pb.innerHTML = '<span class="av" style="--h:' + pr.hue + '">' + pr.emoji + '</span><span class="pb-t"><b>' + FD.h(pr.first) + '</b><small>' + FD.h(pr.tag) + '</small></span>' + FD.icon("chevd");
  var xc = FD.$("#xpchip"); if (xc) xc.innerHTML = FD.icon("spark") + '<b>' + P.xp + '</b><span class="xc-l">XP · L' + L.n + '</span><i class="xc-bar"><i style="width:' + L.pct + '%"></i></i>';
  var tb = FD.$("#themebtn"); if (tb){ tb.innerHTML = FD.icon(dark ? "sun" : "moon"); tb.setAttribute("aria-pressed", dark ? "true" : "false"); tb.setAttribute("title", dark ? "Switch to light theme" : "Switch to dark theme"); }
  var sl = FD.$("#side-lvl"); if (sl) sl.innerHTML = FD.levelCard();
  FD.animate(FD.$("#side-lvl") || document);
}
function profileMenu(){
  var m = FD.modal({ title: "Switch demo profile", cls: "sheet", html: '<h2 class="h2">Demo profiles</h2><p class="muted sm">Switch to see greetings, wellness, challenges, goals, insights, quizzes and learning change. Dummy data only.</p><div class="prof-list" role="list">' +
    D.profiles.map(function(p){ return '<button class="prof-i' + (p.id === S.pid ? " on" : "") + '" data-id="' + p.id + '" aria-pressed="' + (p.id === S.pid) + '"><span class="av" style="--h:' + p.hue + '">' + p.emoji + '</span><span><b>' + FD.h(p.tag) + '</b><small>' + FD.h(p.name) + ' · ' + p.age + ' · ' + FD.h(p.blurb) + '</small></span>' + (p.id === S.pid ? FD.icon("check") : "") + '</button>'; }).join("") + '</div>' +
    '<div class="prof-foot"><a class="btn btn-primary btn-sm" href="onboarding.html">'+FD.icon("sparkle")+' Start as a brand-new user</a><button class="btn btn-ghost btn-sm" id="rstp">' + FD.icon("refresh") + ' Reset this profile\'s demo progress</button></div>' });
  FD.$$(".prof-i", m.el).forEach(function(b){ b.addEventListener("click", function(){ var id = b.getAttribute("data-id"); m.close(); if (id !== S.pid){ FD.setProfile(id); FD.toast("Switched to " + FD.profile().tag + " (simulated)", "ok"); } }); });
  FD.$("#rstp", m.el).addEventListener("click", function(){ m.close(); FD.reset(); FD.toast("Demo progress reset for " + FD.profile().first, "ok"); });
}

/* ---------- page mounting ---------- */
var cfg = null, first = true;
FD.page = function(c){ cfg = c; };
function mount(delay){
  var app = FD.$("#app"); if (!app || !cfg) return;
  var st = window.scrollY;
  app.innerHTML = FD.skel(cfg.skel || 3);
  var d = FD.reduced() ? 60 : (delay == null ? 380 : delay);
  setTimeout(function(){
    try { app.innerHTML = cfg.render(); app.classList.remove("fade"); void app.offsetWidth; app.classList.add("fade"); if (cfg.bind) cfg.bind(app); FD.animate(app); }
    catch(e){ console.error(e); app.innerHTML = '<div class="card pad">Something went wrong in this demo. <button class="btn btn-ghost" onclick="location.reload()">Reload</button></div>'; }
    document.title = (cfg.title ? cfg.title + " · " : "") + "Finscore Daily Companion (prototype)";
  }, d);
}
FD.remount = function(d){ mount(d == null ? 0 : d); };
/* Re-render in place without the skeleton, keeping scroll position. */
FD.rerender = function(){
  var app = FD.$("#app"); if (!app || !cfg) return; var y = window.scrollY;
  app.innerHTML = cfg.render(); if (cfg.bind) cfg.bind(app); FD.animate(app); window.scrollTo(0, y);
};
FD.on("profile", function(){ refreshChrome(); mount(280); });
FD.on("theme", function(){ refreshChrome(); if (cfg && cfg.onTheme) cfg.onTheme(); });
FD.on("xp", function(){ refreshChrome(); var c = FD.$("#xpchip"); if (c){ c.classList.remove("pulse"); void c.offsetWidth; c.classList.add("pulse"); } });
FD.on("badge", function(){ refreshChrome(); });
window.addEventListener("pagehide", save);
try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function(){ if (S.theme === "auto"){ applyTheme(); FD.emit("theme"); } }); } catch(e){}

function boot(){
  if (document.body.getAttribute("data-shell") === "none"){
    var m = document.createElement("main"); m.id = "app"; m.className = "page onb-page"; m.tabIndex = -1; var t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite");
    document.body.appendChild(m); document.body.appendChild(t); mount(250); return;
  }
  chrome();
  mount(first ? 420 : 0); first = false;

}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
FD.boot = boot;
})();
