import { test, expect } from '@playwright/test';
import { swipe, centerOf } from './helpers';

test.describe('mobile gestures', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  test('tabs replace the key bar and jump to sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tabs')).toBeVisible();
    await expect(page.locator('[data-keybar]')).toBeHidden();
    await page.locator('.tabs [data-tab="web2"]').tap();
    await expect(page).toHaveURL(/#web2$/);
    await expect(page.locator('.tabs [data-tab="web2"]')).toHaveAttribute('aria-current', 'true');
  });

  test('horizontal swipes move between projects', async ({ page }) => {
    await page.goto('/#web3');
    await page.waitForTimeout(800);
    const center = (sel: string) => page.locator(sel).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await center('[data-item][data-index="0"] .shot img');
    await page.waitForTimeout(1300);
    const c = await centerOf(page, '[data-item][data-index="0"] .shot img');
    await swipe(page, { x: c.x + 120, y: c.y }, { x: c.x - 120, y: c.y });
    await expect(page.locator('[data-item][data-current]')).toHaveAttribute('data-index', '1', { timeout: 10_000 });
    await page.waitForTimeout(1300);
    await center('[data-item][data-index="1"] .shot img');
    await page.waitForTimeout(1300);
    const c2 = await centerOf(page, '[data-item][data-index="1"] .shot img');
    await swipe(page, { x: c2.x - 120, y: c2.y }, { x: c2.x + 120, y: c2.y });
    await expect(page.locator('[data-item][data-current]')).toHaveAttribute('data-index', '0', { timeout: 10_000 });
  });

  test('the world tab navigates', async ({ page }) => {
    await page.goto('/');
    await page.locator('.tabs [data-tab="world"]').tap();
    await page.waitForURL('**/world');
    await expect(page.locator('.tabs [data-tab="world"]')).toHaveAttribute('aria-current', 'true');
  });
});
