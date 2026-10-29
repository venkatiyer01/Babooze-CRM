export interface InstallEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: string;
    }>;
}
let pending: InstallEvent | null = null;
export const getInstall = () => pending;
export function watchInstall() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        pending = e as InstallEvent;
        window.dispatchEvent(new Event('ba-install-ready'));
    });
    window.addEventListener('appinstalled', () => {
        pending = null;
        window.dispatchEvent(new Event('ba-install-ready'));
    });
}
export async function promptInstall() {
    if (!pending)
        return;
    await pending.prompt();
    await pending.userChoice;
    pending = null;
    window.dispatchEvent(new Event('ba-install-ready'));
}
