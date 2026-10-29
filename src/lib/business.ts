// Pure business rules are shared by the app and dependency-free verification.
export const todayIST = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const eligible = (g: {
    status: string;
    date: string;
}, today = todayIST()) => g.status !== 'Cancelled' && (g.status === 'Completed' || g.date < today);
export const upcoming = (g: {
    status: string;
    date: string;
}, today = todayIST()) => g.status === 'Upcoming' && g.date >= today;
export const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
export function toPaise(value: string) {
    if (!/^\d+(\.\d{1,2})?$/.test(value))
        throw new Error('Enter rupees with at most two decimal places.');
    const [r, p = ''] = value.split('.');
    const n = Number(r) * 100 + Number(p.padEnd(2, '0'));
    if (!Number.isSafeInteger(n) || n > 100000000000)
        throw new Error('Amount is too large.');
    return n;
}
export function assertVersion(actual: number, expected: number) {
    if (actual !== expected)
        throw new Error('This record changed while you were editing. Reload the latest data before trying again.');
}
export function dueState(status: string, scheduledMillis: number, now = Date.now()) {
    if (status !== 'Pending')
        return status;
    return scheduledMillis < now ? 'Overdue' : scheduledMillis === now ? 'Due now' : todayIST(new Date(scheduledMillis)) === todayIST(new Date(now)) ? 'Today' : 'Scheduled';
}
export function resolveMember(selected: string, members: {
    id: string;
    displayName: string;
}[], current: {
    uid: string;
    displayName: string | null;
}) {
    if (!selected)
        return { approachedByUid: current.uid, approachedByName: current.displayName || 'Band member' };
    const p = members.find(p => p.id === selected);
    if (!p)
        throw new Error('Choose a registered member.');
    return { approachedByUid: p.id, approachedByName: p.displayName };
}
export function searchTokens(values: string[]) {
    const tokens = new Set<string>();
    for (const raw of values) {
        const value = raw.trim().toLowerCase();
        for (const word of [value, ...value.split(/\s+/)])
            for (let i = 1; i <= word.length; i++)
                tokens.add(word.slice(0, i));
    }
    return [...tokens].slice(0, 900);
}
