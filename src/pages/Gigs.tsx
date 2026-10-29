import { useEffect, useState } from 'react';
import { Link, Route, Routes, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSession } from '../lib/session';
import { useList, friendly } from '../lib/hooks';
import { load, saveGig, cascadeDelete, where, orderBy } from '../lib/data';
import { todayIST, toPaise, money, eligible, type Gig, type Venue } from '../lib/domain';
import { Field, Form, LoadState, Notice, ConfirmDelete, AuditNote } from '../components/ui';
import GigFields, { type GigDraft } from '../components/GigFields';
function List() {
    const [p] = useSearchParams();
    const [status, setStatus] = useState(p.get('status') || '');
    const list = useList<Gig>('gigs', [...p.get('venue') ? [where('venueId', '==', p.get('venue'))] : [], ...status ? [where('status', '==', status)] : [], orderBy('date'), orderBy('time')], status + (p.get('venue') || ''));
    return <><div className="title-row"><div><p className="eyebrow">ON THE CALENDAR</p><h1>Gigs</h1></div><Link className="button primary" to={'new' + (p.get('venue') ? '?venue=' + p.get('venue') : '')}>+ Add gig</Link></div><Field label="Status"><select value={status} onChange={e => setStatus(e.target.value)}><option value="">All gigs</option>{['Upcoming', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}</select></Field><div className="cards">{list.rows.map(g => <article className="card" key={g.id}><span className="badge">{g.deleting ? 'Deletion in progress' : eligible(g) && g.status === 'Upcoming' ? 'Past · payment review' : g.status}</span><h2><Link to={g.id}>{g.name}</Link></h2><p>{g.venueName}</p><p>{g.date} · {g.time} IST</p><strong>{money(g.payoutPaise)}</strong>{eligible(g) && <p><Link to={'/payments/' + g.id}>Review payment →</Link></p>}</article>)}</div><LoadState list={list}/></>;
}
function Editor() {
    const { id } = useParams();
    const [p] = useSearchParams();
    const nav = useNavigate();
    const { user } = useSession();
    const [old, setOld] = useState<Gig>();
    const [ready, setReady] = useState(!id), [error, setError] = useState('');
    const [venueId, setVenueId] = useState(p.get('venue') || '');
    const [g, setG] = useState<GigDraft>({ name: '', date: todayIST(), time: '', payout: '', status: 'Upcoming' });
    const venues = useList<Venue>('venues', [orderBy('name')]);
    useEffect(() => {
        if (id)
            load<Gig>('gigs', id).then(g => {
                setOld(g);
                setG({ ...g, payout: String(g.payoutPaise / 100) });
                setVenueId(g.venueId);
                setReady(true);
            }).catch(e => setError(friendly(e)));
    }, [id]);
    if (!ready)
        return <Notice>{error || 'Loading gig…'}</Notice>;
    return <><Link to="/gigs">← Gigs</Link><h1>{old ? 'Gig details' : 'Add gig'}</h1>{!old?.deleting && <Form save={async () => {
        const v = await load<Venue>('venues', venueId);
        const saved = await saveGig(user, { ...g, venueId, venueName: v.name, payoutPaise: toPaise(g.payout) }, old);
        nav('/gigs/' + saved);
        setOld(await load<Gig>('gigs', saved));
    }}><Field label="Venue"><select required disabled={Boolean(old)} value={venueId} onChange={e => setVenueId(e.target.value)}><option value="">Select venue</option>{old && !venues.rows.some(v => v.id === old.venueId) && <option value={old.venueId}>{old.venueName}</option>}{venues.rows.filter(v => !v.deleting).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>{venues.more && <button type="button" onClick={venues.next}>Load more venues</button>}<GigFields value={g} set={setG}/></Form>}{old && <><AuditNote record={old}/>{eligible(old) && <p><Link to={'/payments/' + old.id}>Review payment →</Link></p>}<ConfirmDelete name={old.name} detail="Its payment record and all payment follow-up history will also be removed." action={async () => {
        await cascadeDelete(user, 'gigs', old.id, old.version);
        nav('/gigs');
    }}/><button onClick={() => location.reload()}>Reload latest data</button></>}</>;
}
export default function Gigs() {
    return <Routes><Route index element={<List />}/><Route path="new" element={<Editor key="new"/>}/><Route path=":id" element={<Editor />}/></Routes>;
}
