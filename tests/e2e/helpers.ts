import type { Page } from '@playwright/test';

/** Real touch events through CDP so the pointer events carry pointerType "touch". Chromium only. */
export async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 3) {
  const cdp = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => ({ x, y, radiusX: 2, radiusY: 2, force: 1, id: 1 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(from.x, from.y)] });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(x, y)] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

export async function centerOf(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Wait until Astro's client-side transition has finished; its overlay swallows pointer input while running. */
export async function settled(page: Page) {
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-astro-transition'));
  await page.waitForTimeout(150);
}
