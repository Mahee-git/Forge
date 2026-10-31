import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import {firebaseConfig} from './firebase-config.js';
export const configured = !!firebaseConfig.apiKey && !/^PASTE/i.test(firebaseConfig.apiKey);
const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = configured ? getAuth(app) : null;   // persistent sessions by default (IndexedDB)
export const db = configured ? getFirestore(app) : null;
