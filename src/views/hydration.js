import {S, A, F, render, get, mut, save} from '../state.js';
import * as D from '../db.js';
import {num} from '../util.js';
import {dateNav} from './dash.js';

export const GLASS_ML = 240;
export const DEFAULT_GOAL_ML = 2700;

const water = d => Math.max(0, Number(d?.waterMl) || 0);
const liters = ml => `${(ml / 1000).toFixed(ml % 1000 ? 1 : 0)} L`;
const remainingText = ml => ml >= 1000 ? `${liters(ml)} remaining` : `${ml} ml remaining`;

async function addWater(amount) {
  const k = S.date, d = mut(k), oldTotal = water(d), oldLogs = (d.waterLogs || []).slice();
  const log = {id: crypto.randomUUID(), ml: amount, at: new Date().toISOString()};
  d.waterLogs = [...oldLogs, log]; d.waterMl = oldTotal + amount;
  render();
  await save(() => D.saveDay(S.user.uid, k, {waterMl: d.waterMl, waterLogs: d.waterLogs}), () => { d.waterMl = oldTotal; d.waterLogs = oldLogs; });
}

A.water = async el => {
  const amount = Math.max(0, Math.round(Number(el.dataset.ml) || 0));
  if (amount) await addWater(amount);
};
F.water = async f => {
  const amount = Math.round(num(f.ml));
  if (!amount || amount < 1) throw new Error('Enter a water amount in ml');
  await addWater(amount);
};
F.watergoal = async f => {
  const goal = Math.round(num(f.goal));
  if (!(goal >= 250 && goal <= 10000)) throw new Error('Set a daily target between 250 and 10,000 ml');
  const k = S.date, d = mut(k), old = d.waterGoalMl;
  d.waterGoalMl = goal; render();
  if (await save(() => D.saveDay(S.user.uid, k, {waterGoalMl: goal}), () => { if (old == null) delete d.waterGoalMl; else d.waterGoalMl = old; })) render();
};
A.delwater = async el => {
  const k = S.date, d = mut(k), oldTotal = water(d), oldLogs = (d.waterLogs || []).slice();
  const log = oldLogs.find(x => x.id === el.dataset.id); if (!log) return;
  d.waterLogs = oldLogs.filter(x => x.id !== log.id); d.waterMl = Math.max(0, oldTotal - (Number(log.ml) || 0));
  render();
  await save(() => D.saveDay(S.user.uid, k, {waterMl: d.waterMl, waterLogs: d.waterLogs}), () => { d.waterMl = oldTotal; d.waterLogs = oldLogs; });
};

export function hydration() {
  const d = get(S.date), intake = water(d), goal = Math.min(10000, Math.max(250, Number(d.waterGoalMl) || DEFAULT_GOAL_ML));
  const progress = Math.min(100, intake / goal * 100), remaining = Math.max(0, goal - intake), glasses = Math.ceil(remaining / GLASS_ML);
  const logs = d.waterLogs || [], itemized = logs.reduce((a, x) => a + (Number(x.ml) || 0), 0), unitemized = Math.max(0, intake - itemized);
  const logTime = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Time not saved' : date.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}); };
  return `<h1>Hydration</h1>${dateNav()}
<div class="hydration-hero card">
  <div class="hydration-main"><div><div class="big">${liters(intake)}</div><p class="mut">of ${liters(goal)} daily target</p></div><div class="water-orb" aria-hidden="true">◌</div></div>
  <div class="hydration-progress" role="progressbar" aria-label="Daily water intake" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${intake}"><i style="width:${progress}%"></i></div>
  <div class="hydration-meta"><span>${Math.round(progress)}% complete</span><strong>${remaining ? `${remainingText(remaining)} · about ${glasses} glass${glasses === 1 ? '' : 'es'}` : 'Daily target reached'}</strong></div>
</div>
<div class="card"><h3>Daily water target</h3><form data-f="watergoal" class="water-goal-form"><label>Target (ml)<input name="goal" type="number" min="250" max="10000" step="50" value="${goal}" required></label><button class="b g">Save target</button></form><small class="quiet-note">You can set a different target for each date.</small></div>
<div class="card">
  <div class="m" style="border:0;padding:0"><div><h3>Add water</h3><small>One glass = ${GLASS_ML} ml</small></div><span class="hydration-drop">✦</span></div>
  <div class="water-actions">
    <button class="water-action" data-a="water" data-ml="${GLASS_ML}"><b>+1</b><span>glass</span><small>${GLASS_ML} ml</small></button>
    <button class="water-action" data-a="water" data-ml="50"><b>+50</b><span>ml</span></button>
    <button class="water-action" data-a="water" data-ml="100"><b>+100</b><span>ml</span></button>
  </div>
  <form class="water-form" data-f="water"><label>Custom amount<input name="ml" type="number" min="1" step="1" placeholder="e.g. 350" required></label><button class="b g">Add ml</button></form>
</div>
<div class="card"><h3>Water log · ${logs.length} entr${logs.length === 1 ? 'y' : 'ies'}</h3>${logs.length ? [...logs].reverse().map(x => `<div class="m"><span><b>${Number(x.ml) || 0} ml</b><small>${logTime(x.at)}</small></span><button class="lnk danger" data-a="delwater" data-id="${x.id}" aria-label="Delete ${x.ml} ml water log">×</button></div>`).join('') + (unitemized ? `<p class="mut">${unitemized} ml is from an earlier total without individual timestamps.</p>` : '') : `<p class="mut">${intake ? `There are ${intake} ml recorded, but no individual log entries for this date.` : 'No water logged for this date yet.'}</p>`}</div>`;
}
