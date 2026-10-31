import {auth, db} from './firebase.js';
import {doc, getDoc} from 'firebase/firestore';
import {onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, updateProfile, deleteUser} from 'firebase/auth';
export const watch = cb => onAuthStateChanged(auth, async u => {
  let admin = false;
  if (u) { try { admin = (await u.getIdTokenResult()).claims.admin === true; } catch {} if (!admin) try { admin = (await getDoc(doc(db, 'admins', u.uid))).exists(); } catch {} }
  cb(u, admin);
});
export const register = async (name, email, pw) => { const c = await createUserWithEmailAndPassword(auth, email, pw); if (name) await updateProfile(c.user, {displayName: name}); return c.user; };
export const login = (e, p) => signInWithEmailAndPassword(auth, e, p);
export const google = () => signInWithPopup(auth, new GoogleAuthProvider());
export const logout = () => signOut(auth);
export const reset = e => sendPasswordResetEmail(auth, e);
export const rename = n => updateProfile(auth.currentUser, {displayName: n});
export const removeUser = () => deleteUser(auth.currentUser);
const M = {'auth/invalid-credential': 'Wrong email or password.', 'auth/email-already-in-use': 'That email is already registered.', 'auth/weak-password': 'Password needs at least 6 characters.', 'auth/invalid-email': 'Enter a valid email.', 'auth/network-request-failed': 'Network problem. Try again.', 'auth/popup-closed-by-user': 'Sign-in was cancelled.'};
export const authError = e => M[e.code] || e.message;
