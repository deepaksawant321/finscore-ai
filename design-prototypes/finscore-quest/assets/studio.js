/* Fin Studio: talk to Fin in four modes. Every answer shows the typed tool calls behind its numbers. Fin explains; the engine calculates. */
(function (root) {
  'use strict';
  var S = root.FSStore, C = root.FSCoach, Q = root.Q, esc = Q.esc, $ = Q.$, $$ = Q.$$, st = function () { return S.state; };
  var mode = 'Explain', busy = false, MC = { Explain: 'var(--vio)', Diagnose: 'var(--cor)', Simulate: 'var(--em)', Act: 'var(--gold)' };
  var HREF = { '#/chat': 'intro', '#/score': 'tree', '#/actions': 'quests', '#/whatif': 'studio', '#/memory': 'intro', '#/home': 'observatory' };
  function msg(m) {
    if (m.who === 'me') return '<div class="m me">' + esc(m.text) + '</div>';
    return '<div class="m ai">' + esc(m.text) + (m.cls ? '<div style="margin-top:8px"><span class="pill ' + (/declined|Escalation/.test(m.cls) ? 'cor' : 'vio') + '">' + esc(m.cls) + '</span> <span class="pill">AI-assisted · numbers from the engine</span></div>' : '') + (m.trace && m.trace.length ? '<details><summary style="cursor:pointer">How Fin got this (tool calls)</summary><div class="trace">' + m.trace.join('<br>') + '</div></details>' : '') + ((m.links && m.links.length) || m.escalate ? '<div class="row wrap" style="margin-top:10px">' + (m.links || []).map(function (l) { return '<button class="btn sm ghost" data-go="' + (HREF[l[0]] || 'observatory') + '">' + esc(l[1]) + '</button>'; }).join('') + (m.escalate ? '<button class="btn sm vio" data-esc>Connect me to a person</button>' : '') + '</div>' : '') + '</div>';
  }
  function send(text) {
    text = text.trim(); if (!text || busy) return; var s = st(); s.coach = s.coach || []; s.coach.push({ who: 'me', text: text }); busy = true; Q.render(true);
    setTimeout(function () { var r = C.coach(text); s.coach.push({ who: 'ai', text: r.text, cls: r.cls, trace: r.trace, links: r.links, escalate: r.escalate }); S.save(); busy = false; Q.render(true); var c = $('.chat'); if (c) c.scrollTop = 1e6; }, Q.motion() ? 650 : 40);
  }
  Q.register('studio', {
    render: function () {
      var s = st(); s.coach = s.coach || [];
      return '<div class="studio"><div style="text-align:center"><p class="eyebrow">Fin Studio</p><h1 style="font-size:clamp(28px,4vw,42px)">' + (Q.simple() ? 'Ask Fin anything' : 'Ask, diagnose, simulate, act') + '</h1><p class="mut" style="max-width:60ch;margin:8px auto 0">Fin is an AI guide, not a licensed adviser. It reads your question, calls the rules engine for every number, and shows its work.</p></div>' +
        '<div class="modes" role="group" aria-label="Fin mode">' + Object.keys(C.MODES).map(function (k) { return '<button class="mo" data-m="' + k + '" aria-pressed="' + (k === mode) + '" style="--c:' + MC[k] + '"><i></i>' + k + '</button>'; }).join('') + '</div>' +
        '<div class="glass"><div class="chat" id="chat" aria-live="polite">' + (s.coach.length ? s.coach.map(msg).join('') : '<div class="m ai">Hi, I am Fin. Pick a mode and ask, or tap a suggestion. I will say so when I cannot answer, and I never guess your numbers.</div>') + (busy ? '<div class="m ai"><span class="dots" aria-label="Fin is thinking"><i></i><i></i><i></i></span></div>' : '') + '</div><div class="chips" style="justify-content:flex-start;margin:14px 0 10px">' + (Q.simple() ? ['Why is my score what it is?', 'What should I do next?', 'Am I insured enough?', 'What if I invest 10k more?'] : C.MODES[mode]).map(function (q) { return '<button class="chip" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div><form class="cmp" id="cf"><label class="sr" for="cq">Ask Fin</label><input class="inp" id="cq" placeholder="Ask in your own words…" maxlength="160" autocomplete="off"><button class="btn ghost" type="button" id="mic" aria-label="Speak your question">🎤</button><button class="btn" type="submit">Ask</button></form></div>' +
        '<p class="xs mut" style="text-align:center">Guardrails: no product picks or promised returns, distress goes to a person, missing data is asked for and never invented.</p></div>';
    },
    bind: function (m) {
      $$('[data-m]', m).forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.m; Q.render(true); }); }); $$('[data-q]', m).forEach(function (b) { b.addEventListener('click', function () { send(b.dataset.q); }); });
      $$('[data-go]', m).forEach(function (b) { b.addEventListener('click', function () { Q.go(b.dataset.go); }); }); $$('[data-esc]', m).forEach(function (b) { b.addEventListener('click', function () { Q.modal({ title: 'Connect to a person', html: '<p class="mut">In the product, a trained person would pick this up within a set time (the policy is still pending). In this prototype nothing is sent.</p>' }); }); });
      $('#mic', m).addEventListener('click', function () { Q.listen(function (t) { var i = $('#cq'); if (i) { i.value = t; i.focus(); } }); });
      $('#cf', m).addEventListener('submit', function (e) { e.preventDefault(); var i = $('#cq', m), t = i.value; i.value = ''; send(t); });
      var c = $('#chat', m); if (c) c.scrollTop = 1e6; if (Q.pendingAsk) { var q = Q.pendingAsk; Q.pendingAsk = null; setTimeout(function () { send(q); }, 200); } else { var i2 = $('#cq', m); if (i2 && !busy) i2.focus(); }
    }
  });
})(window);
