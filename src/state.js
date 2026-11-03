import * as D from './db.js';
import {key, shift, sync, toast} from './util.js';
import {kpu, activityKcalPerMinute, isMovementExercise} from './health.js';
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
const E = () => ({counts: {}, meals: [], activities: [], waterLogs: [], burn: 0, waterMl: 0});
export const get = k => S.days[k] || E();
export const mut = k => (S.days[k] ||= E(), S.days[k].counts ||= {}, S.days[k].meals ||= [], S.days[k].activities ||= [], S.days[k].waterLogs ||= [], S.days[k]);
export const cnt = (d, id) => d?.counts?.[id] || 0;
export const tot = d => (d?.meals || []).reduce((a, m) => ({k: a.k + m.k, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f}), {k: 0, p: 0, c: 0, f: 0});
// Consistency is based on workouts; walking, cycling, running and sports are a separate activity colour.
export const workoutList = () => ex().filter(e => !isMovementExercise(e));
export const movementList = () => ex().filter(isMovementExercise);
export const workoutProgress = d => { const list = workoutList(); return list.length ? list.reduce((a, e) => a + Math.max(0, cnt(d, e.id)) / Math.max(1, Number(e.target) || 1), 0) / list.length : 0; };
export const hasWorkout = d => workoutList().some(e => cnt(d, e.id) > 0);
export const hasMovement = d => (d?.activities || []).length > 0 || movementList().some(e => cnt(d, e.id) > 0);
export const heatClass = k => { if (k > key()) return ''; const d = S.days[k]; if (!d) return ''; if (hasWorkout(d)) { const r = workoutProgress(d); if (r > 1) return 'w4'; return r >= .5 ? 'w3' : r >= .25 ? 'w2' : 'w1'; } return hasMovement(d) ? 'move-only' : ''; };
export const score = k => { if (k > key()) return 0; const d = S.days[k]; if (!d) return 0; return hasWorkout(d) ? Math.min(1, workoutProgress(d)) : hasMovement(d) ? .12 : 0; };
export const lvl = s => s === 0 ? 0 : s < .25 ? 1 : s < .5 ? 2 : s < .8 ? 3 : 4;
export const reps = d => ex().filter(e => e.unit === 'reps').reduce((a, e) => a + cnt(d, e.id), 0);
export const setTheme = t => { document.documentElement.dataset.theme = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'; };
// Weight used for calorie estimates: latest logged weight, else a 70 kg default.
export const kg = () => { const w = S.weights.at(-1); return w ? {kg: w.kg, src: `your latest logged weight (${w.kg} kg)`, assumed: false} : {kg: 70, src: 'a 70 kg default', assumed: true}; };
export const burn = d => { const w = kg().kg; const workouts = ex().reduce((a, e) => a + cnt(d, e.id) * kpu(e, w), 0); const logged = (d?.activities || []).reduce((a, x) => a + activityKcalPerMinute(Number(x.met) || 0, Number(x.weightKg) || w) * (Number(x.minutes) || 0), 0); return Math.round(workouts + logged); };
export const activityBurn = d => { const w = kg().kg; const legacy = movementList().reduce((a, e) => a + cnt(d, e.id) * kpu(e, w), 0); const logged = (d?.activities || []).reduce((a, x) => a + activityKcalPerMinute(Number(x.met) || 0, Number(x.weightKg) || w) * (Number(x.minutes) || 0), 0); return Math.round(legacy + logged); };
// Run a DB write; on failure undo the optimistic change and tell the user. Returns true only if the server accepted it.
export async function save(fn, undo) { sync('Saving…'); try { await fn(); sync('Saved'); return true; } catch (e) { undo?.(); render(); toast('Not saved — ' + e.message, 1); return false; } }
export async function loadAll() {
  const u = S.user.uid; S.err = null;
  try { const [p, d, f, w] = await Promise.all([D.profile(u), D.days(u, shift(key(), -182)), D.foods(u), D.weights(u)]); Object.assign(S, {profile: p, days: d, foods: f, weights: w}); }
  catch (e) { S.err = e.message; }
}
