import {S, A, F, render, go, nut, save, setTheme, loadAll} from '../state.js';
import * as D from '../db.js';
import {auth} from '../firebase.js';
import {register, login, google, logout, reset, rename, removeUser, authError} from '../auth.js';
import {esc, num, toast, $} from '../util.js';
import {targets, PAL} from '../health.js';
import {pdf} from '../report.js';
let mode = 'login';
A.mode = () => { mode = mode === 'login' ? 'register' : 'login'; render(); };
A.google = async () => { try { await google(); } catch (e) { throw new Error(authError(e)); } };
A.forgot = async () => { const e = $('[name=email]').value.trim(); if (!e) throw new Error('Enter your email first'); try { await reset(e); toast('Password reset email sent'); } catch (x) { throw new Error(authError(x)); } };
A.logout = async () => { await logout(); go('/'); };
F.auth = async f => {
  try { if (mode === 'register') { S.fresh = true; const u = await register(f.name, f.email, f.password); D.setProfile(u.uid, {displayName: f.name || ''}).catch(() => {}); } else await login(f.email, f.password); }
  catch (e) { S.fresh = false; throw new Error(authError(e)); }
};
export const authView = () => { const r = mode === 'register'; return `<h1>${r ? 'Create your account' : 'Welcome back'}</h1><p class="mut">Your records stay private to your account.</p><div class="card narrow"><form data-f="auth">${r ? '<label>Name (optional)<input name="name" autocomplete="name"></label>' : ''}<label>Email<input name="email" type="email" required autocomplete="email"></label><label>Password<input name="password" type="password" required minlength="6" autocomplete="${r ? 'new-password' : 'current-password'}"></label><button class="b g" style="margin-top:14px">${r ? 'Register' : 'Log in'}</button></form><button class="b" data-a="google">Continue with Google</button><p>${r ? '' : '<button class="lnk" data-a="forgot">Forgot password?</button> · '}<button class="lnk" data-a="mode">${r ? 'I already have an account' : 'Create an account'}</button></p></div>`; };
F.prof = async f => { const n = f.name.trim(); await rename(n); const p = {displayName: n, theme: f.theme}; if (await save(() => D.setProfile(S.user.uid, p))) { S.profile = {...(S.profile || {}), ...p}; localStorage.setItem('forge-theme', f.theme); setTheme(f.theme); render(); toast('Profile saved'); } };
F.targets = async f => { const nutv = {kcal: num(f.kcal), p: num(f.p), c: num(f.c), f: num(f.f)}; if (Object.values(nutv).some(v => !v)) throw new Error('All targets must be above 0'); if (await save(() => D.setProfile(S.user.uid, {nut: nutv}))) { S.profile = {...(S.profile || {}), nut: nutv}; render(); toast('Targets saved'); } };
A.export = async () => { const o = await D.exportAll(S.user.uid), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(o, null, 2)], {type: 'application/json'})); a.download = 'forge-export.json'; a.click(); };
A.delacct = async () => {
  if (Date.now() - Date.parse(auth.currentUser.metadata.lastSignInTime) > 3e5) throw new Error('For security, log out and log in again, then delete your account.');
  if (!confirm('Permanently delete your account and ALL records? This cannot be undone.')) return;
  await D.wipe(S.user.uid); await removeUser(); go('/');
};
// ---- Migration from the old localStorage "forge1" tracker ----
const flag = () => 'forge_mig_' + S.user.uid;
const local = () => { try { const o = JSON.parse(localStorage.getItem('forge1')); return o && o.days && Object.keys(o.days).length ? o : null; } catch { return null; } };
A.skipmig = () => { localStorage.setItem(flag(), 'skipped'); render(); };
A.mig = async () => {
  const o = local(), u = S.user.uid, have = new Set(await D.dayIds(u));
  const items = Object.entries(o.days).filter(([k]) => !have.has(k)).map(([k, d]) => [k, {counts: {pushups: d.pu || 0, pullups: d.pl || 0, situps: d.su || 0}, burn: d.burn || 0, meals: (d.meals || []).map(m => ({id: crypto.randomUUID(), meal: 'snacks', name: m.n || 'Meal', qty: 1, unit: 'serving', k: m.k || 0, p: m.p || 0, c: m.c || 0, f: m.f || 0}))}]);
  await D.importDays(u, items);
  const g = o.goals; if (g && !S.profile?.exercises && !S.profile?.nut) await D.setProfile(u, {exercises: [{id: 'pushups', name: 'Push-ups', unit: 'reps', target: g.pu || 50}, {id: 'pullups', name: 'Pull-ups', unit: 'reps', target: g.pl || 15}, {id: 'situps', name: 'Sit-ups', unit: 'reps', target: g.su || 60}], nut: {kcal: g.kcal || 2400, p: g.p || 140, c: g.c || 250, f: g.f || 70}});
  localStorage.setItem(flag(), 'imported'); await loadAll(); render(); toast(`Imported ${items.length} day(s); ${Object.keys(o.days).length - items.length} already existed and were kept`);
};
let EST = null;
F.estimate = async f => { const age = +f.age, kg = num(f.kg), cm = num(f.cm); if (!(age >= 18 && age <= 100)) throw new Error('The estimator is for adults (18+)'); if (!kg || !cm) throw new Error('Enter your weight and height'); EST = {...targets({sex: f.sex, age, kg, pal: +f.pal, goal: f.goal}), pal: +f.pal, age, sex: f.sex, cm}; render(); };
A.applyest = async () => { const p = {nut: {kcal: EST.kcal, p: EST.p, c: EST.c, f: EST.f}, age: EST.age, sex: EST.sex, height: EST.cm}; if (await save(() => D.setProfile(S.user.uid, p))) { S.profile = {...(S.profile || {}), ...p}; EST = null; render(); toast('Targets applied'); } };
A.pdf = async () => { toast('Preparing your PDF…'); await pdf(); };
export function account() {
  const T = nut(), o = local(), th = S.profile?.theme === 'dark' ? 'dark' : 'light', P = S.profile || {}, lw = S.weights.at(-1);
  return `<h1>Account</h1>${location.search.includes('new') ? '<div class="card"><b>Welcome to Forge.</b> Everything below is optional — set your targets now, or <a href="/dashboard">skip to your dashboard</a>.</div>' : ''}
${o && !localStorage.getItem(flag()) ? `<div class="card"><h3>Import your old Forge records</h3><p>Found ${Object.keys(o.days).length} days saved in this browser. Existing cloud days are never overwritten.</p><button class="b g" data-a="mig">Import</button><button class="b" data-a="skipmig">Skip</button></div>` : ''}
<form class="card" data-f="prof"><h3>Profile</h3><label>Display name<input name="name" value="${esc(S.user.displayName)}"></label><label>Email<input value="${esc(S.user.email)}" disabled></label><label>Theme<select name="theme">${['light', 'dark'].map(x => `<option ${x === th ? 'selected' : ''}>${x}</option>`).join('')}</select></label><button class="b g" style="margin-top:14px">Save</button></form>
<form class="card" data-f="targets"><h3>Daily nutrition targets</h3><small>Set your own numbers, or use the estimator below. Not medical advice.</small><div class="row">${[['kcal', 'Calories'], ['p', 'Protein g'], ['c', 'Carbs g'], ['f', 'Fat g']].map(a => `<label>${a[1]}<input name="${a[0]}" type="number" min="1" value="${T[a[0]]}"></label>`).join('')}</div><button class="b g" style="margin-top:14px">Save targets</button></form>
<form class="card" data-f="estimate"><h3>Estimate my targets</h3><small>Uses the FAO/WHO/UNU (Schofield) basal-metabolic-rate equations and FAO/WHO/UNU physical activity levels. Adults only.</small>
<div class="row"><label>Age<input name="age" type="number" min="18" max="100" required value="${P.age || ''}"></label><label>Sex<select name="sex"><option value="m" ${P.sex === 'm' ? 'selected' : ''}>Male</option><option value="f" ${P.sex === 'f' ? 'selected' : ''}>Female</option></select></label><label>Height (cm)<input name="cm" type="number" step="0.1" required value="${P.height || ''}"></label><label>Weight (kg)<input name="kg" type="number" step="0.1" required value="${lw ? lw.kg : ''}"></label></div>
<div class="row" style="grid-template-columns:2fr 1fr"><label>Activity level<select name="pal">${PAL.map(a => `<option value="${a[0]}" ${a[0] === 1.55 ? 'selected' : ''}>${a[1]}</option>`).join('')}</select></label><label>Goal<select name="goal"><option value="maintain">Maintain weight</option><option value="lose">Lose weight gently (−15%)</option><option value="gain">Gain weight gently (+10%)</option></select></label></div>
<button class="b g" style="margin-top:14px">Calculate</button>
${EST ? `<div class="card" style="background:var(--c0)"><p>Basal metabolic rate: <b>${EST.bmr} kcal</b> · Maintenance (BMR × PAL ${EST.pal}): <b>${EST.tdee} kcal</b></p><p>Suggested daily target: <b>${EST.kcal} kcal</b> · Protein <b>${EST.p} g</b> · Carbs <b>${EST.c} g</b> · Fat <b>${EST.f} g</b></p><button type="button" class="b g" data-a="applyest">Use these targets</button><br><small>Protein is set at 1.6 g/kg because you train (the WHO/FAO safe level for the general population is 0.83 g/kg; sports nutrition suggests 1.4–2.0). Fat is 25% of energy (WHO/FAO range 20–35%). Calories are never set below your BMR. These are estimates, not medical advice.</small></div>` : ''}</form>
<div class="card"><h3>Your data</h3><button class="b g" data-a="pdf">Download report (PDF)</button><button class="b" data-a="export">Backup (JSON)</button><button class="b" data-a="logout">Log out</button><button class="b danger" data-a="delacct">Delete account</button>${S.admin ? '<p><a href="/admin">Admin dashboard →</a></p>' : ''}</div>`;
}
