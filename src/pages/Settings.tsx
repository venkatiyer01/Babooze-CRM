import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useSession } from '../lib/session';
import { setTheme, orderBy } from '../lib/data';
import { useList } from '../lib/hooks';
import type { Profile } from '../lib/domain';
import { Field, Form, LoadState } from '../components/ui';
import { getInstall, promptInstall, type InstallEvent } from '../lib/install';
export default function Settings() {
    const { user, profile, reload } = useSession();
    const [theme, set] = useState(profile.theme);
    const [install, setInstall] = useState<InstallEvent | null>(getInstall());
    const members = useList<Profile>('profiles', [orderBy('displayName')]);
    useEffect(() => {
        const listener = () => setInstall(getInstall());
        window.addEventListener('ba-install-ready', listener);
        return () => window.removeEventListener('ba-install-ready', listener);
    }, []);
    return <><p className="eyebrow">THE PEOPLE BEHIND THE SOUND</p><h1>Members & Settings</h1><section className="card"><h2>{profile.displayName}</h2><p>{profile.email}</p><Form save={async () => {
        await setTheme(user, theme);
        localStorage.setItem('ba-theme-' + user.uid, theme);
        await reload();
    }}><Field label="Appearance"><select value={theme} onChange={e => set(e.target.value as Profile['theme'])}><option value="system">System default</option><option value="light">Light</option><option value="dark">Dark</option></select></Field></Form><button onClick={() => signOut(auth)}>Sign out</button></section><section className="card"><h2>Install Ba-booze</h2>{install && <button className="primary" onClick={async () => {
        await promptInstall();
        setInstall(null);
    }}>Install app</button>}<p><strong>iPhone / iPad:</strong> Open in Safari, tap Share, then Add to Home Screen.</p><p><strong>Android:</strong> Use Install app above when available, or choose Install app / Add to Home screen from your browser’s menu.</p><p className="muted">An internet connection is required for CRM data. Reminders appear inside the app while it is open.</p></section><h2>Band members</h2><p>Anyone with the app URL and a Google account can access and edit this shared CRM.</p><div className="cards">{members.rows.map(p => <article className="card" key={p.id}><h3>{p.displayName}</h3><p>{p.email}</p></article>)}</div><LoadState list={members}/></>;
}
