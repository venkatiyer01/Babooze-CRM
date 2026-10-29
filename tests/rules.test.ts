import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
let env: RulesTestEnvironment;
const token = (name = 'A') => ({ name, email: name.toLowerCase() + '@example.com', picture: '', firebase: { sign_in_provider: 'google.com', identities: { 'google.com': ['a'] } } });
const audit = (uid = 'a') => ({ createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdByUid: uid, createdByName: 'A', updatedByUid: uid, updatedByName: 'A', version: 1 });
const venue = () => ({ searchTokens: ['blue', 'note'], name: 'Blue Note', contact: 'Jo', phone: '+91 0012345', approachDate: '2026-10-28', approachedByUid: 'a', approachedByName: 'A', response: 'Awaiting reply', notes: '', deleting: false, ...audit() });
const gig = () => ({ name: 'Live', venueId: 'v', venueName: 'Blue Note', date: '2026-10-01', time: '20:00', payoutPaise: 100000, status: 'Upcoming', deleting: false, ...audit() });
const follow = () => ({ type: 'Venue', venueId: 'v', venueName: 'Blue Note', gigId: '', paymentId: '', scheduledAt: Timestamp.fromMillis(1800000000000), status: 'Pending', note: '', previousId: '', nextId: '', completedAt: null, completedByUid: '', completedByName: '', ...audit() });
const db = () => env.authenticatedContext('a', token()).firestore();
beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-ba-booze', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
});
beforeEach(async () => {
    await env.clearFirestore();
    await assertSucceeds(setDoc(doc(db(), 'profiles', 'a'), { displayName: 'A', email: 'a@example.com', photoURL: '', theme: 'system', createdAt: serverTimestamp(), lastActiveAt: serverTimestamp() }));
});
afterAll(async () => {
    await env.cleanup();
});
describe('access and shapes', () => {
    it('denies unauthenticated reads and writes for all business collections', async () => {
        for (const c of ['venues', 'gigs', 'venueFollowUps', 'paymentFollowUps', 'paymentRecords', 'profiles']) {
            const r = doc(env.unauthenticatedContext().firestore(), c, 'x');
            await assertFails(getDoc(r));
            await assertFails(setDoc(r, {}));
        }
    });
    it('denies non-Google authentication', async () => {
        await assertFails(getDoc(doc(env.authenticatedContext('password', { firebase: { sign_in_provider: 'password' } }).firestore(), 'venues', 'v')));
    });
    it('permits shared venue CRUD and rejects invalid data and stale versions', async () => {
        const r = doc(db(), 'venues', 'v');
        await assertSucceeds(setDoc(r, venue()));
        const other = env.authenticatedContext('b', token('B')).firestore();
        await assertSucceeds(getDoc(doc(other, 'venues', 'v')));
        await assertSucceeds(updateDoc(doc(other, 'venues', 'v'), { name: 'Changed', updatedByUid: 'b', updatedByName: 'B', updatedAt: serverTimestamp(), version: 2 }));
        await assertFails(updateDoc(r, { name: 'Stale', updatedAt: serverTimestamp(), version: 2 }));
        await assertFails(updateDoc(r, { payoutPaise: 1, updatedAt: serverTimestamp(), version: 3 }));
        await assertSucceeds(deleteDoc(doc(other, 'venues', 'v')));
    });
    it('protects other profiles and Google identity; permits own theme', async () => {
        const r = doc(db(), 'profiles', 'a');
        await assertSucceeds(updateDoc(r, { theme: 'dark' }));
        await assertFails(updateDoc(r, { displayName: 'Forged' }));
        const b = env.authenticatedContext('b', token('B')).firestore();
        await assertFails(updateDoc(doc(b, 'profiles', 'a'), { theme: 'light' }));
        await assertFails(deleteDoc(doc(b, 'profiles', 'a')));
        await assertSucceeds(getDoc(doc(b, 'profiles', 'a')));
        expect((await getDoc(r)).data()?.theme).toBe('dark');
    });
    it('allows multiple gigs at the same venue and validates amounts and enums', async () => {
        await setDoc(doc(db(), 'venues', 'v'), venue());
        for (const id of ['g1', 'g2'])
            await assertSucceeds(setDoc(doc(db(), 'gigs', id), gig()));
        await assertFails(setDoc(doc(db(), 'gigs', 'bad'), { ...gig(), payoutPaise: 1.5 }));
        await assertFails(setDoc(doc(db(), 'gigs', 'bad'), { ...gig(), status: 'Maybe' }));
    });
    it('allows payment and follow-up CRUD by Google members', async () => {
        const d = db();
        await setDoc(doc(d, 'venues', 'v'), venue());
        await setDoc(doc(d, 'gigs', 'g'), gig());
        const p = doc(d, 'paymentRecords', 'g');
        await assertSucceeds(setDoc(p, { gigId: 'g', venueId: 'v', gigDate: '2026-10-01', gigStatus: 'Upcoming', status: 'Payment received', ...audit() }));
        await assertSucceeds(getDoc(p));
        await assertSucceeds(updateDoc(p, { status: 'Payment denied', updatedAt: serverTimestamp(), version: 2 }));
        const f = doc(d, 'venueFollowUps', 'f');
        await assertSucceeds(setDoc(f, follow()));
        await assertSucceeds(updateDoc(f, { status: 'Completed', completedAt: serverTimestamp(), completedByUid: 'a', completedByName: 'A', updatedAt: serverTimestamp(), version: 2 }));
        await assertSucceeds(deleteDoc(f));
        await assertSucceeds(deleteDoc(p));
        await assertSucceeds(deleteDoc(doc(d, 'gigs', 'g')));
    });
    it('reschedules atomically preserving the old record and its schedule', async () => {
        const d = db();
        await setDoc(doc(d, 'venues', 'v'), venue());
        await setDoc(doc(d, 'venueFollowUps', 'f'), follow());
        const b = writeBatch(d);
        b.update(doc(d, 'venueFollowUps', 'f'), { status: 'Rescheduled', nextId: 'f2', completedAt: serverTimestamp(), completedByUid: 'a', completedByName: 'A', updatedAt: serverTimestamp(), version: 2 });
        b.set(doc(d, 'venueFollowUps', 'f2'), { ...follow(), previousId: 'f', scheduledAt: Timestamp.fromMillis(1800100000000) });
        await assertSucceeds(b.commit());
        expect((await getDoc(doc(d, 'venueFollowUps', 'f'))).data()?.status).toBe('Rescheduled');
    });
    it('locks out new dependent writes while a venue is deleting', async () => {
        const d = db();
        await setDoc(doc(d, 'venues', 'v'), venue());
        await updateDoc(doc(d, 'venues', 'v'), { deleting: true, version: 2, updatedAt: serverTimestamp() });
        await assertFails(setDoc(doc(d, 'gigs', 'g'), gig()));
        await assertFails(setDoc(doc(d, 'venueFollowUps', 'f'), follow()));
        await assertSucceeds(deleteDoc(doc(d, 'venues', 'v')));
    });
});
