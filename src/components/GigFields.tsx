import { Field } from './ui';
import { gigStatuses } from '../lib/domain';
export interface GigDraft {
    name: string;
    date: string;
    time: string;
    payout: string;
    status: typeof gigStatuses[number];
}
export default function GigFields({ value, set }: {
    value: GigDraft;
    set: (v: GigDraft) => void;
}) {
    const change = (k: keyof GigDraft, v: string) => set({ ...value, [k]: v });
    return <><Field label="Gig name"><input required maxLength={160} value={value.name} onChange={e => change('name', e.target.value)}/></Field><div className="form-grid"><Field label="Gig date (IST)"><input type="date" required value={value.date} onChange={e => change('date', e.target.value)}/></Field><Field label="Gig time (IST)"><input type="time" required value={value.time} onChange={e => change('time', e.target.value)}/></Field></div><Field label="Finalized payout (₹)"><input required inputMode="decimal" placeholder="0.00" value={value.payout} onChange={e => change('payout', e.target.value)}/></Field><Field label="Gig status"><select value={value.status} onChange={e => change('status', e.target.value)}>{gigStatuses.map(s => <option key={s}>{s}</option>)}</select></Field></>;
}
