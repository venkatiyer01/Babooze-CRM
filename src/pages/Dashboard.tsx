import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getCountFromServer, query, where, type QueryConstraint } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useList, useClock, friendly } from '../lib/hooks';
import { orderBy } from '../lib/data';
import { responses, paymentStatuses, todayIST, money, type Venue, type Gig, type FollowUp } from '../lib/domain';
import { FollowCard } from './Reminders';
import { Notice, LoadState } from '../components/ui';
async function count(name: string, ...filters: QueryConstraint[]) {
    return (await getCountFromServer(query(collection(db, name), ...filters))).data().count;
}
export default function Dashboard() {
    const now = useClock();
    const today = todayIST(new Date(now));
    const [counts, setCounts] = useState<Record<string, number>>({}), [error, setError] = useState('');
    const latest = useList<Venue>('venues', [orderBy('approachDate', 'desc')]);
    const gigs = useList<Gig>('gigs', [where('status', '==', 'Upcoming'), where('date', '>=', today), orderBy('date'), orderBy('time')], today);
    const a = useList<FollowUp>('venueFollowUps', [where('status', '==', 'Pending'), orderBy('scheduledAt')]);
    const b = useList<FollowUp>('paymentFollowUps', [where('status', '==', 'Pending'), orderBy('scheduledAt')]);
    useEffect(() => {
        let active = true;
        async function go() {
            const entries: [
                string,
                number
            ][] = [];
            entries.push(['Total venues', await count('venues')]);
            await Promise.all(responses.map(async (s) => entries.push([s, await count('venues', where('response', '==', s))])));
            let eligibleTotal = 0;
            for (const filters of [[where('status', 'in', ['Upcoming', 'Completed']), where('date', '<', today)], [where('status', '==', 'Completed'), where('date', '>=', today)]])
                eligibleTotal += await count('gigs', ...filters);
            let selected = 0;
            for (const status of paymentStatuses) {
                let n = 0;
                for (const filters of [[where('gigStatus', 'in', ['Upcoming', 'Completed']), where('gigDate', '<', today)], [where('gigStatus', '==', 'Completed'), where('gigDate', '>=', today)]])
                    n += await count('paymentRecords', where('status', '==', status), ...filters);
                entries.push(['payment:'+status, n]);
                selected += n;
            }
            entries.push(['Awaiting selection', Math.max(0, eligibleTotal - selected)]);
            for (const [name, type] of [['venueFollowUps', 'Venue'], ['paymentFollowUps', 'Payment']]) {
                const base = [where('status', '==', 'Pending')];
                const { Timestamp } = await import('firebase/firestore');
                const start = Timestamp.fromDate(new Date(today + 'T00:00:00+05:30'));
                const end = Timestamp.fromMillis(start.toMillis() + 86400000);
                entries.push([type + ' overdue', await count(name, ...base, where('scheduledAt', '<', Timestamp.fromMillis(now)))]);
                entries.push([type + ' today', await count(name, ...base, where('scheduledAt', '>=', start), where('scheduledAt', '<', end))]);
            }
            if (active)
                setCounts(Object.fromEntries(entries));
        }
        go().catch(e => {
            if (active)
                setError(friendly(e));
        });
        return () => {
            active = false;
        };
    }, [today, Math.floor(now / 60000)]);
    const pending = [...a.rows, ...b.rows].sort((x, y) => x.scheduledAt.toMillis() - y.scheduledAt.toMillis());
    return <><div className="title-row"><div><p className="eyebrow">THE NEXT STAGE</p><h1>Your band, in motion.</h1><p className="muted">A little less admin. A little more music.</p></div><Link className="button primary" to="/venues/new">+ Approach a venue</Link></div>{error && <p role="alert" className="error">{error}</p>}<div className="stats">{['Total venues', ...responses].map(s => <Link className="stat" key={s} to={'/venues' + (s === 'Total venues' ? '' : '?response=' + encodeURIComponent(s))}><span>{s}</span><strong>{counts[s] ?? '—'}</strong></Link>)}</div><div className="dashboard-grid"><section className="card"><p className="eyebrow">LATEST CONVERSATION</p><h2>Recently approached</h2>{latest.rows[0] ? <><h3><Link to={'/venues/' + latest.rows[0].id}>{latest.rows[0].name}</Link></h3><p>{latest.rows[0].approachDate} · {latest.rows[0].response}</p><p className="muted">Approached by {latest.rows[0].approachedByName}</p></> : <Notice>{latest.error || 'Your first venue conversation starts here.'}</Notice>}</section><section className="card"><p className="eyebrow">MONEY MATTERS</p><h2>Payment summary</h2>{[...paymentStatuses, 'Awaiting selection'].map(s => <Link className="summary-row" key={s} to="/payments"><span>{s}</span><strong>{counts[s==='Awaiting selection'?s:'payment:'+s] ?? '—'}</strong></Link>)}</section></div><h2>Follow-ups to keep moving</h2><div className="stats">{['Venue overdue', 'Venue today', 'Payment overdue', 'Payment today'].map(s => <Link className="stat" to="/reminders" key={s}><span>{s}</span><strong>{counts[s] ?? '—'}</strong></Link>)}</div><div className="cards">{pending.slice(0, 6).map(f => <FollowCard key={f.type + f.id} f={f} refresh={() => {
        a.refresh();
        b.refresh();
    }}/>)}</div>{!pending.length && <Notice>{a.error || b.error || 'No pending follow-ups. You’re all caught up.'}</Notice>}<Link to="/reminders">All reminders →</Link><h2>Coming up on stage</h2><div className="cards">{gigs.rows.slice(0, 6).map(g => <Link className="card" key={g.id} to={'/gigs/' + g.id}><span className="badge">Upcoming</span><h3>{g.name}</h3><p>{g.venueName} · {g.date} · {g.time} IST</p><strong>{money(g.payoutPaise)}</strong></Link>)}</div>{!gigs.rows.length && <Notice>{gigs.error || 'No upcoming gigs. Let’s get the next one booked.'}</Notice>}<Link to="/gigs?status=Upcoming">All upcoming gigs →</Link><Awaiting /></>;
}
function Awaiting() {
    const today = todayIST();
    const list = useList<Gig>('gigs', [where('status', 'in', ['Upcoming', 'Completed']), where('date', '<', today), orderBy('date', 'desc')], today);
    const future = useList<Gig>('gigs', [where('status', '==', 'Completed'), where('date', '>=', today), orderBy('date')], today);
    const [ids, setIds] = useState<string[]>([]);
    const [error, setError] = useState('');
    useEffect(() => {
        const rows = [...list.rows, ...future.rows];
        if (!rows.length) {
            setIds([]);
            return;
        }
        let active = true;
        import('firebase/firestore').then(async ({ getDocsFromServer, documentId }) => {
            const paid = new Set<string>();
            for (let i = 0; i < rows.length; i += 30) {
                const s = await getDocsFromServer(query(collection(db, 'paymentRecords'), where(documentId(), 'in', rows.slice(i, i + 30).map(g => g.id))));
                s.docs.forEach(d => paid.add(d.id));
            }
            if (active)
                setIds(rows.filter(g => !paid.has(g.id)).map(g => g.id));
        }).catch(e => {
            if (active)
                setError(friendly(e));
        });
        return () => {
            active = false;
        };
    }, [list.rows, future.rows]);
    return <section><h2>Awaiting payment selection</h2>{error && <p role="alert" className="error">{error}</p>}{[...list.rows, ...future.rows].filter(g => ids.includes(g.id)).map(g => <Link className="summary-row" key={g.id} to={'/payments/' + g.id}><span>{g.name} · {g.venueName} · {g.date}</span><strong>{money(g.payoutPaise)}</strong></Link>)}{!ids.length && <Notice>No unreviewed payments in the loaded results.</Notice>}<LoadState list={list}/><LoadState list={future}/></section>;
}
