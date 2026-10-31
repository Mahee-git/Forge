// All Firestore access lives here. Schema:
// users/{uid}                    profile: {displayName, theme, exercises:[{id,name,unit,target}], nut:{kcal,p,c,f}}
// users/{uid}/days/{YYYY-MM-DD}  {counts:{exerciseId:n}, meals:[{id,meal,name,qty,unit,k,p,c,f}], burn}
// users/{uid}/foods/{id}         saved foods   | users/{uid}/weights/{YYYY-MM-DD} {kg}
// posts/{slug}                   blog posts (status: draft|published)
import {db} from './firebase.js';
import {doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, orderBy, documentId, serverTimestamp as ts, writeBatch} from 'firebase/firestore';
import {timeout as T} from './util.js';
const col = (u, n) => collection(db, 'users', u, n);
export const profile = async u => { const s = await getDoc(doc(db, 'users', u)); return s.exists() ? s.data() : null; };
export const setProfile = (u, d) => T(setDoc(doc(db, 'users', u), {...d, updatedAt: ts()}, {merge: true}));
export const days = async (u, from) => { const o = {}; (await getDocs(query(col(u, 'days'), where(documentId(), '>=', from)))).forEach(s => o[s.id] = s.data()); return o; };
export const saveDay = (u, k, d) => T(setDoc(doc(db, 'users', u, 'days', k), {...d, updatedAt: ts()}, {merge: true}));
export const dayIds = async u => (await getDocs(col(u, 'days'))).docs.map(s => s.id);
export const foods = async u => (await getDocs(col(u, 'foods'))).docs.map(s => ({id: s.id, ...s.data()}));
export const saveFood = (u, id, d) => T(setDoc(doc(db, 'users', u, 'foods', id), d));
export const delFood = (u, id) => T(deleteDoc(doc(db, 'users', u, 'foods', id)));
export const weights = async u => (await getDocs(col(u, 'weights'))).docs.map(s => ({date: s.id, kg: s.data().kg})).sort((a, b) => a.date < b.date ? -1 : 1);
export const saveWeight = (u, k, kg) => T(setDoc(doc(db, 'users', u, 'weights', k), {kg, updatedAt: ts()}));
export const delWeight = (u, k) => T(deleteDoc(doc(db, 'users', u, 'weights', k)));
export const posts = async () => (await getDocs(query(collection(db, 'posts'), where('status', '==', 'published')))).docs.map(s => s.data()).sort((a, b) => (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0));
export const allPosts = async () => (await getDocs(query(collection(db, 'posts'), orderBy('updatedAt', 'desc')))).docs.map(s => s.data());
export const post = async s => { try { const x = await getDoc(doc(db, 'posts', s)); return x.exists() ? x.data() : null; } catch { return null; } };
export const savePost = p => T(setDoc(doc(db, 'posts', p.slug), {...p, publishedAt: p.publishedAt === 'now' ? ts() : p.publishedAt, updatedAt: ts()}, {merge: true}));
export const delPost = s => T(deleteDoc(doc(db, 'posts', s)));
export const importDays = async (u, items) => { for (let i = 0; i < items.length; i += 400) { const b = writeBatch(db); items.slice(i, i + 400).forEach(([k, d]) => b.set(doc(db, 'users', u, 'days', k), {...d, importedAt: ts()})); await T(b.commit(), 20000); } };
export const exportAll = async u => { const d = {}; (await getDocs(col(u, 'days'))).forEach(s => d[s.id] = s.data()); return {profile: await profile(u), days: d, foods: await foods(u), weights: await weights(u)}; };
export const wipe = async u => { for (const n of ['days', 'foods', 'weights']) { const s = (await getDocs(col(u, n))).docs; for (let i = 0; i < s.length; i += 400) { const b = writeBatch(db); s.slice(i, i + 400).forEach(x => b.delete(x.ref)); await b.commit(); } } await deleteDoc(doc(db, 'users', u)); };
