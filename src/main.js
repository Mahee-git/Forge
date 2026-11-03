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
const NAV = [
  ['/dashboard', 'Home', '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
  ['/activity', 'Activity', '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/>'],
  ['/nutrition', 'Nutrition', '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3v18M17 3c3 2 4 5 4 8h-4"/>'],
  ['/hydration', 'Hydration', '<path d="M12 3s7 7.1 7 12a7 7 0 1 1-14 0c0-4.9 7-12 7-12z"/>'],
  ['/progress', 'Progress', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="m13 11 7-7M16 4h4v4"/>'],
];
const gate = '<h1>Sign in to track</h1><p class="mut">Your records are private and saved to your account.</p><a class="b g" href="/account">Sign in or register</a>';
const landing = () => '<h1>Forge</h1><p class="mut" style="font-size:18px">Track meals, movement, hydration and progress.</p><a class="b g" href="/account">Get started</a><a class="b" href="/blog">Read the blog</a>';
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
  meta('Forge', 'Track meals, movement, hydration and progress.');
  const h = await view(p); if (id !== rid) return;
  const current = p === '/' ? '/dashboard' : p;
  const nav = S.user ? `<nav class="glass-nav" aria-label="Main navigation">${NAV.map(([url, label, svg]) => `<a href="${url}" aria-label="${label}" title="${label}" ${current === url ? 'class="on" aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${svg}</svg><span>${label}</span></a>`).join('')}</nav>` : '';
  $('#app').innerHTML = `<header class="site-head"><a class="brand" href="/">Forge</a><div class="site-tools"><a href="/blog">Blog</a><a href="/account">Account</a><button class="b" data-a="theme" aria-label="Switch theme">${document.documentElement.dataset.theme === 'dark' ? '☀' : '☾'}</button></div></header>${nav}<main><div class="wrap">${h}</div></main>`;
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
