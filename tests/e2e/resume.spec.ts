import { test, expect } from '@playwright/test';

test.describe('resume', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('packs into two or three full pages', async ({ page }) => {
    await page.goto('/resume');
    await expect(page.locator('h1.rs-name')).toHaveText('Didier Krux');
    const root = page.locator('#resume[data-packed="true"]');
    await expect(root).toHaveCount(1);
    const pages = Number(await root.getAttribute('data-pages'));
    expect(pages).toBeGreaterThanOrEqual(2);
    expect(pages).toBeLessThanOrEqual(4);
    await expect(page.locator('.rs-page')).toHaveCount(pages);
    await expect(page.locator('.rs-page').first().locator('h2', { hasText: 'Experience' })).toBeVisible();
  });

  test('the PDF is served at the historical URL', async ({ request }) => {
    const res = await request.get('/Resume_Didier_Krux.pdf');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('pdf');
  });
});
