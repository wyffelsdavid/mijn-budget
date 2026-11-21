'use strict';
/* Mijn Budget – rekenlogica. Bedragen worden altijd opgeslagen in centen (gehele getallen). */
const S = { tx: [], cats: [], budgets: [], rec: [], goals: [], settings: {} };

const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const MONTHS_S = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const WEEKDAYS = ['zo','ma','di','wo','do','vr','za'];
const FREQ = { weekly: 'Wekelijks', monthly: 'Maandelijks', quarterly: 'Per kwartaal', yearly: 'Jaarlijks' };
const FREQ_PER_MONTH = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

/* ---------- Datums (altijd als tekst JJJJ-MM-DD, zonder tijdzoneproblemen) ---------- */
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function thisYM() { return todayISO().slice(0, 7); }
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; }
function iso(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }
function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function isValidISO(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const { y, m, d } = parseISO(s);
  return y > 1900 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}
function addMonthsISO(s, n) {
  const { y, m, d } = parseISO(s);
  const t = (m - 1) + n;
  const ny = y + Math.floor(t / 12);
  const nm = ((t % 12) + 12) % 12 + 1;
  return iso(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}
function addDaysISO(s, n) {
  const { y, m, d } = parseISO(s);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
function shiftYM(ym, n) { const [y, m] = ym.split('-').map(Number); const t = y * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`; }
function ymLabel(ym) { const [y, m] = ym.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; }
function lastDayOfYM(ym) { const [y, m] = ym.split('-').map(Number); return `${ym}-${pad(daysInMonth(y, m))}`; }
function fmtDate(s) { if (!s) return ''; const { y, m, d } = parseISO(s); return `${pad(d)}/${pad(m)}/${y}`; }
function weekday(s) { const { y, m, d } = parseISO(s); return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; }
function daysBetween(a, b) { const A = parseISO(a), B = parseISO(b); return Math.round((Date.UTC(B.y, B.m - 1, B.d) - Date.UTC(A.y, A.m - 1, A.d)) / 86400000); }
function monthsBetween(a, b) { const A = parseISO(a), B = parseISO(b); let n = (B.y - A.y) * 12 + (B.m - A.m); if (B.d < A.d) n -= 1; return n; }

/* ---------- Bedragen ---------- */
/* Begrijpt 35 / 12,50 / 12.50 / 1.234,56 / 1,234.56. Geeft centen terug of NaN. */
function parseAmount(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : NaN;
  let s = String(input || '').replace(/[€$£\s]/g, '').replace(/CHF/gi, '');
  if (!s || s.startsWith('-')) return NaN;
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc > -1 && ld > -1) {
    s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lc > -1) {
    const parts = s.split(',');
    s = parts.length > 2 ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (ld > -1) {
    const parts = s.split('.');
    if (parts.length > 2 || (parts[1].length === 3 && parts[0] !== '0' && parts[0] !== '')) s = s.replace(/\./g, '');
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100);
}

/* ---------- Index (snel opzoeken per maand) ---------- */
let IDX = null;
function invalidate() { IDX = null; }
function idx() {
  if (IDX) return IDX;
  const byMonth = new Map();
  for (const t of S.tx) {
    const k = t.date.slice(0, 7);
    let arr = byMonth.get(k);
    if (!arr) { arr = []; byMonth.set(k, arr); }
    arr.push(t);
  }
  IDX = { byMonth, catMap: new Map(S.cats.map((c) => [c.id, c])) };
  return IDX;
}
function txOfMonth(ym) { return idx().byMonth.get(ym) || []; }
function cat(id) { return idx().catMap.get(id); }
function catsOf(kind) { return S.cats.filter((c) => c.kind === kind).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name)); }

/* Sparen = inleg in een spaardoel, of Financieel > Sparen/Beleggingen. Telt niet als "uitgave". */
function isSavings(t) {
  if (t.type !== 'expense') return false;
  if (t.goalId) return true;
  return t.categoryId === 'c_fin' && (t.subcategory === 'Sparen' || t.subcategory === 'Beleggingen');
}
function isExtraIncome(t) { const c = cat(t.categoryId); return !!(c && c.extra); }

/* ---------- Terugkerende transacties ---------- */
function occurrence(r, n) {
  switch (r.frequency) {
    case 'weekly': return addDaysISO(r.startDate, 7 * n);
    case 'quarterly': return addMonthsISO(r.startDate, 3 * n);
    case 'yearly': return addMonthsISO(r.startDate, 12 * n);
    default: return addMonthsISO(r.startDate, n);
  }
}
function occurrencesBetween(r, from, to) {
  const out = [];
  if (!r.startDate || to < r.startDate) return out;
  // spring dichtbij 'from' om lange lussen te vermijden
  let n = 0;
  if (from > r.startDate) {
    if (r.frequency === 'weekly') n = Math.max(0, Math.floor(daysBetween(r.startDate, from) / 7) - 1);
    else { const step = r.frequency === 'quarterly' ? 3 : r.frequency === 'yearly' ? 12 : 1; n = Math.max(0, Math.floor(monthsBetween(r.startDate, from) / step) - 1); }
  }
  for (let i = 0; i < 5000; i++, n++) {
    const d = occurrence(r, n);
    if (d > to) break;
    if (r.endDate && d > r.endDate) break;
    if (d >= from) out.push(d);
  }
  return out;
}
function genFrom(r) { return r.generatedUntil ? addDaysISO(r.generatedUntil, 1) : r.startDate; }
/* Toekomstige (nog niet aangemaakte) betalingen in een periode */
function plannedBetween(from, to) {
  const out = [];
  for (const r of S.rec) {
    if (!r.active) continue;
    const g = genFrom(r);
    const f = g > from ? g : from;
    if (f > to) continue;
    for (const d of occurrencesBetween(r, f, to)) out.push({ rec: r, date: d });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
function nextOccurrence(r) {
  const t = todayISO(), g = genFrom(r);
  const list = occurrencesBetween(r, g > t ? g : t, addDaysISO(t, 800));
  return list[0] || null;
}
function signedAmount(t) { return t.type === 'income' ? t.amount : -t.amount; }
function txFromRec(r, date) {
  return {
    id: `r_${r.id}_${date}`, type: r.type, description: r.name, amount: r.amount, date,
    categoryId: r.categoryId, subcategory: r.subcategory || '', fixed: r.type === 'expense',
    paymentMethod: r.paymentMethod || '', notes: '', recurringId: r.id, goalId: null, createdAt: Date.now()
  };
}
/* Maakt vervallen betalingen aan tot en met vandaag. Vaste ID's + 'generatedUntil' = nooit dubbels. */
async function generateRecurring() {
  const today = todayISO();
  const existing = new Set(S.tx.map((t) => t.id));
  const newTx = [], upd = [];
  for (const r of S.rec) {
    if (!r.active) continue;
    const from = genFrom(r);
    if (from > today) continue;
    for (const d of occurrencesBetween(r, from, today)) {
      const t = txFromRec(r, d);
      if (!existing.has(t.id)) { newTx.push(t); existing.add(t.id); }
    }
    r.generatedUntil = today;
    upd.push(r);
  }
  if (newTx.length || upd.length) {
    await DB.batch({ put: { transactions: newTx, recurring: upd } });
    S.tx.push(...newTx);
    invalidate();
  }
  return newTx.length;
}

/* ---------- Statistieken ---------- */
function monthStats(ym) {
  const r = { income: 0, regIncome: 0, extraIncome: 0, spending: 0, savings: 0, fixed: 0, variable: 0, byCat: {}, count: 0 };
  for (const t of txOfMonth(ym)) {
    r.count++;
    if (t.type === 'income') {
      if (t.goalId) { r.savings -= t.amount; continue; } // opname uit spaardoel
      r.income += t.amount;
      if (isExtraIncome(t)) r.extraIncome += t.amount; else r.regIncome += t.amount;
    } else {
      if (isSavings(t)) { r.savings += t.amount; continue; }
      r.spending += t.amount;
      if (t.fixed) r.fixed += t.amount; else r.variable += t.amount;
      r.byCat[t.categoryId] = (r.byCat[t.categoryId] || 0) + t.amount;
    }
  }
  return r;
}
/* Werkelijke cijfers + geplande terugkerende betalingen die nog moeten komen */
function monthView(ym) {
  const r = monthStats(ym);
  r.pIncome = 0; r.pSpending = 0; r.pSavings = 0;
  r.planned = plannedBetween(`${ym}-01`, lastDayOfYM(ym));
  for (const { rec } of r.planned) {
    if (rec.type === 'income') {
      r.income += rec.amount; r.pIncome += rec.amount;
      if (isExtraIncome(rec)) r.extraIncome += rec.amount; else r.regIncome += rec.amount;
    } else if (isSavings(rec)) { r.savings += rec.amount; r.pSavings += rec.amount; }
    else {
      r.spending += rec.amount; r.pSpending += rec.amount; r.fixed += rec.amount;
      r.byCat[rec.categoryId] = (r.byCat[rec.categoryId] || 0) + rec.amount;
    }
  }
  r.net = r.income - r.spending;
  r.left = r.net - r.savings;
  return r;
}
function yearView(y) {
  const months = Array.from({ length: 12 }, (_, i) => monthView(`${y}-${pad(i + 1)}`));
  const t = { months, income: 0, reg: 0, extra: 0, spending: 0, savings: 0, fixed: 0, variable: 0, pIncome: 0, pSpending: 0, byCat: {} };
  for (const m of months) {
    t.income += m.income; t.reg += m.regIncome; t.extra += m.extraIncome; t.spending += m.spending;
    t.savings += m.savings; t.fixed += m.fixed; t.variable += m.variable; t.pIncome += m.pIncome; t.pSpending += m.pSpending;
    for (const [k, v] of Object.entries(m.byCat)) t.byCat[k] = (t.byCat[k] || 0) + v;
  }
  return t;
}
function balanceAt(dateISO) {
  let b = S.settings.startBalance || 0;
  for (const t of S.tx) if (t.date <= dateISO) b += signedAmount(t);
  return b;
}
function budgetRows(ym) {
  const st = monthStats(ym);
  return S.budgets.map((b) => {
    const c = cat(b.categoryId);
    if (!c) return null;
    const spent = st.byCat[b.categoryId] || 0;
    const pct = b.limit > 0 ? (spent / b.limit) * 100 : (spent > 0 ? 999 : 0);
    const state = pct > 100 ? 'over' : pct >= 90 ? 'alert' : pct >= 75 ? 'warn' : 'ok';
    return { b, c, spent, remaining: b.limit - spent, pct, state };
  }).filter(Boolean).sort((a, b) => (a.c.order ?? 99) - (b.c.order ?? 99));
}

/* ---------- Sparen ---------- */
function goalSaved(g) {
  let s = g.startAmount || 0;
  for (const t of S.tx) if (t.goalId === g.id) s += t.type === 'expense' ? t.amount : -t.amount;
  return s;
}
function totalSavings() { return S.goals.reduce((a, g) => a + goalSaved(g), 0); }
function goalStats(g) {
  const today = todayISO();
  const saved = goalSaved(g);
  const remaining = Math.max(0, g.target - saved);
  const pct = g.target > 0 ? Math.min(100, (saved / g.target) * 100) : 0;
  let monthsLeft = null, suggested = null;
  if (g.targetDate) {
    monthsLeft = Math.max(1, monthsBetween(today, g.targetDate));
    suggested = Math.ceil(remaining / monthsLeft);
  }
  // tempo: vaste maandinleg, anders gemiddelde netto-inleg van de laatste 3 maanden
  let pace = g.monthly || 0, paceSrc = 'vaste maandinleg';
  if (!pace) {
    const from = addMonthsISO(today, -3);
    let s = 0;
    for (const t of S.tx) if (t.goalId === g.id && t.date > from && t.date <= today) s += t.type === 'expense' ? t.amount : -t.amount;
    pace = Math.max(0, Math.round(s / 3)); paceSrc = 'gemiddelde van de laatste 3 maanden';
  }
  let eta = null;
  if (remaining === 0) eta = 'done';
  else if (pace > 0) eta = addMonthsISO(today, Math.ceil(remaining / pace));
  return { saved, remaining, pct, monthsLeft, suggested, pace, paceSrc, eta };
}
/* Wat kan er realistisch maandelijks gespaard worden? Gebaseerd op geregistreerde gegevens. */
function savingsPotential(planned = 0) {
  const today = todayISO();
  const active = S.rec.filter((r) => r.active && (!r.endDate || r.endDate >= today) && r.startDate <= addMonthsISO(today, 1));
  let regRec = 0, extraRec = 0, fixed = 0, recSavings = 0;
  for (const r of active) {
    const m = r.amount * FREQ_PER_MONTH[r.frequency];
    if (r.type === 'income') { if (isExtraIncome(r)) extraRec += m; else regRec += m; }
    else if (isSavings(r)) recSavings += m;
    else fixed += m;
  }
  const cur = thisYM();
  const months = [1, 2, 3].map((i) => shiftYM(cur, -i)).filter((ym) => txOfMonth(ym).length);
  const n = months.length;
  let regHist = 0, varHist = 0;
  for (const ym of months) for (const t of txOfMonth(ym)) {
    if (t.goalId || t.recurringId) continue;
    if (t.type === 'income') { if (!isExtraIncome(t)) regHist += t.amount; }
    else if (!isSavings(t)) varHist += t.amount;
  }
  // extra inkomen (vakantiegeld, 13de maand, ...) uit de laatste 12 maanden, per maand gespreid
  const yearAgo = addMonthsISO(today, -12);
  let extraHist = 0;
  for (const t of S.tx) if (t.type === 'income' && !t.goalId && !t.recurringId && isExtraIncome(t) && t.date > yearAgo && t.date <= today) extraHist += t.amount;

  let income = regRec + (n ? regHist / n : 0);
  let incomeSrc = n ? `vaste inkomsten + gemiddelde van ${n} maand${n > 1 ? 'en' : ''}` : 'vaste inkomsten';
  if (!n) {
    let manual = 0; for (const t of txOfMonth(cur)) if (t.type === 'income' && !t.goalId && !t.recurringId && !isExtraIncome(t)) manual += t.amount;
    if (manual) { income += manual; incomeSrc = 'vaste inkomsten + deze maand'; }
  }
  let variable, varSrc;
  const budgetTotal = S.budgets.reduce((a, b) => a + b.limit, 0);
  if (n) { variable = varHist / n; varSrc = `gemiddelde van de laatste ${n} maand${n > 1 ? 'en' : ''}`; }
  else {
    let curVar = 0; for (const t of txOfMonth(cur)) if (t.type === 'expense' && !t.recurringId && !isSavings(t)) curVar += t.amount;
    if (budgetTotal >= curVar && budgetTotal > 0) { variable = budgetTotal; varSrc = 'op basis van je budgetten'; }
    else { variable = curVar; varSrc = 'op basis van deze maand tot nu'; }
  }
  const extra = extraRec + extraHist / 12;
  const potential = Math.round(income - fixed - variable - planned);
  return { income: Math.round(income), incomeSrc, fixed: Math.round(fixed), variable: Math.round(variable), varSrc, planned, potential, extra: Math.round(extra), recSavings: Math.round(recSavings), months: n };
}

/* Snel overzicht: resterend budget (maand/jaar) en gespaard (maand/12 maanden) */
function quickStats() {
  const cur = thisYM(), y = cur.slice(0, 4);
  const ids = S.budgets.map((b) => b.categoryId);
  const lim = S.budgets.reduce((a, b) => a + b.limit, 0);
  const m = monthStats(cur);
  const spentM = ids.reduce((a, id) => a + (m.byCat[id] || 0), 0);
  let spentY = 0, savedYear = 0;
  for (let i = 1; i <= 12; i++) {
    const ym = `${y}-${pad(i)}`;
    if (ym > cur) break;
    const s = monthStats(ym);
    spentY += ids.reduce((a, id) => a + (s.byCat[id] || 0), 0);
  }
  for (let i = 0; i < 12; i++) savedYear += monthStats(shiftYM(cur, -i)).savings;
  return { hasBudget: ids.length > 0, monthLeft: lim - spentM, yearLeft: lim * 12 - spentY, savedMonth: m.savings, savedYear };
}
