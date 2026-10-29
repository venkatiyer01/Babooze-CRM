import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
const env = import.meta.env;
export const configured = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && !env.VITE_FIREBASE_PROJECT_ID.startsWith('replace'));
const app = initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY || 'placeholder', authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'localhost', projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-ba-booze', appId: env.VITE_FIREBASE_APP_ID || 'placeholder' });
export const auth = getAuth(app);
export const db = initializeFirestore(app, { localCache: memoryLocalCache() });
if (env.VITE_USE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
