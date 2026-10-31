export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const p2 = n => String(n).padStart(2, '0');
// Days are keyed by the device's LOCAL calendar date (YYYY-MM-DD) so history never shifts.
export const key = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const shift = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
export const num = v => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : 0; };
export const r1 = n => Math.round(n * 10) / 10;
export const kcalFrom = (p, c, f) => Math.round(p * 4 + c * 4 + f * 9);   // approximate 4/4/9
export const timeout = (p, ms = 10000) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('network timeout')), ms))]);
export const slugify = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const readMin = t => Math.max(1, Math.round(t.trim().split(/\s+/).length / 200));
export const safeUrl = u => /^https:\/\//i.test(u || '') ? u : '';
export const fmt = t => t?.toDate ? t.toDate().toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'}) : '';
export const dlabel = k => parse(k).toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'});
let tt; export function toast(m, err) { const e = $('#toast'); e.textContent = m; e.className = 'on' + (err ? ' err' : ''); clearTimeout(tt); tt = setTimeout(() => e.className = '', 3800); }
export const sync = t => { const e = $('#sync'); if (e) e.textContent = t; };
export function meta(title, desc, img, type = 'website') {
  document.title = title;
  const set = (n, v, a = 'name') => { let e = document.head.querySelector(`meta[${a}="${n}"]`); if (!e) { e = document.createElement('meta'); e.setAttribute(a, n); document.head.append(e); } e.content = v || ''; };
  set('description', desc); set('og:title', title, 'property'); set('og:description', desc, 'property'); set('og:image', img, 'property'); set('og:type', type, 'property'); set('twitter:card', img ? 'summary_large_image' : 'summary');
  let l = document.querySelector('link[rel=canonical]'); if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.append(l); } l.href = location.origin + location.pathname;
}
export function ring(v, g, lab, u = '') {
  const p = g ? Math.min(1, v / g) : 0, c = 2 * Math.PI * 32, left = g - v, n = x => Math.round(x).toLocaleString();
  return `<div class="rg"><svg viewBox="0 0 78 78" aria-hidden="true"><circle cx="39" cy="39" r="32" fill="none" stroke="var(--c0)" stroke-width="7"/><circle cx="39" cy="39" r="32" fill="none" stroke="var(--gold)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 39 39)" style="transition:stroke-dasharray .4s"/><text x="39" y="44" text-anchor="middle">${Math.round(p * 100)}%</text></svg><b>${lab}</b>${n(v)} / ${n(g)}${u}<br><small>${left >= 0 ? n(left) + u + ' left' : n(-left) + u + ' over'}</small></div>`;
}
export const bars = (v, l, aria) => { const m = Math.max(...v, 1); return `<div class="bars${v.length > 10 ? ' sm' : ''}" role="img" aria-label="${aria}">${v.map((x, i) => `<div title="${l[i]}: ${Math.round(x)}"><i style="height:${Math.max(x / m * 100, x ? 3 : 0)}%"></i><span>${l[i]}</span></div>`).join('')}</div>`; };
