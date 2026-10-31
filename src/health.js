// Reference data + calculators. Sources:
//  - Compendium of Physical Activities (2011 / 2024 update): MET values
//  - WHO (1995/2000) BMI classes; WHO Expert Consultation 2004: Asian public-health points 23 / 27.5
//  - FAO/WHO/UNU 1985 Schofield BMR equations; FAO/WHO/UNU 2001 physical activity levels (PAL)
//  - WHO/FAO/UNU 2007 protein safe level 0.83 g/kg; WHO/FAO fat 20-35% of energy
const h = s => s / 3600;
// [id, name, unit, MET, hours per unit, default daily target]
// Reps are converted to active time with an assumed seconds-per-rep (Forge's assumption), then kcal = MET x kg x hours.
export const CAT = [
  ['pushups', 'Push-ups', 'reps', 8, h(2), 50], ['pullups', 'Pull-ups', 'reps', 8, h(4), 15], ['situps', 'Sit-ups', 'reps', 3.8, h(3), 60],
  ['crunches', 'Crunches', 'reps', 2.8, h(2.5), 40], ['squats', 'Squats', 'reps', 3.8, h(3), 50], ['lunges', 'Lunges', 'reps', 3.8, h(3), 30],
  ['dips', 'Dips', 'reps', 3.8, h(3), 20], ['burpees', 'Burpees', 'reps', 7.5, h(4), 20], ['jacks', 'Jumping jacks', 'reps', 8, h(1), 100],
  ['plank', 'Plank', 'min', 2.8, 1 / 60, 3], ['rope', 'Skipping rope', 'min', 10, 1 / 60, 10],
  ['walk-km', 'Walking (brisk, ~5 km/h)', 'km', 3.5, 12 / 60, 5], ['walk-min', 'Walking (brisk, ~5 km/h)', 'min', 3.5, 1 / 60, 30],
  ['run-km', 'Running (~10 km/h)', 'km', 9.8, 6.2 / 60, 3], ['run-min', 'Running (~10 km/h)', 'min', 9.8, 1 / 60, 20],
  ['cyc-km', 'Cycling (moderate, ~20 km/h)', 'km', 8, 3 / 60, 10], ['cyc-min', 'Cycling (moderate, ~20 km/h)', 'min', 8, 1 / 60, 30],
  ['cycl-km', 'Cycling (leisure, ~15 km/h)', 'km', 4, 4 / 60, 8], ['swim', 'Swimming (laps, easy)', 'min', 5.8, 1 / 60, 20],
  ['hike', 'Hiking', 'min', 6, 1 / 60, 60], ['dance', 'Dancing (aerobic)', 'min', 5, 1 / 60, 30], ['weights', 'Weight training', 'min', 3.5, 1 / 60, 45],
  ['yoga', 'Yoga (Hatha)', 'min', 3, 1 / 60, 30], ['pilates', 'Pilates', 'min', 3.8, 1 / 60, 30],
].map(([id, name, unit, met, h, target]) => ({id, name, unit, met, h, target}));
const BY = Object.fromEntries(CAT.map(c => [c.id, c]));
// kcal burned per 1 unit (rep / minute / km) for a body weight. Unknown custom exercises use a generic moderate 5 MET.
export const kpu = (e, kg) => { const c = BY[e.cat || e.id]; return c ? c.met * kg * c.h : 5 * kg * (e.unit === 'min' ? 1 / 60 : e.unit === 'km' ? 10 / 60 : h(3)); };

export const STD = {
  who: {name: 'WHO international', cuts: [18.5, 25, 30], labels: ['Underweight', 'Normal weight', 'Overweight', 'Obese']},
  asia: {name: 'WHO Asian public-health points', cuts: [18.5, 23, 27.5], labels: ['Underweight', 'Normal weight', 'Overweight (increased risk)', 'Obese (high risk)']},
};
export const bmi = (kg, cm) => kg / ((cm / 100) ** 2);
export const bmiCat = (b, s) => { const x = STD[s] || STD.who; return x.labels[x.cuts.filter(c => b >= c).length]; };
export const healthyKg = (cm, s) => { const x = STD[s] || STD.who, m = (cm / 100) ** 2; return [x.cuts[0] * m, (x.cuts[1] - 0.1) * m]; };

// Schofield (FAO/WHO/UNU 1985) BMR, kcal/day from weight (adults)
export const bmr = (sex, kg, age) => { const m = sex === 'm'; return age < 30 ? (m ? 15.057 * kg + 692.2 : 14.818 * kg + 486.6) : age < 60 ? (m ? 11.472 * kg + 873.1 : 8.126 * kg + 845.6) : (m ? 11.711 * kg + 587.7 : 9.082 * kg + 658.5); };
// FAO/WHO/UNU 2001 PAL bands: sedentary/light 1.40-1.69, moderate 1.70-1.99, vigorous 2.00-2.40 (mid-points used)
export const PAL = [[1.4, 'Sedentary — little or no exercise'], [1.55, 'Light — exercise 1–3 days/week'], [1.75, 'Moderate — exercise 3–5 days/week'], [2.0, 'Very active — hard training most days']];
export function targets({sex, age, kg, pal, goal}) {
  const b = bmr(sex, kg, age), tdee = b * pal; let k = goal === 'lose' ? tdee * .85 : goal === 'gain' ? tdee * 1.1 : tdee;
  k = Math.round(Math.max(k, b) / 10) * 10;                       // never suggest below BMR
  const p = Math.round(Math.min(1.6 * kg, .35 * k / 4)), f = Math.round(.25 * k / 9), c = Math.max(0, Math.round((k - p * 4 - f * 9) / 4));
  return {bmr: Math.round(b), tdee: Math.round(tdee), kcal: k, p, c, f};
}
