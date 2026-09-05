import { test, expect } from '@playwright/test';
import { settled } from './helpers';

test.describe('desktop operating model', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('the home page opens on the intro with the key bar visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#top h1')).toHaveText("gm, I'm Didier Krux.");
    await expect(page.locator('[data-keybar]')).toBeVisible();
    await expect(page.locator('.bottombar')).toBeHidden();
    await expect(page.locator('footer')).toHaveCount(0);
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-mood', 'me');
  });

  test('1 to 4 scroll to home and the sections, and the hash follows', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('3');
    await expect(page).toHaveURL(/#web2$/);
    await expect(page.locator('.keybar [data-tab="web2"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-mood', 'work');
    await page.keyboard.press('4');
    await expect(page).toHaveURL(/#projects$/);
    await page.keyboard.press('2');
    await expect(page).toHaveURL(/#web3$/);
    await page.keyboard.press('1');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.keybar [data-tab="top"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-mood', 'me');
  });

  test('the page is one scroll: every project is in the DOM, Devcon first, with a screenshot', async ({ page }) => {
    await page.goto('/');
    const items = page.locator('[data-item]');
    expect(await items.count()).toBeGreaterThanOrEqual(22);
    await expect(items.first().locator('h3')).toHaveText('Devcon and Devconnect apps');
    await expect(items.first().locator('.shot img')).toHaveAttribute('src', '/screens/devcon-apps.jpg');
    await expect(page.locator('#web3 [data-item]').first()).toHaveAttribute('data-era', 'web3');
    await expect(page.locator('#web2 [data-item]').first()).toHaveAttribute('data-era', 'web2');
    await expect(page.locator('#projects [data-item]').first()).toHaveAttribute('data-era', 'side');
  });

  test('arrows walk the projects, starting from the first one and back up to gm', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-item][data-current]')).toHaveAttribute('data-index', '0');
    await expect(page.locator('.keybar [data-tab="web3"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#web3 .section-head h2')).toBeInViewport(); // the category heading comes along with its first project
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-item][data-current]')).toHaveAttribute('data-index', '1');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('[data-item][data-current]')).toHaveAttribute('data-index', '0');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('.keybar [data-tab="top"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.keybar [data-tab="web3"]')).toHaveAttribute('aria-current', 'false');
  });

  test('every paragraph of a project is visible without interaction', async ({ page }) => {
    await page.goto('/#web3');
    const first = page.locator('[data-item][data-index="0"] .story p');
    expect(await first.count()).toBeGreaterThan(1);
    await expect(first.nth(1)).toBeVisible();
    await expect(page.locator('.more')).toHaveCount(0);
  });

  test('T cycles the theme and it persists across navigation', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.keyboard.press('t');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.keyboard.press('t');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.keyboard.press('t');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.keyboard.press('5');
    await page.waitForURL('**/world');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('5 enters the world with the same stage, ? opens the manual', async ({ page }) => {
    await page.goto('/');
    const before = await page.locator('[data-stage]').getAttribute('data-instance');
    await page.keyboard.press('5');
    await page.waitForURL('**/world');
    await settled(page);
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-instance', before!);
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-mood', 'world');
    await page.keyboard.press('?');
    await expect(page.locator('dialog[data-manual]')).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[data-manual]')).not.toHaveAttribute('open', '');
    await page.keyboard.press('5');
    await page.waitForURL(/\/$/);
  });

  test('Space plays and pauses, left and right arrows move between tracks, and it stays off by default', async ({ page }) => {
    await page.goto('/');
    const player = page.locator('[data-player]');
    await expect(player).toHaveAttribute('data-playing', 'false');
    await expect(player.locator('[data-track]')).toContainText(',');
    await expect(player.locator('.player-seek')).toBeDisabled();
    await expect(player.locator('.player-toggle')).toHaveAttribute('aria-label', 'Play');
    await page.keyboard.press(' ');
    await expect(player).toHaveAttribute('data-playing', 'true');
    await expect(player.locator('.player-seek')).toBeEnabled({ timeout: 10_000 });
    const first = await player.locator('[data-track]').textContent();
    expect(first).toContain(',');
    await page.keyboard.press('ArrowRight');
    await expect(player.locator('[data-track]')).not.toHaveText(first!);
    await page.keyboard.press('ArrowLeft');
    await expect(player.locator('[data-track]')).toHaveText(first!);
    await page.locator('.player-next').click();
    await expect(player.locator('[data-track]')).not.toHaveText(first!);
    await page.locator('.player-prev').click();
    await expect(player.locator('[data-track]')).toHaveText(first!);
    await page.keyboard.press(' ');
    await expect(player).toHaveAttribute('data-playing', 'false');
    await expect(player.locator('[data-track]')).toHaveText(first!); // paused, not forgotten
    await expect(player.locator('.player-seek')).toBeEnabled(); // and still seekable
    await expect(page.locator('.keybar [data-key="ArrowRight"]')).toHaveCount(0);
    await expect(page.locator('.keybar button')).toHaveCount(6);
  });

  test('the world has a DJ booth; DJ mode follows a playing set and nothing else', async ({ page }) => {
    await page.goto('/world');
    await expect(page.locator('[data-set-url]')).toHaveCount(12);
    await expect(page.locator('.keybar [data-key="d"]')).toHaveCount(0);
    await page.locator('[data-set-url]').first().click();
    await expect(page.locator('html')).toHaveAttribute('data-dj', 'on');
    await expect(page.locator('[data-set-url]').first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-player]')).toHaveAttribute('data-playing', 'true');
    await page.locator('[data-set-url]').first().click();
    await expect(page.locator('html')).toHaveAttribute('data-dj', 'off');
    await page.keyboard.press('d');
    await expect(page.locator('html')).toHaveAttribute('data-dj', 'off');
  });

  test('while a set plays, next and previous step through the sets and Space pauses it without leaving DJ mode', async ({ page }) => {
    await page.goto('/world');
    const sets = page.locator('[data-set-url]');
    const player = page.locator('[data-player]');
    await sets.first().click();
    await expect(sets.first()).toHaveAttribute('aria-pressed', 'true');
    await expect(sets.first()).not.toBeFocused();
    await sets.nth(2).focus();
    await page.keyboard.press('Enter');
    await expect(sets.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(sets.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(sets.nth(2)).not.toBeFocused();
    await sets.first().click();
    await expect(sets.first()).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(sets.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(sets.first()).toHaveAttribute('aria-pressed', 'false');
    await expect(player.locator('[data-track]')).toHaveText(await sets.nth(1).getAttribute('data-set-title') ?? '');
    await page.locator('.player-prev').click();
    await expect(sets.first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-dj', 'on');
    await page.keyboard.press(' ');
    await expect(player).toHaveAttribute('data-playing', 'false');
    await expect(page.locator('html')).toHaveAttribute('data-dj', 'on');
    await expect(sets.first()).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press(' ');
    await expect(player).toHaveAttribute('data-playing', 'true');
    await sets.first().click();
    await expect(page.locator('html')).toHaveAttribute('data-dj', 'off');
    await expect(player).toHaveAttribute('data-playing', 'true'); // the album takes over
    await expect(player.locator('[data-track]')).toContainText(',');
  });

  test('the booth also lists the Turn On album; a track plays on the ambient deck without DJ mode', async ({ page }) => {
    await page.goto('/world');
    const tracks = page.locator('[data-track-index]');
    await expect(tracks).toHaveCount(22);
    await tracks.nth(3).click();
    await expect(page.locator('[data-player]')).toHaveAttribute('data-playing', 'true');
    await expect(tracks.nth(3)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-dj', 'off');
    await expect(page.locator('[data-now-playing="track"]')).toHaveText(await tracks.nth(3).getAttribute('data-track-label') ?? '');
    await expect(page.locator('[data-now-playing="set"]')).toBeHidden();
    await expect(page.locator('[data-seek="track"]')).toBeEnabled({ timeout: 10_000 });
    await expect(page.locator('[data-seek="set"]')).toBeDisabled();
    await page.locator('[data-set-url]').first().click();
    await expect(page.locator('html')).toHaveAttribute('data-dj', 'on');
    await expect(tracks.nth(3)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-now-playing="track"]')).toBeHidden();
    await expect(page.locator('[data-now-playing="set"]')).toBeVisible();
    await tracks.nth(5).click();
    await expect(page.locator('html')).toHaveAttribute('data-dj', 'off');
    await expect(tracks.nth(5)).toHaveAttribute('aria-pressed', 'true');
    await tracks.nth(5).click();
    await expect(page.locator('[data-player]')).toHaveAttribute('data-playing', 'false');
  });

  test('the Meebit plays clips, swaps with M, looks around in the world and dances to a set', async ({ page }) => {
    await page.goto('/');
    const stage = page.locator('[data-stage]');
    await expect(stage).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
    await expect(stage).toHaveAttribute('data-clip', 'wave-hello', { timeout: 30_000 }); // the intro greets
    await expect(stage).toHaveAttribute('data-clip', 'idle', { timeout: 30_000 }); // and settles into the idle
    await expect(stage.locator('.meebit-pose')).toHaveText('Idle');
    await expect(stage).toHaveAttribute('data-meebit', '11752');
    await stage.locator('.meebit-pose').click();
    await expect(stage).toHaveAttribute('data-clip', 'wave-hey', { timeout: 30_000 });
    await page.keyboard.press('m');
    await expect(stage).toHaveAttribute('data-meebit', '17273');
    await expect(stage.locator('.meebit-pose')).toBeVisible({ timeout: 30_000 }); // the new Meebit is up and animating
    await stage.getByRole('button', { name: 'Next Meebit' }).click();
    await expect(stage).toHaveAttribute('data-meebit', '13307');
    await page.keyboard.press('5');
    await expect(stage).toHaveAttribute('data-mood', 'world');
    await expect(stage).toHaveAttribute('data-clip', 'look-around', { timeout: 30_000 });
    await page.keyboard.press('ArrowDown'); // in the world the arrows change the pose
    await expect(stage).toHaveAttribute('data-clip', 'look-behind', { timeout: 30_000 });
    await page.keyboard.press('ArrowUp');
    await expect(stage).toHaveAttribute('data-clip', 'look-around', { timeout: 30_000 });
    await page.locator('[data-set-url]').first().click();
    await expect(stage).toHaveAttribute('data-clip', 'belly-dance', { timeout: 30_000 }); // first dance of the catalogue
    await page.keyboard.press(' '); // paused set: no dance
    await expect(stage).toHaveAttribute('data-clip', 'look-around', { timeout: 30_000 });
  });

  test('the world lists every pose; a pick plays it, the character click cycles its group, auto hands back to the mood', async ({ page }) => {
    await page.goto('/world');
    const stage = page.locator('[data-stage]');
    expect(await page.locator('[data-anim]').count()).toBeGreaterThan(100);
    await page.locator('[data-anim="thriller"]').click();
    await expect(stage).toHaveAttribute('data-clip', 'thriller', { timeout: 30_000 });
    await expect(page.locator('[data-anim="thriller"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(stage.locator('.meebit-pose')).toHaveText('Thriller');
    await stage.locator('.meebit-pose').click();
    await expect(stage).toHaveAttribute('data-clip', 'thriller-2', { timeout: 30_000 });
    await page.locator('[data-anim="thriller-2"]').click(); // picking the running clip again hands control back
    await expect(stage).toHaveAttribute('data-clip', 'look-around', { timeout: 30_000 });
    await expect(page.locator('[data-anim="thriller-2"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('keys are ignored inside inputs except Escape', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const i = document.createElement('input');
      i.id = 'probe';
      document.body.append(i);
      i.focus();
    });
    await page.keyboard.type('3');
    await expect(page).not.toHaveURL(/#web2/);
  });
});
