import { useEffect, useState } from 'react';
import { collection, documentId, getDocsFromServer, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../lib/session';
import { useList, friendly } from '../lib/hooks';
import { load, saveVenue, cascadeDelete, where, orderBy } from '../lib/data';
import { approachedBy, responses, todayIST, toPaise, validateVenueFlow, type Venue, type Profile, type FollowUp } from '../lib/domain';
import { Field, Form, FollowFields, LoadState, Notice, ConfirmDelete, AuditNote } from '../components/ui';
import GigFields, { type GigDraft } from '../components/GigFields';
import { History } from './Reminders';
function List() {
    const [params] = useSearchParams();
    const [response, setResponse] = useState(params.get('response') || ''), [member, setMember] = useState(''), [search, setSearch] = useState(''), [debounced, setDebounced] = useState(''), [sort, setSort] = useState('approachDate'), [follow, setFollow] = useState('');
    useEffect(() => {
        const id = setTimeout(() => setDebounced(search.toLowerCase()), 200);
        return () => clearTimeout(id);
    }, [search]);
    const filters = [...debounced ? [where('searchTokens', 'array-contains', debounced)] : [], ...response ? [where('response', '==', response)] : [], ...member ? [where('approachedByUid', '==', member)] : [], orderBy(sort === 'follow' ? 'approachDate' : sort, 'desc')];
    const list = useList<Venue>('venues', filters, `${response}|${member}|${sort}|${debounced}`);
    const members = useList<Profile>('profiles', [orderBy('displayName')]);
    const rows = list.rows;
    return <><div className="title-row"><div><p className="eyebrow">MAKE THE FIRST MOVE</p><h1>Venue Approach</h1></div><Link className="button primary" to="new">+ Add venue</Link></div><div className="filters"><Field label="Search venues"><input type="search" maxLength={160} placeholder="Start of venue, contact or phone" value={search} onChange={e => setSearch(e.target.value)}/></Field><Field label="Response"><select value={response} onChange={e => setResponse(e.target.value)}><option value="">All responses</option>{responses.map(s => <option key={s}>{s}</option>)}</select></Field><Field label="Approached by"><select value={member} onChange={e => setMember(e.target.value)}><option value="">All members</option>{members.rows.map(m => <option value={m.id} key={m.id}>{m.displayName}</option>)}</select></Field><Field label="Follow-up state"><select value={follow} onChange={e => setFollow(e.target.value)}><option value="">All</option>{['Pending', 'Completed', 'Rescheduled'].map(s => <option key={s}>{s}</option>)}</select></Field><Field label="Sort"><select value={sort} onChange={e => setSort(e.target.value)}><option value="approachDate">Approach date · newest</option><option value="name">Venue name · Z–A</option><option value="follow">Follow-up date - earliest</option></select></Field></div>{(follow || sort === 'follow') ? <FollowVenueList status={follow || 'Pending'} response={response} member={member} search={debounced}/> : <><div className="cards">{rows.map(v => <article className="card" key={v.id}><span className="badge">{v.deleting ? 'Deletion in progress' : v.response}</span><h2><Link to={v.id}>{v.name}</Link></h2><p>{v.contact} · <a href={'tel:' + v.phone}>{v.phone}</a></p><p className="muted">{v.approachDate} · {v.approachedByName}</p><Link to={v.id}>View venue →</Link></article>)}</div><LoadState list={list}/></>}{members.more && <button onClick={members.next}>Load more members for filter</button>}</>;
}
function FollowVenueList({ status, response, member, search }: {
    status: string;
    response: string;
    member: string;
    search: string;
}) {
    const list = useList<FollowUp>('venueFollowUps', [where('status', '==', status), orderBy('scheduledAt')], status);
    const [venues, setVenues] = useState<Venue[]>([]), [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        const ids = [...new Set(list.rows.map(f => f.venueId))];
        async function get() {
            const result: Venue[] = [];
            for (let i = 0; i < ids.length; i += 30) {
                const s = await getDocsFromServer(query(collection(db, 'venues'), where(documentId(), 'in', ids.slice(i, i + 30))));
                s.docs.forEach(d => result.push({ ...d.data(), id: d.id } as Venue));
            }
            if (active)
                setVenues(result);
        }
        get().catch(e => {
            if (active)
                setError(friendly(e));
        });
        return () => {
            active = false;
        };
    }, [list.rows]);
    const ordered = [...new Set(list.rows.map(f => f.venueId))].map(id => venues.find(v => v.id === id)).filter((v): v is Venue => Boolean(v)).filter(v => (!response || v.response === response) && (!member || v.approachedByUid === member) && (!search || [v.name, v.contact, v.phone].some(s => s.toLowerCase().includes(search))));
    return <>{error && <p className="error" role="alert">{error}</p>}<p className="small muted">Sorted by earliest matching follow-up. Load more follow-ups to expand filtered results.</p><div className="cards">{ordered.map(v => <article className="card" key={v.id}><span className="badge">{v.response}</span><h2><Link to={v.id}>{v.name}</Link></h2><p>{v.contact} / <a href={'tel:' + v.phone}>{v.phone}</a></p><p>{v.approachDate} / {v.approachedByName}</p><p className="muted">{list.rows.find(f => f.venueId === v.id)?.scheduledAt.toDate().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p></article>)}</div><LoadState list={list}/></>;
}
function Editor() {
    const { id } = useParams();
    const nav = useNavigate();
    const { user } = useSession();
    const [old, setOld] = useState<Venue>();
    const [error, setError] = useState('');
    const [ready, setReady] = useState(!id);
    const [v, setV] = useState({ name: '', contact: '', phone: '', approachDate: todayIST(), response: responses[0] as typeof responses[number], notes: '', member: '' });
    const [fd, setFd] = useState(''), [ft, setFt] = useState(''), [addGig, setAddGig] = useState(false);
    const [g, setG] = useState<GigDraft>({ name: '', date: todayIST(), time: '', payout: '', status: 'Upcoming' });
    const members = useList<Profile>('profiles', [orderBy('displayName')]);
    useEffect(() => {
        if (id)
            load<Venue>('venues', id).then(o => {
                setOld(o);
                setV({ ...o, member: o.approachedByUid });
                setReady(true);
            }).catch(e => setError(friendly(e)));
    }, [id]);
    if (!ready)
        return <Notice>{error || 'Loading venue…'}</Notice>;
    const needsGig = v.response === 'Gig confirmed' && (!old || old.response !== 'Gig confirmed' || addGig);
    return <><Link to="/venues">← Venue Approach</Link><h1>{old ? 'Venue details' : 'Add venue'}</h1>{old?.deleting ? <Notice>Deletion is in progress. Use Delete below to resume cleanup.</Notice> : <Form save={async () => {
                const selected = v.member && !members.rows.some(m => m.id === v.member) ? await load<Profile>('profiles', v.member) : null;
                const input = { ...v, ...approachedBy(v.member, selected ? [...members.rows, selected] : members.rows, user) };
                const gig = needsGig ? { ...g, venueId: id || 'new', venueName: v.name, payoutPaise: toPaise(g.payout) } : null;
                const follow = v.response === 'Follow-up required' ? { date: fd, time: ft } : null;
                if (!old || v.response !== 'Gig confirmed' || needsGig)
                    validateVenueFlow(input, follow, gig);
                const saved = await saveVenue(user, input, old, follow, gig);
                nav('/venues/' + saved);
                setOld(await load<Venue>('venues', saved));
                setFd('');
                setFt('');
                setAddGig(false);
            }}><div className="form-grid"><Field label="Venue name"><input required maxLength={160} value={v.name} onChange={e => setV({ ...v, name: e.target.value })}/></Field><Field label="Contact person"><input required maxLength={160} value={v.contact} onChange={e => setV({ ...v, contact: e.target.value })}/></Field><Field label="Contact number"><input type="tel" required maxLength={40} value={v.phone} onChange={e => setV({ ...v, phone: e.target.value })}/></Field><Field label="Approach date (IST)"><input type="date" required value={v.approachDate} onChange={e => setV({ ...v, approachDate: e.target.value })}/></Field></div><Field label="Approached by"><select value={v.member} onChange={e => setV({ ...v, member: e.target.value })}><option value="">Me · {user.displayName}</option>{old && !members.rows.some(m => m.id === old.approachedByUid) && <option value={old.approachedByUid}>{old.approachedByName}</option>}{members.rows.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select></Field>{members.more && <button type="button" onClick={members.next}>Load more members</button>}<Field label="Response"><select value={v.response} onChange={e => setV({ ...v, response: e.target.value as typeof v.response })}>{responses.map(s => <option key={s}>{s}</option>)}</select></Field>{v.response === 'Follow-up required' && <><Notice>Saving adds a new follow-up. Existing follow-ups keep their history.</Notice><FollowFields d={fd} t={ft} setD={setFd} setT={setFt}/></>}{old?.response === 'Gig confirmed' && v.response === 'Gig confirmed' && <Field label="Add another gig in this save"><input type="checkbox" checked={addGig} onChange={e => setAddGig(e.target.checked)}/></Field>}{needsGig && <section className="inset"><h2>Confirmed gig</h2><GigFields value={g} set={setG}/></section>}<Field label="Notes"><textarea maxLength={4000} value={v.notes} onChange={e => setV({ ...v, notes: e.target.value })}/></Field></Form>}{old && <><AuditNote record={old}/><p><Link to={'/gigs?venue=' + old.id}>View gigs / add another gig</Link></p><History venueId={old.id} revision={old.version}/><ConfirmDelete name={old.name} detail="All linked gigs, payment records, venue follow-ups and payment follow-ups will also be removed." action={async () => {
        await cascadeDelete(user, 'venues', old.id, old.version);
        nav('/venues');
    }}/><button onClick={() => location.reload()}>Reload latest data</button></>}</>;
}
export default function Venues() {
    return <Routes><Route index element={<List />}/><Route path="new" element={<Editor key="new"/>}/><Route path=":id" element={<Editor />}/></Routes>;
}
