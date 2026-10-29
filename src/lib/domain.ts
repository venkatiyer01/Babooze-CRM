import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
export const responses = ['Awaiting reply', 'Not right now', 'Follow-up required', 'Gig confirmed'] as const;
export const gigStatuses = ['Upcoming', 'Completed', 'Cancelled'] as const;
export const paymentStatuses = ['Payment received', 'Follow-up required', 'Payment denied'] as const;
export const text = z.string().trim().min(1, 'Required').max(160);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date').refine(v => {
    const d = new Date(v + 'T00:00:00Z');
    return !isNaN(+d) && d.toISOString().slice(0, 10) === v;
}, 'Invalid date');
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a time');
export const notes = z.string().trim().max(4000).default('');
export const gigSchema = z.object({ name: text, venueId: text, venueName: text, date, time, payoutPaise: z.number().int().min(0).max(100000000000), status: z.enum(gigStatuses) });
export const venueSchema = z.object({ name: text, contact: text, phone: z.string().trim().min(3).max(40).regex(/^[+\d ()-]+$/, 'Use a phone number'), approachDate: date, approachedByUid: text, approachedByName: text, response: z.enum(responses), notes });
export const followSchema = z.object({ date, time });
export function validateVenueFlow(v: unknown, follow: unknown, gig: unknown) {
    const parsed = venueSchema.parse(v);
    if (parsed.response === 'Follow-up required')
        followSchema.parse(follow);
    if (parsed.response === 'Gig confirmed')
        gigSchema.parse(gig);
    return parsed;
}
export function validatePayment(status: unknown, follow: unknown) {
    const parsed = z.enum(paymentStatuses).parse(status);
    if (parsed === 'Follow-up required')
        followSchema.parse(follow);
    return parsed;
}
export interface Audit {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdByUid: string;
    createdByName: string;
    updatedByUid: string;
    updatedByName: string;
    version: number;
}
export interface Venue extends Audit {
    id: string;
    name: string;
    contact: string;
    phone: string;
    approachDate: string;
    approachedByUid: string;
    approachedByName: string;
    response: typeof responses[number];
    notes: string;
    deleting: boolean;
}
export interface Gig extends Audit {
    id: string;
    name: string;
    venueId: string;
    venueName: string;
    date: string;
    time: string;
    payoutPaise: number;
    status: typeof gigStatuses[number];
    deleting: boolean;
}
export interface Payment extends Audit {
    id: string;
    gigId: string;
    venueId: string;
    status: typeof paymentStatuses[number];
}
export interface FollowUp extends Audit {
    id: string;
    type: 'Venue' | 'Payment';
    venueId: string;
    venueName: string;
    gigId: string;
    paymentId: string;
    scheduledAt: Timestamp;
    status: 'Pending' | 'Completed' | 'Rescheduled';
    note: string;
    previousId: string;
    nextId: string;
    completedAt: Timestamp | null;
    completedByUid: string;
    completedByName: string;
}
export interface Profile {
    id: string;
    displayName: string;
    email: string;
    photoURL: string;
    theme: 'light' | 'dark' | 'system';
    createdAt: Timestamp;
    lastActiveAt: Timestamp;
}
export type CollectionName = 'venues' | 'gigs' | 'venueFollowUps' | 'paymentFollowUps' | 'paymentRecords' | 'profiles';
export { todayIST, eligible, upcoming, money, toPaise, assertVersion } from './business';
import { dueState, resolveMember } from './business';
export const istInstant = (d: string, t: string) => Timestamp.fromDate(new Date(`${date.parse(d)}T${time.parse(t)}:00+05:30`));
export const reminderState = (f: Pick<FollowUp, 'status' | 'scheduledAt'>, now = Date.now()) => dueState(f.status, f.scheduledAt.toMillis(), now);
export const approachedBy = resolveMember;
export const formatInstant = (t: Timestamp) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(t.toDate()) + ' IST';
