import { collection, doc, getDocFromServer, getDocsFromServer, query, where, limit, orderBy, startAfter, runTransaction, serverTimestamp, writeBatch, type QueryConstraint, type DocumentData, type QueryDocumentSnapshot, type Transaction } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';
import { searchTokens } from './business';
import { assertVersion, eligible, gigSchema, venueSchema, validatePayment, validateVenueFlow, istInstant, type CollectionName, type Venue, type Gig, type FollowUp, type Profile } from './domain';
export function online() {
    if (!navigator.onLine)
        throw new Error('You are offline. Reconnect before saving.');
}
export const audit = (u: User, create = false) => ({ ...create ? { createdAt: serverTimestamp(), createdByUid: u.uid, createdByName: u.displayName || 'Band member' } : {}, updatedAt: serverTimestamp(), updatedByUid: u.uid, updatedByName: u.displayName || 'Band member' });
export async function page<T>(name: CollectionName, filters: QueryConstraint[] = [], cursor?: QueryDocumentSnapshot<DocumentData>, size = 30) {
    online();
    const snap = await getDocsFromServer(query(collection(db, name), ...filters, ...cursor ? [startAfter(cursor)] : [], limit(size)));
    return { rows: snap.docs.map(d => ({ ...d.data(), id: d.id }) as T), cursor: snap.docs.at(-1), more: snap.size === size };
}
export async function load<T>(name: CollectionName, id: string) {
    online();
    const s = await getDocFromServer(doc(db, name, id));
    if (!s.exists())
        throw new Error('Record no longer exists.');
    return { ...s.data(), id: s.id } as T;
}
export async function profile(u: User) {
    online();
    const ref = doc(db, 'profiles', u.uid);
    await runTransaction(db, async (tx) => {
        const s = await tx.get(ref);
        tx.set(ref, { displayName: u.displayName || 'Band member', email: u.email || '', photoURL: u.photoURL || '', lastActiveAt: serverTimestamp(), ...s.exists() ? {} : { createdAt: serverTimestamp(), theme: 'system' } }, { merge: true });
    });
    return load<Profile>('profiles', u.uid);
}
export async function setTheme(u: User, theme: Profile['theme']) {
    online();
    const b = writeBatch(db);
    b.update(doc(db, 'profiles', u.uid), { theme });
    await b.commit();
}
async function guard(tx: Transaction, name: 'venues' | 'gigs', id: string, version?: number) {
    const r = doc(db, name, id);
    const s = await tx.get(r);
    if (!s.exists() || s.data().deleting)
        throw new Error('This record is being deleted or no longer exists.');
    if (version !== undefined)
        assertVersion(s.data().version, version);
    return { ref: r, data: s.data() };
}
export function followData(type: 'Venue' | 'Payment', venueId: string, venueName: string, gigId: string, d: string, t: string, u: User, previousId = '') {
    return { type, venueId, venueName, gigId, paymentId: gigId, scheduledAt: istInstant(d, t), status: 'Pending', note: '', previousId, nextId: '', completedAt: null, completedByUid: '', completedByName: '', version: 1, ...audit(u, true) };
}
export async function saveVenue(u: User, input: unknown, old: Venue | undefined, follow: {
    date: string;
    time: string;
} | null, gig: unknown | null) {
    online();
    const v = venueSchema.parse(input);
    if (!old || v.response !== 'Gig confirmed' || gig)
        validateVenueFlow(input, follow, gig);
    const ref = old ? doc(db, 'venues', old.id) : doc(collection(db, 'venues'));
    const g = gig ? gigSchema.parse({ ...gig as object, venueId: ref.id, venueName: v.name }) : null;
    await runTransaction(db, async (tx) => {
        if (old)
            await guard(tx, 'venues', old.id, old.version);
        tx.set(ref, { ...v, searchTokens: searchTokens([v.name, v.contact, v.phone]), deleting: false, version: (old?.version || 0) + 1, ...audit(u, !old) }, { merge: true });
        if (follow)
            tx.set(doc(collection(db, 'venueFollowUps')), followData('Venue', ref.id, v.name, '', follow.date, follow.time, u));
        if (g)
            tx.set(doc(collection(db, 'gigs')), { ...g, deleting: false, version: 1, ...audit(u, true) });
    });
    return ref.id;
}
export async function saveGig(u: User, input: unknown, old?: Gig) {
    online();
    const g = gigSchema.parse(input);
    const ref = old ? doc(db, 'gigs', old.id) : doc(collection(db, 'gigs'));
    await runTransaction(db, async (tx) => {
        await guard(tx, 'venues', g.venueId);
        if (old)
            await guard(tx, 'gigs', old.id, old.version);
        const payment = old ? await tx.get(doc(db, 'paymentRecords', old.id)) : null;
        if (payment?.exists())
            tx.update(payment.ref, { gigStatus: g.status, gigDate: g.date, version: payment.data().version + 1, ...audit(u) });
        tx.set(ref, { ...g, deleting: false, version: (old?.version || 0) + 1, ...audit(u, !old) }, { merge: true });
    });
    return ref.id;
}
export async function savePayment(u: User, gig: Gig, status: unknown, follow: {
    date: string;
    time: string;
} | null, expected: number) {
    online();
    const s = validatePayment(status, follow);
    await runTransaction(db, async (tx) => {
        await guard(tx, 'venues', gig.venueId);
        const g = await guard(tx, 'gigs', gig.id, gig.version);
        if (!eligible(g.data as Gig))
            throw new Error('This gig is not eligible for payment review.');
        const ref = doc(db, 'paymentRecords', gig.id);
        const p = await tx.get(ref);
        assertVersion(p.exists() ? p.data().version : 0, expected);
        tx.set(ref, { gigId: gig.id, venueId: gig.venueId, gigStatus: gig.status, gigDate: gig.date, status: s, version: expected + 1, ...audit(u, !p.exists()) }, { merge: true });
        if (follow)
            tx.set(doc(collection(db, 'paymentFollowUps')), followData('Payment', gig.venueId, gig.venueName, gig.id, follow.date, follow.time, u));
    });
}
export async function finishFollow(u: User, f: FollowUp, note: string, next?: {
    date: string;
    time: string;
}) {
    online();
    if (note.length > 4000)
        throw new Error('Note must be 4000 characters or fewer.');
    const col = f.type === 'Venue' ? 'venueFollowUps' : 'paymentFollowUps';
    const ref = doc(db, col, f.id);
    const nextRef = doc(collection(db, col));
    await runTransaction(db, async (tx) => {
        await guard(tx, 'venues', f.venueId);
        if (f.gigId)
            await guard(tx, 'gigs', f.gigId);
        const s = await tx.get(ref);
        if (!s.exists())
            throw new Error('Follow-up no longer exists.');
        assertVersion(s.data().version, f.version);
        if (s.data().status !== 'Pending')
            throw new Error('This follow-up has already been handled.');
        tx.update(ref, { status: next ? 'Rescheduled' : 'Completed', note, nextId: next ? nextRef.id : '', completedAt: serverTimestamp(), completedByUid: u.uid, completedByName: u.displayName || 'Band member', version: f.version + 1, ...audit(u) });
        if (next)
            tx.set(nextRef, followData(f.type, f.venueId, f.venueName, f.gigId, next.date, next.time, u, f.id));
    });
}
export async function deletePayment(_u: User, g: Gig, version: number) {
    online();
    await runTransaction(db, async (tx) => {
        await guard(tx, 'venues', g.venueId);
        await guard(tx, 'gigs', g.id);
        const r = doc(db, 'paymentRecords', g.id);
        const s = await tx.get(r);
        if (!s.exists())
            return;
        assertVersion(s.data().version, version);
        tx.delete(r);
    }); // Follow-up history deliberately remains linked to the gig.
}
export async function deleteFollow(f: FollowUp) {
    online();
    const r = doc(db, f.type === 'Venue' ? 'venueFollowUps' : 'paymentFollowUps', f.id);
    await runTransaction(db, async (tx) => {
        const s = await tx.get(r);
        if (!s.exists())
            return;
        assertVersion(s.data().version, f.version);
        tx.delete(r);
    });
}
export async function cascadeDelete(u: User, name: 'venues' | 'gigs', id: string, version: number) {
    online();
    const root = doc(db, name, id);
    await runTransaction(db, async (tx) => {
        const s = await tx.get(root);
        if (!s.exists())
            return;
        if (!s.data().deleting)
            assertVersion(s.data().version, version);
        tx.update(root, { deleting: true, version: s.data().version + 1, ...audit(u) });
    });
    const field = name === 'venues' ? 'venueId' : 'gigId';
    for (const child of (name === 'venues' ? ['venueFollowUps', 'paymentFollowUps', 'paymentRecords', 'gigs'] : ['paymentFollowUps', 'paymentRecords'])) {
        for (;;) {
            const s = await getDocsFromServer(query(collection(db, child), where(field, '==', id), limit(100)));
            if (s.empty)
                break;
            const b = writeBatch(db);
            s.docs.forEach(d => b.delete(d.ref));
            await b.commit();
        }
    }
    const b = writeBatch(db);
    b.delete(root);
    await b.commit();
}
export const newest = [orderBy('createdAt', 'desc')];
export { where, orderBy };
