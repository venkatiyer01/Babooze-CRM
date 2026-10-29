import { useState, useId, createContext, useContext, cloneElement, isValidElement, type ReactElement, type ReactNode, type FormEvent } from 'react';
import { ZodError } from 'zod';
import { friendly, useOnline } from '../lib/hooks';
import { formatInstant, type Audit } from '../lib/domain';
const Errors = createContext<Record<string, string>>({});
const fieldKeys: Record<string, string> = { 'Venue name': 'name', 'Contact person': 'contact', 'Contact number': 'phone', 'Approach date (IST)': 'approachDate', 'Approached by': 'approachedByUid', 'Response': 'response', 'Gig name': 'name', 'Gig date (IST)': 'date', 'Gig time (IST)': 'time', 'Finalized payout (₹)': 'payoutPaise', 'Gig status': 'status', 'Venue': 'venueId', 'Payment status': 'status', 'Follow-up date (IST)': 'date', 'Follow-up time (IST)': 'time', 'Notes': 'notes' };
export function Field({ label, children, error }: {
    label: string;
    children: ReactNode;
    error?: string;
}) {
    const errors = useContext(Errors), id = useId();
    const controlId = id + '-control';
    const errorId = id + '-error';
    const message = error || errors[fieldKeys[label] || label];
    const control = isValidElement(children) ? cloneElement(children as ReactElement<Record<string, unknown>>, { id: controlId, 'aria-invalid': Boolean(message), 'aria-describedby': message ? errorId : undefined }) : children;
    return <div className="field"><label htmlFor={controlId}>{label}</label>{control}{message && <small id={errorId} className="error">{message}</small>}</div>;
}
export function Notice({ children }: {
    children: ReactNode;
}) {
    return <p role="status" className="notice">{children}</p>;
}
export function AuditNote({ record }: {
    record: Audit;
}) {
    return <p className="muted small">Created by {record.createdByName}{record.createdAt ? ' · ' + formatInstant(record.createdAt) : ''}<br />Last updated by {record.updatedByName}{record.updatedAt ? ' · ' + formatInstant(record.updatedAt) : ''}</p>;
}
export function Form({ children, save, label = 'Save changes' }: {
    children?: ReactNode;
    save: () => Promise<void>;
    label?: string;
}) {
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [errors, setErrors] = useState<Record<string, string>>({}), [success, setSuccess] = useState(false);
    const online = useOnline();
    async function submit(e: FormEvent) {
        e.preventDefault();
        if (busy || !online)
            return;
        setBusy(true);
        setError('');
        setErrors({});
        setSuccess(false);
        try {
            await save();
            setSuccess(true);
        }
        catch (e) {
            if (e instanceof ZodError) {
                setErrors(Object.fromEntries(e.issues.map(i => [String(i.path.at(-1) || 'status'), i.message])));
                setError('Check the highlighted fields. Your entries have been kept.');
            }
            else
                setError(friendly(e));
        }
        finally {
            setBusy(false);
        }
    }
    return <Errors.Provider value={errors}><form onSubmit={submit}><fieldset disabled={busy || !online}>{children}<button className="primary" type="submit">{busy ? 'Saving…' : label}</button></fieldset>{error && <p className="error" role="alert">{error}</p>}{success && <Notice>Saved successfully.</Notice>}</form></Errors.Provider>;
}
export function LoadState({ list }: {
    list: {
        loading: boolean;
        error: string;
        rows: unknown[];
        more: boolean;
        next: () => void;
        refresh: () => void;
    };
}) {
    return <><button onClick={list.refresh} disabled={list.loading}>Refresh records</button>{list.error && <p role="alert" className="error">{list.error} <button onClick={list.refresh}>Retry</button></p>}{list.loading && <Notice>Loading…</Notice>}{!list.loading && !list.error && !list.rows.length && <Notice>No records yet.</Notice>}{list.more && <button disabled={list.loading} onClick={list.next}>Load more</button>}</>;
}
export function ConfirmDelete({ name, detail, action }: {
    name: string;
    detail: string;
    action: () => Promise<void>;
}) {
    const [open, setOpen] = useState(false);
    return open ? <div className="danger-panel" role="region" aria-label="Confirm permanent deletion"><p>Permanently delete <strong>{name}</strong>?</p><p>{detail} This cannot be undone.</p><Form save={action} label="Permanently delete"/><button onClick={() => setOpen(false)}>Keep record</button></div> : <button className="danger" onClick={() => setOpen(true)}>Delete</button>;
}
export function FollowFields({ d, t, setD, setT }: {
    d: string;
    t: string;
    setD: (s: string) => void;
    setT: (s: string) => void;
}) {
    return <div className="form-grid"><Field label="Follow-up date (IST)"><input type="date" required value={d} onChange={e => setD(e.target.value)}/></Field><Field label="Follow-up time (IST)"><input type="time" required value={t} onChange={e => setT(e.target.value)}/></Field></div>;
}
