import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { todayIST, eligible, upcoming, toPaise, approachedBy, validateVenueFlow, validatePayment, istInstant, reminderState, assertVersion, date } from '../src/lib/domain';
const venue = { name: 'Blue Note', contact: 'Jo', phone: '+91 0099887766', approachDate: '2026-10-28', approachedByUid: 'a', approachedByName: 'A', response: 'Awaiting reply', notes: '' };
const gig = { name: 'Friday live', venueId: 'v', venueName: 'Blue Note', date: '2026-10-30', time: '20:00', payoutPaise: 100001, status: 'Upcoming' };
describe('venue workflows', () => {
    it('defaults approached by to signed-in user', () => expect(approachedBy('', [], { uid: 'a', displayName: 'A' })).toEqual({ approachedByUid: 'a', approachedByName: 'A' }));
    it('accepts a registered member and rejects arbitrary names', () => {
        expect(approachedBy('b', [{ id: 'b', displayName: 'B' }], { uid: 'a', displayName: 'A' }).approachedByUid).toBe('b');
        expect(() => approachedBy('stranger', [], { uid: 'a', displayName: 'A' })).toThrow();
    });
    it('requires conditional fields', () => {
        expect(() => validateVenueFlow({ ...venue, response: 'Follow-up required' }, null, null)).toThrow();
        expect(() => validateVenueFlow({ ...venue, response: 'Gig confirmed' }, null, null)).toThrow();
        expect(validateVenueFlow({ ...venue, response: 'Gig confirmed' }, null, gig).response).toBe('Gig confirmed');
        expect(validateVenueFlow(venue, null, null).name).toBe('Blue Note');
    });
    it('validates calendar dates', () => {
        expect(date.safeParse('2026-02-30').success).toBe(false);
        expect(date.safeParse('2028-02-29').success).toBe(true);
    });
});
describe('payments', () => {
    it('makes past-date gigs eligible without changing status', () => {
        const g = { status: 'Upcoming', date: '2026-10-27' };
        expect(eligible(g, '2026-10-28')).toBe(true);
        expect(g.status).toBe('Upcoming');
    });
    it('makes completed future gigs immediately eligible', () => expect(eligible({ status: 'Completed', date: '2027-01-01' }, '2026-10-28')).toBe(true));
    it('excludes cancelled gigs from payments and upcoming', () => {
        const g = { status: 'Cancelled', date: '2020-01-01' };
        expect(eligible(g)).toBe(false);
        expect(upcoming(g)).toBe(false);
    });
    it('does not include today until completed', () => expect(eligible({ status: 'Upcoming', date: '2026-10-28' }, '2026-10-28')).toBe(false));
    it('starts unselected and requires a follow-up schedule', () => {
        expect(() => validatePayment('', null)).toThrow();
        expect(() => validatePayment('Follow-up required', null)).toThrow();
        expect(validatePayment('Follow-up required', { date: '2026-11-01', time: '11:30' })).toBe('Follow-up required');
    });
    it('stores exact paise and rejects fractions beyond two decimal places', () => {
        expect(toPaise('123.45')).toBe(12345);
        expect(toPaise('0.01')).toBe(1);
        expect(() => toPaise('1.001')).toThrow();
        expect(() => toPaise('-1')).toThrow();
    });
});
describe('reminders and conflicts', () => {
    it('uses the IST date across UTC midnight boundaries', () => {
        expect(todayIST(new Date('2026-10-28T18:30:00Z'))).toBe('2026-10-29');
        expect(istInstant('2026-10-29', '00:00').toDate().toISOString()).toBe('2026-10-28T18:30:00.000Z');
    });
    it('keeps overdue reminders visible on subsequent days', () => {
        const f = { status: 'Pending' as const, scheduledAt: Timestamp.fromDate(new Date('2026-10-01T10:00:00Z')) };
        expect(reminderState(f, +new Date('2026-10-28T10:00:00Z'))).toBe('Overdue');
    });
    it('distinguishes due now and completed', () => {
        const scheduledAt = Timestamp.fromMillis(1000);
        expect(reminderState({ status: 'Pending', scheduledAt }, 1000)).toBe('Due now');
        expect(reminderState({ status: 'Completed', scheduledAt }, 2000)).toBe('Completed');
    });
    it('rejects stale edits', () => {
        expect(() => assertVersion(3, 2)).toThrow(/changed/);
        expect(() => assertVersion(3, 3)).not.toThrow();
    });
});
