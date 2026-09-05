import { test, expect } from '@playwright/test';

test.describe('seo and previews', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('home and world have title, description, canonical, og:image, and JSON-LD', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Didier Krux/);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://www.didierkrux.com/');
    expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe('https://www.didierkrux.com/og/home.png');
    expect(JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}')['@type']).toBe('Person');
    await page.goto('/world');
    expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe('https://www.didierkrux.com/og/world.png');
    expect(JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}')['@type']).toBe('WebSite');
  });

  test('preview images, sitemap, and noindex on card pages', async ({ request }) => {
    for (const p of ['home', 'world']) {
      const res = await request.get(`/og/${p}.png`);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
    }
    expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
    expect(await (await request.get('/og/home')).text()).toContain('noindex');
  });

  test('JavaScript on the home page stays under budget', async ({ page }) => {
    let bytes = 0;
    page.on('response', async (res) => {
      if (res.request().resourceType() !== 'script') return;
      try { bytes += (await res.body()).byteLength; } catch { /* aborted */ }
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(bytes).toBeLessThan(1_500_000); // uncompressed; three.js + React Three Fiber + drei + three-vrm are most of it
  });
});
