import { useEffect, useState } from 'react';
import { collection, documentId, getDocsFromServer, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import { useSession } from '../lib/session';
import { useList, friendly, useClock } from '../lib/hooks';
import { load, savePayment, deletePayment, where, orderBy } from '../lib/data';
import { todayIST, eligible, money, paymentStatuses, type Gig, type Payment } from '../lib/domain';
import { Field, Form, FollowFields, LoadState, Notice, ConfirmDelete, AuditNote } from '../components/ui';
import { History } from './Reminders';
function List() {
    useClock();
    const today = todayIST();
    const past = useList<Gig>('gigs', [where('date', '<', today), orderBy('date', 'desc')], today);
    const completed = useList<Gig>('gigs', [where('status', '==', 'Completed'), where('date', '>=', today), orderBy('date')], today);
    const [payments, setPayments] = useState<Record<string, Payment>>({}), [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        const rows = [...past.rows, ...completed.rows].filter(g => eligible(g) && !g.deleting);
        async function get() {
            const result: Record<string, Payment> = {};
            for (let i = 0; i < rows.length; i += 30) {
                const snap = await getDocsFromServer(query(collection(db, 'paymentRecords'), where(documentId(), 'in', rows.slice(i, i + 30).map(g => g.id))));
                snap.docs.forEach(d => {
                    result[d.id] = { ...d.data(), id: d.id } as Payment;
                });
            }
            if (active)
                setPayments(result);
        }
        get().catch(e => {
            if (active)
                setError(friendly(e));
        });
        return () => {
            active = false;
        };
    }, [past.rows, completed.rows]);
    const rows = [...past.rows, ...completed.rows].filter(g => eligible(g) && !g.deleting);
    return <><p className="eyebrow">CLOSE THE LOOP</p><h1>Payments</h1><p className="muted">Past-date and manually completed gigs are ready for review. Cancelled gigs are excluded.</p>{error && <p role="alert" className="error">{error}</p>}<div className="cards">{rows.map(g => <article className="card" key={g.id}><span className="badge">{payments[g.id]?.status === 'Payment received' ? 'Settled - Payment received' : payments[g.id]?.status || 'Awaiting selection'}</span><h2><Link to={g.id}>{g.name}</Link></h2><p>{g.venueName} · {g.date}</p><strong>{money(g.payoutPaise)}</strong><p><Link to={g.id}>Review payment →</Link></p></article>)}</div><LoadState list={past}/><LoadState list={completed}/></>;
}
function Editor() {
    const { id } = useParams();
    const { user } = useSession();
    const [g, setG] = useState<Gig>(), [p, setP] = useState<Payment | null>(null), [ready, setReady] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState(''), [d, setD] = useState(''), [t, setT] = useState('');
    async function refresh() {
        const gig = await load<Gig>('gigs', id!);
        setG(gig);
        try {
            const payment = await load<Payment>('paymentRecords', id!);
            setP(payment);
            setStatus(payment.status);
        }
        catch (e) {
            if ((e as Error).message !== 'Record no longer exists.')
                throw e;
            setP(null);
            setStatus('');
        }
        setReady(true);
    }
    useEffect(() => {
        refresh().catch(e => setError(friendly(e)));
    }, [id]);
    return <><Link to="/payments">← Payments</Link><h1>Payment review</h1>{error && <p role="alert" className="error">{error}</p>}{!ready ? <Notice>Loading payment…</Notice> : g && eligible(g) && !g.deleting ? <><article className="card"><h2>{g.name}</h2><p>{g.venueName} · {g.date} · {g.time} IST</p><strong>{money(g.payoutPaise)}</strong><p><Link to={'/gigs/' + g.id}>Gig details</Link></p></article><Form save={async () => {
        await savePayment(user, g, status, status === 'Follow-up required' ? { date: d, time: t } : null, p?.version || 0);
        await refresh();
        setD('');
        setT('');
    }}><Field label="Payment status"><select required value={status} onChange={e => setStatus(e.target.value)}><option value="" disabled>Select a payment status</option>{paymentStatuses.map(s => <option key={s}>{s}</option>)}</select></Field>{status === 'Follow-up required' && <><Notice>Saving creates a new payment follow-up. Previous reminders remain until completed or rescheduled.</Notice><FollowFields d={d} t={t} setD={setD} setT={setT}/></>}</Form>{p && <>{p.status === 'Payment received' && <Notice>Settled - payment received.</Notice>}{p.status === 'Payment denied' && <Notice>Payment denied.</Notice>}<AuditNote record={p}/><ConfirmDelete name={'payment record for ' + g.name} detail="The payment selection is removed and will return to Awaiting selection. Follow-up history stays linked to this gig." action={async () => {
        await deletePayment(user, g, p.version);
        await refresh();
    }}/></>}<History venueId={g.venueId} gigId={g.id} revision={p?.version || 0}/><button onClick={() => location.reload()}>Reload latest data</button></> : <Notice>This gig is not eligible for Payments. Cancelled gigs are excluded.</Notice>}</>;
}
export default function Payments() {
    return <Routes><Route index element={<List />}/><Route path=":id" element={<Editor />}/></Routes>;
}
