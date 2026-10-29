import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, Link } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { auth, configured } from './lib/firebase';
import { profile as ensureProfile } from './lib/data';
import { Session } from './lib/session';
import type { Profile } from './lib/domain';
import { useClock, useOnline, friendly } from './lib/hooks';
import { collection, getCountFromServer, query, Timestamp, where } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Notice } from './components/ui';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Venues = lazy(() => import('./pages/Venues'));
const Gigs = lazy(() => import('./pages/Gigs'));
const Payments = lazy(() => import('./pages/Payments'));
const Reminders = lazy(() => import('./pages/Reminders'));
const Settings = lazy(() => import('./pages/Settings'));
function Shell() {
    const now = useClock();
    const [count, setCount] = useState(0);
    useEffect(() => {
        let active = true;
        Promise.all(['venueFollowUps', 'paymentFollowUps'].map(c => getCountFromServer(query(collection(db, c), where('status', '==', 'Pending'), where('scheduledAt', '<=', Timestamp.fromMillis(now)))))).then(results => {
            if (active)
                setCount(results.reduce((n, s) => n + s.data().count, 0));
        }).catch(() => {
        });
        return () => {
            active = false;
        };
    }, [now]);
    const links = [['/', 'Dashboard'], ['/venues', 'Venue Approach'], ['/gigs', 'Gigs'], ['/payments', 'Payments'], ['/reminders', `Reminders${count ? ' · ' + count : ''}`], ['/settings', 'Members & Settings']];
    return <BrowserRouter><a className="skip" href="#main">Skip to content</a><aside><Link className="brand" to="/"><span className="brand-icon">B♭</span><span>Ba-booze<small>BAND WORKSPACE</small></span></Link><nav aria-label="Main navigation">{links.map(([to, label]) => <NavLink key={to} end={to === '/'} to={to}>{label}</NavLink>)}</nav><p className="sidebar-note">Less chasing.<br />More playing.</p></aside><div className="workspace"><header><span>THE BAND, IN SYNC</span><Link to="/settings">Account & sign out</Link></header><main id="main"><Suspense fallback={<Notice>Loading screen…</Notice>}><Routes><Route path="/" element={<Dashboard />}/><Route path="/venues/*" element={<Venues />}/><Route path="/gigs/*" element={<Gigs />}/><Route path="/payments/*" element={<Payments />}/><Route path="/reminders" element={<Reminders />}/><Route path="/settings" element={<Settings />}/><Route path="*" element={<Notice>Page not found. <Link to="/">Go to dashboard</Link></Notice>}/></Routes></Suspense></main><footer>Ba-booze CRM · Times in IST · INR</footer></div></BrowserRouter>;
}
export default function App() {
    const [user, setUser] = useState<User | null>(null), [p, setP] = useState<Profile | null>(null), [loading, setLoading] = useState(configured), [error, setError] = useState('');
    const online = useOnline();
    async function reload() {
        if (auth.currentUser)
            setP(await ensureProfile(auth.currentUser));
    }
    useEffect(() => {
        if (!configured)
            return;
        return onAuthStateChanged(auth, u => {
            setUser(u);
            setP(null);
            if (!u) {
                setLoading(false);
                return;
            }
            setLoading(true);
            ensureProfile(u).then(setP).catch(e => setError(friendly(e))).finally(() => setLoading(false));
        });
    }, []);
    useEffect(() => {
        const theme = p?.theme || localStorage.getItem('ba-theme-' + (user?.uid || 'guest')) || 'system';
        const media = matchMedia('(prefers-color-scheme: dark)');
        const apply = () => document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, [p, user]);
    return <>{!online && <div role="alert" className="offline">You’re offline. CRM data is unavailable; reconnect to view current records and save changes.</div>}{loading ? <div className="welcome"><Notice>Connecting to your band workspace…</Notice></div> : user && p ? <Session.Provider value={{ user, profile: p, reload }}><Shell /></Session.Provider> : <div className="welcome"><div className="brand-icon">B♭</div><p className="eyebrow">YOUR NEXT GIG STARTS HERE</p><h1>Ba-booze CRM</h1><p>Venue conversations. Confirmed gigs.<br />Payments that don’t get forgotten.</p>{!configured ? <Notice>Firebase setup required. Copy .env.example to .env.local, add your Firebase web configuration, then restart the development server. See README.md.</Notice> : <><button className="primary" disabled={!online} onClick={async () => {
                    setError('');
                    try {
                        await signInWithPopup(auth, new GoogleAuthProvider());
                        await reload();
                    }
                    catch (e) {
                        setError(friendly(e));
                    }
                }}>Continue with Google</button>{user && <button onClick={() => {
                setLoading(true);
                reload().catch(e => setError(friendly(e))).finally(() => setLoading(false));
            }}>Retry profile connection</button>}</>}{error && <p className="error" role="alert">{error}</p>}<p className="small muted">Anyone with this app’s URL and a Google account can access the shared band CRM.</p>{user && <button onClick={() => signOut(auth)}>Sign out</button>}</div>}</>;
}
