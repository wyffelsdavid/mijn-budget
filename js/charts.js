'use strict';
/* Mijn Budget – eigen SVG-grafieken (geen externe bibliotheken, werkt offline). */
const Charts = (() => {
  const e = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }

  function donut(items, { size = 200, thick = 24, label = '', value = '' } = {}) {
    const total = items.reduce((a, b) => a + Math.max(0, b.value), 0);
    const r = (size - thick) / 2, c = size / 2, C = 2 * Math.PI * r;
    let segs = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${thick}"/>`;
    if (total > 0) {
      let off = 0;
      const gap = items.filter((i) => i.value > 0).length > 1 ? 2.5 : 0;
      for (const it of items) {
        if (it.value <= 0) continue;
        const len = (it.value / total) * C;
        const dl = Math.max(len - gap, 0.5);
        segs += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${it.color}" stroke-width="${thick}" stroke-dasharray="${dl.toFixed(2)} ${(C - dl).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${c} ${c})"/>`;
        off += len;
      }
    }
    return `<svg class="chart donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="${e(label)} ${e(value)}">${segs}
      <text x="${c}" y="${c - 4}" text-anchor="middle" class="d-label">${e(label)}</text>
      <text x="${c}" y="${c + 20}" text-anchor="middle" class="d-value">${e(value)}</text></svg>`;
  }

  /* Gegroepeerde staafgrafiek. series: [{name,color,values}] */
  function bars(labels, series, { height = 190, highlight = -1 } = {}) {
    const W = 340, H = height, pl = 40, pr = 4, pt = 10, pb = 24;
    const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
    const cw = (W - pl - pr) / labels.length, n = series.length, g = 2;
    const bw = Math.max(3, Math.min(13, (cw - 6 - g * (n - 1)) / n));
    let out = '';
    for (let i = 0; i <= 3; i++) {
      const y = pt + (H - pt - pb) * (1 - i / 3);
      out += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" class="grid"/><text x="${pl - 6}" y="${y + 3.5}" text-anchor="end" class="axis">${e(fmtShort(max * i / 3))}</text>`;
    }
    labels.forEach((lab, i) => {
      const gx = pl + cw * i + (cw - (bw * n + g * (n - 1))) / 2;
      series.forEach((s, j) => {
        const v = Math.max(0, s.values[i] || 0);
        const h = (v / max) * (H - pt - pb);
        if (h > 0) out += `<rect x="${(gx + j * (bw + g)).toFixed(1)}" y="${(H - pb - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, bw / 2)}" fill="${s.color}"><title>${e(lab)}: ${e(fmt(v))}</title></rect>`;
      });
      out += `<text x="${(pl + cw * i + cw / 2).toFixed(1)}" y="${H - 7}" text-anchor="middle" class="axis${i === highlight ? ' strong' : ''}">${e(lab)}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
  }

  /* Lijngrafiek (mag negatieve waarden bevatten) */
  function line(labels, values, { height = 180, color = 'var(--rose-d)', fillId = 'lg' + Math.random().toString(36).slice(2, 7) } = {}) {
    const W = 340, H = height, pl = 40, pr = 8, pt = 12, pb = 24;
    const hi = Math.max(0, ...values), lo = Math.min(0, ...values);
    const top = hi > 0 ? niceMax(hi) : 0, bot = lo < 0 ? -niceMax(-lo) : 0;
    const span = (top - bot) || 1;
    const x = (i) => pl + (labels.length === 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (labels.length - 1));
    const y = (v) => pt + (H - pt - pb) * (1 - (v - bot) / span);
    let out = `<defs><linearGradient id="${fillId}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
    const ticks = [bot, bot + span / 3, bot + (2 * span) / 3, top];
    for (const t of ticks) out += `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${pl - 6}" y="${y(t) + 3.5}" text-anchor="end" class="axis">${e(fmtShort(t))}</text>`;
    if (bot < 0) out += `<line x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}" class="zero"/>`;
    const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    out += `<path d="M${pts[0]} L${pts.join(' L')} L${x(values.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z" fill="url(#${fillId})"/>`;
    out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    values.forEach((v, i) => { out += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="var(--card)" stroke="${color}" stroke-width="2"><title>${e(labels[i])}: ${e(fmt(v))}</title></circle>`; });
    labels.forEach((l, i) => { out += `<text x="${x(i).toFixed(1)}" y="${H - 7}" text-anchor="middle" class="axis">${e(l)}</text>`; });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
  }

  return { donut, bars, line };
})();
