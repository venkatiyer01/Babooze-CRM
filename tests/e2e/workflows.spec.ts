import { test, expect } from '@playwright/test';
test.skip(process.env.E2E_EMULATORS !== 'true', 'Requires local Auth and Firestore emulators; never use a live project.');
test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
        const localModule = '/src/lib/firebase.ts';
        const { auth } = await import(localModule);
        const authModule = '/node_modules/.vite/deps/firebase_auth.js';
        const { GoogleAuthProvider, signInWithCredential } = await import(authModule);
        const token = { sub: 'e2e-band-member', email: 'band@example.com', email_verified: true, name: 'Band Tester', picture: '', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, aud: 'demo-ba-booze', iss: 'https://accounts.google.com' };
        const encode = (v: unknown) => btoa(JSON.stringify(v)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
        const credential = GoogleAuthProvider.credential(encode({ alg: 'none', typ: 'JWT' }) + '.' + encode(token) + '.');
        await signInWithCredential(auth, credential);
    });
    await expect(page.getByRole('heading', { name: 'Your band, in motion.' })).toBeVisible();
});
test('venue to completed gig to payment and preserved follow-up history', async ({ page }) => {
    const name = 'Test venue ' + Date.now();
    await page.getByRole('link', { name: '+ Approach a venue' }).click();
    await page.getByLabel('Venue name', { exact: true }).fill(name);
    await page.getByLabel('Contact person').fill('Venue Manager');
    await page.getByLabel('Contact number').fill('+91 0012345678');
    await page.getByLabel('Response', { exact: true }).selectOption('Gig confirmed');
    await page.getByLabel('Gig name', { exact: true }).fill(name + ' live');
    await page.getByLabel('Gig time (IST)').fill('20:00');
    await page.getByLabel('Finalized payout').fill('12345.67');
    await page.getByLabel('Gig status').selectOption('Completed');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Venue details' })).toBeVisible();
    await page.getByRole('link', { name: 'Payments', exact: true }).click();
    await page.getByRole('link', { name: name + ' live', exact: true }).click();
    await expect(page.getByLabel('Payment status', { exact: true })).toHaveValue('');
    await page.getByLabel('Payment status', { exact: true }).selectOption('Follow-up required');
    await page.getByLabel('Follow-up date (IST)').fill('2026-10-01');
    await page.getByLabel('Follow-up time (IST)').fill('10:00');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByText('Payment · Overdue')).toBeVisible();
    await page.getByRole('button', { name: 'Reschedule', exact: true }).click();
    await page.getByLabel('Follow-up date (IST)').last().fill('2027-01-01');
    await page.getByLabel('Follow-up time (IST)').last().fill('11:30');
    await page.getByRole('button', { name: 'Save next follow-up' }).click();
    await expect(page.getByText('Payment · Rescheduled')).toBeVisible();
    await page.getByRole('button', { name: 'Mark completed', exact: true }).click();
    await page.getByRole('button', { name: 'Complete follow-up', exact: true }).click();
    await expect(page.getByText('Payment · Completed')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('all primary screens fit common phone and desktop viewports', async ({ page }) => {
    for (const route of ['venues', 'gigs', 'payments', 'reminders', 'settings']) {
        await page.goto('/' + route);
        await expect(page.locator('main h1')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
});
