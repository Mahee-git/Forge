import {S, A, F, render, get, mut, tot, nut, save, burn} from '../state.js';
import * as D from '../db.js';
import {key, shift, esc, num, r1, kcalFrom, slugify, ring, bars, toast, parse, $} from '../util.js';
import {dateNav} from './dash.js';
const M = ['breakfast', 'lunch', 'dinner', 'snacks', 'post-workout', 'others'];
const L = {breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks', 'post-workout': 'Post-workout meal', others: 'Others'};
let RC = [];
const amt = x => x.amount ?? (x.qty != null ? `${x.qty} ${x.unit || ''}`.trim() : '');   // older entries used qty + unit
const recent = () => { const seen = new Set(), o = []; for (const k of Object.keys(S.days).sort().reverse()) for (const m of [...(S.days[k].meals || [])].reverse()) { const n = m.name.toLowerCase(); if (!seen.has(n) && o.length < 10) { seen.add(n); o.push(m); } } return o; };
async function putMeals(k, fn) { const d = mut(k), o = d.meals, n = fn(d); d.meals = n; render(); return save(() => D.saveDay(S.user.uid, k, {meals: n}), () => { d.meals = o; }); }
F.food = async f => {
  const name = f.name.trim(); if (!name) throw new Error('Enter a food name');
  const p = num(f.p), c = num(f.c), fa = num(f.f); let k = num(f.k); if (!k && (p || c || fa)) k = kcalFrom(p, c, fa);
  if (!k) throw new Error('Enter calories, or at least one macro');
  const e = {id: f.id || crypto.randomUUID(), meal: f.meal, name, amount: (f.amount || '').trim(), k: Math.round(k), p: r1(p), c: r1(c), f: r1(fa)};
  const ok = await putMeals(S.date, d => f.id ? d.meals.map(m => m.id === f.id ? e : m) : [...d.meals, e]);
  if (ok && f.save) { const id = slugify(name) || 'food', o = {name, amount: e.amount, k: e.k, p: e.p, c: e.c, f: e.f}; if (await save(() => D.saveFood(S.user.uid, id, o))) S.foods = [...S.foods.filter(x => x.id !== id), {id, ...o}]; }
  if (ok) { S.edit = null; render(); toast('Saved'); }
};
A.quick = async el => { const x = (el.dataset.t === 's' ? S.foods : RC)[+el.dataset.i]; await putMeals(S.date, d => [...d.meals, {id: crypto.randomUUID(), meal: $('#meal').value, name: x.name, amount: amt(x), k: x.k, p: x.p, c: x.c, f: x.f}]); };
A.savefood = async el => { const x = RC[+el.dataset.i], id = slugify(x.name) || 'food', o = {name: x.name, amount: amt(x), k: x.k, p: x.p, c: x.c, f: x.f}; if (await save(() => D.saveFood(S.user.uid, id, o))) { S.foods = [...S.foods.filter(y => y.id !== id), {id, ...o}]; render(); toast('Saved to your foods'); } };
A.rmfood = async el => { const id = el.dataset.id; if (await save(() => D.delFood(S.user.uid, id))) { S.foods = S.foods.filter(x => x.id !== id); render(); } };
A.edit = el => { S.edit = el.dataset.id; render(); $('#fform')?.scrollIntoView({behavior: 'smooth'}); };
A.canceledit = () => { S.edit = null; render(); };
A.delentry = el => putMeals(S.date, d => d.meals.filter(m => m.id !== el.dataset.id));
A.clearmeal = el => { if (confirm(`Delete all ${L[el.dataset.m]} entries for this day?`)) putMeals(S.date, d => d.meals.filter(m => m.meal !== el.dataset.m)); };
A.copy = async () => { const prev = get(shift(S.date, -1)).meals; if (!prev.length) return toast('Nothing logged on the previous day'); await putMeals(S.date, d => [...d.meals, ...prev.map(m => ({...m, id: crypto.randomUUID()}))]); toast(`Copied ${prev.length} entries`); };

export function nutrition() {
  const d = get(S.date), t = tot(d), T = nut(), ed = S.edit && d.meals.find(m => m.id === S.edit) || {}, b = burn(d);
  RC = recent(); const savedNames = new Set(S.foods.map(f => f.name.toLowerCase()));
  const row = (x, i, t) => `<div class="m qr"><button class="qn" data-a="quick" data-t="${t}" data-i="${i}">${esc(x.name)}<small>${esc(amt(x))}${amt(x) ? ' · ' : ''}${x.k} kcal</small></button>${t === 's' ? `<button class="lnk danger" data-a="rmfood" data-id="${x.id}" aria-label="Remove saved food ${esc(x.name)}">×</button>` : savedNames.has(x.name.toLowerCase()) ? '' : `<button class="lnk" data-a="savefood" data-i="${i}" aria-label="Save ${esc(x.name)} to my foods">☆</button>`}</div>`;
  const wk = [...Array(7)].map((_, i) => shift(key(), -6 + i)), vals = wk.map(k => tot(get(k)).k), logged = wk.filter(k => get(k).meals.length);
  const avg = f => logged.length ? Math.round(logged.reduce((a, k) => a + tot(get(k))[f], 0) / logged.length) : 0;
  return `<h1>Nutrition</h1>${dateNav()}
<div class="card"><div class="rings">${ring(t.k, T.kcal, 'Calories', ' kcal')}${ring(t.p, T.p, 'Protein', ' g')}${ring(t.c, T.c, 'Carbs', ' g')}${ring(t.f, T.f, 'Fat', ' g')}</div>${b ? `<p class="mut">Estimated exercise burn today: ${b} kcal — shown separately, not subtracted from food.</p>` : ''}</div>
<div class="card" id="fform"><h3>${ed.id ? 'Edit food' : 'Add food'}</h3><form data-f="food"><input type="hidden" name="id" value="${ed.id || ''}">
<div class="row"><label>Meal<select name="meal" id="meal">${M.map(m => `<option value="${m}" ${(ed.meal || '') === m ? 'selected' : ''}>${L[m]}</option>`).join('')}</select></label><label style="grid-column:span 3">Food<input name="name" required value="${esc(ed.name)}" placeholder="Eggs"></label></div>
<div class="row"><label style="grid-column:span 2">Amount / serving<input name="amount" value="${esc(ed.id ? amt(ed) : '')}" placeholder="2 large, 100 g, 1 cup"></label><label>Calories<input name="k" type="number" step="any" min="0" value="${ed.k ?? ''}" placeholder="auto"></label><span></span></div>
<div class="row"><label>Protein g<input name="p" type="number" step="any" min="0" value="${ed.p ?? ''}"></label><label>Carbs g<input name="c" type="number" step="any" min="0" value="${ed.c ?? ''}"></label><label>Fat g<input name="f" type="number" step="any" min="0" value="${ed.f ?? ''}"></label><span></span></div>
<small>Leave calories empty to estimate from macros (4/4/9, rounded).</small><br>${ed.id ? '' : '<label><input type="checkbox" name="save"> Save to my foods for one-tap reuse</label>'}<button class="b g">${ed.id ? 'Update' : 'Add'}</button>${ed.id ? '<button type="button" class="b" data-a="canceledit">Cancel</button>' : ''}</form>
<button class="b" data-a="copy">Copy previous day’s meals</button></div>
<div class="cols"><div class="card" style="margin:0"><h3>Saved foods</h3><small>Tap to add to the meal selected above.</small>${S.foods.length ? S.foods.map((x, i) => row(x, i, 's')).join('') : '<p class="mut">Nothing saved yet. Tick “Save to my foods” or tap ☆ on a recent food.</p>'}</div>
<div class="card" style="margin:0"><h3>Recent</h3><small>Your latest logged foods.</small>${RC.length ? RC.map((x, i) => row(x, i, 'r')).join('') : '<p class="mut">Foods you log will appear here.</p>'}</div></div>
${M.map(m => { const l = d.meals.filter(x => x.meal === m); return `<div class="card"><div class="m" style="border:0;padding:0"><h3>${L[m]}</h3><span>${Math.round(l.reduce((a, x) => a + x.k, 0))} kcal ${l.length ? `<button class="lnk danger" data-a="clearmeal" data-m="${m}">Clear</button>` : ''}</span></div>${l.length ? l.map(x => `<div class="m"><span>${esc(x.name)}<br><small>${esc(amt(x))}${amt(x) ? ' · ' : ''}${x.k} kcal · P${x.p} C${x.c} F${x.f}</small></span><span><button class="b" data-a="edit" data-id="${x.id}">Edit</button><button class="b danger" data-a="delentry" data-id="${x.id}" aria-label="Delete ${esc(x.name)}">✕</button></span></div>`).join('') : '<p class="mut" style="margin:6px 0 0">Nothing logged yet.</p>'}</div>`; }).join('')}
<div class="card"><h3>Last 7 days</h3>${bars(vals, wk.map(k => parse(k).toLocaleDateString(undefined, {weekday: 'short'})), 'Calories per day')}<p class="mut">${logged.length ? `Average over ${logged.length} logged day(s): ${avg('k')} kcal · P ${avg('p')} g · C ${avg('c')} g · F ${avg('f')} g` : 'Log a meal to see averages.'}</p></div>`;
}
