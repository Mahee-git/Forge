import * as D from './db.js';
import {key, shift, sync, toast} from './util.js';
import {kpu} from './health.js';
export const S = {user: null, admin: false, ready: false, profile: null, days: {}, foods: [], weights: [], posts: null, date: key(), edit: null, err: null};
export const A = {}, F = {}, C = {};          // click / submit / change handlers, registered by views
export const hooks = {render: () => {}};
export const render = () => hooks.render();
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');   // '' locally, '/repo-name' on GitHub Pages
export const path = () => location.pathname.slice(BASE.length) || '/';
export const go = p => { history.pushState({}, '', BASE + p); render(); };
export const swap = p => history.replaceState({}, '', BASE + p);
export const DEF = {ex: [{id: 'pushups', name: 'Push-ups', unit: 'reps', target: 50}, {id: 'pullups', name: 'Pull-ups', unit: 'reps', target: 15}, {id: 'situps', name: 'Sit-ups', unit: 'reps', target: 60}], nut: {kcal: 2400, p: 140, c: 250, f: 70}};
export const ex = () => S.profile?.exercises || DEF.ex;
export const nut = () => S.profile?.nut || DEF.nut;
const E = () => ({counts: {}, meals: [], burn: 0, waterMl: 0});
export const get = k => S.days[k] || E();
export const mut = k => (S.days[k] ||= E(), S.days[k].counts ||= {}, S.days[k].meals ||= [], S.days[k]);
export const cnt = (d, id) => d?.counts?.[id] || 0;
export const tot = d => (d?.meals || []).reduce((a, m) => ({k: a.k + m.k, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f}), {k: 0, p: 0, c: 0, f: 0});
// Heat score: 70% exercise target completion, 30% protein target. Future days are never scored.
export const score = k => { if (k > key()) return 0; const d = S.days[k]; if (!d) return 0; const e = ex(); const w = e.reduce((a, x) => a + Math.min(1, cnt(d, x.id) / x.target), 0) / (e.length || 1); return .7 * w + .3 * Math.min(1, tot(d).p / nut().p); };
export const lvl = s => s === 0 ? 0 : s < .25 ? 1 : s < .5 ? 2 : s < .8 ? 3 : 4;
export const reps = d => ex().filter(e => e.unit === 'reps').reduce((a, e) => a + cnt(d, e.id), 0);
export const setTheme = t => { document.documentElement.dataset.theme = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'; };
// Weight used for calorie estimates: latest logged weight, else a 70 kg default.
export const kg = () => { const w = S.weights.at(-1); return w ? {kg: w.kg, src: `your latest logged weight (${w.kg} kg)`, assumed: false} : {kg: 70, src: 'a 70 kg default', assumed: true}; };
export const burn = d => { const w = kg().kg; return Math.round(ex().reduce((a, e) => a + cnt(d, e.id) * kpu(e, w), 0)); };
// Run a DB write; on failure undo the optimistic change and tell the user. Returns true only if the server accepted it.
export async function save(fn, undo) { sync('Saving…'); try { await fn(); sync('Saved'); return true; } catch (e) { undo?.(); render(); toast('Not saved — ' + e.message, 1); return false; } }
export async function loadAll() {
  const u = S.user.uid; S.err = null;
  try { const [p, d, f, w] = await Promise.all([D.profile(u), D.days(u, shift(key(), -182)), D.foods(u), D.weights(u)]); Object.assign(S, {profile: p, days: d, foods: f, weights: w}); }
  catch (e) { S.err = e.message; }
}
