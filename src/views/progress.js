import {S, A, F, render, ex, get, cnt, tot, reps, score, save} from '../state.js';
import * as D from '../db.js';
import {STD, bmi, bmiCat, healthyKg} from '../health.js';
import {key, shift, parse, esc, num, bars, toast} from '../util.js';
import {C} from "../state.js";
C.pex = el => { S.pe = el.value; render(); };
A.delw = async el => { const k = el.dataset.k; if (await save(() => D.delWeight(S.user.uid, k))) { S.weights = S.weights.filter(w => w.date !== k); render(); } };
F.body = async f => {
  const h = num(f.h), kg = num(f.kg), date = f.date || key();
  if (h < 80 || h > 250) throw new Error('Enter your height in cm (80–250)');
  if (kg > 400) throw new Error('Weight looks too high — enter kg');
  const p = {height: h, bmiStd: f.std};
  if (!(await save(() => D.setProfile(S.user.uid, p)))) return;
  S.profile = {...(S.profile || {}), ...p};
  if (kg) { if (!(await save(() => D.saveWeight(S.user.uid, date, kg)))) { render(); return; } S.weights = [...S.weights.filter(w => w.date !== date), {date, kg}].sort((a, b) => a.date < b.date ? -1 : 1); }
  render(); toast('Saved');
};
function bmiCard() {
  const h = S.profile?.height, std = S.profile?.bmiStd || 'who', X = STD[std], w = S.weights.at(-1), t = key();
  const form = `<form data-f="body" class="row"><label>Height (cm)<input name="h" type="number" step="0.1" min="80" max="250" required value="${h || ''}"></label><label>Weight (kg)<input name="kg" type="number" step="0.1" min="1" max="400" value="${w ? w.kg : ''}"></label><label>Date<input type="date" name="date" value="${t}" max="${t}"></label><label>Standard<select name="std">${Object.entries(STD).map(([k, v]) => `<option value="${k}" ${k === std ? 'selected' : ''}>${v.name}</option>`).join('')}</select></label><button class="b g" style="grid-column:1/-1;margin-top:6px">Save &amp; calculate</button></form>`;
  let res = '<p class="mut">Enter your height and weight above to see your BMI.</p>';
  if (h && w) { const b = bmi(w.kg, h), pos = Math.min(100, Math.max(0, (b - 15) / 25 * 100)), seg = [15, ...X.cuts, 40].map((x, i, a) => i ? (x - a[i - 1]) / 25 * 100 : 0).slice(1), cols = ['var(--c1)', 'var(--c4)', 'var(--c3)', 'var(--bad)'], [lo, hi] = healthyKg(h, std);
    res = `<div class="big">${b.toFixed(1)}</div><b>${bmiCat(b, std)}</b> <small>· ${w.kg} kg (${w.date}) at ${h} cm</small><div class="gauge" role="img" aria-label="BMI ${b.toFixed(1)}: ${bmiCat(b, std)}">${seg.map((x, i) => `<i style="width:${x}%;background:${cols[i]}"></i>`).join('')}<b style="left:calc(${pos}% - 1px)"></b></div><small>Cut-offs: ${X.cuts.join(' · ')}</small><p>Healthy-weight range for your height: <b>${lo.toFixed(1)}–${hi.toFixed(1)} kg</b> <small>(${X.name})</small></p><small>BMI is a screening index, not a diagnosis. It is less reliable for children, pregnancy and very muscular people.</small>`; }
  return `<div class="card"><h3>Body mass index</h3>${form}${res}</div>`;
}
const lab = k => parse(k).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
const spark = v => { if (v.length < 2) return ''; const mn = Math.min(...v), r = Math.max(...v) - mn || 1; return `<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label="Weight trend"><polyline fill="none" stroke="var(--gold)" stroke-width="1.5" vector-effect="non-scaling-stroke" points="${v.map((x, i) => `${i / (v.length - 1) * 100},${28 - (x - mn) / r * 26}`).join(' ')}"/></svg>`; };
export function progress() {
  const t = key(), wk = [...Array(8)].map((_, i) => { const e = shift(t, -7 * (7 - i)); let s = 0; for (let j = 0; j < 7; j++) s += reps(get(shift(e, -j))); return [lab(e), s]; });
  const pre = t.slice(0, 7), mk = Object.keys(S.days).filter(k => k.startsWith(pre)), pe = ex().find(e => e.id === S.pe) || ex()[0];
  const d30 = [...Array(30)].map((_, i) => shift(t, -29 + i)), d14 = d30.slice(16), w = S.weights.slice(-30);
  return `<h1>Progress</h1>
${bmiCard()}
<div class="card"><h3>Weekly reps</h3><small>Last 8 weeks (reps-based exercises)</small>${bars(wk.map(x => x[1]), wk.map(x => x[0]), 'Weekly reps')}</div>
<div class="card"><h3>This month</h3><p>${mk.filter(k => score(k) > 0).length} active days · ${mk.reduce((a, k) => a + reps(S.days[k]), 0)} reps</p></div>
<div class="card"><h3>Exercise progression</h3><label>Exercise<select data-c="pex">${ex().map(e => `<option value="${e.id}" ${e.id === pe.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>${bars(d30.map(k => cnt(get(k), pe.id)), d30.map(lab), pe.name + ' per day')}<small>Last 30 days · daily count</small></div>
<div class="card"><h3>Calories</h3>${bars(d14.map(k => tot(get(k)).k), d14.map(lab), 'Calories per day')}<small>Last 14 days</small></div>
<div class="card"><h3>Weight history</h3>${spark(w.map(x => x.kg))}${S.weights.slice(-6).reverse().map(x => `<div class="m"><span>${x.date}</span><span>${x.kg} kg <button class="lnk danger" data-a="delw" data-k="${x.date}" aria-label="Delete weight entry">✕</button></span></div>`).join('') || '<p class="mut">No entries yet.</p>'}</div>`;
}
