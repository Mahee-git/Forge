import {S, A, C, F, render, ex, get, mut, cnt, tot, score, lvl, reps, nut, save, burn, kg} from '../state.js';
import {CAT, kpu} from '../health.js';
import * as D from '../db.js';
import {key, shift, parse, esc, num, slugify, dlabel, ring} from '../util.js';

export const dateNav = () => { const t = key(); return `<div class="dn"><button class="b" data-a="d" data-n="-1" aria-label="Previous day">‹</button><input type="date" value="${S.date}" max="${t}" data-c="date" aria-label="Date"><button class="b" data-a="d" data-n="1" ${S.date >= t ? 'disabled' : ''} aria-label="Next day">›</button>${S.date !== t ? '<button class="b" data-a="d" data-n="0">Today</button>' : ''}<span id="sync" class="mut"></span></div>`; };
A.d = el => { const n = +el.dataset.n; S.date = n ? shift(S.date, n) : key(); render(); };
C.date = el => { if (el.value && el.value <= key()) { S.date = el.value; render(); } };
A.pick = el => { S.date = el.dataset.k; render(); };
A.adj = el => { const k = S.date, id = el.dataset.id, d = mut(k), o = cnt(d, id); d.counts[id] = Math.max(0, Math.round((o + +el.dataset.n) * 100) / 100); const v = d.counts[id]; render(); save(() => D.saveDay(S.user.uid, k, {counts: {[id]: v}}), () => { d.counts[id] = o; }); };
const setEx = list => { const o = S.profile?.exercises; S.profile = {...(S.profile || {}), exercises: list}; render(); return save(() => D.setProfile(S.user.uid, {exercises: list}), () => { S.profile.exercises = o; }); };
C.exedit = el => { const {id, k} = el.dataset, v = el.value.trim(); setEx(ex().map(e => e.id === id ? {...e, [k]: k === 'target' ? (num(v) || e.target) : (v || e.name)} : e)); };
A.delex = el => { if (confirm('Delete this exercise? Past counts stay stored but stop appearing in totals.')) setEx(ex().filter(e => e.id !== el.dataset.id)); };
F.addex = async f => { const name = f.name.trim(); if (!name) throw new Error('Give the exercise a name'); await setEx([...ex(), {id: slugify(name) + '-' + Date.now().toString(36), name, unit: (f.unit || 'reps').trim(), target: Math.max(1, Math.round(num(f.target)) || 10)}]); };

export function dashboard() {
  const t = key(); let k = t; if (score(k) < .25) k = shift(k, -1); let st = 0; while (score(k) >= .25) { st++; k = shift(k, -1); }
  const all = Object.keys(S.days), wk = [...Array(7)].reduce((a, _, i) => a + reps(get(shift(t, -i))), 0);
  const total = all.reduce((a, x) => a + reps(S.days[x]), 0), act = all.filter(x => score(x) > 0).length;
  const s0 = shift(t, -(parse(t).getDay() + 175)); let h = '';
  for (let i = 0; i < 182; i++) { const x = shift(s0, i); h += `<button class="d l${lvl(score(x))}${x > t ? ' f' : ''}${x === t ? ' t' : ''}${x === S.date ? ' s' : ''}" data-a="pick" data-k="${x}" aria-label="${x}: ${Math.round(score(x) * 100)}%" title="${x}"></button>`; }
  const d = get(S.date), T = tot(d), n = nut();
  return `<h1>Daily discipline</h1><div class="stats">${[[st, 'Day streak'], [wk, 'Reps · 7 days'], [total, 'Total reps'], [act, 'Active days']].map(a => `<div class="st"><b>${a[0]}</b><span>${a[1]}</span></div>`).join('')}</div>
<div class="card"><h3>Consistency</h3><div class="hm" role="group" aria-label="Activity heatmap">${h}</div></div>
<div class="card"><h3>${dlabel(S.date)}${S.date === t ? ' · Today' : ''}</h3>${ex().map(e => `<div class="m"><span>${esc(e.name)}<div class="bar" style="width:140px"><i style="width:${Math.min(100, cnt(d, e.id) / e.target * 100)}%"></i></div></span><span>${cnt(d, e.id)} / ${e.target}</span></div>`).join('')}<div class="m"><span>Estimated burn</span><span>${burn(d)} kcal</span></div><div class="rings" style="grid-template-columns:repeat(2,1fr);margin:14px 0">${ring(T.k, n.kcal, 'Calories', ' kcal')}${ring(T.p, n.p, 'Protein', ' g')}</div><a class="b g" href="/activity">Log activity</a><a class="b" href="/nutrition">Log food</a></div>`;
}

F.addcat = async f => { const c = CAT.find(x => x.id === f.cat); if (!c) throw new Error('Pick an exercise'); await setEx([...ex(), {id: c.id, cat: c.id, name: c.name, unit: c.unit, target: num(f.target) || c.target}]); };
const STEP = {reps: [-1, 1, 5], min: [-5, 5, 15], km: [-0.5, 0.5, 1]};
const k1 = n => n >= 10 ? Math.round(n) : Math.round(n * 100) / 100;
export function activity() {
  const d = get(S.date), w = kg(), have = new Set(ex().map(e => e.id)), avail = CAT.filter(c => !have.has(c.id));
  const rows = ex().map(e => ({e, n: cnt(d, e.id), k: kpu(e, w.kg)})), total = Math.round(rows.reduce((a, r) => a + r.n * r.k, 0));
  return `<h1>Activity</h1>${dateNav()}<div class="card">${rows.length ? rows.map(({e, n, k}) => `<div class="ex"><div class="n"><b>${esc(e.name)}</b><small> target ${e.target} ${esc(e.unit)}</small><br><small>≈ ${Math.round(n * k)} kcal · ${k1(k)} kcal per ${esc(e.unit)}</small><div class="bar"><i style="width:${Math.min(100, n / e.target * 100)}%"></i></div></div>${(STEP[e.unit] || STEP.reps).map((s, i) => `<button class="b${i === 2 ? ' g' : ''}" data-a="adj" data-id="${e.id}" data-n="${s}" aria-label="${s > 0 ? 'Add' : 'Remove'} ${Math.abs(s)} ${esc(e.unit)} ${esc(e.name)}">${s < 0 ? '−' : '+'}${Math.abs(s)}</button>`).join('')}<div class="cnt" aria-live="polite">${n}</div></div>`).join('') : '<p class="mut">No exercises yet — add some below.</p>'}</div>
<div class="card"><h3>Estimated calories burned</h3><div class="big">${total} kcal</div><small>Worked out automatically from your exercises: MET (Compendium of Physical Activities) × body weight × active time. Using ${w.src}${w.assumed ? ' — log your weight in Progress for a better estimate' : ''}. Reps are converted to time with an assumed pace. It is an estimate and is never subtracted from your food.</small></div>
<details class="card"><summary>Manage exercises</summary>${ex().map(e => `<div class="row" style="grid-template-columns:2fr 1fr auto;align-items:end"><label>Name<input value="${esc(e.name)}" data-c="exedit" data-id="${e.id}" data-k="name"></label><label>Daily target (${esc(e.unit)})<input type="number" step="any" min="0.5" value="${e.target}" data-c="exedit" data-id="${e.id}" data-k="target"></label><button class="b danger" data-a="delex" data-id="${e.id}">Remove</button></div>`).join('')}
<form data-f="addcat"><h3 style="margin-top:16px">Add from the exercise list</h3><div class="row" style="grid-template-columns:2fr 1fr auto;align-items:end"><label>Exercise<select name="cat">${avail.map(c => `<option value="${c.id}">${esc(c.name)} · ${c.unit}</option>`).join('')}</select></label><label>Daily target<input name="target" type="number" step="any" min="0.5" placeholder="default"></label><button class="b g" ${avail.length ? '' : 'disabled'}>Add</button></div></form>
<form data-f="addex"><h3 style="margin-top:16px">Or add your own</h3><div class="row" style="grid-template-columns:2fr 1fr 1fr"><label>Name<input name="name" required placeholder="Kettlebell swings"></label><label>Unit<select name="unit"><option>reps</option><option>min</option></select></label><label>Target<input name="target" type="number" min="1" value="20"></label></div><small>Own exercises use a generic moderate estimate (5 MET).</small><br><button class="b g">Add</button></form></details>`;
}
