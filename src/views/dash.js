import {S, A, C, F, render, ex, get, mut, cnt, tot, score, reps, nut, save, burn, kg, workoutList, movementList, heatClass, activityBurn, workoutProgress, hasWorkout, hasMovement} from '../state.js';
import {WORKOUT_CAT, ACTIVITIES, kpu, activityKcalPerMinute} from '../health.js';
import * as D from '../db.js';
import {key, shift, parse, esc, num, slugify, dlabel, ring} from '../util.js';

export const dateNav = () => { const t = key(); return `<div class="dn"><button class="b" data-a="d" data-n="-1" aria-label="Previous day">‹</button><input type="date" value="${S.date}" max="${t}" data-c="date" aria-label="Date"><button class="b" data-a="d" data-n="1" ${S.date >= t ? 'disabled' : ''} aria-label="Next day">›</button>${S.date !== t ? '<button class="b" data-a="d" data-n="0">Today</button>' : ''}<span id="sync" class="mut"></span></div>`; };
A.d = el => { const n = +el.dataset.n; S.date = n ? shift(S.date, n) : key(); render(); };
C.date = el => { if (el.value && el.value <= key()) { S.date = el.value; render(); } };
A.pick = el => { S.date = el.dataset.k; render(); };
A.adj = el => { const k = S.date, id = el.dataset.id, d = mut(k), o = cnt(d, id); d.counts[id] = Math.max(0, Math.round((o + +el.dataset.n) * 100) / 100); const v = d.counts[id]; render(); save(() => D.saveDay(S.user.uid, k, {counts: {[id]: v}}), () => { d.counts[id] = o; }); };
const setEx = list => { const o = S.profile?.exercises; S.profile = {...(S.profile || {}), exercises: list}; render(); return save(() => D.setProfile(S.user.uid, {exercises: list}), () => { S.profile.exercises = o; }); };
C.exedit = el => { const {id, k} = el.dataset, v = el.value.trim(); setEx(ex().map(e => e.id === id ? {...e, [k]: k === 'target' ? (num(v) || e.target) : (v || e.name)} : e)); };
A.delex = el => { if (confirm('Remove this exercise? Past entries stay in your records.')) setEx(ex().filter(e => e.id !== el.dataset.id)); };
F.addex = async f => { const name = f.name.trim(); if (!name) throw new Error('Give the workout a name'); await setEx([...ex(), {id: slugify(name) + '-' + Date.now().toString(36), name, unit: (f.unit || 'reps').trim(), target: Math.max(1, Math.round(num(f.target)) || 10)}]); };

A.delactivity = async el => {
  const k = S.date, d = mut(k), old = d.activities.slice(), next = old.filter(x => x.id !== el.dataset.id);
  d.activities = next; render();
  await save(() => D.saveDay(S.user.uid, k, {activities: next}), () => { d.activities = old; });
};
F.activity = async f => {
  const item = ACTIVITIES.find(x => x.id === f.activityId), minutes = Math.round(num(f.minutes));
  if (!item) throw new Error('Choose an activity');
  if (!(minutes > 0 && minutes <= 1440)) throw new Error('Enter minutes between 1 and 1,440');
  const k = S.date, d = mut(k), old = d.activities.slice();
  const entry = {id: crypto.randomUUID(), activityId: item.id, name: item.name, kind: item.kind, met: item.met, minutes, weightKg: kg().kg, at: new Date().toISOString()};
  d.activities = [...old, entry]; render();
  if (await save(() => D.saveDay(S.user.uid, k, {activities: d.activities}), () => { d.activities = old; })) render();
};

export function dashboard() {
  const t = key(); let k = score(t) > 0 ? t : shift(t, -1), st = 0;
  while (score(k) > 0) { st++; k = shift(k, -1); }
  const all = Object.keys(S.days), wk = [...Array(7)].reduce((a, _, i) => a + reps(get(shift(t, -i))), 0);
  const total = all.reduce((a, x) => a + reps(S.days[x]), 0), act = all.filter(x => score(x) > 0).length;
  const s0 = shift(t, -(parse(t).getDay() + 175)); let h = '';
  for (let i = 0; i < 182; i++) { const x = shift(s0, i), day = get(x), pct = hasWorkout(day) ? Math.round(workoutProgress(day) * 100) : 0, desc = hasWorkout(day) ? `Workout ${pct}% of targets` : hasMovement(day) ? 'Movement only' : 'No activity'; h += `<button class="d ${heatClass(x)}${x > t ? ' f' : ''}${x === t ? ' t' : ''}${x === S.date ? ' s' : ''}" data-a="pick" data-k="${x}" aria-label="${x}: ${desc}" title="${x} · ${desc}"></button>`; }
  const d = get(S.date), T = tot(d), n = nut(), kcalBurn = burn(d), foodKcal = Math.round(T.k), net = foodKcal - kcalBurn, remaining = n.kcal - net;
  const workouts = workoutList(), legacy = movementList();
  const movementCount = (d.activities || []).length + legacy.filter(e => cnt(d, e.id) > 0).length;
  return `<h1>Overview</h1><div class="stats">${[[st, 'Day streak'], [wk, 'Reps · 7 days'], [total, 'Total reps'], [act, 'Active days']].map(a => `<div class="st"><b>${a[0]}</b><span>${a[1]}</span></div>`).join('')}</div>
<div class="card"><h3>Consistency</h3><div class="hm" role="group" aria-label="Activity heatmap">${h}</div><div class="heat-legend"><span><i class="w1"></i>Workout · 1–24%</span><span><i class="w2"></i>Workout · 25–49%</span><span><i class="w3"></i>Workout · 50–100%</span><span><i class="w4"></i>Above target</span><span><i class="move-only"></i>Movement / sports only</span></div></div>
<div class="card"><h3>${dlabel(S.date)}${S.date === t ? ' · Today' : ''}</h3>${workouts.map(e => `<div class="m"><span>${esc(e.name)}<div class="bar" style="width:140px"><i style="width:${Math.min(100, cnt(d, e.id) / e.target * 100)}%"></i></div></span><span>${cnt(d, e.id)} / ${e.target}</span></div>`).join('') || '<p class="mut">No workout targets yet.</p>'}<div class="m"><span>Movement &amp; sports</span><span>${movementCount} log${movementCount === 1 ? '' : 's'}</span></div>
<div class="rings" style="grid-template-columns:repeat(2,1fr);margin:14px 0">${ring(T.k, n.kcal, 'Food calories', ' kcal')}${ring(T.p, n.p, 'Protein', ' g')}</div>
<div class="net-line"><span>Food ${foodKcal} kcal − activity ${kcalBurn} kcal</span><b>${net} kcal net</b></div><small class="net-gap">${remaining >= 0 ? `${remaining} kcal below your calorie target` : `${Math.abs(remaining)} kcal above your calorie target`}</small>
<a class="b g" href="/activity">Log activity</a><a class="b" href="/nutrition">Log food</a></div>`;
}

F.addcat = async f => { const c = WORKOUT_CAT.find(x => x.id === f.cat); if (!c) throw new Error('Pick a workout'); await setEx([...ex(), {id: c.id, cat: c.id, name: c.name, unit: c.unit, target: num(f.target) || c.target}]); };
const STEP = {reps: [-1, 1, 5], min: [-5, 5, 15], km: [-0.5, 0.5, 1]};
const k1 = n => n >= 10 ? Math.round(n) : Math.round(n * 100) / 100;
const exerciseRow = ({e, n, k}) => `<div class="ex"><div class="n"><b>${esc(e.name)}</b><small> target ${e.target} ${esc(e.unit)}</small><br><small>≈ ${Math.round(n * k)} kcal</small><div class="bar"><i style="width:${Math.min(100, n / e.target * 100)}%"></i></div></div>${(STEP[e.unit] || STEP.reps).map((s, i) => `<button class="b${i === 2 ? ' g' : ''}" data-a="adj" data-id="${e.id}" data-n="${s}" aria-label="${s > 0 ? 'Add' : 'Remove'} ${Math.abs(s)} ${esc(e.unit)} ${esc(e.name)}">${s < 0 ? '−' : '+'}${Math.abs(s)}</button>`).join('')}<div class="cnt" aria-live="polite">${n}</div></div>`;

export function activity() {
  const d = get(S.date), w = kg(), workouts = workoutList(), legacy = movementList();
  const rows = workouts.map(e => ({e, n: cnt(d, e.id), k: kpu(e, w.kg)}));
  const legacyRows = legacy.map(e => ({e, n: cnt(d, e.id), k: kpu(e, w.kg)}));
  const total = burn(d), logs = d.activities || [];
  const movementTotal = activityBurn(d);
  const availWorkouts = WORKOUT_CAT.filter(c => !new Set(ex().map(e => e.id)).has(c.id));
  const options = ['<optgroup label="Movement">', ...ACTIVITIES.filter(x => x.group === 'Movement').map(x => `<option value="${x.id}">${esc(x.name)} · ${x.met} MET · ~${activityKcalPerMinute(x.met, w.kg).toFixed(1)} kcal/min</option>`), '</optgroup>', '<optgroup label="Sports">', ...ACTIVITIES.filter(x => x.group === 'Sports').map(x => `<option value="${x.id}">${esc(x.name)} · ${x.met} MET · ~${activityKcalPerMinute(x.met, w.kg).toFixed(1)} kcal/min</option>`), '</optgroup>'].join('');
  return `<h1>Activity</h1>${dateNav()}
<div class="card"><h3>Movement &amp; sports</h3><form data-f="activity" class="activity-form"><label>Activity<select name="activityId">${options}</select></label><div class="row" style="grid-template-columns:1fr auto;align-items:end"><label>Duration (minutes)<input name="minutes" type="number" min="1" max="1440" step="1" value="30" required></label><button class="b g">Add activity</button></div></form>
${logs.length ? `<div class="activity-log">${[...logs].reverse().map(x => { const rate = activityKcalPerMinute(Number(x.met) || 0, Number(x.weightKg) || w.kg), kcal = Math.round(rate * (Number(x.minutes) || 0)); return `<div class="m"><span><b>${esc(x.name)}</b><small>${x.minutes} min · ${Number(x.met).toFixed(1)} MET · ≈ ${rate.toFixed(1)} kcal/min · ${kcal} kcal</small></span><button class="lnk danger" data-a="delactivity" data-id="${x.id}" aria-label="Remove ${esc(x.name)}">×</button></div>`; }).join('')}</div>` : '<p class="mut">No movement or sports logged for this date.</p>'}</div>
<div class="card"><h3>Workouts</h3>${rows.length ? rows.map(exerciseRow).join('') : '<p class="mut">No workouts added yet.</p>'}</div>
${legacyRows.some(x => x.n > 0) ? `<div class="card"><h3>Earlier movement entries</h3>${legacyRows.filter(x => x.n > 0).map(exerciseRow).join('')}</div>` : ''}
<div class="card"><h3>Calories burned</h3><div class="big">${total} kcal</div><small>Uses latest logged weight · 70 kg default.</small>${movementTotal ? `<p class="mut" style="margin:8px 0 0">Movement &amp; sports: ${movementTotal} kcal</p>` : ''}</div>
<details class="card"><summary>Manage workouts</summary>${ex().map(e => `<div class="row" style="grid-template-columns:2fr 1fr auto;align-items:end"><label>Name<input value="${esc(e.name)}" data-c="exedit" data-id="${e.id}" data-k="name"></label><label>Daily target (${esc(e.unit)})<input type="number" step="any" min="0.5" value="${e.target}" data-c="exedit" data-id="${e.id}" data-k="target"></label><button class="b danger" data-a="delex" data-id="${e.id}">Remove</button></div>`).join('')}
${availWorkouts.length ? `<form data-f="addcat"><h3 style="margin-top:16px">Add a workout</h3><div class="row" style="grid-template-columns:2fr 1fr auto;align-items:end"><label>Workout<select name="cat">${availWorkouts.map(c => `<option value="${c.id}">${esc(c.name)} · ${c.unit}</option>`).join('')}</select></label><label>Daily target<input name="target" type="number" step="any" min="0.5" placeholder="default"></label><button class="b g">Add</button></div></form>` : '<p class="mut">All listed workouts are already added.</p>'}
<form data-f="addex"><h3 style="margin-top:16px">Custom workout</h3><div class="row" style="grid-template-columns:2fr 1fr 1fr"><label>Name<input name="name" required placeholder="Kettlebell swings"></label><label>Unit<select name="unit"><option>reps</option><option>min</option></select></label><label>Target<input name="target" type="number" min="1" value="20"></label></div><button class="b g">Add</button></form></details>`;
}
