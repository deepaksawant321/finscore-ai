/* Skill tree: the 15 factors as five branches. Each node shows its level out of 10, what the next band is worth, and whether a quest could raise it. */
(function (root) {
  'use strict';
  var E = root.FSEngine, M = root.FSModel, S = root.FSStore, Q = root.Q, esc = Q.esc, $ = Q.$, $$ = Q.$$, st = function () { return S.state; };
  var questsOnly = false;
  var col = function (r) { return r >= 0.7 ? 'var(--em)' : r >= 0.5 ? 'var(--gold)' : 'var(--cor)'; };
  Q.register('tree', {
    render: function () {
      var res = S.evaluate(); if (!res.scoredCount) return '<div class="empty" style="max-width:560px;margin:8vh auto"><b>Your tree has not grown yet</b>Skills appear as Fin learns about you. Start the conversation, or open a sample profile.<div class="row wrap" style="justify-content:center;margin-top:18px"><button class="btn" data-go="intro">Talk to Fin</button><button class="btn ghost" data-demo>Open a sample profile</button></div></div>';
      var rows = {}; res.factors.forEach(function (f) { rows[f.id] = f; }); var acts = Q.topActions(20), qf = {}; acts.forEach(function (a) { a.factors.forEach(function (id) { qf[id] = a; }); });
      var weak = -1, wr = 2; Q.BRANCHES.forEach(function (b, i) { var sc = b.f.map(function (id) { return rows[id]; }).filter(function (f) { return f.status === 'scored'; }), mx = sc.reduce(function (a, f) { return a + f.scaledMax; }, 0), r = mx ? sc.reduce(function (a, f) { return a + f.scaledPoints; }, 0) / mx : 2; if (r < wr) { wr = r; weak = i; } });
      return '<div class="row between wrap"><div><h1 style="font-size:clamp(28px,4vw,42px)">Your strengths</h1><p class="mut" style="max-width:62ch;margin-top:8px">Five areas of your money. The one that needs most attention is open. Tap any item for the reason.</p></div><label class="pill"><input type="checkbox" id="qo" ' + (questsOnly ? 'checked' : '') + '> Only items with an action</label></div>' +
        '<div class="tree" role="list">' + Q.BRANCHES.map(function (b, bi) {
          var fs = b.f.map(function (id) { return rows[id]; }), sc = fs.filter(function (f) { return f.status === 'scored'; }), pts = sc.reduce(function (a, f) { return a + f.scaledPoints; }, 0), mx = sc.reduce(function (a, f) { return a + f.scaledMax; }, 0);
          return '<details class="branch" role="listitem"' + (bi === weak || questsOnly ? ' open' : '') + '><summary style="cursor:pointer;list-style:none"><h3 style="display:inline">' + esc(b.name) + '</h3><p class="tot">' + (mx ? Math.round(pts) + ' of ' + Math.round(mx) + ' points' : 'Nothing lit yet') + (bi === weak ? ' · needs most attention' : '') + '</p></summary>' + fs.filter(function (f) { return !questsOnly || qf[f.id]; }).map(function (f) {
            if (f.status === 'scored') { var m = E.rules.matrices[f.matrix], ar = E.rules.age_bands.labels.indexOf(f.ageLabel), row = m.rows_by_age_band[ar], nx = row[f.band + 1] != null ? (row[f.band + 1] - f.fscore) / 10 * f.scaledMax : 0; return '<button class="node ' + (qf[f.id] ? 'quest' : '') + '" data-f="' + f.id + '"><span class="lv" style="--p:' + f.fscore * 10 + ';--c:' + col(f.ratio) + '"><b>' + f.fscore + '</b></span><span><span class="nm">' + esc(f.name) + '</span><br><span class="sb">' + (f.ratio >= 0.7 ? 'Strong' : f.ratio >= 0.5 ? 'Middling' : 'Needs attention') + ' · ' + esc(f.bandLabel) + (nx > 0.05 ? ' · next +' + nx.toFixed(0) : f.fscore >= 10 ? ' · top' : '') + '</span>' + (qf[f.id] ? '<br><span class="badge">Quest +' + qf[f.id].delta + '</span>' : '') + '</span></button>'; }
            if (f.status === 'na') return '<button class="node locked" data-f="' + f.id + '"><span class="lv"><b>–</b></span><span><span class="nm">' + esc(f.name) + '</span><br><span class="sb">Does not apply to you</span></span></button>';
            return '<button class="node locked" data-f="' + f.id + '"><span class="lv"><b>🔒</b></span><span><span class="nm">' + esc(f.name) + '</span><br><span class="sb">Needs ' + f.needs.filter(function (k) { return k !== 'age'; }).map(function (k) { return esc(M.FDEF[k].label.toLowerCase().replace(/ \(.*/, '')); }).slice(0, 2).join(', ') + '</span></span></button>';
          }).join('') + '</details>';
        }).join('') + '</div><details class="xs mut" style="margin-top:6px"><summary style="cursor:pointer">How to read this</summary><p style="margin:6px 0 0">The number is a 0 to 10 level for your age group. Green is strong, gold is middling, coral needs attention. Actions are estimates from the rules engine; the approved action library is still pending.</p></details>';
    },
    bind: function (m) {
      $$('[data-go]', m).forEach(function (b) { b.addEventListener('click', function () { Q.go(b.dataset.go); }); }); var d = $('[data-demo]', m); if (d) d.addEventListener('click', function () { S.loadDemo(); st().seen.revealDone = 0; Q.render(); });
      $$('.node[data-f]', m).forEach(function (b) { b.addEventListener('click', function () { Q.drill(b.dataset.f); }); }); var q = $('#qo', m); if (q) q.addEventListener('change', function () { questsOnly = q.checked; Q.render(true); });
    }
  });
})(window);
