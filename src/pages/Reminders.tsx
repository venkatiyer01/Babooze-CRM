import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../lib/session';
import { useList, useClock } from '../lib/hooks';
import { finishFollow, deleteFollow, where, orderBy } from '../lib/data';
import { formatInstant, reminderState, type FollowUp } from '../lib/domain';
import { Form, Field, FollowFields, LoadState, ConfirmDelete, AuditNote } from '../components/ui';
export function FollowCard({ f, refresh }: {
    f: FollowUp;
    refresh: () => void;
}) {
    const { user } = useSession();
    const now = useClock();
    const [mode, setMode] = useState(''), [note, setNote] = useState(''), [d, setD] = useState(''), [t, setT] = useState('');
    return <article className="card"><span className={'badge ' + (reminderState(f, now) === 'Overdue' ? 'urgent' : '')}>{f.type} · {reminderState(f, now)}</span><h3><Link to={f.type === 'Venue' ? '/venues/' + f.venueId : '/payments/' + f.gigId}>{f.venueName}</Link></h3><p>{formatInstant(f.scheduledAt)}</p>{f.status === 'Pending' && <div className="actions"><button onClick={() => setMode('complete')}>Mark completed</button><button onClick={() => setMode('reschedule')}>Reschedule</button></div>}{mode && f.status === 'Pending' && <Form label={mode === 'complete' ? 'Complete follow-up' : 'Save next follow-up'} save={async () => {
        await finishFollow(user, f, note, mode === 'reschedule' ? { date: d, time: t } : undefined);
        setMode('');
        refresh();
    }}>{mode === 'reschedule' && <FollowFields d={d} t={t} setD={setD} setT={setT}/>}<Field label="Optional note"><textarea maxLength={4000} value={note} onChange={e => setNote(e.target.value)}/></Field></Form>}{f.note && <p>{f.note}</p>}{f.completedAt && <p className="muted">{f.status} by {f.completedByName} · {formatInstant(f.completedAt)}</p>}{f.previousId && <p className="small muted">Rescheduled from an earlier follow-up.</p>}{f.nextId && <p className="small muted">A new pending follow-up was created.</p>}<details><summary>Record details</summary><AuditNote record={f}/><ConfirmDelete name={f.type.toLowerCase() + ' follow-up for ' + f.venueName} detail="This follow-up is permanently removed from history. Linked previous or next follow-ups remain." action={async () => {
        await deleteFollow(f);
        refresh();
    }}/></details></article>;
}
export function History({ venueId, gigId, revision = 0 }: {
    venueId: string;
    gigId?: string;
    revision?: number;
}) {
    const a = useList<FollowUp>(gigId ? 'paymentFollowUps' : 'venueFollowUps', [where(gigId ? 'gigId' : 'venueId', '==', gigId || venueId), orderBy('scheduledAt', 'desc')], `${venueId}:${gigId || ''}:${revision}`);
    return <section><h2>Follow-up history</h2><div className="cards">{a.rows.map(f => <FollowCard key={f.id} f={f} refresh={a.refresh}/>)}</div><LoadState list={a}/></section>;
}
export default function Reminders() {
    const [status, setStatus] = useState('Pending');
    const a = useList<FollowUp>('venueFollowUps', [...status ? [where('status', '==', status)] : [], orderBy('scheduledAt')], status);
    const b = useList<FollowUp>('paymentFollowUps', [...status ? [where('status', '==', status)] : [], orderBy('scheduledAt')], status);
    const rows = [...a.rows, ...b.rows].sort((x, y) => x.scheduledAt.toMillis() - y.scheduledAt.toMillis());
    return <><p className="eyebrow">KEEP THE CONVERSATION GOING</p><h1>In-app Reminders</h1><p className="muted">Due reminders stay here until completed or rescheduled. Completing one does not change a venue, gig or payment status.</p><Field label="Follow-up status"><select value={status} onChange={e => setStatus(e.target.value)}><option value="">All history</option>{['Pending', 'Completed', 'Rescheduled'].map(s => <option key={s}>{s}</option>)}</select></Field><div className="cards">{rows.map(f => <FollowCard key={f.type + f.id} f={f} refresh={() => {
        a.refresh();
        b.refresh();
    }}/>)}</div><LoadState list={a}/><LoadState list={b}/></>;
}
