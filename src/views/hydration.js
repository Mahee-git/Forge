import {S, A, F, render, get, mut, save} from '../state.js';
import * as D from '../db.js';
import {num} from '../util.js';
import {dateNav} from './dash.js';

export const GLASS_ML = 240;
export const DEFAULT_GOAL_ML = 2700;

const water = d => Math.max(0, Number(d?.waterMl) || 0);
const liters = ml => `${(ml / 1000).toFixed(ml % 1000 ? 1 : 0)} L`;
const remainingText = ml => ml >= 1000 ? `${liters(ml)} remaining` : `${ml} ml remaining`;

A.water = async el => {
  const amount = Math.max(0, Math.round(Number(el.dataset.ml) || 0));
  if (!amount) return;
  const d = mut(S.date), old = water(d), next = old + amount;
  d.waterMl = next;
  render();
  await save(() => D.saveDay(S.user.uid, S.date, {waterMl: next}), () => { d.waterMl = old; });
};

F.water = async f => {
  const amount = Math.round(num(f.ml));
  if (!amount || amount < 1) throw new Error('Enter a water amount in ml');
  const d = mut(S.date), old = water(d), next = old + amount;
  d.waterMl = next;
  render();
  if (await save(() => D.saveDay(S.user.uid, S.date, {waterMl: next}), () => { d.waterMl = old; })) {
    render();
  }
};

export function hydration() {
  const d = get(S.date), intake = water(d), goal = DEFAULT_GOAL_ML;
  const progress = Math.min(100, intake / goal * 100);
  const remaining = Math.max(0, goal - intake);
  const glasses = Math.ceil(remaining / GLASS_ML);
  return `<h1>Hydration</h1>${dateNav()}
<div class="hydration-hero card">
  <div class="hydration-kicker">Daily hydration ritual</div>
  <div class="hydration-main"><div><div class="big">${liters(intake)}</div><p class="mut">of ${liters(goal)} daily goal</p></div><div class="water-orb" aria-hidden="true">◌</div></div>
  <div class="hydration-progress" role="progressbar" aria-label="Daily water intake" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${intake}"><i style="width:${progress}%"></i></div>
  <div class="hydration-meta"><span>${Math.round(progress)}% complete</span><strong>${remaining ? `${remainingText(remaining)} · about ${glasses} glass${glasses === 1 ? '' : 'es'}` : 'Daily goal reached'}</strong></div>
</div>
<div class="card">
  <div class="m" style="border:0;padding:0"><div><h3>Add water</h3><small>One standard glass = ${GLASS_ML} ml</small></div><span class="hydration-drop">✦</span></div>
  <div class="water-actions">
    <button class="water-action" data-a="water" data-ml="${GLASS_ML}"><b>+1</b><span>glass</span><small>${GLASS_ML} ml</small></button>
    <button class="water-action" data-a="water" data-ml="50"><b>+50</b><span>ml</span></button>
    <button class="water-action" data-a="water" data-ml="100"><b>+100</b><span>ml</span></button>
  </div>
  <form class="water-form" data-f="water"><label>Custom amount<input name="ml" type="number" min="1" step="1" placeholder="e.g. 350" required></label><button class="b g">Add ml</button></form>
</div>
<div class="card hydration-note"><h3>A considered target</h3><p class="mut">The National Academies’ adequate intake is about 2.7 L for adult women and 3.7 L for adult men from all beverages and food. Forge starts with a practical 2.7 L drink goal; adjust it for your body, climate and activity.</p><small>Sources: National Academies of Sciences, Engineering, and Medicine; Mayo Clinic.</small></div>`;
}
