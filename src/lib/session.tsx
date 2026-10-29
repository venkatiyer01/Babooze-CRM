import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { Profile } from './domain';
export const Session = createContext<{
    user: User;
    profile: Profile;
    reload: () => Promise<void>;
} | null>(null);
export function useSession() {
    const s = useContext(Session);
    if (!s)
        throw new Error('Sign in required.');
    return s;
}
