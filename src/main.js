import './style.css';
import {configured} from './firebase.js';
import {S, A, F, C, hooks, render, go, setTheme, loadAll, BASE, path, swap} from './state.js';
import {esc, meta, toast, $} from './util.js';
import {watch} from './auth.js';
import * as D from './db.js';
import {dashboard, activity} from './views/dash.js';
import {nutrition} from './views/nutrition.js';
import {hydration} from './views/hydration.js';
import {progress} from './views/progress.js';
import {blogList, article, admin} from './views/blog.js';
import {account, authView} from './views/account.js';
const NAV = [['/dashboard', 'Dashboard'], ['/activity', 'Activity'], ['/nutrition', 'Nutrition'], ['/hydration', 'Hydration'], ['/progress', 'Progress'], ['/blog', 'Blog'], ['/account', 'Account']];
const gate = '<h1>Sign in to track</h1><p class="mut">Your records are private and saved to your account.</p><a class="b g" href="/account">Sign in or register</a>';
const landing = () => '<h1>Forge</h1><p class="mut" style="font-size:18px">A quiet place to build the habit — workouts, nutrition and progress in one calm tracker.</p><a class="b g" href="/account">Start tracking</a><a class="b" href="/blog">Read the blog</a>';
async function view(p) {
  if (!configured) return '<h1>Setup needed</h1><p>Open <code>src/firebase-config.js</code> and paste your Firebase web config. See README.</p>';
  if (!S.ready) return '<p class="mut">Loading…</p>';
  if (S.err && S.user) return `<h1>Couldn’t load your data</h1><p class="err">${esc(S.err)}</p><button class="b" data-a="retry">Retry</button>`;
  if (p === '/') return S.user ? dashboard() : landing();
  if (p === '/blog') return blogList();
  if (p.startsWith('/blog/')) return article(decodeURIComponent(p.slice(6)));
  if (p === '/account') return S.user ? account() : authView();
  if (!S.user) return gate;
  if (p === '/admin') return admin();
  return ({'/dashboard': dashboard, '/activity': activity, '/nutrition': nutrition, '/hydration': hydration, '/progress': progress}[p] || (() => '<h1>Page not found</h1>'))();
}
let rid = 0;
hooks.render = async () => {
  const p = path(), id = ++rid, y = scrollY, f = document.activeElement, d = f?.dataset;
  const sel = d?.a ? `[data-a="${d.a}"]${d.id ? `[data-id="${d.id}"]` : ''}${d.n ? `[data-n="${d.n}"]` : ''}` : null;
  meta('Forge — Daily discipline', 'A quiet, premium tracker for workouts and nutrition.');
  const h = await view(p); if (id !== rid) return;
  $('#app').innerHTML = `<nav aria-label="Main"><div class="brand">Forge</div>${NAV.map(n => `<a href="${n[0]}" ${p.startsWith(n[0]) ? 'class="on" aria-current="page"' : ''}>${n[1]}</a>`).join('')}</nav><main><div class="wrap"><div class="top"><button class="b" data-a="theme" aria-label="Switch between light and dark mode">${document.documentElement.dataset.theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}</button></div>${h}</div></main>`;
  if (BASE) document.querySelectorAll('#app a[href^="/"]').forEach(a => a.setAttribute('href', BASE + a.getAttribute('href')));
  scrollTo(0, y); const hm = $('.hm'); if (hm) hm.scrollLeft = hm.scrollWidth; if (sel) $(sel)?.focus();
};
A.retry = async () => { S.ready = false; render(); await loadAll(); S.ready = true; render(); };
A.theme = () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('forge-theme', n); setTheme(n); if (S.user) { S.profile = {...(S.profile || {}), theme: n}; D.setProfile(S.user.uid, {theme: n}).catch(() => {}); } render(); };
const run = fn => async e => { try { await fn(e); } catch (x) { toast(x.message, 1); } };
document.addEventListener('click', run(async e => {
  const l = e.target.closest('a');
  if (l && l.origin === location.origin && l.pathname.startsWith(BASE) && !l.target && !e.metaKey && !e.ctrlKey) { e.preventDefault(); go(l.pathname.slice(BASE.length) + l.search); scrollTo(0, 0); return; }
  const a = e.target.closest('[data-a]'); if (a && A[a.dataset.a]) await A[a.dataset.a](a, e);
}));
document.addEventListener('change', run(async e => { const c = e.target.closest('[data-c]'); if (c && C[c.dataset.c]) await C[c.dataset.c](c); }));
document.addEventListener('submit', run(async e => { const f = e.target.closest('form[data-f]'); if (!f) return; e.preventDefault(); await F[f.dataset.f](Object.fromEntries(new FormData(f, e.submitter)), f); }));
addEventListener('popstate', render);
setTheme(localStorage.getItem('forge-theme'));
if (!configured) { S.ready = true; render(); }
else watch(async (u, adm) => {
  S.user = u; S.admin = adm; S.ready = false; render();
  if (u) { await loadAll(); setTheme(S.profile?.theme || localStorage.getItem('forge-theme')); if (path() === '/account') swap(S.fresh ? '/account?new=1' : '/dashboard'); S.fresh = false; }
  else Object.assign(S, {profile: null, days: {}, foods: [], weights: []});
  S.ready = true; render();
});
