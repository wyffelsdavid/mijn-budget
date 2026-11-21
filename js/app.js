'use strict';
/* Mijn Budget – gebruikersinterface */
const APP_VERSION = '1.2.0';
const UI = {
  view: 'dashboard', ym: thisYM(), year: Number(thisYM().slice(0, 4)),
  budgetSeg: 'budgets', reportSeg: 'month', catSeg: 'expense',
  hist: { q: '', type: 'all', cat: '', from: '', to: '', sort: 'date-desc', limit: 100 },
  calc: { target: 300000, months: 12, reduce: 5000, reduceCat: '', planned: 0 },
  persisted: null
};
let F = null;            // status van het open formulier
let swWaiting = null;    // nieuwe versie van de app die klaarstaat
let pendingImport = null;
let hiddenAt = 0;       // wanneer de app naar de achtergrond ging

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

const PAY = ['Bankkaart', 'Kredietkaart', 'Maaltijdcheques', 'Cash', 'Overschrijving', 'Domiciliëring', 'Payconiq', 'Andere'];
const ICONS = ['🏡','🧺','🚗','💄','👗','🩺','👪','✈️','🏦','✨','☕','🍽️','🛒','🥐','🍷','💅','💇‍♀️','🧴','👠','👜','💍','🎁','🐾','🧸','📚','🎬','🎵','🧘‍♀️','🏋️‍♀️','💊','📱','💻','⚡','💧','🔥','🌐','📺','🛡️','🔧','🚆','⛽','🅿️','🌴','🎓','💼','💶','⭐','🧾','➕','🌸','🌿','💐','🕯️','🎨','🐶','🐱','👶','💳','📈','🐷','❤️','🍰'];
const COLORS = ['#C9A99B','#D8B48A','#9DB0C8','#D99AA5','#B7A3D1','#93BFA8','#E3A88B','#8FB5C2','#A7A39B','#BDB3AE','#C48A92','#E2B263','#8FC1BE','#9CB89F','#D9BC7E','#A3B6CF'];
const GOAL_ICONS = ['🌴','👗','🛟','🚗','🏠','✨','💍','🎓','💐','🧳','💻','🐷'];
const DEFAULT_CATS = [
  ['c_home','Wonen','🏡','#C9A99B',['Huur of hypotheek','Elektriciteit','Gas','Water','Internet','Televisie','Verzekering','Onderhoud','Huishoudelijke aankopen']],
  ['c_food','Eten & boodschappen','🧺','#D8B48A',['Supermarkt','Bakker','Slager','Restaurant','Afhaal','Koffie & snacks']],
  ['c_transport','Vervoer','🚗','#9DB0C8',['Brandstof','Openbaar vervoer','Autoverzekering','Auto-onderhoud','Parkeren','Ander vervoer']],
  ['c_beauty','Beauty & selfcare','💄','#D99AA5',['Make-up','Huidverzorging','Kapper','Schoonheidsbehandelingen','Nagels','Wenkbrauwen & wimpers','Parfum','Wellness','Verzorgingsproducten']],
  ['c_fashion','Mode & shopping','👗','#B7A3D1',['Kleding','Schoenen','Accessoires','Handtassen','Online shopping','Algemene aankopen']],
  ['c_health','Gezondheid','🩺','#93BFA8',['Apotheek','Medische afspraken','Tandarts','Ziekteverzekering','Andere zorg']],
  ['c_family','Gezin & persoonlijk','👪','#E3A88B',['Kinderen','Cadeaus','Gezinsactiviteiten','Persoonlijke uitgaven','Huisdieren']],
  ['c_leisure','Vrije tijd & beleving','✈️','#8FB5C2',['Vakanties','Weekendtrips','Activiteiten','Entertainment',"Hobby's",'Abonnementen']],
  ['c_fin','Financieel','🏦','#A7A39B',['Sparen','Beleggingen','Leningaflossing','Kredietkaart','Andere financiële kosten']],
  ['c_other','Overig','✨','#BDB3AE',['Diverse uitgaven']]
];
const DEFAULT_INC = [
  ['i_salary','Salaris','💼','#9CB89F',false],['i_meal','Maaltijdcheques','🍽️','#D8B48A',false],['i_extra','Bijkomend inkomen','➕','#A9C4B9',true],
  ['i_holiday','Vakantiegeld','🌴','#8FC1BE',true],['i_13th','13de maand','🎁','#B9AED6',true],
  ['i_bonus','Bonus','⭐','#D9BC7E',true],['i_tax','Belastingteruggave','🧾','#A3B6CF',true],['i_other','Overig inkomen','💶','#BDB3AE',true]
];
const LOCKED = new Set(['c_fin', 'c_other', 'i_other']);

/* ---------- Opmaak ---------- */
let _nf = null, _nfCur = '';
function fmt(c) {
  const cur = S.settings.currency || 'EUR';
  if (!_nf || _nfCur !== cur) { _nf = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: cur }); _nfCur = cur; }
  return _nf.format((c || 0) / 100);
}
function curSym() { return ({ EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' })[S.settings.currency || 'EUR'] || '€'; }
function fmtShort(c) {
  const v = c / 100, a = Math.abs(v), s = curSym(), sign = v < 0 ? '−' : '';
  if (a >= 1000) return `${sign}${s}${(a / 1000).toLocaleString('nl-BE', { maximumFractionDigits: 1 })}k`;
  return `${sign}${s}${Math.round(a)}`;
}
function fmtInput(c) { return (c / 100).toFixed(2).replace('.', ','); }
function signed(c) { return (c > 0 ? '+' : c < 0 ? '−' : '') + fmt(Math.abs(c)); }
function catOrUnknown(id) { return cat(id) || { id, name: 'Onbekend', icon: '•', color: '#BDB3AE', subs: [] }; }
function icon(c, size = '') { return `<span class="ci ${size}" style="background:${c.color}2E">${c.icon}</span>`; }

/* ---------- Opstart ---------- */
async function init() {
  try { await DB.open(); }
  catch (e) { $('#view').innerHTML = `<div class="card empty"><h3>De app kan niet starten</h3><p>${esc(e.message)}</p><p class="muted">Gebruik Safari op iPhone (iOS 15 of nieuwer) en zorg dat privénavigatie uit staat.</p></div>`; return; }
  await loadAll();
  if (!S.settings.initialized) await seedDefaults();
  await migrate();
  await generateRecurring();
  bindEvents();
  render();
  maybeQuickAdd();
  registerSW();
  try { if (navigator.storage && navigator.storage.persist) UI.persisted = await navigator.storage.persist(); } catch (_) {}
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') { hiddenAt = Date.now(); return; }
    const n = await generateRecurring();
    if (n && $('#sheet').hidden) render();
    if (hiddenAt && Date.now() - hiddenAt > 1500) maybeQuickAdd();
  });
}
/* Openen met nieuwe uitgave (voor Back Tap / snelkoppeling) */
function maybeQuickAdd() {
  if (!S.settings.quickAddOnOpen) return;
  if (!$('#sheet').hidden || !$('#dialog').hidden || UI.view === 'backup') return;
  openTxForm();
}
async function loadAll() {
  const [tx, cats, budgets, rec, goals, set] = await Promise.all(DB.STORES.map((s) => DB.getAll(s)));
  Object.assign(S, { tx, cats, budgets, rec, goals, settings: Object.fromEntries(set.map((x) => [x.key, x.value])) });
  invalidate();
}
function defaultCategories() {
  const cats = DEFAULT_CATS.map(([id, name, ic, color, subs], i) => ({ id, kind: 'expense', name, icon: ic, color, subs, order: i }));
  DEFAULT_INC.forEach(([id, name, ic, color, extra], i) => cats.push({ id, kind: 'income', name, icon: ic, color, subs: [], extra, order: i }));
  return cats;
}
/* Nieuwe standaardcategorieën ook toevoegen bij bestaande installaties (één keer) */
async function migrate() {
  if (!S.settings.catsV2) {
    if (!S.cats.some((c) => c.id === 'i_meal')) {
      const c = { id: 'i_meal', kind: 'income', name: 'Maaltijdcheques', icon: '🍽️', color: '#D8B48A', subs: [], extra: false, order: 0.5 };
      await DB.put('categories', c); S.cats.push(c); invalidate();
    }
    await setSetting('catsV2', true);
  }
}
async function seedDefaults() {
  const cats = defaultCategories();
  const settings = { initialized: true, catsV2: true, currency: 'EUR', language: 'nl', startBalance: 0, userName: '', createdAt: new Date().toISOString() };
  await DB.batch({ put: { categories: cats, settings: Object.entries(settings).map(([key, value]) => ({ key, value })) } });
  S.cats = cats; Object.assign(S.settings, settings); invalidate();
}

/* ---------- Gegevens bewaren ---------- */
function upsert(arr, obj, key = 'id') { const i = arr.findIndex((x) => x[key] === obj[key]); if (i > -1) arr[i] = obj; else arr.push(obj); }
async function saveTx(t) { await DB.put('transactions', t); upsert(S.tx, t); invalidate(); }
async function deleteTx(id) { await DB.del('transactions', id); S.tx = S.tx.filter((t) => t.id !== id); invalidate(); }
async function saveRec(r) { await DB.put('recurring', r); upsert(S.rec, r); invalidate(); await generateRecurring(); }
async function deleteRec(id) { await DB.del('recurring', id); S.rec = S.rec.filter((r) => r.id !== id); invalidate(); }
async function saveBudget(b) { await DB.put('budgets', b); upsert(S.budgets, b, 'categoryId'); invalidate(); }
async function deleteBudget(cid) { await DB.del('budgets', cid); S.budgets = S.budgets.filter((b) => b.categoryId !== cid); invalidate(); }
async function saveGoal(g) { await DB.put('goals', g); upsert(S.goals, g); invalidate(); }
async function deleteGoal(id) { await DB.del('goals', id); S.goals = S.goals.filter((g) => g.id !== id); invalidate(); }
async function setSetting(key, value) { await DB.put('settings', { key, value }); S.settings[key] = value; invalidate(); }

/* ---------- Navigatie ---------- */
const TITLES = { dashboard: 'Overzicht', history: 'Historiek', budget: 'Budget', savings: 'Sparen', reports: 'Rapporten', settings: 'Instellingen', categories: 'Categorieën', backup: 'Mijn gegevens & back-up' };
const SUBVIEWS = { categories: 'settings', backup: 'settings' };
function go(v) { UI.view = v; render(); window.scrollTo(0, 0); }
function render() {
  const fn = { dashboard: renderDashboard, history: renderHistory, budget: renderBudget, savings: renderSavings, reports: renderReports, settings: renderSettings, categories: renderCategories, backup: renderBackup }[UI.view];
  $('#view').innerHTML = fn();
  $('#title').textContent = TITLES[UI.view];
  const parent = SUBVIEWS[UI.view];
  $('#back').hidden = !parent;
  $('#back').dataset.v = parent || '';
  $('#gear').hidden = UI.view === 'settings' || !!parent;
  const tabView = parent ? null : UI.view;
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.v === tabView));
  if (UI.view === 'history') fillHistory();
  if (UI.view === 'savings') fillCalc();
  if (UI.view === 'settings') fillStorageInfo();
}
function rerenderKeepScroll() { const y = window.scrollY; render(); window.scrollTo(0, y); }

/* ---------- Kleine bouwstenen ---------- */
function monthSel(ym, act) {
  return `<div class="monthsel">
    <button class="round" data-act="${act}" data-d="-1" aria-label="Vorige">‹</button>
    <div class="ms-label">${ymLabel(ym)}${ym !== thisYM() ? ` <button class="link small" data-act="${act}" data-d="0">naar vandaag</button>` : ''}</div>
    <button class="round" data-act="${act}" data-d="1" aria-label="Volgende">›</button></div>`;
}
function yearSel(y) {
  return `<div class="monthsel"><button class="round" data-act="yr" data-d="-1" aria-label="Vorig jaar">‹</button>
    <div class="ms-label">${y}${y !== Number(thisYM().slice(0, 4)) ? ` <button class="link small" data-act="yr" data-d="0">dit jaar</button>` : ''}</div>
    <button class="round" data-act="yr" data-d="1" aria-label="Volgend jaar">›</button></div>`;
}
function seg(key, options, current, act = 'seg') {
  return `<div class="seg">${options.map(([v, l]) => `<button class="${v === current ? 'on' : ''}" data-act="${act}" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
}
function bar(pct, color) { return `<div class="bar"><span style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%;background:${color}"></span></div>`; }
const STATE_COLOR = { ok: 'var(--sage)', warn: 'var(--warn)', alert: 'var(--alert)', over: 'var(--over)' };
const STATE_TEXT = { ok: 'Binnen budget', warn: '75% gebruikt', alert: 'Bijna op', over: 'Overschreden' };
function kpi(label, value, sub, cls = '') { return `<div class="kpi ${cls}"><div class="kpi-l">${label}</div><div class="kpi-v">${value}</div><div class="kpi-s">${sub}</div></div>`; }
function empty(title, text, btn) { return `<div class="empty"><h3>${title}</h3><p>${text}</p>${btn || ''}</div>`; }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400); }

/* =================== OVERZICHT =================== */
function ring(pct, size = 88) {
  const r = 36, C = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
  return `<svg viewBox="0 0 88 88" width="${size}" height="${size}" class="ring" aria-hidden="true">
    <circle cx="44" cy="44" r="${r}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="7"/>
    <circle cx="44" cy="44" r="${r}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(p / 100 * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 44 44)"/>
    <text x="44" y="49" text-anchor="middle">${Math.round(pct)}%</text></svg>`;
}
function renderDashboard() {
  const today = todayISO(), ym = UI.ym, curM = thisYM();
  const v = monthView(ym), now = ym === curM ? v : monthView(curM);
  const bal = balanceAt(today);
  const rest = plannedBetween(addDaysISO(today, 1), lastDayOfYM(curM));
  const expEnd = bal + sum(rest.filter((p) => !isMealTx(p.rec)), (p) => signedAmount(p.rec));
  const hasMeal = S.tx.some(isMealTx) || S.rec.some((r) => r.active && isMealTx(r));
  const mealBal = mealBalanceAt(today);
  const rows = budgetRows(ym), bLim = sum(rows, (r) => r.b.limit), bSpent = sum(rows, (r) => r.spent);
  const h = new Date().getHours(), name = S.settings.userName;
  const greet = h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond';
  const spentPct = now.income > 0 ? (now.spending / now.income) * 100 : 0;
  const backupWarn = S.tx.length > 0 && (!S.settings.lastBackup || daysBetween(S.settings.lastBackup.slice(0, 10), today) > 30);

  const cats = Object.entries(v.byCat).map(([id, val]) => ({ c: catOrUnknown(id), val })).sort((a, b) => b.val - a.val);
  const six = Array.from({ length: 6 }, (_, i) => shiftYM(ym, i - 5));
  const sixV = six.map(monthView);
  const upcoming = plannedBetween(addDaysISO(today, 1), addDaysISO(today, 30)).filter((p) => p.rec.type === 'expense').slice(0, 6);
  const y = Number(ym.slice(0, 4)), yv = yearView(y);
  const goals = S.goals.slice().sort((a, b) => (a.targetDate || '9999').localeCompare(b.targetDate || '9999')).slice(0, 3);

  return `
  <p class="greet">${greet}${name ? `, ${esc(name)}` : ''}</p>
  ${backupWarn ? `<button class="banner" data-act="nav" data-v="backup"><b>Tijd voor een back-up.</b> ${S.settings.lastBackup ? `Je laatste back-up is van ${fmtDate(S.settings.lastBackup.slice(0, 10))}.` : 'Je hebt nog geen back-up gemaakt.'} Tik hier.</button>` : ''}
  <section class="hero">
    <div class="hero-main">
      <div class="hero-l">Beschikbaar saldo</div>
      <div class="hero-amount">${fmt(bal)}</div>
      <div class="hero-sub">Verwacht op ${fmtDate(lastDayOfYM(curM))}: <b>${fmt(expEnd)}</b></div>
      ${hasMeal ? `<div class="hero-meal">🍽️ Maaltijdcheques: <b>${fmt(mealBal)}</b></div>` : ''}
    </div>
    <div class="hero-ring">${ring(spentPct)}<span>van je inkomen<br>deze maand uitgegeven</span></div>
    <button class="hero-btn" data-act="add">Uitgave toevoegen</button>
  </section>

  ${monthSel(ym, 'ym')}
  <div class="kpis">
    ${kpi('Inkomsten', fmt(v.income), v.pIncome ? `waarvan ${fmt(v.pIncome)} nog verwacht` : 'deze maand', 'in')}
    ${kpi('Uitgaven', fmt(v.spending), v.pSpending ? `waarvan ${fmt(v.pSpending)} nog gepland` : 'zonder spaargeld', 'out')}
    ${kpi('Resterend budget', rows.length ? fmt(bLim - bSpent) : '—', rows.length ? `van ${fmt(bLim)} budget` : 'nog geen budgetten', bLim - bSpent < 0 ? 'neg' : '')}
    ${kpi('Totaal gespaard', fmt(totalSavings()), v.savings ? `${signed(v.savings)} deze maand` : `${S.goals.length} spaardoel${S.goals.length === 1 ? '' : 'en'}`, 'sav')}
  </div>
  <div class="card net">
    <div><div class="kpi-l">Over na deze maand</div><div class="net-v ${v.left < 0 ? 'neg' : ''}">${fmt(v.left)}</div></div>
    <div class="net-f">${fmt(v.income)} inkomsten<br>− ${fmt(v.spending)} uitgaven<br>− ${fmt(v.savings)} gespaard</div>
  </div>

  <section class="card">
    <div class="card-h"><h3>Spaardoelen</h3><button class="link" data-act="nav" data-v="savings">Alles</button></div>
    ${goals.length ? goals.map((g) => { const s = goalStats(g); return `<div class="goal-mini"><div class="gm-top"><span>${g.icon || '🐷'} ${esc(g.name)}</span><span>${fmt(s.saved)} <span class="muted">/ ${fmt(g.target)}</span></span></div>${bar(s.pct, 'linear-gradient(90deg,var(--lav),var(--rose))')}</div>`; }).join('')
      : `<p class="muted">Spaar je voor een reis, een buffer of iets moois? <button class="link" data-act="goal-new">Maak een spaardoel</button></p>`}
  </section>

  <section class="card">
    <div class="card-h"><h3>Uitgaven per categorie</h3><span class="muted small">${ymLabel(ym)}</span></div>
    ${cats.length ? `<div class="donut-wrap">${Charts.donut(cats.map((x) => ({ value: x.val, color: x.c.color })), { label: 'uitgegeven', value: fmt(v.spending) })}</div>
      <div class="toplist">${cats.slice(0, 5).map((x) => `<div class="tl-row">${icon(x.c, 'sm')}<div class="tl-mid"><div class="tl-name"><span>${esc(x.c.name)}</span><span>${fmt(x.val)}</span></div>${bar(v.spending ? (x.val / v.spending) * 100 : 0, x.c.color)}</div></div>`).join('')}</div>`
      : `<p class="muted">Nog geen uitgaven in ${ymLabel(ym)}.</p>`}
  </section>

  <section class="card">
    <div class="card-h"><h3>Inkomsten en uitgaven</h3><span class="muted small">6 maanden</span></div>
    ${Charts.bars(six.map((m) => MONTHS_S[Number(m.slice(5)) - 1]), [{ name: 'Inkomsten', color: 'var(--lav)', values: sixV.map((m) => m.income) }, { name: 'Uitgaven', color: 'var(--rose)', values: sixV.map((m) => m.spending) }], { highlight: 5 })}
    <div class="legend"><span><i style="background:var(--lav)"></i>Inkomsten</span><span><i style="background:var(--rose)"></i>Uitgaven</span></div>
  </section>

  <section class="card">
    <div class="card-h"><h3>Komende vaste betalingen</h3><button class="link" data-act="budget-seg" data-v="recurring">Beheren</button></div>
    ${upcoming.length ? upcoming.map((p) => { const c = catOrUnknown(p.rec.categoryId); return `<div class="row">${icon(c, 'sm')}<div class="row-mid"><div class="row-t">${esc(p.rec.name)}</div><div class="row-s">${weekday(p.date)} ${fmtDate(p.date)}</div></div><div class="row-a">${fmt(p.rec.amount)}</div></div>`; }).join('')
      : `<p class="muted">Geen vaste betalingen in de komende 30 dagen. Voeg huur, abonnementen en verzekeringen toe onder <button class="link" data-act="budget-seg" data-v="recurring">vaste lasten</button>.</p>`}
  </section>

  <section class="card">
    <div class="card-h"><h3>Jaaroverzicht ${y}</h3><button class="link" data-act="report-year">Rapport</button></div>
    <div class="yr-grid">
      <div><span class="muted small">Inkomsten</span><b>${fmt(yv.income)}</b></div>
      <div><span class="muted small">Uitgaven</span><b>${fmt(yv.spending)}</b></div>
      <div><span class="muted small">Gespaard</span><b>${fmt(yv.savings)}</b></div>
      <div><span class="muted small">Over</span><b class="${yv.income - yv.spending - yv.savings < 0 ? 'neg' : ''}">${fmt(yv.income - yv.spending - yv.savings)}</b></div>
    </div>
    ${yv.pIncome || yv.pSpending ? `<p class="muted small">Inclusief vaste inkomsten en lasten die dit jaar nog gepland zijn.</p>` : ''}
  </section>`;
}

/* =================== HISTORIEK =================== */
function catOptions(selected, { includeAll = false, kinds = ['expense', 'income'] } = {}) {
  let html = includeAll ? `<option value="">Alle categorieën</option>` : '';
  for (const k of kinds) {
    html += `<optgroup label="${k === 'expense' ? 'Uitgaven' : 'Inkomsten'}">${catsOf(k).map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}</optgroup>`;
  }
  return html;
}
function renderHistory() {
  const h = UI.hist;
  const active = h.q || h.type !== 'all' || h.cat || h.from || h.to;
  return `
  <div class="search"><input id="h-q" type="search" placeholder="Zoek op omschrijving, categorie of bedrag" value="${esc(h.q)}" autocomplete="off"></div>
  ${seg('type', [['all', 'Alles'], ['expense', 'Uitgaven'], ['income', 'Inkomsten']], h.type, 'h-type')}
  <div class="filters">
    <select id="h-cat" data-change="hist">${catOptions(h.cat, { includeAll: true })}</select>
    <select id="h-sort" data-change="hist">
      ${[['date-desc', 'Nieuwste eerst'], ['date-asc', 'Oudste eerst'], ['amt-desc', 'Hoogste bedrag'], ['amt-asc', 'Laagste bedrag']].map(([v, l]) => `<option value="${v}" ${v === h.sort ? 'selected' : ''}>${l}</option>`).join('')}
    </select>
    <label class="mini">Van<input type="date" id="h-from" data-change="hist" value="${h.from}"></label>
    <label class="mini">Tot<input type="date" id="h-to" data-change="hist" value="${h.to}"></label>
  </div>
  ${active ? `<button class="link small" data-act="h-reset">Filters wissen</button>` : ''}
  <div id="h-list"></div>`;
}
function filteredTx() {
  const h = UI.hist, q = h.q.trim().toLowerCase();
  const list = S.tx.filter((t) => {
    if (h.type !== 'all' && t.type !== h.type) return false;
    if (h.cat && t.categoryId !== h.cat) return false;
    if (h.from && t.date < h.from) return false;
    if (h.to && t.date > h.to) return false;
    if (q) {
      const c = cat(t.categoryId);
      const hay = `${t.description} ${t.notes || ''} ${t.subcategory || ''} ${c ? c.name : ''} ${fmtInput(t.amount)} ${fmtDate(t.date)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const bySort = {
    'date-desc': (a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0),
    'date-asc': (a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0),
    'amt-desc': (a, b) => b.amount - a.amount || b.date.localeCompare(a.date),
    'amt-asc': (a, b) => a.amount - b.amount || b.date.localeCompare(a.date)
  };
  return list.sort(bySort[h.sort]);
}
function txRow(t) {
  const c = catOrUnknown(t.categoryId);
  const tags = [t.subcategory ? esc(t.subcategory) : esc(c.name)];
  if (t.recurringId) tags.push('vast, herhaalt');
  else if (t.fixed) tags.push('vast');
  if (t.goalId) tags.push('spaardoel');
  if (t.type === 'expense' && t.paymentMethod === MEAL) tags.push('maaltijdcheques');
  return `<button class="row tx" data-act="tx-edit" data-id="${esc(t.id)}">${icon(c)}<div class="row-mid"><div class="row-t">${esc(t.description)}</div><div class="row-s">${tags.join(', ')}</div></div>
    <div class="row-a ${t.type === 'income' ? 'pos' : ''}">${t.type === 'income' ? '+' : '−'}${fmt(t.amount)}</div></button>`;
}
function fillHistory() {
  const el = $('#h-list'); if (!el) return;
  const list = filteredTx();
  if (!S.tx.length) { el.innerHTML = empty('Nog geen transacties', 'Tik op de plusknop om je eerste uitgave of inkomen toe te voegen.', `<button class="btn primary" data-act="add">Transactie toevoegen</button>`); return; }
  if (!list.length) { el.innerHTML = empty('Niets gevonden', 'Pas je zoekterm of filters aan.'); return; }
  const inc = sum(list.filter((t) => t.type === 'income'), (t) => t.amount), out = sum(list.filter((t) => t.type === 'expense'), (t) => t.amount);
  const shown = list.slice(0, UI.hist.limit);
  const byDate = UI.hist.sort.startsWith('date');
  let html = `<p class="muted small sumline">${list.length} transactie${list.length === 1 ? '' : 's'}, in ${fmt(inc)}, uit ${fmt(out)}</p><div class="card list">`;
  let last = '';
  for (const t of shown) {
    if (byDate && t.date !== last) { html += `<div class="day">${weekday(t.date)} ${fmtDate(t.date)}</div>`; last = t.date; }
    else if (!byDate) { /* datum in de regel tonen */ }
    html += byDate ? txRow(t) : txRow(t).replace('<div class="row-s">', `<div class="row-s">${fmtDate(t.date)}, `);
  }
  html += `</div>`;
  if (list.length > shown.length) html += `<button class="btn ghost block" data-act="h-more">Toon meer (${list.length - shown.length})</button>`;
  el.innerHTML = html;
}

/* =================== BUDGET & VASTE LASTEN =================== */
function renderBudget() {
  return seg('budgetSeg', [['budgets', 'Budgetten'], ['recurring', 'Vaste lasten & inkomen']], UI.budgetSeg) +
    (UI.budgetSeg === 'budgets' ? renderBudgets() : renderRecurring());
}
function renderBudgets() {
  const rows = budgetRows(UI.ym);
  const lim = sum(rows, (r) => r.b.limit), spent = sum(rows, (r) => r.spent);
  if (!rows.length) return monthSel(UI.ym, 'ym') + empty('Stel je eerste budget in', 'Kies een categorie en een maandbedrag, bv. Beauty € 100. Je ziet meteen hoeveel er nog over is.', `<button class="btn primary" data-act="budget-new">Budget toevoegen</button>`);
  return `${monthSel(UI.ym, 'ym')}
  <div class="card bsum">
    <div><span class="muted small">Budget</span><b>${fmt(lim)}</b></div>
    <div><span class="muted small">Uitgegeven</span><b>${fmt(spent)}</b></div>
    <div><span class="muted small">Over</span><b class="${lim - spent < 0 ? 'neg' : ''}">${fmt(lim - spent)}</b></div>
  </div>
  <div class="card list">
  ${rows.map((r) => `<button class="row budget ${r.state}" data-act="budget-edit" data-id="${r.c.id}">${icon(r.c)}<div class="row-mid">
      <div class="row-t2"><span>${esc(r.c.name)}</span><span>${fmt(r.spent)} <span class="muted">/ ${fmt(r.b.limit)}</span></span></div>
      ${bar(r.pct, STATE_COLOR[r.state])}
      <div class="row-s2"><span class="state">${STATE_TEXT[r.state]}, ${Math.round(r.pct)}%</span><span>${r.remaining >= 0 ? `nog ${fmt(r.remaining)}` : `${fmt(-r.remaining)} te veel`}</span></div>
    </div></button>`).join('')}
  </div>
  <button class="btn ghost block" data-act="budget-new">Budget toevoegen</button>
  <p class="muted small center">Wat je niet uitgeeft, schuift niet door naar volgende maand.</p>`;
}
function recRow(r) {
  const c = catOrUnknown(r.categoryId), next = r.active ? nextOccurrence(r) : null;
  const ended = r.endDate && r.endDate < todayISO();
  return `<button class="row ${r.active && !ended ? '' : 'dim'}" data-act="rec-edit" data-id="${r.id}">${icon(c)}<div class="row-mid"><div class="row-t">${esc(r.name)}</div>
    <div class="row-s">${FREQ[r.frequency]}${!r.active ? ', gepauzeerd' : ended ? ', beëindigd' : next ? `, volgende ${fmtDate(next)}` : ''}</div></div>
    <div class="row-a ${r.type === 'income' ? 'pos' : ''}">${fmt(r.amount)}${r.frequency !== 'monthly' ? `<div class="row-s">≈ ${fmt(Math.round(r.amount * FREQ_PER_MONTH[r.frequency]))}/maand</div>` : ''}</div></button>`;
}
function renderRecurring() {
  const today = todayISO();
  const live = S.rec.filter((r) => r.active && (!r.endDate || r.endDate >= today));
  const inc = S.rec.filter((r) => r.type === 'income').sort((a, b) => a.name.localeCompare(b.name));
  const exp = S.rec.filter((r) => r.type === 'expense').sort((a, b) => (a.startDate.slice(8) - b.startDate.slice(8)) || a.name.localeCompare(b.name));
  const mi = sum(live.filter((r) => r.type === 'income'), (r) => r.amount * FREQ_PER_MONTH[r.frequency]);
  const me = sum(live.filter((r) => r.type === 'expense'), (r) => r.amount * FREQ_PER_MONTH[r.frequency]);
  const upcoming = plannedBetween(addDaysISO(today, 1), addDaysISO(today, 30));
  return `
  <div class="card bsum">
    <div><span class="muted small">Vast inkomen</span><b>${fmt(Math.round(mi))}</b></div>
    <div><span class="muted small">Vaste lasten</span><b>${fmt(Math.round(me))}</b></div>
    <div><span class="muted small">Per maand over</span><b class="${mi - me < 0 ? 'neg' : ''}">${fmt(Math.round(mi - me))}</b></div>
  </div>
  <div class="card-h pad"><h3>Vaste lasten</h3><button class="link" data-act="rec-new" data-type="expense">Toevoegen</button></div>
  ${exp.length ? `<div class="card list">${exp.map(recRow).join('')}</div>` : `<p class="muted pad">Huur, energie, internet, verzekeringen, gsm, sportclub, abonnementen. Voeg ze één keer toe; de app boekt ze automatisch op de vervaldag.</p>`}
  <div class="card-h pad"><h3>Vast inkomen</h3><button class="link" data-act="rec-new" data-type="income">Toevoegen</button></div>
  ${inc.length ? `<div class="card list">${inc.map(recRow).join('')}</div>` : `<p class="muted pad">Voeg je maandsalaris toe. Vakantiegeld en 13de maand kun je als jaarlijkse betaling instellen of los registreren.</p>`}
  <div class="card-h pad"><h3>Komende 30 dagen</h3></div>
  ${upcoming.length ? `<div class="card list">${upcoming.map((p) => { const c = catOrUnknown(p.rec.categoryId); return `<div class="row">${icon(c, 'sm')}<div class="row-mid"><div class="row-t">${esc(p.rec.name)}</div><div class="row-s">${weekday(p.date)} ${fmtDate(p.date)}</div></div><div class="row-a ${p.rec.type === 'income' ? 'pos' : ''}">${p.rec.type === 'income' ? '+' : '−'}${fmt(p.rec.amount)}</div></div>`; }).join('')}</div>` : `<p class="muted pad">Niets gepland.</p>`}`;
}

/* =================== SPAREN =================== */
function renderSavings() {
  const goals = S.goals.slice().sort((a, b) => (a.targetDate || '9999').localeCompare(b.targetDate || '9999'));
  const goalHtml = goals.map((g) => {
    const s = goalStats(g);
    return `<section class="card goal">
      <div class="goal-h"><span class="goal-ic">${g.icon || '🐷'}</span><div class="row-mid"><h3>${esc(g.name)}</h3><div class="row-s">${g.targetDate ? `Doel: ${fmtDate(g.targetDate)}` : 'Geen einddatum'}</div></div>
        <button class="round sm" data-act="goal-edit" data-id="${g.id}" aria-label="Bewerken">⋯</button></div>
      <div class="goal-amt"><b>${fmt(s.saved)}</b> <span class="muted">van ${fmt(g.target)}</span><span class="goal-pct">${Math.round(s.pct)}%</span></div>
      ${bar(s.pct, 'linear-gradient(90deg,var(--lav),var(--rose))')}
      <div class="goal-facts">
        <div><span class="muted small">Nog nodig</span><b>${fmt(s.remaining)}</b></div>
        <div><span class="muted small">Per maand nodig</span><b>${s.suggested != null ? fmt(s.suggested) : '—'}</b></div>
        <div><span class="muted small">Klaar rond</span><b>${s.eta === 'done' ? 'Bereikt' : s.eta ? MONTHS_S[Number(s.eta.slice(5, 7)) - 1] + ' ' + s.eta.slice(0, 4) : '—'}</b></div>
      </div>
      ${s.eta && s.eta !== 'done' && g.targetDate && s.eta.slice(0, 7) > g.targetDate.slice(0, 7) ? `<p class="note warn">Aan dit tempo (${fmt(s.pace)}/maand) haal je de einddatum niet.</p>` : ''}
      ${!s.eta ? `<p class="muted small">Leg iets in of stel een vaste maandinleg in om een einddatum te berekenen.</p>` : ''}
      <div class="row-btns"><button class="btn soft" data-act="goal-move" data-id="${g.id}" data-dir="in">Inleggen</button><button class="btn ghost" data-act="goal-move" data-id="${g.id}" data-dir="out">Opnemen</button></div>
    </section>`;
  }).join('');
  return `
  <div class="card savtop"><div><span class="muted small">Totaal gespaard</span><div class="big">${fmt(totalSavings())}</div></div><button class="btn primary" data-act="goal-new">Nieuw doel</button></div>
  ${goals.length ? goalHtml : empty('Nog geen spaardoelen', 'Bijvoorbeeld een reis, een noodfonds van drie maanden kosten of een nieuwe garderobe.', '')}
  <section class="card" id="calc">
    <div class="card-h"><h3>Spaarcalculator</h3></div>
    <p class="muted small">Berekend met je geregistreerde inkomsten en uitgaven.</p>
    <div id="calc-base"></div>
    <label class="field"><span>Extra geplande uitgaven per maand</span><input class="calc-in" data-k="planned" inputmode="decimal" placeholder="0,00" value="${UI.calc.planned ? fmtInput(UI.calc.planned) : ''}"></label>

    <h4>Hoeveel moet ik per maand sparen?</h4>
    <div class="two"><label class="field"><span>Doelbedrag</span><input class="calc-in" data-k="target" inputmode="decimal" value="${fmtInput(UI.calc.target)}"></label>
    <label class="field"><span>Aantal maanden</span><input class="calc-in" data-k="months" inputmode="numeric" value="${UI.calc.months}"></label></div>
    <div class="calc-out" id="calc-1"></div>

    <h4>Wat als ik een budget verlaag?</h4>
    <div class="two">${S.budgets.length ? `<label class="field"><span>Budget</span><select class="calc-in" data-k="reduceCat"><option value="">Algemeen</option>${budgetRows(thisYM()).map((r) => `<option value="${r.c.id}" ${UI.calc.reduceCat === r.c.id ? 'selected' : ''}>${esc(r.c.name)} (${fmt(r.b.limit)})</option>`).join('')}</select></label>` : ''}
    <label class="field"><span>Minder per maand</span><input class="calc-in" data-k="reduce" inputmode="decimal" value="${fmtInput(UI.calc.reduce)}"></label></div>
    <div class="calc-out" id="calc-2"></div>

    <h4>Hoeveel heb ik eind ${thisYM().slice(0, 4)}?</h4>
    <div class="calc-out" id="calc-3"></div>
  </section>`;
}
function fillCalc() {
  if (!$('#calc-base')) return;
  const c = UI.calc, p = savingsPotential(c.planned), can = Math.max(0, p.potential);
  $('#calc-base').innerHTML = `<div class="calc-table">
    <div><span>Inkomen per maand<small>${p.incomeSrc}</small></span><b>${fmt(p.income)}</b></div>
    <div><span>Vaste lasten</span><b>− ${fmt(p.fixed)}</b></div>
    <div><span>Variabele uitgaven<small>${p.varSrc}</small></span><b>− ${fmt(p.variable)}</b></div>
    ${p.planned ? `<div><span>Extra gepland</span><b>− ${fmt(p.planned)}</b></div>` : ''}
    <div class="total"><span>Mogelijk te sparen per maand</span><b class="${p.potential < 0 ? 'neg' : ''}">${fmt(p.potential)}</b></div>
    ${p.extra ? `<div><span>Extra inkomen, gespreid per maand<small>vakantiegeld, 13de maand, bonus…</small></span><b>+ ${fmt(p.extra)}</b></div>` : ''}
  </div>
  ${p.potential < 0 ? `<p class="note alert">Je uitgaven liggen hoger dan je inkomen. Er is nu niets over om te sparen; bekijk je budgetten en vaste lasten.</p>` : ''}
  ${p.recSavings ? `<p class="muted small">Hiervan zet je al ${fmt(p.recSavings)} per maand automatisch opzij.</p>` : ''}
  ${!p.income ? `<p class="note">Voeg je maandinkomen toe onder <button class="link" data-act="budget-seg" data-v="recurring">vast inkomen</button> voor een betrouwbare berekening.</p>` : ''}`;

  const months = Math.max(1, Math.round(c.months || 1));
  const need = Math.ceil(c.target / months);
  let r1 = `<div class="res">${fmt(need)} <span>per maand</span></div>`;
  if (!c.target) r1 = `<p class="muted small">Vul een doelbedrag in.</p>`;
  else if (need <= can) r1 += `<p class="muted small">Haalbaar: dat is ${can ? Math.round(need / can * 100) : 0}% van wat je maandelijks kunt sparen.</p>`;
  else r1 += `<p class="note warn">Niet haalbaar met je huidige cijfers. Je kunt ongeveer ${fmt(can)} per maand opzij zetten${can ? `, dan duurt het ${Math.ceil(c.target / can)} maanden` : ''}.</p>`;
  $('#calc-1').innerHTML = r1;

  const b = c.reduceCat ? S.budgets.find((x) => x.categoryId === c.reduceCat) : null;
  const red = b ? Math.min(c.reduce, b.limit) : c.reduce;
  $('#calc-2').innerHTML = `<div class="res">${fmt(can + red)} <span>per maand te sparen</span></div>
    <p class="muted small">Dat is ${fmt(red * 12)} extra per jaar${b ? `. Je budget voor ${esc(catOrUnknown(b.categoryId).name)} wordt ${fmt(b.limit - red)}` : ''}.${p.potential < 0 ? ' Je uitgaven blijven dan nog altijd hoger dan je inkomen.' : ''}</p>`;

  const m = Number(thisYM().slice(5)), left = 12 - m + 1;
  const extraLeft = sum(plannedBetween(addDaysISO(todayISO(), 1), `${thisYM().slice(0, 4)}-12-31`).filter((x) => x.rec.type === 'income' && isExtraIncome(x.rec)), (x) => x.rec.amount);
  const end = totalSavings() + can * left;
  $('#calc-3').innerHTML = `<div class="res">${fmt(end)}</div>
    <p class="muted small">Nu gespaard ${fmt(totalSavings())}, plus ${fmt(can)} per maand gedurende ${left} maand${left > 1 ? 'en' : ''} (deze maand inbegrepen).${extraLeft ? ` Met het extra inkomen dat dit jaar nog gepland staat, kan het ${fmt(end + extraLeft)} worden.` : ''}</p>`;
}

/* =================== RAPPORTEN =================== */
function renderReports() {
  return seg('reportSeg', [['month', 'Maand'], ['year', 'Jaar']], UI.reportSeg) + (UI.reportSeg === 'month' ? reportMonth() : reportYear());
}
function catBreakdown(byCat, total) {
  const cats = Object.entries(byCat).map(([id, val]) => ({ c: catOrUnknown(id), val })).sort((a, b) => b.val - a.val);
  if (!cats.length) return `<p class="muted">Geen uitgaven in deze periode.</p>`;
  return `<div class="donut-wrap">${Charts.donut(cats.map((x) => ({ value: x.val, color: x.c.color })), { label: 'totaal', value: fmt(total) })}</div>
    <div class="toplist">${cats.map((x) => `<div class="tl-row">${icon(x.c, 'sm')}<div class="tl-mid"><div class="tl-name"><span>${esc(x.c.name)}</span><span>${fmt(x.val)} <span class="muted">${Math.round(x.val / total * 100)}%</span></span></div>${bar(x.val / total * 100, x.c.color)}</div></div>`).join('')}</div>`;
}
function reportMonth() {
  const v = monthView(UI.ym), rows = budgetRows(UI.ym);
  const fv = v.fixed + v.variable;
  return `${monthSel(UI.ym, 'ym')}
  <div class="kpis">
    ${kpi('Inkomsten', fmt(v.income), v.pIncome ? `waarvan ${fmt(v.pIncome)} verwacht` : `extra: ${fmt(v.extraIncome)}`, 'in')}
    ${kpi('Uitgaven', fmt(v.spending), v.pSpending ? `waarvan ${fmt(v.pSpending)} gepland` : 'zonder spaargeld', 'out')}
    ${kpi('Netto', fmt(v.net), 'inkomsten min uitgaven', v.net < 0 ? 'neg' : '')}
    ${kpi('Gespaard', fmt(v.savings), `over: ${fmt(v.left)}`, 'sav')}
  </div>
  <section class="card"><div class="card-h"><h3>Uitgaven per categorie</h3></div>${catBreakdown(v.byCat, v.spending)}</section>
  <section class="card"><div class="card-h"><h3>Vaste en variabele uitgaven</h3></div>
    <div class="fv"><div class="tl-name"><span>Vast</span><span>${fmt(v.fixed)}</span></div>${bar(fv ? v.fixed / fv * 100 : 0, 'var(--lav)')}</div>
    <div class="fv"><div class="tl-name"><span>Variabel</span><span>${fmt(v.variable)}</span></div>${bar(fv ? v.variable / fv * 100 : 0, 'var(--rose)')}</div>
  </section>
  <section class="card"><div class="card-h"><h3>Budgetten</h3></div>
    ${rows.length ? rows.map((r) => `<div class="fv"><div class="tl-name"><span>${r.c.icon} ${esc(r.c.name)}</span><span>${fmt(r.spent)} <span class="muted">/ ${fmt(r.b.limit)}</span></span></div>${bar(r.pct, STATE_COLOR[r.state])}</div>`).join('')
      : `<p class="muted">Nog geen budgetten. <button class="link" data-act="budget-new">Budget toevoegen</button></p>`}
  </section>`;
}
function reportYear() {
  const y = UI.year, yv = yearView(y), curY = Number(thisYM().slice(0, 4)), curM = Number(thisYM().slice(5));
  const upto = y < curY ? 12 : y > curY ? 12 : curM;
  const firstIdx = yv.months.findIndex((m) => m.count > 0 || m.planned.length > 0);
  const considered = firstIdx < 0 ? [] : yv.months.map((m, i) => ({ m, i })).slice(firstIdx, Math.max(firstIdx + 1, upto));
  const avgSpend = considered.length ? sum(considered, (x) => x.m.spending) / considered.length : 0;
  const avgReg = considered.length ? sum(considered, (x) => x.m.regIncome) / considered.length : 0;
  const withData = considered.filter((x) => x.m.spending > 0);
  const hi = withData.length ? withData.reduce((a, b) => (b.m.spending > a.m.spending ? b : a)) : null;
  const lo = withData.length ? withData.reduce((a, b) => (b.m.spending < a.m.spending ? b : a)) : null;
  let cum = 0; const cumVals = yv.months.map((m) => (cum += m.income - m.spending));
  return `${yearSel(y)}
  <div class="kpis">
    ${kpi('Inkomsten', fmt(yv.income), yv.pIncome ? `waarvan ${fmt(yv.pIncome)} nog verwacht` : 'heel het jaar', 'in')}
    ${kpi('Uitgaven', fmt(yv.spending), yv.pSpending ? `waarvan ${fmt(yv.pSpending)} gepland` : 'zonder spaargeld', 'out')}
    ${kpi('Gespaard', fmt(yv.savings), `over: ${fmt(yv.income - yv.spending - yv.savings)}`, 'sav')}
    ${kpi('Gem. uitgaven', fmt(Math.round(avgSpend)), `per maand, over ${considered.length} maand${considered.length === 1 ? '' : 'en'}`)}
  </div>
  <section class="card"><div class="card-h"><h3>Inkomen</h3></div>
    <div class="calc-table">
      <div><span>Gemiddeld maandinkomen<small>regulier, zonder extra's</small></span><b>${fmt(Math.round(avgReg))}</b></div>
      <div><span>Regulier jaarinkomen</span><b>${fmt(yv.reg)}</b></div>
      <div><span>Extra jaarinkomen<small>vakantiegeld, 13de maand, bonus…</small></span><b>${fmt(yv.extra)}</b></div>
      <div class="total"><span>Totaal jaarinkomen</span><b>${fmt(yv.income)}</b></div>
    </div></section>
  <section class="card"><div class="card-h"><h3>Inkomsten en uitgaven per maand</h3></div>
    ${Charts.bars(MONTHS_S.map((m) => m.slice(0, 1).toUpperCase() + m.slice(1, 3)), [{ name: 'Inkomsten', color: 'var(--lav)', values: yv.months.map((m) => m.income) }, { name: 'Uitgaven', color: 'var(--rose)', values: yv.months.map((m) => m.spending) }], { highlight: y === curY ? curM - 1 : -1 })}
    <div class="legend"><span><i style="background:var(--lav)"></i>Inkomsten</span><span><i style="background:var(--rose)"></i>Uitgaven</span></div>
    <div class="hilo">${hi && withData.length > 1 ? `<div><span class="muted small">Duurste maand</span><b>${MONTHS[hi.i]}</b><span>${fmt(hi.m.spending)}</span></div><div><span class="muted small">Zuinigste maand</span><b>${MONTHS[lo.i]}</b><span>${fmt(lo.m.spending)}</span></div>` : ''}</div>
  </section>
  <section class="card"><div class="card-h"><h3>Opgebouwd overschot</h3></div>
    <p class="muted small">Inkomsten min uitgaven, opgeteld sinds januari. Wat je spaart zit hierin.</p>
    ${Charts.line(MONTHS_S.map((m) => m.slice(0, 1).toUpperCase() + m.slice(1, 3)), cumVals, { color: '#A8656F' })}
  </section>
  <section class="card"><div class="card-h"><h3>Uitgaven per categorie</h3></div>${catBreakdown(yv.byCat, yv.spending)}</section>
  <section class="card"><div class="card-h"><h3>Maanden vergeleken</h3></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Maand</th><th>In</th><th>Uit</th><th>Gespaard</th><th>Over</th></tr></thead><tbody>
    ${yv.months.map((m, i) => `<tr class="${y === curY && i === curM - 1 ? 'cur' : ''}"><td>${MONTHS_S[i]}</td><td>${fmtShort(m.income)}</td><td>${fmtShort(m.spending)}</td><td>${fmtShort(m.savings)}</td><td class="${m.left < 0 ? 'neg' : ''}">${fmtShort(m.left)}</td></tr>`).join('')}
    </tbody></table></div></section>`;
}

/* =================== INSTELLINGEN =================== */
function renderSettings() {
  const incRec = S.rec.filter((r) => r.type === 'income' && r.active);
  return `
  <section class="card set">
    <h3>Algemeen</h3>
    <label class="field"><span>Je naam (voor de begroeting)</span><input data-set="userName" maxlength="30" value="${esc(S.settings.userName || '')}" placeholder="Optioneel"></label>
    <label class="field"><span>Munteenheid</span><select data-set="currency">${['EUR', 'USD', 'GBP', 'CHF'].map((c) => `<option ${c === (S.settings.currency || 'EUR') ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="field"><span>Taal</span><select data-set="language"><option value="nl" selected>Nederlands</option></select></label>
    <label class="field"><span>Startsaldo op je rekening</span><input data-set="startBalance" inputmode="decimal" value="${S.settings.startBalance ? (S.settings.startBalance < 0 ? '-' : '') + fmtInput(Math.abs(S.settings.startBalance)) : ''}" placeholder="0,00"><small>Het saldo op het moment dat je met de app begon. Een minteken mag.</small></label>
  </section>
  <section class="card set">
    <h3>Maandinkomen</h3>
    ${incRec.length ? `<div class="list">${incRec.map(recRow).join('')}</div>` : `<p class="muted">Nog geen vast inkomen ingesteld.</p>`}
    <button class="btn soft block" data-act="rec-new" data-type="income" data-cat="i_salary">Vast inkomen toevoegen</button>
  </section>
  <section class="card set">
    <h3>Snel toevoegen</h3>
    <button type="button" class="switch ${S.settings.quickAddOnOpen ? 'on' : ''}" data-act="toggle-quick"><span>Openen met nieuwe uitgave</span><i></i></button>
    <p class="muted small">Bij elk openen van de app verschijnt meteen het scherm om een uitgave toe te voegen, met je resterende budget en spaargeld erboven. Veeg omlaag of tik op ✕ om naar het overzicht te gaan.</p>
    <details class="howto"><summary>Openen door 3× op de achterkant van je iPhone te tikken</summary>
      <ol>
        <li>Open de app <b>Opdrachten</b> en tik op <b>+</b>.</li>
        <li>Zoek de actie <b>Open app</b>, tik op <b>App</b> en kies <b>Mijn Budget</b>.</li>
        <li>Geef de opdracht de naam <b>Uitgave toevoegen</b> en tik op Gereed.</li>
        <li>Ga naar <b>Instellingen › Toegankelijkheid › Aanraken › Tik op achterkant › Tik drie keer</b> en kies <b>Uitgave toevoegen</b>.</li>
        <li>Zet hierboven <b>Openen met nieuwe uitgave</b> aan.</li>
      </ol>
      <p class="muted small">Dezelfde opdracht kun je ook als knop toevoegen aan je beginscherm (widget Opdrachten) of aan het bedieningspaneel.</p>
    </details>
  </section>
  <section class="card set links">
    <button class="link-row" data-act="budget-seg" data-v="recurring"><span>Vaste lasten & inkomen</span><span>›</span></button>
    <button class="link-row" data-act="budget-seg" data-v="budgets"><span>Maandbudgetten</span><span>›</span></button>
    <button class="link-row" data-act="nav" data-v="categories"><span>Categorieën</span><span>›</span></button>
    <button class="link-row" data-act="nav" data-v="backup"><span>Mijn gegevens & back-up</span><span>›</span></button>
  </section>
  <section class="card set">
    <h3>Privacy</h3>
    <p>Al je gegevens staan alleen op deze iPhone, in de app zelf. Er is geen account, geen cloud, geen tracking en geen reclame. De app stuurt nooit financiële gegevens naar een server.</p>
    <p class="muted small">Lokale opslag is geen gegarandeerde back-up: als je de app van je beginscherm verwijdert of websitegegevens wist in Safari, zijn je gegevens weg. Maak dus regelmatig een back-up.</p>
  </section>
  <section class="card set">
    <h3>Over de app</h3>
    <p class="muted small">Mijn Budget, versie ${APP_VERSION}. Werkt offline. Database-versie ${DB.VERSION}.</p>
    <p class="muted small" id="storage-info"></p>
  </section>
  <section class="card set danger">
    <h3>Alles wissen</h3>
    <p class="muted small">Verwijdert alle transacties, budgetten, spaardoelen en instellingen van dit toestel. Maak eerst een back-up.</p>
    <button class="btn danger block" data-act="reset">Alle gegevens wissen</button>
  </section>`;
}
async function fillStorageInfo() {
  const el = $('#storage-info'); if (!el) return;
  let txt = `${S.tx.length} transacties opgeslagen.`;
  try {
    if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); if (e.usage != null) txt += ` Gebruikt: ${(e.usage / 1024 / 1024).toFixed(1).replace('.', ',')} MB.`; }
    if (navigator.storage && navigator.storage.persisted) { const p = await navigator.storage.persisted(); txt += p ? ' Opslag is als blijvend gemarkeerd.' : ''; }
  } catch (_) {}
  el.textContent = txt;
}

/* =================== CATEGORIEËN =================== */
function renderCategories() {
  const list = catsOf(UI.catSeg);
  return `${seg('catSeg', [['expense', 'Uitgaven'], ['income', 'Inkomsten']], UI.catSeg)}
  <div class="card list">${list.map((c) => `<button class="row" data-act="cat-edit" data-id="${c.id}">${icon(c)}<div class="row-mid"><div class="row-t">${esc(c.name)}</div><div class="row-s">${c.kind === 'expense' ? `${c.subs.length} subcategorie${c.subs.length === 1 ? '' : 'ën'}` : c.extra ? 'Extra inkomen, niet elke maand' : 'Regulier inkomen'}</div></div><span class="chev">›</span></button>`).join('')}</div>
  <button class="btn ghost block" data-act="cat-new">Nieuwe categorie</button>`;
}

/* =================== GEGEVENS & BACK-UP =================== */
function renderBackup() {
  const lb = S.settings.lastBackup;
  return `
  <section class="card">
    <h3>Laatste back-up</h3>
    <p class="big2">${lb ? `${fmtDate(lb.slice(0, 10))} om ${lb.slice(11, 16)}` : 'Nog geen back-up gemaakt'}</p>
    <p class="note">Je gegevens staan alleen op deze iPhone. Als je de app van je beginscherm verwijdert of in Safari de websitegegevens wist, ben je ze kwijt. Bewaar daarom regelmatig een back-up in Bestanden of iCloud Drive.</p>
    <button class="btn primary block" data-act="export-json">Back-up maken</button>
    <p class="muted small">Kies daarna “Bewaar in Bestanden”. Het bestand bevat al je transacties, categorieën, budgetten, vaste lasten en spaardoelen.</p>
  </section>
  <section class="card">
    <h3>Back-up terugzetten</h3>
    <p class="muted small">Kies een eerder bewaard back-upbestand (.json). Je krijgt eerst te zien wat erin zit en kiest dan of je bestaande gegevens behoudt.</p>
    <button class="btn soft block" data-act="import">Back-upbestand kiezen</button>
  </section>
  <section class="card">
    <h3>Exporteren naar Excel</h3>
    <p class="muted small">Alle transacties als CSV-bestand, met puntkomma's en komma als decimaalteken, zodat Excel het meteen goed opent.</p>
    <button class="btn ghost block" data-act="export-csv">CSV exporteren</button>
  </section>`;
}

/* =================== SHEET & DIALOOG =================== */
function openSheet(html) {
  const b = $('#sheet');
  $('#sheet-body').innerHTML = html;
  $('#sheet .sheet').scrollTop = 0;
  b.hidden = false;
  requestAnimationFrame(() => b.classList.add('open'));
  document.body.classList.add('noscroll');
}
function setSheet(html) { $('#sheet-body').innerHTML = html; }
function closeSheet() {
  const b = $('#sheet');
  b.classList.remove('open');
  document.body.classList.remove('noscroll');
  F = null;
  setTimeout(() => { if (!b.classList.contains('open')) { b.hidden = true; $('#sheet-body').innerHTML = ''; } }, 260);
}
function sheetHead(title) { return `<div class="sheet-head"><h2>${title}</h2><button class="round" data-act="close" aria-label="Sluiten">✕</button></div>`; }
function confirmDialog({ title, msg, ok = 'Bevestigen', danger = false, requireText = '' }) {
  return new Promise((resolve) => {
    const d = $('#dialog');
    $('#dlg-title').textContent = title;
    $('#dlg-msg').textContent = msg;
    const inp = $('#dlg-input'), okb = $('#dlg-ok');
    inp.hidden = !requireText; inp.value = ''; inp.placeholder = requireText ? `Typ ${requireText}` : '';
    okb.textContent = ok; okb.className = `btn ${danger ? 'danger' : 'primary'}`;
    okb.disabled = !!requireText;
    inp.oninput = () => { okb.disabled = inp.value.trim().toUpperCase() !== requireText; };
    d.hidden = false;
    const finish = (v) => { d.hidden = true; okb.onclick = null; $('#dlg-cancel').onclick = null; resolve(v); };
    okb.onclick = () => finish(true);
    $('#dlg-cancel').onclick = () => finish(false);
  });
}
function formErr(msg) { const e = $('#f-err'); if (e) { e.textContent = msg; e.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
function val(id) { const el = document.getElementById(id); return el ? el.value : undefined; }

/* =================== FORMULIER: TRANSACTIE =================== */
function openTxForm(t = null, opts = {}) {
  const dup = !!opts.duplicate;
  F = {
    kind: 'tx', id: t && !dup ? t.id : null, type: (t && t.type) || opts.type || 'expense',
    amount: t ? fmtInput(t.amount) : '', categoryId: (t && t.categoryId) || '', subcategory: (t && t.subcategory) || '',
    description: (t && t.description) || '', date: !t || dup ? todayISO() : t.date, fixed: t ? !!t.fixed : false,
    paymentMethod: (t && t.paymentMethod) || '', notes: (t && t.notes) || '', repeat: false, frequency: 'monthly', endDate: '',
    recurringId: t && !dup ? t.recurringId || null : null, goalId: t && !dup ? t.goalId || null : null,
    createdAt: t && !dup ? t.createdAt : null, more: !!(t && (t.notes || t.paymentMethod || t.fixed))
  };
  openSheet(txFormHTML());
}
function txFormHTML() {
  const cats = catsOf(F.type), c = cat(F.categoryId);
  const more = F.more ? `
    ${F.type === 'expense' ? `<div class="field-label">Soort uitgave</div><div class="seg">
      <button class="${!F.fixed ? 'on' : ''}" data-act="f-fixed" data-v="0">Variabel</button><button class="${F.fixed ? 'on' : ''}" data-act="f-fixed" data-v="1">Vast</button></div>` : ''}
    <label class="field"><span>Betaalmethode</span><select id="f-pay"><option value="">Niet opgegeven</option>${PAY.map((p) => `<option ${p === F.paymentMethod ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
    <label class="field"><span>Notities</span><textarea id="f-notes" rows="2" maxlength="500">${esc(F.notes)}</textarea></label>
    ${!F.id ? `<button type="button" class="switch ${F.repeat ? 'on' : ''}" data-act="f-repeat"><span>Herhaalt automatisch</span><i></i></button>
      ${F.repeat ? `<div class="two"><label class="field"><span>Hoe vaak</span><select id="f-freq">${Object.entries(FREQ).map(([k, l]) => `<option value="${k}" ${k === F.frequency ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Einddatum (optioneel)</span><input type="date" id="f-end" value="${F.endDate}"></label></div>
      <p class="muted small">De eerste betaling is op de gekozen datum. Daarna boekt de app elke vervaldag automatisch, zonder dubbels.</p>` : ''}` : ''}` : '';
  return `${sheetHead(F.id ? 'Transactie bewerken' : 'Nieuwe transactie')}
    ${!F.id ? quickStrip() : ''}
    ${F.goalId ? `<p class="note">Deze transactie hoort bij een spaardoel.</p>` : ''}
    ${F.recurringId ? `<p class="note">Automatisch geboekt vanuit een vaste ${F.type === 'income' ? 'inkomst' : 'last'}. Wijzigingen gelden alleen voor deze ene keer.</p>` : ''}
    <div class="seg"><button class="${F.type === 'expense' ? 'on' : ''}" data-act="f-type" data-v="expense">Uitgave</button><button class="${F.type === 'income' ? 'on' : ''}" data-act="f-type" data-v="income">Inkomen</button></div>
    <label class="amount-field"><span>${curSym()}</span><input id="f-amount" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(F.amount)}" aria-label="Bedrag"></label>
    <div class="field-label">Categorie</div>
    <div class="chips">${cats.map((x) => `<button type="button" class="chip ${x.id === F.categoryId ? 'sel' : ''}" data-act="f-cat" data-id="${x.id}">${icon(x, 'xs')}${esc(x.name)}</button>`).join('')}</div>
    ${c && c.subs.length ? `<div class="field-label">Subcategorie</div><div class="chips small">${c.subs.map((s) => `<button type="button" class="chip ${s === F.subcategory ? 'sel' : ''}" data-act="f-sub" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
    ${F.type === 'expense' && F.categoryId === 'c_food' ? `<button type="button" class="switch ${F.paymentMethod === MEAL ? 'on' : ''}" data-act="f-meal"><span>🍽️ Betaald met maaltijdcheques</span><i></i></button>` : ''}
    <label class="field"><span>Omschrijving</span><input id="f-desc" maxlength="80" autocomplete="off" placeholder="${esc(F.subcategory || (c && c.name) || 'Bv. kapper')}" value="${esc(F.description)}"></label>
    <label class="field"><span>Datum</span><input id="f-date" type="date" value="${F.date}"></label>
    <button type="button" class="more" data-act="f-more">${F.more ? 'Minder details' : 'Meer details'}</button>
    ${more}
    <div class="form-err" id="f-err" role="alert"></div>
    <button class="btn primary block" data-act="f-save">${F.id ? 'Wijzigingen bewaren' : F.repeat ? 'Herhaling instellen' : 'Toevoegen'}</button>
    ${F.id ? `<div class="row-btns"><button class="btn ghost" data-act="f-dup">Dupliceren</button><button class="btn danger-ghost" data-act="f-del">Verwijderen</button></div>` : ''}`;
}
function quickStrip() {
  const q = quickStats();
  const b = (v) => `<b class="${v < 0 ? 'neg' : ''}">${fmt(v)}</b>`;
  return `<div class="qstrip">
    <div><span>Budget over, ${MONTHS[Number(thisYM().slice(5)) - 1]}</span>${q.hasBudget ? b(q.monthLeft) : '<b class="muted">geen budget</b>'}</div>
    <div><span>Budget over, ${thisYM().slice(0, 4)}</span>${q.hasBudget ? b(q.yearLeft) : '<b class="muted">geen budget</b>'}</div>
    <div><span>Gespaard deze maand</span>${b(q.savedMonth)}</div>
    <div><span>Gespaard, 12 maanden</span>${b(q.savedYear)}</div>
  </div>`;
}
function syncTx() {
  if (!F) return;
  const m = { amount: 'f-amount', description: 'f-desc', date: 'f-date', paymentMethod: 'f-pay', notes: 'f-notes', frequency: 'f-freq', endDate: 'f-end' };
  for (const [k, id] of Object.entries(m)) { const v = val(id); if (v !== undefined) F[k] = v; }
}
async function saveTxForm() {
  syncTx();
  const amount = parseAmount(F.amount);
  if (!(amount > 0)) return formErr('Vul een bedrag groter dan 0 in, bijvoorbeeld 35 of 12,50.');
  if (amount > 10000000000) return formErr('Dit bedrag is te groot.');
  const c = cat(F.categoryId);
  if (!c || c.kind !== F.type) return formErr('Kies een categorie.');
  if (!isValidISO(F.date)) return formErr('Kies een geldige datum.');
  const desc = (F.description.trim() || F.subcategory || c.name).slice(0, 80);
  if (!F.id && F.repeat) {
    if (F.endDate && !isValidISO(F.endDate)) return formErr('Kies een geldige einddatum.');
    if (F.endDate && F.endDate < F.date) return formErr('De einddatum ligt vóór de eerste betaling.');
    const r = { id: uid(), type: F.type, name: desc, amount, frequency: F.frequency, startDate: F.date, endDate: F.endDate || '', categoryId: c.id, subcategory: F.subcategory, paymentMethod: F.paymentMethod || '', active: true, generatedUntil: null, createdAt: Date.now() };
    await saveRec(r);
    closeSheet(); toast('Herhaling ingesteld'); render(); return;
  }
  const t = {
    id: F.id || uid(), type: F.type, description: desc, amount, date: F.date, categoryId: c.id, subcategory: F.subcategory,
    fixed: F.type === 'expense' ? !!F.fixed : false, paymentMethod: F.paymentMethod || '', notes: (F.notes || '').trim().slice(0, 500),
    recurringId: F.recurringId || null, goalId: F.goalId || null, createdAt: F.createdAt || Date.now(), updatedAt: Date.now()
  };
  const wasEdit = !!F.id;
  await saveTx(t);
  closeSheet(); toast(wasEdit ? 'Wijzigingen bewaard' : (t.type === 'income' ? 'Inkomen toegevoegd' : 'Uitgave toegevoegd')); render();
}

/* =================== FORMULIER: VASTE LAST / INKOMEN =================== */
function openRecForm(r = null, opts = {}) {
  const type = (r && r.type) || opts.type || 'expense';
  F = r ? { kind: 'rec', ...r, amount: fmtInput(r.amount), isNew: false }
    : { kind: 'rec', isNew: true, id: uid(), type, name: '', amount: '', frequency: 'monthly', startDate: todayISO(), endDate: '', categoryId: opts.cat || (type === 'income' ? 'i_salary' : ''), subcategory: '', paymentMethod: '', active: true, generatedUntil: null, createdAt: Date.now() };
  openSheet(recFormHTML());
}
function recFormHTML() {
  const c = cat(F.categoryId);
  return `${sheetHead(F.isNew ? (F.type === 'income' ? 'Vast inkomen' : 'Vaste last') : 'Herhaling bewerken')}
    ${F.isNew ? `<div class="seg"><button class="${F.type === 'expense' ? 'on' : ''}" data-act="r-type" data-v="expense">Vaste last</button><button class="${F.type === 'income' ? 'on' : ''}" data-act="r-type" data-v="income">Vast inkomen</button></div>` : ''}
    <label class="field"><span>Naam</span><input id="r-name" maxlength="80" value="${esc(F.name)}" placeholder="${F.type === 'income' ? 'Bv. Salaris' : 'Bv. Huur'}"></label>
    <label class="amount-field"><span>${curSym()}</span><input id="r-amount" inputmode="decimal" placeholder="0,00" value="${esc(F.amount)}" aria-label="Bedrag"></label>
    <div class="two"><label class="field"><span>Hoe vaak</span><select id="r-freq">${Object.entries(FREQ).map(([k, l]) => `<option value="${k}" ${k === F.frequency ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field"><span>${F.isNew ? 'Eerste betaling' : 'Startdatum'}</span><input type="date" id="r-start" value="${F.startDate}"></label></div>
    <label class="field"><span>Einddatum (optioneel)</span><input type="date" id="r-end" value="${F.endDate || ''}"></label>
    <label class="field"><span>Categorie</span><select id="r-cat" data-change="rcat"><option value="">Kies…</option>${catOptions(F.categoryId, { kinds: [F.type] })}</select></label>
    ${c && c.subs.length ? `<label class="field"><span>Subcategorie</span><select id="r-sub"><option value="">Geen</option>${c.subs.map((s) => `<option ${s === F.subcategory ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>` : ''}
    ${F.type === 'expense' ? `<label class="field"><span>Betaalmethode</span><select id="r-pay"><option value="">Niet opgegeven</option>${PAY.map((p) => `<option ${p === F.paymentMethod ? 'selected' : ''}>${p}</option>`).join('')}</select></label>` : ''}
    ${!F.isNew ? `<button type="button" class="switch ${F.active ? 'on' : ''}" data-act="r-active"><span>Actief</span><i></i></button>
      <p class="muted small">Wijzigingen gelden voor de volgende betalingen. Eerder geboekte betalingen blijven ongewijzigd.</p>` : `<p class="muted small">Ligt de eerste betaling in het verleden? Dan worden de gemiste betalingen tot vandaag meteen geboekt.</p>`}
    <div class="form-err" id="f-err" role="alert"></div>
    <button class="btn primary block" data-act="r-save">${F.isNew ? 'Toevoegen' : 'Wijzigingen bewaren'}</button>
    ${!F.isNew ? `<button class="btn danger-ghost block" data-act="r-del">Verwijderen</button>` : ''}`;
}
function syncRec() {
  const m = { name: 'r-name', amount: 'r-amount', frequency: 'r-freq', startDate: 'r-start', endDate: 'r-end', categoryId: 'r-cat', subcategory: 'r-sub', paymentMethod: 'r-pay' };
  for (const [k, id] of Object.entries(m)) { const v = val(id); if (v !== undefined) F[k] = v; }
}
async function saveRecForm() {
  syncRec();
  const amount = parseAmount(F.amount);
  const c = cat(F.categoryId);
  if (!F.name.trim() && !c) return formErr('Geef een naam en kies een categorie.');
  if (!(amount > 0)) return formErr('Vul een bedrag groter dan 0 in.');
  if (!c || c.kind !== F.type) return formErr('Kies een categorie.');
  if (!isValidISO(F.startDate)) return formErr('Kies een geldige datum voor de eerste betaling.');
  if (F.endDate && !isValidISO(F.endDate)) return formErr('Kies een geldige einddatum.');
  if (F.endDate && F.endDate < F.startDate) return formErr('De einddatum ligt vóór de startdatum.');
  const r = { id: F.id, type: F.type, name: (F.name.trim() || F.subcategory || c.name).slice(0, 80), amount, frequency: F.frequency, startDate: F.startDate, endDate: F.endDate || '', categoryId: c.id, subcategory: F.subcategory || '', paymentMethod: F.type === 'expense' ? F.paymentMethod || '' : '', active: !!F.active, generatedUntil: F.generatedUntil || null, createdAt: F.createdAt || Date.now(), updatedAt: Date.now() };
  const isNew = F.isNew;
  const before = S.tx.length;
  await saveRec(r);
  const added = S.tx.length - before;
  closeSheet(); toast(isNew ? (added > 1 ? `Toegevoegd, ${added} betalingen geboekt` : 'Toegevoegd') : 'Wijzigingen bewaard'); render();
}

/* =================== FORMULIER: BUDGET =================== */
function openBudgetForm(cid = null) {
  const b = cid ? S.budgets.find((x) => x.categoryId === cid) : null;
  F = { kind: 'budget', isNew: !b, categoryId: cid || '', limit: b ? fmtInput(b.limit) : '' };
  const used = new Set(S.budgets.map((x) => x.categoryId));
  const opts = catsOf('expense').filter((c) => !used.has(c.id) || c.id === cid);
  const c = cat(cid);
  openSheet(`${sheetHead(b ? `Budget ${esc(c ? c.name : '')}` : 'Nieuw budget')}
    ${b ? '' : `<label class="field"><span>Categorie</span><select id="b-cat"><option value="">Kies…</option>${opts.map((c) => `<option value="${c.id}">${c.icon} ${esc(c.name)}</option>`).join('')}</select></label>`}
    <div class="field-label">Maandlimiet</div>
    <label class="amount-field"><span>${curSym()}</span><input id="b-limit" inputmode="decimal" placeholder="0,00" value="${esc(F.limit)}" aria-label="Maandlimiet"></label>
    <p class="muted small">Je krijgt een signaal bij 75% en 90%, en ziet het meteen als je erover gaat.</p>
    <div class="form-err" id="f-err" role="alert"></div>
    <button class="btn primary block" data-act="b-save">${b ? 'Wijzigingen bewaren' : 'Budget toevoegen'}</button>
    ${b ? `<button class="btn danger-ghost block" data-act="b-del">Budget verwijderen</button>` : ''}`);
}
async function saveBudgetForm() {
  const cid = F.isNew ? val('b-cat') : F.categoryId;
  const limit = parseAmount(val('b-limit'));
  if (!cid) return formErr('Kies een categorie.');
  if (!(limit > 0)) return formErr('Vul een maandlimiet groter dan 0 in.');
  await saveBudget({ categoryId: cid, limit, updatedAt: Date.now() });
  closeSheet(); toast('Budget bewaard'); render();
}

/* =================== FORMULIER: SPAARDOEL =================== */
function openGoalForm(g = null) {
  F = g ? { kind: 'goal', isNew: false, ...g } : { kind: 'goal', isNew: true, id: uid(), name: '', icon: '🌴', target: 0, startAmount: 0, targetDate: '', monthly: 0, createdAt: Date.now() };
  openSheet(goalFormHTML());
}
function goalFormHTML() {
  return `${sheetHead(F.isNew ? 'Nieuw spaardoel' : 'Spaardoel bewerken')}
    <div class="chips icons">${GOAL_ICONS.map((i) => `<button type="button" class="chip ic ${i === F.icon ? 'sel' : ''}" data-act="g-icon" data-v="${i}">${i}</button>`).join('')}</div>
    <label class="field"><span>Naam</span><input id="g-name" maxlength="50" value="${esc(F.name)}" placeholder="Bv. Zomervakantie"></label>
    <div class="two"><label class="field"><span>Doelbedrag</span><input id="g-target" inputmode="decimal" placeholder="0,00" value="${F.target ? fmtInput(F.target) : ''}"></label>
    <label class="field"><span>Al gespaard</span><input id="g-start" inputmode="decimal" placeholder="0,00" value="${F.startAmount ? fmtInput(F.startAmount) : ''}"></label></div>
    <div class="two"><label class="field"><span>Streefdatum</span><input type="date" id="g-date" value="${F.targetDate || ''}"></label>
    <label class="field"><span>Vaste maandinleg</span><input id="g-monthly" inputmode="decimal" placeholder="Optioneel" value="${F.monthly ? fmtInput(F.monthly) : ''}"></label></div>
    <p class="muted small">“Al gespaard” is wat er nu al opzij staat. Latere inleggingen voeg je toe met de knop Inleggen.</p>
    <div class="form-err" id="f-err" role="alert"></div>
    <button class="btn primary block" data-act="g-save">${F.isNew ? 'Spaardoel maken' : 'Wijzigingen bewaren'}</button>
    ${!F.isNew ? `<button class="btn danger-ghost block" data-act="g-del">Spaardoel verwijderen</button>` : ''}`;
}
function syncGoal() { const m = { name: 'g-name', _t: 'g-target', _s: 'g-start', targetDate: 'g-date', _m: 'g-monthly' }; for (const [k, id] of Object.entries(m)) { const v = val(id); if (v !== undefined) F[k] = v; } }
async function saveGoalForm() {
  syncGoal();
  const target = parseAmount(F._t), start = F._s && F._s.trim() ? parseAmount(F._s) : 0, monthly = F._m && F._m.trim() ? parseAmount(F._m) : 0;
  if (!F.name.trim()) return formErr('Geef je spaardoel een naam.');
  if (!(target > 0)) return formErr('Vul een doelbedrag groter dan 0 in.');
  if (Number.isNaN(start)) return formErr('“Al gespaard” is geen geldig bedrag.');
  if (Number.isNaN(monthly)) return formErr('De maandinleg is geen geldig bedrag.');
  if (F.targetDate && !isValidISO(F.targetDate)) return formErr('Kies een geldige streefdatum.');
  const g = { id: F.id, name: F.name.trim(), icon: F.icon, target, startAmount: start, targetDate: F.targetDate || '', monthly, createdAt: F.createdAt || Date.now(), updatedAt: Date.now() };
  const isNew = F.isNew;
  await saveGoal(g);
  closeSheet(); toast(isNew ? 'Spaardoel gemaakt' : 'Wijzigingen bewaard'); render();
}
function openMoveForm(goalId, dir) {
  const g = S.goals.find((x) => x.id === goalId); if (!g) return;
  F = { kind: 'move', goalId, dir };
  const s = goalStats(g);
  openSheet(`${sheetHead(dir === 'in' ? `Inleggen: ${esc(g.name)}` : `Opnemen: ${esc(g.name)}`)}
    <label class="amount-field"><span>${curSym()}</span><input id="m-amount" inputmode="decimal" placeholder="0,00" aria-label="Bedrag" value="${dir === 'in' && g.monthly ? fmtInput(g.monthly) : ''}"></label>
    <label class="field"><span>Datum</span><input type="date" id="m-date" value="${todayISO()}"></label>
    <p class="muted small">${dir === 'in' ? 'Het bedrag gaat van je beschikbaar saldo naar dit spaardoel en telt als gespaard, niet als uitgave.' : `Er staat ${fmt(s.saved)} in dit spaardoel. Het bedrag gaat terug naar je beschikbaar saldo.`}</p>
    <div class="form-err" id="f-err" role="alert"></div>
    <button class="btn primary block" data-act="m-save">${dir === 'in' ? 'Inleggen' : 'Opnemen'}</button>`);
}
async function saveMoveForm() {
  const g = S.goals.find((x) => x.id === F.goalId); if (!g) return closeSheet();
  const amount = parseAmount(val('m-amount')), date = val('m-date');
  if (!(amount > 0)) return formErr('Vul een bedrag groter dan 0 in.');
  if (!isValidISO(date)) return formErr('Kies een geldige datum.');
  if (F.dir === 'out' && amount > goalSaved(g)) return formErr(`Je kunt maximaal ${fmt(goalSaved(g))} opnemen.`);
  const inn = F.dir === 'in';
  await saveTx({ id: uid(), type: inn ? 'expense' : 'income', description: `${inn ? 'Inleg' : 'Opname'}: ${g.name}`, amount, date, categoryId: inn ? 'c_fin' : 'i_other', subcategory: inn ? 'Sparen' : '', fixed: false, paymentMethod: '', notes: '', recurringId: null, goalId: g.id, createdAt: Date.now() });
  closeSheet(); toast(inn ? 'Ingelegd' : 'Opgenomen'); render();
}

/* =================== FORMULIER: CATEGORIE =================== */
function openCatForm(c = null) {
  F = c ? { kind: 'cat', isNew: false, id: c.id, ckind: c.kind, name: c.name, icon: c.icon, color: c.color, extra: !!c.extra, subs: c.subs.map((s) => ({ orig: s, name: s })), order: c.order }
    : { kind: 'cat', isNew: true, id: 'u_' + uid(), ckind: UI.catSeg, name: '', icon: '🌸', color: COLORS[S.cats.length % COLORS.length], extra: UI.catSeg === 'income', subs: [], order: 50 };
  openSheet(catFormHTML());
}
function catFormHTML() {
  return `${sheetHead(F.isNew ? 'Nieuwe categorie' : 'Categorie bewerken')}
    <div class="cat-preview">${icon({ icon: F.icon, color: F.color }, 'lg')}<span>${esc(F.name || 'Naam')}</span></div>
    <label class="field"><span>Naam</span><input id="c-name" maxlength="40" value="${esc(F.name)}"></label>
    <div class="field-label">Icoon</div>
    <div class="chips icons">${ICONS.map((i) => `<button type="button" class="chip ic ${i === F.icon ? 'sel' : ''}" data-act="c-icon" data-v="${i}">${i}</button>`).join('')}</div>
    <div class="field-label">Kleur</div>
    <div class="swatches">${COLORS.map((col) => `<button type="button" class="sw ${col === F.color ? 'sel' : ''}" style="background:${col}" data-act="c-color" data-v="${col}" aria-label="Kleur ${col}"></button>`).join('')}</div>
    ${F.ckind === 'income' ? `<button type="button" class="switch ${F.extra ? 'on' : ''}" data-act="c-extra"><span>Extra inkomen (niet elke maand)</span><i></i></button>` : `
      <div class="field-label">Subcategorieën</div>
      <div class="subs">${F.subs.map((s, i) => `<div class="sub-row"><input class="sub-in" data-i="${i}" maxlength="40" value="${esc(s.name)}" placeholder="Naam"><button type="button" class="round sm" data-act="c-subdel" data-i="${i}" aria-label="Verwijderen">✕</button></div>`).join('')}</div>
      <button type="button" class="link" data-act="c-subadd">Subcategorie toevoegen</button>`}
    <div class="form-err" id="f-err" role="alert"></div>
    <button class="btn primary block" data-act="c-save">${F.isNew ? 'Categorie maken' : 'Wijzigingen bewaren'}</button>
    ${!F.isNew && !LOCKED.has(F.id) ? `<button class="btn danger-ghost block" data-act="c-del">Categorie verwijderen</button>` : ''}
    ${LOCKED.has(F.id) ? `<p class="muted small">Deze categorie is nodig voor sparen en kan niet verwijderd worden.</p>` : ''}`;
}
function syncCat() {
  const n = val('c-name'); if (n !== undefined) F.name = n;
  $$('.sub-in').forEach((el) => { F.subs[Number(el.dataset.i)].name = el.value; });
}
async function saveCatForm() {
  syncCat();
  const name = F.name.trim();
  if (!name) return formErr('Geef de categorie een naam.');
  if (S.cats.some((c) => c.id !== F.id && c.kind === F.ckind && c.name.toLowerCase() === name.toLowerCase())) return formErr('Er bestaat al een categorie met die naam.');
  const subs = [], seen = new Set(), renames = [], removed = [];
  for (const s of F.subs) {
    const nm = s.name.trim();
    if (!nm) { if (s.orig) removed.push(s.orig); continue; }
    if (seen.has(nm.toLowerCase())) return formErr(`Subcategorie “${nm}” staat er twee keer in.`);
    seen.add(nm.toLowerCase()); subs.push(nm);
    if (s.orig && s.orig !== nm) renames.push([s.orig, nm]);
  }
  const old = cat(F.id);
  if (old) for (const o of old.subs) if (!F.subs.some((s) => s.orig === o)) removed.push(o);
  const c = { id: F.id, kind: F.ckind, name, icon: F.icon, color: F.color, subs, extra: F.ckind === 'income' ? !!F.extra : undefined, order: F.order ?? 50 };
  // pas transacties en vaste lasten aan bij hernoemen/verwijderen van subcategorieën
  const chTx = [], chRec = [];
  const fix = (o, list) => {
    if (o.categoryId !== c.id || !o.subcategory) return;
    const rn = renames.find(([a]) => a === o.subcategory);
    if (rn) { o.subcategory = rn[1]; list.push(o); } else if (removed.includes(o.subcategory)) { o.subcategory = ''; list.push(o); }
  };
  S.tx.forEach((t) => fix(t, chTx)); S.rec.forEach((r) => fix(r, chRec));
  await DB.batch({ put: { categories: [c], transactions: chTx, recurring: chRec } });
  upsert(S.cats, c); invalidate();
  const isNew = F.isNew;
  closeSheet(); toast(isNew ? 'Categorie gemaakt' : 'Wijzigingen bewaard'); render();
}
async function deleteCat() {
  const c = cat(F.id); if (!c || LOCKED.has(c.id)) return;
  const n = S.tx.filter((t) => t.categoryId === c.id).length;
  const target = c.kind === 'income' ? 'i_other' : 'c_other';
  const ok = await confirmDialog({ title: `${c.name} verwijderen?`, msg: n ? `${n} transactie${n === 1 ? '' : 's'} en eventuele vaste lasten gaan naar “${cat(target).name}”. Een budget voor deze categorie wordt verwijderd.` : 'Deze categorie wordt verwijderd.', ok: 'Verwijderen', danger: true });
  if (!ok) return;
  const chTx = S.tx.filter((t) => t.categoryId === c.id).map((t) => Object.assign(t, { categoryId: target, subcategory: '' }));
  const chRec = S.rec.filter((r) => r.categoryId === c.id).map((r) => Object.assign(r, { categoryId: target, subcategory: '' }));
  await DB.batch({ put: { transactions: chTx, recurring: chRec }, del: { categories: [c.id], budgets: [c.id] } });
  S.cats = S.cats.filter((x) => x.id !== c.id); S.budgets = S.budgets.filter((b) => b.categoryId !== c.id); invalidate();
  closeSheet(); toast('Categorie verwijderd'); render();
}

/* =================== BACK-UP, HERSTEL & EXPORT =================== */
async function saveFile(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  try {
    const file = new File([blob], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      await navigator.share({ files: [file], title: name });
      return true;
    }
  } catch (e) { if (e && e.name === 'AbortError') return false; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}
function backupObject() {
  return {
    app: 'mijn-budget', format: 1, appVersion: APP_VERSION, exportedAt: new Date().toISOString(),
    data: {
      transactions: S.tx, categories: S.cats, budgets: S.budgets, recurring: S.rec, goals: S.goals,
      settings: Object.entries(S.settings).filter(([k]) => k !== 'lastBackup').map(([key, value]) => ({ key, value }))
    }
  };
}
async function exportJSON() {
  const now = new Date();
  const name = `mijn-budget-backup-${todayISO()}.json`;
  const ok = await saveFile(name, 'application/json', JSON.stringify(backupObject(), null, 1));
  if (ok) {
    const stamp = `${todayISO()}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    await setSetting('lastBackup', stamp);
    toast('Back-up gemaakt'); render();
  }
}
function csvCell(v) { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
async function exportCSV() {
  if (!S.tx.length) return toast('Er zijn nog geen transacties');
  const head = ['Datum', 'Type', 'Omschrijving', 'Categorie', 'Subcategorie', 'Bedrag', 'Vast/Variabel', 'Herhaling', 'Spaardoel', 'Betaalmethode', 'Notities'];
  const rows = S.tx.slice().sort((a, b) => a.date.localeCompare(b.date)).map((t) => {
    const g = t.goalId ? S.goals.find((x) => x.id === t.goalId) : null;
    return [fmtDate(t.date), t.type === 'income' ? 'Inkomen' : 'Uitgave', t.description, catOrUnknown(t.categoryId).name, t.subcategory || '',
      ((t.type === 'income' ? 1 : -1) * t.amount / 100).toFixed(2).replace('.', ','), t.type === 'expense' ? (t.fixed ? 'Vast' : 'Variabel') : '',
      t.recurringId ? 'Ja' : 'Nee', g ? g.name : '', t.paymentMethod || '', t.notes || ''].map(csvCell).join(';');
  });
  await saveFile(`mijn-budget-transacties-${todayISO()}.csv`, 'text/csv;charset=utf-8', '\uFEFF' + [head.join(';'), ...rows].join('\r\n'));
}
function validateBackup(obj) {
  const fail = (m) => { throw new Error(m); };
  if (!obj || typeof obj !== 'object' || obj.app !== 'mijn-budget' || !obj.data) fail('Dit is geen back-upbestand van Mijn Budget.');
  if (obj.format > 1) fail('Deze back-up komt van een nieuwere versie van de app. Werk de app eerst bij.');
  const d = obj.data;
  for (const k of ['transactions', 'categories', 'budgets', 'recurring', 'goals', 'settings']) if (!Array.isArray(d[k])) fail(`Het onderdeel “${k}” ontbreekt of is beschadigd.`);
  const int = (n, min = 0) => Number.isInteger(n) && n >= min;
  d.categories.forEach((c, i) => { if (typeof c.id !== 'string' || typeof c.name !== 'string' || !['expense', 'income'].includes(c.kind) || !Array.isArray(c.subs)) fail(`Categorie ${i + 1} is ongeldig.`); });
  d.transactions.forEach((t, i) => { if (typeof t.id !== 'string' || !['expense', 'income'].includes(t.type) || !int(t.amount, 1) || !isValidISO(t.date) || typeof t.categoryId !== 'string' || typeof t.description !== 'string') fail(`Transactie ${i + 1} is ongeldig.`); });
  d.budgets.forEach((b, i) => { if (typeof b.categoryId !== 'string' || !int(b.limit, 1)) fail(`Budget ${i + 1} is ongeldig.`); });
  d.recurring.forEach((r, i) => { if (typeof r.id !== 'string' || !FREQ[r.frequency] || !int(r.amount, 1) || !isValidISO(r.startDate) || !['expense', 'income'].includes(r.type)) fail(`Vaste last ${i + 1} is ongeldig.`); });
  d.goals.forEach((g, i) => { if (typeof g.id !== 'string' || typeof g.name !== 'string' || !int(g.target, 1)) fail(`Spaardoel ${i + 1} is ongeldig.`); });
  d.settings.forEach((s) => { if (typeof s.key !== 'string') fail('Instellingen zijn ongeldig.'); });
  return obj;
}
async function onImportFile(file) {
  if (!file) return;
  try {
    if (file.size > 50 * 1024 * 1024) throw new Error('Dit bestand is te groot voor een back-up.');
    const text = await file.text();
    let obj; try { obj = JSON.parse(text); } catch (_) { throw new Error('Dit bestand kan niet gelezen worden. Kies een .json-back-up van Mijn Budget.'); }
    pendingImport = validateBackup(obj);
  } catch (e) { pendingImport = null; await confirmDialog({ title: 'Back-up niet gebruikt', msg: e.message, ok: 'OK' }); return; }
  const d = pendingImport.data, ex = pendingImport.exportedAt ? new Date(pendingImport.exportedAt) : null;
  openSheet(`${sheetHead('Back-up terugzetten')}
    <p>Back-up${ex && !isNaN(ex) ? ` van ${pad(ex.getDate())}/${pad(ex.getMonth() + 1)}/${ex.getFullYear()}` : ''} gevonden met:</p>
    <div class="calc-table">
      <div><span>Transacties</span><b>${d.transactions.length}</b></div><div><span>Categorieën</span><b>${d.categories.length}</b></div>
      <div><span>Budgetten</span><b>${d.budgets.length}</b></div><div><span>Vaste lasten & inkomen</span><b>${d.recurring.length}</b></div>
      <div><span>Spaardoelen</span><b>${d.goals.length}</b></div></div>
    <p class="muted small">Nu op deze iPhone: ${S.tx.length} transacties, ${S.goals.length} spaardoelen.</p>
    <button class="btn soft block" data-act="imp-merge">Samenvoegen</button>
    <p class="muted small">Voegt alleen toe wat nog niet bestaat. Niets van je huidige gegevens wordt overschreven.</p>
    <button class="btn danger block" data-act="imp-replace">Alles vervangen door de back-up</button>
    <p class="muted small">Wist eerst alle huidige gegevens op deze iPhone en zet daarna de back-up terug.</p>`);
}
async function doImport(mode) {
  if (!pendingImport) return;
  const d = pendingImport.data;
  if (mode === 'replace') {
    const ok = await confirmDialog({ title: 'Alles vervangen?', msg: `Je huidige ${S.tx.length} transacties en alle andere gegevens worden vervangen door de back-up. Dit kan niet ongedaan gemaakt worden.`, ok: 'Vervangen', danger: true });
    if (!ok) return;
    const settings = d.settings.filter((s) => s.key !== 'lastBackup');
    if (!settings.some((s) => s.key === 'initialized')) settings.push({ key: 'initialized', value: true });
    if (S.settings.lastBackup) settings.push({ key: 'lastBackup', value: S.settings.lastBackup });
    await DB.batch({ clear: DB.STORES, put: { transactions: d.transactions, categories: d.categories, budgets: d.budgets, recurring: d.recurring, goals: d.goals, settings } });
  } else {
    const ok = await confirmDialog({ title: 'Samenvoegen?', msg: 'Ontbrekende gegevens uit de back-up worden toegevoegd. Bestaande gegevens blijven zoals ze zijn.', ok: 'Samenvoegen' });
    if (!ok) return;
    const have = { transactions: new Set(S.tx.map((x) => x.id)), categories: new Set(S.cats.map((x) => x.id)), budgets: new Set(S.budgets.map((x) => x.categoryId)), recurring: new Set(S.rec.map((x) => x.id)), goals: new Set(S.goals.map((x) => x.id)) };
    const put = {};
    for (const k of Object.keys(have)) put[k] = d[k].filter((x) => !have[k].has(k === 'budgets' ? x.categoryId : x.id));
    await DB.batch({ put });
  }
  pendingImport = null;
  await loadAll();
  if (!S.cats.length) await seedDefaults();
  await generateRecurring();
  closeSheet(); toast(mode === 'replace' ? 'Back-up teruggezet' : 'Back-up samengevoegd'); go('dashboard');
}
async function resetAll() {
  const ok = await confirmDialog({ title: 'Alle gegevens wissen?', msg: 'Alles op deze iPhone wordt definitief verwijderd. Typ WISSEN om te bevestigen.', ok: 'Definitief wissen', danger: true, requireText: 'WISSEN' });
  if (!ok) return;
  await DB.batch({ clear: DB.STORES });
  Object.assign(S, { tx: [], cats: [], budgets: [], rec: [], goals: [], settings: {} });
  invalidate();
  await seedDefaults();
  toast('Alle gegevens gewist'); go('dashboard');
}

/* =================== ACTIES =================== */
const ACT = {
  nav: (el) => go(el.dataset.v),
  back: (el) => go(el.dataset.v || 'dashboard'),
  close: () => closeSheet(),
  ym: (el) => { const d = Number(el.dataset.d); UI.ym = d === 0 ? thisYM() : shiftYM(UI.ym, d); rerenderKeepScroll(); },
  yr: (el) => { const d = Number(el.dataset.d); UI.year = d === 0 ? Number(thisYM().slice(0, 4)) : UI.year + d; rerenderKeepScroll(); },
  seg: (el) => { UI[el.dataset.k] = el.dataset.v; render(); },
  'budget-seg': (el) => { UI.budgetSeg = el.dataset.v; go('budget'); },
  'report-year': () => { UI.reportSeg = 'year'; UI.year = Number(UI.ym.slice(0, 4)); go('reports'); },
  add: () => openTxForm(),
  'tx-edit': (el) => { const t = S.tx.find((x) => x.id === el.dataset.id); if (t) openTxForm(t); },
  // transactieformulier
  'f-type': (el) => { syncTx(); if (F.type !== el.dataset.v) { F.type = el.dataset.v; F.categoryId = ''; F.subcategory = ''; } setSheet(txFormHTML()); },
  'f-cat': (el) => { syncTx(); if (F.categoryId !== el.dataset.id) { F.categoryId = el.dataset.id; F.subcategory = ''; } setSheet(txFormHTML()); },
  'f-sub': (el) => { syncTx(); F.subcategory = F.subcategory === el.dataset.v ? '' : el.dataset.v; setSheet(txFormHTML()); },
  'f-more': () => { syncTx(); F.more = !F.more; setSheet(txFormHTML()); },
  'f-fixed': (el) => { syncTx(); F.fixed = el.dataset.v === '1'; setSheet(txFormHTML()); },
  'f-repeat': () => { syncTx(); F.repeat = !F.repeat; if (F.repeat) F.fixed = true; setSheet(txFormHTML()); },
  'f-save': () => saveTxForm(),
  'f-meal': () => { syncTx(); F.paymentMethod = F.paymentMethod === MEAL ? '' : MEAL; setSheet(txFormHTML()); },
  'f-dup': () => { syncTx(); Object.assign(F, { id: null, date: todayISO(), recurringId: null, goalId: null, createdAt: null }); setSheet(txFormHTML()); toast('Kopie gemaakt, pas aan en voeg toe'); },
  'f-del': async () => {
    const id = F.id;
    if (!(await confirmDialog({ title: 'Transactie verwijderen?', msg: 'Deze transactie wordt definitief verwijderd.', ok: 'Verwijderen', danger: true }))) return;
    await deleteTx(id); closeSheet(); toast('Transactie verwijderd'); render();
  },
  // historiek
  'h-type': (el) => { UI.hist.type = el.dataset.v; UI.hist.limit = 100; render(); },
  'h-reset': () => { UI.hist = { q: '', type: 'all', cat: '', from: '', to: '', sort: 'date-desc', limit: 100 }; render(); },
  'h-more': () => { UI.hist.limit += 200; fillHistory(); },
  // vaste lasten
  'rec-new': (el) => openRecForm(null, { type: el.dataset.type, cat: el.dataset.cat }),
  'rec-edit': (el) => { const r = S.rec.find((x) => x.id === el.dataset.id); if (r) openRecForm(r); },
  'r-type': (el) => { syncRec(); if (F.type !== el.dataset.v) { F.type = el.dataset.v; F.categoryId = F.type === 'income' ? 'i_salary' : ''; F.subcategory = ''; } setSheet(recFormHTML()); },
  'r-active': () => { syncRec(); F.active = !F.active; setSheet(recFormHTML()); },
  'r-save': () => saveRecForm(),
  'r-del': async () => {
    const id = F.id;
    if (!(await confirmDialog({ title: 'Herhaling verwijderen?', msg: 'Er worden geen nieuwe betalingen meer geboekt. Eerder geboekte betalingen blijven in je historiek.', ok: 'Verwijderen', danger: true }))) return;
    await deleteRec(id); closeSheet(); toast('Herhaling verwijderd'); render();
  },
  // budgetten
  'budget-new': () => openBudgetForm(),
  'budget-edit': (el) => openBudgetForm(el.dataset.id),
  'b-save': () => saveBudgetForm(),
  'b-del': async () => { const cid = F.categoryId; if (!(await confirmDialog({ title: 'Budget verwijderen?', msg: 'Je uitgaven blijven bewaard; alleen de limiet verdwijnt.', ok: 'Verwijderen', danger: true }))) return; await deleteBudget(cid); closeSheet(); toast('Budget verwijderd'); render(); },
  // sparen
  'goal-new': () => openGoalForm(),
  'goal-edit': (el) => { const g = S.goals.find((x) => x.id === el.dataset.id); if (g) openGoalForm(g); },
  'goal-move': (el) => openMoveForm(el.dataset.id, el.dataset.dir),
  'g-icon': (el) => { syncGoal(); F.icon = el.dataset.v; setSheet(goalFormHTML()); restoreGoalInputs(); },
  'g-save': () => saveGoalForm(),
  'g-del': async () => { const id = F.id; if (!(await confirmDialog({ title: 'Spaardoel verwijderen?', msg: 'Het doel verdwijnt. Eerdere inleggingen blijven in je historiek staan.', ok: 'Verwijderen', danger: true }))) return; await deleteGoal(id); closeSheet(); toast('Spaardoel verwijderd'); render(); },
  'm-save': () => saveMoveForm(),
  // categorieën
  'cat-new': () => openCatForm(),
  'cat-edit': (el) => { const c = cat(el.dataset.id); if (c) openCatForm(c); },
  'c-icon': (el) => { syncCat(); F.icon = el.dataset.v; setSheet(catFormHTML()); },
  'c-color': (el) => { syncCat(); F.color = el.dataset.v; setSheet(catFormHTML()); },
  'c-extra': () => { syncCat(); F.extra = !F.extra; setSheet(catFormHTML()); },
  'c-subadd': () => { syncCat(); F.subs.push({ orig: null, name: '' }); setSheet(catFormHTML()); const ins = $$('.sub-in'); if (ins.length) ins[ins.length - 1].focus(); },
  'c-subdel': (el) => { syncCat(); F.subs.splice(Number(el.dataset.i), 1); setSheet(catFormHTML()); },
  'c-save': () => saveCatForm(),
  'c-del': () => deleteCat(),
  // gegevens
  'export-json': () => exportJSON(),
  'export-csv': () => exportCSV(),
  import: () => { const i = $('#import-file'); i.value = ''; i.click(); },
  'imp-merge': () => doImport('merge'),
  'imp-replace': () => doImport('replace'),
  reset: () => resetAll(),
  'toggle-quick': async () => { await setSetting('quickAddOnOpen', !S.settings.quickAddOnOpen); rerenderKeepScroll(); toast(S.settings.quickAddOnOpen ? 'De app opent voortaan met een nieuwe uitgave' : 'De app opent voortaan met het overzicht'); },
  'sw-update': () => { UI.updateRequested = true; if (swWaiting) swWaiting.postMessage('skipWaiting'); else location.reload(); }
};
function restoreGoalInputs() {
  const set = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
  set('g-target', F._t); set('g-start', F._s); set('g-monthly', F._m); set('g-name', F.name); set('g-date', F.targetDate);
}
const CHANGE = {
  hist: () => { Object.assign(UI.hist, { cat: val('h-cat'), sort: val('h-sort'), from: val('h-from') || '', to: val('h-to') || '', limit: 100 }); render(); },
  rcat: () => { syncRec(); F.subcategory = ''; setSheet(recFormHTML()); }
};
async function onSettingChange(el) {
  const k = el.dataset.set;
  if (k === 'startBalance') {
    const raw = el.value.trim(), neg = raw.startsWith('-') || raw.startsWith('−');
    const c = raw ? parseAmount(raw.replace(/^[-−]/, '')) : 0;
    if (Number.isNaN(c)) { toast('Dat is geen geldig bedrag'); return; }
    await setSetting(k, neg ? -c : c);
  } else await setSetting(k, el.value.trim());
  toast('Bewaard');
}
function bindEvents() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = ACT[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.change && CHANGE[el.dataset.change]) CHANGE[el.dataset.change](el);
    else if (el.dataset.set) onSettingChange(el);
    else if (el.classList.contains('calc-in') && el.tagName === 'SELECT') { UI.calc[el.dataset.k] = el.value; fillCalc(); }
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'h-q') { UI.hist.q = el.value; UI.hist.limit = 100; fillHistory(); }
    else if (el.classList.contains('calc-in') && el.tagName === 'INPUT') {
      const k = el.dataset.k;
      if (k === 'months') UI.calc.months = Math.max(1, Math.min(600, parseInt(el.value, 10) || 1));
      else { const c = el.value.trim() ? parseAmount(el.value) : 0; UI.calc[k] = Number.isNaN(c) ? 0 : c; }
      fillCalc();
    } else if (el.id === 'c-name') { const p = $('.cat-preview span'); if (p) p.textContent = el.value || 'Naam'; }
  });
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });
  $('#import-file').addEventListener('change', (e) => onImportFile(e.target.files[0]));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet();
    if (e.key === 'Enter' && F && e.target.tagName === 'INPUT') {
      const map = { tx: 'f-save', rec: 'r-save', budget: 'b-save', goal: 'g-save', move: 'm-save' };
      if (map[F.kind]) { e.preventDefault(); ACT[map[F.kind]](); }
    }
  });
}

/* =================== OFFLINE & UPDATES =================== */
function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('service-worker.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w); });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshing || !UI.updateRequested) return; refreshing = true; location.reload(); });
}
function showUpdate(w) { swWaiting = w; $('#update').hidden = false; }

document.addEventListener('DOMContentLoaded', init);
