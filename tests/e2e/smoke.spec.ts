import { test, expect } from '@playwright/test';
test('setup screen is readable with no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Ba-booze CRM' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByText(/Anyone with this app/)).toBeVisible();
});
test('offline message explains write restrictions', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Ba-booze CRM' })).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByRole('alert')).toContainText('offline');
    await context.setOffline(false);
});
test('PWA manifest declares names and valid install icons', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    const manifest = await response.json();
    expect(manifest.name).toBe('Ba-booze CRM');
    expect(manifest.display).toBe('standalone');
    for (const icon of manifest.icons) {
        const asset = await request.get(icon.src);
        expect(asset.ok()).toBe(true);
    }
});
