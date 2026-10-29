import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import type { QueryConstraint, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { page } from './data';
import type { CollectionName } from './domain';
export function friendly(e: unknown) {
    const code = (e as {
        code?: string;
    })?.code;
    if (code?.includes('permission-denied'))
        return 'Access denied. Sign in again or check the Firebase security rules.';
    if (code?.includes('unavailable'))
        return 'The server is unavailable. Check your connection and retry.';
    if (code?.includes('failed-precondition'))
        return 'This query needs an index. Follow the index deployment instructions in the README.';
    if (code)
        return 'The request could not be completed. Check your connection and try again.';
    return e instanceof Error ? e.message : 'Something went wrong. Please retry.';
}
function subscribeOnline(notify: () => void) {
    window.addEventListener('online', notify);
    window.addEventListener('offline', notify);
    return () => {
        window.removeEventListener('online', notify);
        window.removeEventListener('offline', notify);
    };
}
const getOnline = () => navigator.onLine;
export function useOnline() {
    // Recheck after subscribing so a connection change during mount cannot be lost.
    return useSyncExternalStore(subscribeOnline, getOnline, () => false);
}
export function useClock() {
    const [now, set] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => set(Date.now()), 30000);
        return () => clearInterval(id);
    }, []);
    return now;
}
export function useList<T>(name: CollectionName, filters: QueryConstraint[] = [], key = '') {
    const [rows, setRows] = useState<T[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [more, setMore] = useState(false), [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData>>();
    const [revision, revise] = useState(0);
    const refresh = useCallback(() => revise(v => v + 1), []);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setRows([]);
        setCursor(undefined);
        setMore(false);
        setError('');
        page<T>(name, filters).then(p => {
            if (active) {
                setRows(p.rows);
                setMore(p.more);
                setCursor(p.cursor);
            }
        }).catch(e => {
            if (active)
                setError(friendly(e));
        }).finally(() => {
            if (active)
                setLoading(false);
        });
        return () => {
            active = false;
        }; /* Query inputs are explicitly represented by key. */
    }, [name, key, revision]);
    async function next() {
        setLoading(true);
        try {
            const p = await page<T>(name, filters, cursor);
            setRows(r => [...r, ...p.rows]);
            setMore(p.more);
            setCursor(p.cursor);
        }
        catch (e) {
            setError(friendly(e));
        }
        finally {
            setLoading(false);
        }
    }
    return { rows, loading, error, more, next, refresh };
}
