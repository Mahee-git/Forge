import {marked} from 'marked';
import DOMPurify from 'dompurify';
import {S, A, F, render, go} from '../state.js';
import * as D from '../db.js';
import {esc, fmt, meta, safeUrl, slugify, readMin, toast, $} from '../util.js';
const md = t => DOMPurify.sanitize(marked.parse(t || ''));
const card = (p, big) => `<a class="post card" href="/blog/${p.slug}">${p.cover ? `<img class="cover" loading="lazy" src="${esc(safeUrl(p.cover))}" alt="">` : ''}<div class="tag" style="margin-top:10px">${p.featured ? 'Featured · ' : ''}${esc(p.category)}</div><${big ? 'h1' : 'h3'} style="margin:4px 0">${esc(p.title)}</${big ? 'h1' : 'h3'}><p class="mut" style="margin:0">${esc(p.excerpt)}</p><small>${fmt(p.publishedAt)} · ${p.readMin || 1} min read</small></a>`;
export async function blogList() {
  meta('Blog — Forge', 'Articles on training, nutrition and consistency.');
  if (!S.posts) try { S.posts = await D.posts(); } catch (e) { return `<h1>Blog</h1><p class="err">Couldn’t load articles: ${esc(e.message)}</p>`; }
  const q = new URLSearchParams(location.search), s = (q.get('q') || '').toLowerCase(), c = q.get('cat') || '';
  const cats = [...new Set(S.posts.map(p => p.category).filter(Boolean))];
  const l = S.posts.filter(p => (!c || p.category === c) && (!s || (p.title + ' ' + p.excerpt + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(s))).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  return `<h1>Blog</h1><form data-f="search" class="dn"><input type="search" name="q" value="${esc(s)}" placeholder="Search articles" aria-label="Search" style="width:220px"><button class="b">Search</button></form><div>${cats.map(x => `<a class="chip" style="padding:6px 12px;font-size:13px" href="/blog?cat=${encodeURIComponent(x)}">${esc(x)}</a>`).join('')}${c || s ? '<a class="chip" style="padding:6px 12px;font-size:13px" href="/blog">Clear</a>' : ''}</div>${l.length ? l.map(p => card(p)).join('') : '<div class="card"><p class="mut">No articles found.</p></div>'}`;
}
F.search = f => go('/blog' + (f.q ? '?q=' + encodeURIComponent(f.q) : ''));
export async function article(slug) {
  if (!S.posts) S.posts = await D.posts().catch(() => null);
  const p = (S.posts || []).find(x => x.slug === slug) || await D.post(slug);
  if (!p || (p.status !== 'published' && !S.admin)) { meta('Not found — Forge', ''); return '<h1>Article not found</h1><p><a href="/blog">← Back to the blog</a></p>'; }
  meta(p.seoTitle || p.title + ' — Forge', p.seoDesc || p.excerpt, safeUrl(p.cover), 'article');
  const rel = (S.posts || []).filter(x => x.slug !== slug && x.category === p.category).slice(0, 3);
  return `<p><a href="/blog">← Blog</a></p><article class="prose"><div class="tag">${esc(p.category)}</div><h1>${esc(p.title)}</h1><p class="mut">${esc(p.author)} · ${fmt(p.publishedAt)} · ${p.readMin || 1} min read${p.status !== 'published' ? ' · DRAFT' : ''}</p>${p.cover ? `<img class="cover" src="${esc(safeUrl(p.cover))}" alt="">` : ''}${md(p.content)}</article>${rel.length ? `<h3 style="margin-top:32px">Related</h3>${rel.map(x => card(x)).join('')}` : ''}`;
}
// ---- Admin CMS (UI is gated by the admin claim; Firestore rules enforce it server-side) ----
const blank = () => ({isNew: true, status: 'draft', title: '', slug: '', excerpt: '', content: '', cover: '', category: '', tags: [], seoTitle: '', seoDesc: '', featured: false});
A.newpost = () => { S.ed = blank(); render(); };
A.editpost = async el => { S.ed = {...(await D.post(el.dataset.s))}; render(); };
A.cancelpost = () => { S.ed = null; render(); };
A.delpost = async el => { if (!confirm('Delete this post permanently?')) return; await D.delPost(el.dataset.s); S.apl = S.posts = null; toast('Deleted'); render(); };
A.preview = () => { const v = $('#pv'); v.innerHTML = md($('[name=content]').value); v.hidden = !v.hidden; };
F.post = async f => {
  const old = S.ed, slug = old.isNew ? slugify(f.slug || f.title) : old.slug;
  if (!f.title.trim() || !slug) throw new Error('Title and slug are required');
  if (old.isNew && await D.post(slug)) throw new Error('That slug already exists');
  const status = f.act === 'publish' ? 'published' : 'draft';
  await D.savePost({slug, title: f.title.trim(), excerpt: f.excerpt.trim(), content: f.content, cover: safeUrl(f.cover.trim()), category: f.category.trim(), tags: f.tags.split(',').map(s => s.trim()).filter(Boolean), featured: !!f.featured, seoTitle: f.seoTitle.trim(), seoDesc: f.seoDesc.trim(), status, author: old.author || S.user.displayName || 'Forge', readMin: readMin(f.content), publishedAt: status === 'published' ? (old.publishedAt || 'now') : (old.publishedAt || null)});
  S.ed = S.apl = S.posts = null; toast(status === 'published' ? 'Published' : 'Draft saved'); render();
};
export async function admin() {
  if (!S.admin) return '<h1>Not authorised</h1><p class="mut">This area is for administrators.</p>';
  meta('Admin — Forge', '');
  const p = S.ed;
  if (p) return `<h1>${p.isNew ? 'New post' : 'Edit post'}</h1><form data-f="post" class="card">
<label>Title<input name="title" required value="${esc(p.title)}"></label><label>Slug (URL)<input name="slug" value="${esc(p.slug)}" ${p.isNew ? '' : 'readonly'} placeholder="auto from title"></label>
<label>Excerpt<input name="excerpt" value="${esc(p.excerpt)}"></label><label>Cover image URL (https)<input name="cover" value="${esc(p.cover)}"></label>
<div class="row" style="grid-template-columns:1fr 1fr"><label>Category<input name="category" value="${esc(p.category)}"></label><label>Tags (comma separated)<input name="tags" value="${esc((p.tags || []).join(', '))}"></label></div>
<label>Content (Markdown)<textarea name="content">${esc(p.content)}</textarea></label><div id="pv" class="prose card" hidden></div>
<label>SEO title<input name="seoTitle" value="${esc(p.seoTitle)}"></label><label>Meta description<input name="seoDesc" value="${esc(p.seoDesc)}"></label>
<label><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Featured</label>
<button type="button" class="b" data-a="preview">Preview</button><button class="b" name="act" value="draft">Save draft</button><button class="b g" name="act" value="publish">${p.status === 'published' ? 'Update published' : 'Publish'}</button>${p.status === 'published' ? '<button class="b" name="act" value="unpublish">Unpublish</button>' : ''}<button type="button" class="b" data-a="cancelpost">Close</button></form>`;
  S.apl ||= await D.allPosts();
  return `<h1>Admin · Blog</h1><button class="b g" data-a="newpost">New post</button>${S.apl.map(x => `<div class="card m"><span><b>${esc(x.title)}</b><br><small>${x.status} · /blog/${x.slug}</small></span><span><button class="b" data-a="editpost" data-s="${x.slug}">Edit</button><button class="b danger" data-a="delpost" data-s="${x.slug}">Delete</button></span></div>`).join('') || '<p class="mut">No posts yet.</p>'}`;
}
