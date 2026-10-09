// ETF Trading tools. Every tool's default result is pre-rendered in HTML; JS only recalculates on input.
(function () {
  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  var usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  var pct = function (v) { return (Math.round(v * 100) / 100).toFixed(2) + '%'; };

  function val(root, name) {
    var el = root.querySelector('[data-in="' + name + '"]');
    if (!el) return 0;
    var v = parseFloat(String(el.value).replace(/[^0-9.\-]/g, ''));
    return isFinite(v) ? v : 0;
  }
  function out(root, name, text) {
    var el = root.querySelector('[data-out="' + name + '"]');
    if (el) el.textContent = text;
  }
  // Monthly compounding at (annual return - fee), contributions at month end.
  function grow(initial, monthly, years, annual, fee) {
    var r = Math.pow(1 + (annual - fee), 1 / 12) - 1, b = initial;
    var n = Math.round(Math.min(Math.max(years, 0), 80) * 12);
    for (var i = 0; i < n; i++) b = b * (1 + r) + monthly;
    return b;
  }

  var tools = {
    // Original homepage calculator: two fees, one portfolio.
    'fee-pair': function (t) {
      var i = val(t, 'initial'), m = val(t, 'monthly'), y = val(t, 'years'), r = val(t, 'return') / 100;
      var a = grow(i, m, y, r, val(t, 'feeA') / 100), b = grow(i, m, y, r, val(t, 'feeB') / 100);
      out(t, 'contrib', usd.format(i + m * Math.round(y * 12)));
      out(t, 'a', usd.format(a)); out(t, 'b', usd.format(b)); out(t, 'diff', usd.format(Math.abs(a - b)));
    },
    // Same portfolio across several funds (rows carry data-fee).
    'fee-compare': function (t) {
      var i = val(t, 'initial'), m = val(t, 'monthly'), y = val(t, 'years'), r = val(t, 'return') / 100;
      var rows = t.querySelectorAll('[data-fee]'), best = 0, vals = [];
      rows.forEach(function (row) { var v = grow(i, m, y, r, parseFloat(row.getAttribute('data-fee')) / 100); vals.push(v); if (v > best) best = v; });
      rows.forEach(function (row, k) {
        row.querySelector('[data-cell="value"]').textContent = usd.format(vals[k]);
        row.querySelector('[data-cell="cost"]').textContent = vals[k] === best ? 'Lowest cost' : '−' + usd.format(best - vals[k]);
      });
      out(t, 'contrib', usd.format(i + m * Math.round(y * 12)));
    },
    // ETF (yearly fee) vs buying the coin directly (one-time buy + sell fee).
    'vs-direct': function (t) {
      var a = val(t, 'amount'), y = val(t, 'years'), r = val(t, 'return') / 100;
      var etf = a * Math.pow(1 + r - val(t, 'etfFee') / 100, y);
      var direct = a * (1 - val(t, 'buyFee') / 100) * Math.pow(1 + r, y) * (1 - val(t, 'sellFee') / 100);
      out(t, 'etf', usd.format(etf)); out(t, 'direct', usd.format(direct));
      out(t, 'winner', direct >= etf ? 'Buying directly is ' + usd.format(direct - etf) + ' cheaper' : 'The ETF is ' + usd.format(etf - direct) + ' cheaper');
    },
    // Dividend income from capital, and capital needed for a target income.
    'dividend': function (t) {
      var c = val(t, 'capital'), yld = val(t, 'yield') / 100, target = val(t, 'target');
      out(t, 'annual', usd.format(c * yld)); out(t, 'monthly', usd.format(c * yld / 12));
      out(t, 'needed', yld > 0 ? usd.format(target * 12 / yld) : '—');
    },
    // Leveraged ETF decay: alternating +x% / −x% days.
    'decay': function (t) {
      var move = val(t, 'move') / 100, days = Math.max(Math.round(val(t, 'days')), 0), lev = val(t, 'lev');
      var idx = 100, l = 100;
      for (var d = 0; d < days; d++) { var mv = d % 2 === 0 ? move : -move; idx *= 1 + mv; l = Math.max(l * (1 + lev * mv), 0); }
      out(t, 'index', pct(idx - 100)); out(t, 'lev', pct(l - 100)); out(t, 'gap', pct(l - idx));
    },
    // Gold/silver ratio.
    'ratio': function (t) {
      var g = val(t, 'gold'), s = val(t, 'silver'), amt = val(t, 'amount');
      out(t, 'ratio', s > 0 ? (g / s).toFixed(1) + ' : 1' : '—');
      out(t, 'goldOz', g > 0 ? (amt / g).toFixed(3) + ' oz' : '—');
      out(t, 'silverOz', s > 0 ? (amt / s).toFixed(2) + ' oz' : '—');
    },
    // Treasury ETF vs savings account, after tax.
    'treasury': function (t) {
      var a = val(t, 'amount'), ty = val(t, 'tyield') / 100, sv = val(t, 'savings') / 100, fed = val(t, 'fed') / 100, st = val(t, 'state') / 100;
      var tNet = a * ty * (1 - fed), sNet = a * sv * (1 - fed - st);
      out(t, 'tnet', usd.format(tNet)); out(t, 'snet', usd.format(sNet));
      out(t, 'gap', (tNet >= sNet ? '+' : '−') + usd.format(Math.abs(tNet - sNet)) + ' a year');
    }
  };

  document.querySelectorAll('[data-tool]').forEach(function (t) {
    var fn = tools[t.getAttribute('data-tool')];
    if (!fn) return;
    t.addEventListener('input', function () { fn(t); });
    fn(t);
  });
  window.__etf = { grow: grow, usd2: usd2 };
})();
