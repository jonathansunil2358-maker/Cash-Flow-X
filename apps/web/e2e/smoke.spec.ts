import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/** Clear anything that pauses the game: event choices, celebrations, the offline summary. */
async function clearOverlays(page: Page) {
  for (let i = 0; i < 10; i++) {
    // Celebrations sit on top of event cards, so dismiss them first.
    const dismiss = page.getByRole('button', { name: /^(Nice|Back to work)/ });
    if (await dismiss.isVisible()) { await dismiss.click(); continue; }
    const choice = page.locator('.cfx-choice').first();
    if (await choice.isVisible()) { await choice.click(); continue; }
    break;
  }
}

/** Sign in with the local dev login (each run uses a fresh player). */
async function signIn(page: Page, prefix: string) {
  const name = `${prefix}${Date.now().toString(36).slice(-6)}`;
  await page.getByRole('textbox', { name: 'Player name' }).fill(name);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'New company' })).toBeVisible({ timeout: 15_000 });
  return name;
}

/** Close the first-run sector walkthrough. */
async function skipTour(page: Page) {
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await expect(page.locator('#tour-title')).toHaveCount(0);
}

async function openDock(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Actions' }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
}

test('onboard, play in real time, books balance, save/load round-trips', async ({ page }) => {
  test.setTimeout(180_000);
  await page.clock.install();
  await page.goto('/');
  // The fake clock would replay every animation frame of the 3D scene, so play with it off.
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:pref:scene3d', 'false'); });
  await page.reload();
  await signIn(page, 'E2E');

  // Onboarding: sector → name and icon → difficulty.
  await page.getByRole('button', { name: 'New company' }).click();
  await expect(page.getByText('What will you build?')).toBeVisible();
  await page.getByRole('button', { name: 'Next: name it' }).click();
  await page.locator('#biz-name').fill('E2E Ltd');
  await page.getByRole('radio', { name: 'Crown' }).click();
  await page.getByRole('button', { name: 'Next: difficulty' }).click();
  await page.getByRole('radio', { name: /Easy/ }).click();
  await page.getByRole('button', { name: 'Open for business' }).click();
  await expect(page.locator('.cfx-hud__name')).toHaveText('E2E Ltd');

  // The sector walkthrough opens first and holds the clock until it is finished.
  await expect(page.locator('#tour-title')).toHaveText('Welcome to E2E Ltd!');
  await expect(page.getByText(/· paused/)).toBeVisible();
  await page.getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('#tour-title')).toHaveText(/^Your /);
  for (let n = 0; n < 20 && !(await page.getByRole('button', { name: "Let's go!" }).isVisible()); n++) {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.getByRole('button', { name: "Let's go!" }).click();
  await expect(page.locator('#tour-title')).toHaveCount(0);

  // Decisions from the dock panels.
  await openDock(page, 'Business');
  await page.getByRole('button', { name: 'Hire' }).first().click();
  await expect(page.getByText(/Hired 1 ×/)).toBeVisible();
  await clearOverlays(page);
  await page.getByRole('button', { name: 'Close panel' }).click();

  await openDock(page, 'Upgrades');
  await page.getByRole('button', { name: /^Upgrade £/ }).first().click();
  await expect(page.getByText(/upgraded to level 1/)).toBeVisible();
  await clearOverlays(page);
  await page.getByRole('button', { name: 'Close panel' }).click();

  await openDock(page, 'Finance');
  await page.getByRole('button', { name: 'Borrow' }).click();
  await expect(page.getByText(/Borrowed £/)).toBeVisible();
  await clearOverlays(page);
  await page.getByRole('button', { name: 'Close panel' }).click();

  // Let 3 months pass on the real-time clock (10 seconds each at x1). The fake clock also plays
  // every animation frame of the 3D scene, so a few months keeps the test fast.
  for (let i = 0; i < 3; i++) {
    await clearOverlays(page);
    await page.clock.runFor(10_500);
  }
  await clearOverlays(page);
  await expect(page.locator('.cfx-hud__date')).toContainText('Apr 2027');

  // The Books: statements tie.
  await openDock(page, 'Books');
  await page.getByRole('tab', { name: 'Statements' }).click();
  await expect(page.getByText('Assets = Liabilities + Equity')).toBeVisible();
  await expect(page.getByText('Cash flow reconciles to cash')).toBeVisible();
  await clearOverlays(page);
  await page.getByRole('button', { name: 'Close panel' }).click();

  // Panels (the menu included) pause time by default; the setting lets it keep running.
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText(/· paused/)).toBeVisible();
  const pauseToggle = page.getByRole('checkbox', { name: /Pause time while a panel is open/ });
  await expect(pauseToggle).toBeChecked();
  await pauseToggle.uncheck();
  await expect(page.getByText(/· paused/)).toHaveCount(0);
  await pauseToggle.check();
  await expect(page.getByText(/· paused/)).toBeVisible();

  // Save, leave, load it back.
  await page.getByRole('button', { name: 'Save to slot 1' }).click();
  const date = await page.locator('.cfx-hud__date').textContent();
  await page.getByRole('button', { name: 'Main menu' }).click();
  const slot = page.locator('div', { has: page.getByText('Slot 1', { exact: false }) }).filter({ has: page.getByRole('button', { name: 'Load' }) }).last();
  await slot.getByRole('button', { name: 'Load' }).click();
  await expect(page.locator('.cfx-hud__name')).toHaveText('E2E Ltd');
  await expect(page.locator('.cfx-hud__date')).toContainText((date ?? '').split(' · ')[0]);
});

test('the 3D business scene renders without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await signIn(page, 'Scene');
  await page.getByRole('button', { name: 'New company' }).click();
  await page.getByRole('button', { name: 'Next: name it' }).click();
  await page.getByRole('button', { name: 'Next: difficulty' }).click();
  await page.getByRole('button', { name: 'Open for business' }).click();
  await skipTour(page);
  await expect(page.locator('section[aria-label="Your business"] canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('online: sign-in is required, runs are registered and verified, holding companies and leaderboards work', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:pref:scene3d', 'false'); });
  await page.reload();
  await expect(page.getByText('Sign in to play')).toBeVisible();
  const name = await signIn(page, 'Online');

  await page.getByRole('button', { name: 'New company' }).click();
  await page.getByRole('button', { name: 'Next: name it' }).click();
  await page.getByRole('button', { name: 'Next: difficulty' }).click();
  await page.getByRole('button', { name: 'Open for business' }).click();
  await expect(page.locator('.cfx-hud__name')).toBeVisible();
  await skipTour(page);

  // Let a few months pass, then leave the tab: the game syncs and the server verifies it.
  await page.getByRole('button', { name: 'x1' }).click();
  // Events pause the game, so keep answering them while waiting.
  await expect.poll(async () => {
    await clearOverlays(page);
    return page.evaluate(() => JSON.parse(localStorage.getItem('cfx:save:autosave') ?? '{}').month ?? 0);
  }, { timeout: 60_000, intervals: [1000] }).toBeGreaterThanOrEqual(2);
  await clearOverlays(page);
  await page.getByRole('button', { name: 'II' }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => page.evaluate(async () => {
    const r = await fetch('http://localhost:8787/me', { headers: { authorization: `Bearer ${localStorage.getItem('cfx:session')}` } });
    const me = await r.json();
    return me.activeRun?.month ?? -1;
  }), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await clearOverlays(page);

  // Found a holding company from the Social panel.
  await page.getByRole('button', { name: /Holding company and leaderboards/ }).click();
  await page.locator('#guild-name').fill(`E2E ${name}`);
  await page.getByRole('button', { name: 'Create holding company' }).click();
  await expect(page.getByText('Weekly goal')).toBeVisible();
  await expect(page.getByText(`${name} (you)`)).toBeVisible();

  // Leaderboards list verified players, including this one.
  await page.getByRole('tab', { name: 'Leaderboards' }).click();
  await page.getByRole('tab', { name: 'All time' }).click();
  await expect(page.locator('.cfx-rank.is-me')).toBeVisible();
  await page.getByRole('tab', { name: 'Holding cos' }).click();
  // Match the leaderboard row only: a transient "is open for members" message also names the company.
  await expect(page.locator('.cfx-rank__name').filter({ hasText: `E2E ${name}` })).toBeVisible();
});

/** A signed-in player with a fresh Easy company: fake clock (no pop-ups) and the 3D scene off, as the first test does. */
async function freshCompany(page: Page, prefix: string) {
  await page.clock.install();
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:pref:scene3d', 'false'); });
  await page.reload();
  await signIn(page, prefix);
  await page.getByRole('button', { name: 'New company' }).click();
  await page.getByRole('button', { name: 'Next: name it' }).click();
  await page.getByRole('button', { name: 'Next: difficulty' }).click();
  await page.getByRole('button', { name: 'Open for business' }).click();
  await skipTour(page);
}

test('prestige is one tap from the dock, on screen on every device', async ({ page }) => {
  await freshCompany(page, 'Prestige');
  const button = page.getByRole('navigation', { name: 'Actions' }).getByRole('button', { name: /^Prestige/ });
  // It must fit across the screen (the dock once scrolled sideways on phones, hiding the last button).
  const box = (await button.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await openDock(page, 'Prestige');
  const sheet = page.getByRole('dialog', { name: 'Prestige & Legacy' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('Needed to prestige')).toBeVisible();
});

test('every upgrade for the sector can be found in the Upgrades panel', async ({ page }) => {
  await freshCompany(page, 'Upgrades');
  await openDock(page, 'Upgrades');
  const sheet = page.getByRole('dialog', { name: 'Upgrades' });
  for (const name of ['Cloud migration', 'Sales CRM', 'Developer tooling', 'AI assistant', 'Reliability engineering', 'Enterprise sales team']) {
    await expect(sheet.getByText(name).first()).toBeVisible();
  }
});

test('the new Business cards open: promotions, morale and pay, R&D projects and rivals', async ({ page }) => {
  await freshCompany(page, 'Cards');
  await openDock(page, 'Business');
  const sheet = page.getByRole('dialog', { name: 'Run the business' });

  const promo = sheet.locator('#card-promo');
  await promo.getByRole('button', { name: 'Open' }).click();
  await expect(promo.getByLabel('Seasonal demand for the next six months')).toBeVisible();
  await promo.getByRole('button', { name: 'Start promotion' }).click();
  await expect(promo.getByText(/20% off, 2 months left/)).toBeVisible();
  await expect(promo.getByRole('button', { name: 'Start promotion' })).toBeDisabled();

  const morale = sheet.locator('#card-morale');
  await morale.getByRole('button', { name: 'Open' }).click();
  await morale.getByRole('button', { name: /Above market/ }).click();
  await expect(morale.getByRole('button', { name: /Above market/ })).toHaveAttribute('aria-pressed', 'true');

  const rnd = sheet.locator('#card-projects');
  await rnd.getByRole('button', { name: 'Open' }).click();
  await expect(rnd.getByText('New product line')).toBeVisible();
  await expect(rnd.getByRole('button', { name: 'Start project' }).first()).toBeDisabled();
  await expect(rnd.getByText(/at least 3 R&D staff/).first()).toBeVisible();

  const rivals = sheet.locator('#card-rivals');
  await rivals.getByRole('button', { name: 'Open' }).click();
  await expect(rivals.getByText(/Normal prices/).first()).toBeVisible();
});

test('prestige explains what happens, with stats and history one tap away', async ({ page }) => {
  await freshCompany(page, 'Rank');
  await openDock(page, 'Prestige');
  const sheet = page.getByRole('dialog', { name: 'Prestige & Legacy' });
  await expect(sheet.getByText('What happens')).toBeVisible();
  await expect(sheet.getByLabel('Prestige rank 0')).toBeVisible();
  await expect(sheet.getByText(/Prestige now to become Operator/)).toBeVisible();
  await sheet.getByRole('tab', { name: 'Stats & history' }).click();
  await expect(sheet.getByText('Lifetime')).toBeVisible();
  await expect(sheet.getByText('Achievements')).toBeVisible();
  await sheet.getByRole('tab', { name: 'Prestige' }).click();
  await expect(sheet.getByText('What happens')).toBeVisible();
});

test('sound and vibration are switchable, remembered, and actually make a sound when on', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __osc: number; AudioContext: unknown };
    w.__osc = 0;
    w.AudioContext = class {
      currentTime = 0; state = 'running'; destination = {};
      resume() { return Promise.resolve(); }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
      createOscillator() { w.__osc++; return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }; }
    };
  });
  await freshCompany(page, 'Sound');
  await openDock(page, 'Business');
  await page.getByRole('dialog', { name: 'Run the business' }).getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  const sfx = page.getByRole('checkbox', { name: 'Sound effects' });
  await expect(sfx).not.toBeChecked(); // off by default in automated browsers
  expect(await page.evaluate(() => (window as unknown as { __osc: number }).__osc)).toBe(0);
  await sfx.check();
  expect(await page.evaluate(() => localStorage.getItem('cfx:pref:sfx'))).toBe('on');
  expect(await page.evaluate(() => (window as unknown as { __osc: number }).__osc)).toBeGreaterThan(0);
  await sfx.uncheck();
  expect(await page.evaluate(() => localStorage.getItem('cfx:pref:sfx'))).toBe('off');
  const before = await page.evaluate(() => (window as unknown as { __osc: number }).__osc);
  await page.getByRole('button', { name: 'Save to slot 1' }).click(); // makes a toast
  expect(await page.evaluate(() => (window as unknown as { __osc: number }).__osc)).toBe(before);
  await page.getByRole('checkbox', { name: 'Vibration' }).check();
  expect(await page.evaluate(() => localStorage.getItem('cfx:pref:haptics'))).toBe('on');
});

test('the daily challenge: the same company for everyone, practise or play ranked once', async ({ page }) => {
  await freshCompany(page, 'Daily');
  await openDock(page, 'Missions');
  const sheet = page.getByRole('dialog', { name: 'Missions' });
  const card = sheet.locator('#card-daily');
  await expect(card.getByText(/Everyone plays the same company for 24 months/)).toBeVisible();
  await expect(card.getByLabel('Time left today')).toHaveText(/^\d\d:\d\d:\d\d$/);
  const name = await card.locator('.font-display').nth(1).innerText();
  expect(name).toMatch(/^Daily \w+ Ltd$/);

  // Ranked: it replaces the current company, and can only be done once a day.
  await card.getByRole('button', { name: "Play today's challenge" }).click();
  await card.getByRole('button', { name: 'Play without saving' }).click();
  await expect(page.locator('.cfx-hud__name')).toHaveText(name);
  await skipTour(page);
  await openDock(page, 'Missions');
  const again = page.getByRole('dialog', { name: 'Missions' }).locator('#card-daily');
  await expect(again.getByText(/You are playing it now: month 0 of 24/)).toBeVisible();
  await expect(again.getByRole('button', { name: "Play today's challenge" })).toHaveCount(0);
  await expect(again.getByRole('button', { name: /Practise/ })).toBeDisabled();
});

test('a share card is a real picture', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const m = await import('/src/lib/shareCard.ts');
    const c = m.drawShareCard({ heading: 'Daily Software Ltd', sub: 'Software · Medium · 2.0 years', badge: 'Prestiged: +12 Legacy', tone: 'good',
      stats: [['Final score', '1,234,567'], ['Equity value', '£12.3m'], ['Months in business', '24']] });
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/png'));
    return { w: c.width, h: c.height, size: blob?.size ?? 0, type: blob?.type };
  });
  expect(info.w).toBe(1080);
  expect(info.h).toBe(1350);
  expect(info.type).toBe('image/png');
  expect(info.size).toBeGreaterThan(10_000);
});


/** A real game saved by the previous version of the game (state version 3), 18 months into a software company. */
const oldGame = (): Record<string, any> =>
  JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v3-software.json'), 'utf8'));

/** Put an old-version game in the browser's storage before the app starts, then sign in. */
async function openWithOldGame(page: Page, game: Record<string, any>) {
  await page.addInitScript((g) => {
    if (localStorage.getItem('cfx:seeded')) return;
    localStorage.setItem('cfx:seeded', '1');
    localStorage.setItem('cfx:save:autosave', JSON.stringify(g));
    localStorage.setItem('cfx:meta:autosave', JSON.stringify({ slot: 'autosave', companyName: g.companyName, industryId: g.industryId, label: 'Jul 2028', savedAt: new Date().toISOString(), status: 'playing' }));
    localStorage.setItem('cfx:pref:scene3d', 'false');
    localStorage.setItem(`cfx:pref:tour:${g.industryId}`, 'done');
  }, game);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Player name' }).fill(`Old${Date.now().toString(36).slice(-6)}`);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

const savedGame = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('cfx:save:autosave') ?? 'null'));

test('a game saved on the old version carries on, with the new features', async ({ page }) => {
  const old = oldGame();
  expect(old.version).toBe(3);
  await openWithOldGame(page, old);
  await expect(page.locator('.cfx-hud__name')).toHaveText(old.companyName);
  await expect(page.getByText(/Your company was upgraded/)).toBeVisible();
  const saved = await savedGame(page);
  expect(saved.version).toBe(5);
  expect(saved.month).toBe(old.month);
  expect(saved.ledger.balances.cash).toBe(old.ledger.balances.cash);

  // The new features are all there, on the old company.
  await expect(page.getByRole('navigation', { name: 'Actions' }).getByRole('button', { name: /^Prestige/ })).toBeVisible();
  await openDock(page, 'Business');
  const sheet = page.getByRole('dialog', { name: 'Run the business' });
  const promo = sheet.locator('#card-promo');
  await promo.getByRole('button', { name: 'Open' }).click();
  await promo.getByRole('button', { name: 'Start promotion' }).click();
  await expect(promo.getByText(/20% off, 2 months left/)).toBeVisible();
  await sheet.locator('#card-morale').getByRole('button', { name: 'Open' }).click();
  await expect(sheet.locator('#card-morale').getByText(/Steady: 60/)).toBeVisible();
});

test('an online company from the old version is carried over to the server', async ({ page }) => {
  const old = oldGame();
  old.server = { runId: 'r-legacy', synced: 3, syncedMonth: 6 };
  let seen: any = null;
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
  await page.route('**/runs/r-legacy/carryover', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    seen = route.request().postDataJSON();
    return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ actionsVerified: seen.actions, month: seen.state.month, status: 'playing' }) });
  });
  await openWithOldGame(page, old);
  await expect(page.locator('.cfx-hud__name')).toHaveText(old.companyName);
  await expect.poll(async () => (await savedGame(page)).server.carry, { timeout: 15_000 }).toBe('done');
  expect(seen.state.version).toBe(5);
  expect(seen.state.actionLog).toEqual([]); // the server only needs the compact copy
  expect(seen.actions).toBe(old.actionLog.length);
  const saved = await savedGame(page);
  expect(saved.server.synced).toBe(old.actionLog.length);
  expect(saved.server.syncedMonth).toBe(old.month);
  expect(saved.server.flagged).toBeUndefined();
});

test('if the server refuses a carry-over, the company still plays but is unranked', async ({ page }) => {
  const old = oldGame();
  old.server = { runId: 'r-legacy', synced: 3, syncedMonth: 6 };
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
  await page.route('**/runs/r-legacy/carryover', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({ status: 422, headers: cors, contentType: 'application/json', body: JSON.stringify({ error: 'This company cannot be carried over: its accounts do not balance.' }) });
  });
  await openWithOldGame(page, old);
  await expect(page.locator('.cfx-hud__name')).toHaveText(old.companyName);
  await expect(page.getByText(/will not count for leaderboards/)).toBeVisible({ timeout: 15_000 });
  const saved = await savedGame(page);
  expect(saved.server.carry).toBe('failed');
  expect(saved.server.flagged).toMatch(/cannot be carried over/);
  // Still playable.
  await openDock(page, 'Business');
  await expect(page.getByRole('dialog', { name: 'Run the business' })).toBeVisible();
});

test('the growth cards open: locations, contracts, insurance, and the stock market in Finance', async ({ page }) => {
  await freshCompany(page, 'Growth');
  await openDock(page, 'Business');
  const sheet = page.getByRole('dialog', { name: 'Run the business' });

  const sites = sheet.locator('#card-sites');
  await sites.getByRole('button', { name: 'Open' }).click();
  await expect(sites.getByText(/Fit-out \(capitalised\)/)).toBeVisible();
  await expect(sites.getByRole('button', { name: 'Open a new site' })).toBeDisabled();
  await expect(sites.getByText(/Prove the first site works/)).toBeVisible();

  const contracts = sheet.locator('#card-contracts');
  await contracts.getByRole('button', { name: 'Open' }).click();
  await expect(contracts.getByText(/No offers right now/)).toBeVisible();

  const insurance = sheet.locator('#card-insurance');
  await insurance.getByRole('button', { name: 'Open' }).click();
  await insurance.getByRole('button', { name: /Basic cover/ }).click();
  await expect(insurance.getByRole('button', { name: /Basic cover/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#card-insurance').getByText(/excess of/)).toBeVisible();

  await page.getByRole('button', { name: 'Close panel' }).click();
  await openDock(page, 'Finance');
  const fin = page.getByRole('dialog', { name: 'Finance' });
  const listing = fin.locator('#card-listing');
  await listing.getByRole('button', { name: 'Open' }).click();
  await expect(listing.getByRole('button', { name: 'List the company' })).toBeDisabled();
  await expect(listing.getByText(/Investors want 24 months of accounts first/)).toBeVisible();
});

test('a game saved by the version before this one (state 4) carries on with the new features', async ({ page }) => {
  const v4 = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  expect(v4.version).toBe(4);
  await openWithOldGame(page, v4);
  await expect(page.locator('.cfx-hud__name')).toHaveText(v4.companyName);
  const saved = await savedGame(page);
  expect(saved.version).toBe(5);
  expect(saved.sites).toBe(1);
  expect(saved.insurance).toBe('none');
  expect(saved.month).toBe(v4.month);
  expect(saved.ledger.balances.cash).toBe(v4.ledger.balances.cash);
  await openDock(page, 'Business');
  const sheet = page.getByRole('dialog', { name: 'Run the business' });
  const insurance = sheet.locator('#card-insurance');
  await insurance.getByRole('button', { name: 'Open' }).click();
  await insurance.getByRole('button', { name: /Full cover/ }).click();
  await expect(insurance.getByRole('button', { name: /Full cover/ })).toHaveAttribute('aria-pressed', 'true');
});

test('the weekly event shows its twist, and a friend challenge can be made, joined and played', async ({ page }) => {
  await freshCompany(page, 'Social');
  await openDock(page, 'Missions');
  const sheet = page.getByRole('dialog', { name: 'Missions' });

  const weekly = sheet.locator('#card-weekly');
  await expect(weekly.getByText(/^Twist: /)).toBeVisible();
  await expect(weekly.getByLabel('Time left this week')).toHaveText(/\d\d:\d\d:\d\d$/);

  // A challenge: the server makes the code, and the company comes from the code alone.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => { (navigator as any).share = undefined; });
  const challenge = sheet.locator('#card-challenge');
  await challenge.getByRole('button', { name: 'Make a challenge and share it' }).click();
  await expect(challenge.getByText(/code [A-Z2-9]{6}/)).toBeVisible();
  const code = (await challenge.getByText(/code [A-Z2-9]{6}/).innerText()).match(/code ([A-Z2-9]{6})/)![1];
  const name = await challenge.locator('.font-display', { hasText: /^Challenge [\w-]+ Ltd$/ }).first().innerText();
  expect(name).toMatch(/^Challenge [\w-]+ Ltd$/);
  await challenge.getByRole('button', { name: 'Play this challenge' }).click();
  await challenge.getByRole('button', { name: 'Play without saving' }).click();
  await expect(page.locator('.cfx-hud__name')).toHaveText(name);
  await skipTour(page);
  expect(code).toMatch(/^[A-Z2-9]{6}$/);
});

test('a challenge link is remembered through sign-in and offered on the menu', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?challenge=abc234');
  await expect(page).toHaveURL(/localhost:5173\/$/);
  await page.evaluate(() => localStorage.setItem('cfx:pref:scene3d', 'false'));
  expect(await page.evaluate(() => localStorage.getItem('cfx:pref:challenge'))).toBe('ABC234');
  await signIn(page, 'Link');
  await expect(page.getByText('A friend challenged you')).toBeVisible();
  await expect(page.getByText(/Code ABC234/)).toBeVisible();
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByText('A friend challenged you')).toHaveCount(0);
});

test('titles are earned, and the island shop sells skins for gems', async ({ page }) => {
  await freshCompany(page, 'Shop');
  // Give the player some gems and an achievement title to wear.
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('cfx:profile')!);
    p.gems = 500;
    p.achievements = { ...p.achievements, insured: new Date().toISOString() };
    localStorage.setItem('cfx:profile', JSON.stringify(p));
  });
  await page.reload();
  await skipTourIfShown(page);
  await openDock(page, 'Missions');
  const missions = page.getByRole('dialog', { name: 'Missions' });
  const titles = missions.locator('#card-titles');
  await expect(titles.getByText('the Careful')).toBeVisible();
  await titles.locator('button:not([disabled])', { hasText: 'Wear' }).first().click();
  await expect(titles.getByText('You are "the Careful".')).toBeVisible();
  await expect(titles.getByRole('button', { name: 'Worn' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Close panel' }).click();

  await page.getByRole('button', { name: /^(Menu|Settings)/ }).first().click();
  const shop = page.locator('#card-shop');
  await expect(shop.getByText('Autumn')).toBeVisible();
  await shop.getByRole('button', { name: /Buy for 60/ }).click();
  await expect(shop.getByRole('button', { name: 'Equipped' })).toHaveCount(1);
  await expect(shop.getByText(/You have 440 gems/)).toBeVisible();
  await shop.getByRole('button', { name: 'Equip' }).first().click();
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('cfx:profile')!));
  expect(profile.cosmetics.owned).toEqual(['default', 'autumn']);
  expect(profile.cosmetics.skin).toBe('default');
  expect(profile.title).toBe('insured');
});

async function skipTourIfShown(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip tutorial' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

test('a company saved at the old prestige screen just carries on', async ({ page }) => {
  const sold = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  sold.status = 'prestiged';
  sold.endReason = 'You sold it.';
  sold.prestigeAward = 9;
  await openWithOldGame(page, sold);
  await expect(page.locator('.cfx-hud__name')).toHaveText(sold.companyName);
  await expect(page.getByText(/The company has failed|Prestiged: \+/)).toHaveCount(0);
  const saved = await savedGame(page);
  expect(saved.status).toBe('playing');
  expect(saved.version).toBe(5);
  expect(saved.prestigeLevel).toBe((sold.prestigeLevel ?? 0) + 1);
  expect(saved.month).toBe(sold.month);
  // The rank and its multiplier are visible in the top bar and on the Prestige panel.
  const rank = saved.prestigeLevel;
  await expect(page.getByRole('button', { name: new RegExp(`^Prestige rank ${rank}, .*: \\+${rank * 2}% demand`) })).toBeVisible();
  await openDock(page, 'Prestige');
  await expect(page.getByRole('dialog', { name: 'Prestige & Legacy' }).getByText(new RegExp(`\\+${rank * 2}% demand \\(rank ${rank}\\)`))).toBeVisible();
});

test('a sold company saved at the current version carries on too', async ({ page }) => {
  const sold = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  // Same company, but stamped as the current version and sold, as a save made just before the change would be.
  sold.status = 'prestiged';
  sold.prestigeLevel = 3;
  sold.prestigeAward = 15;
  await openWithOldGame(page, sold);
  await expect(page.locator('.cfx-hud__name')).toHaveText(sold.companyName);
  const saved = await savedGame(page);
  expect(saved.status).toBe('playing');
  expect(saved.prestigeLevel).toBe(4);
  await expect(page.getByText(/Prestiged: \+/)).toHaveCount(0);
});

test('extra challenges can be chosen for a new company, and the pressures and rival personalities are shown', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:pref:scene3d', 'false'); });
  await page.reload();
  await signIn(page, 'Mods');
  await page.getByRole('button', { name: 'New company' }).click();
  await page.getByRole('button', { name: 'Next: name it' }).click();
  await page.getByRole('button', { name: 'Next: difficulty' }).click();
  const extra = page.getByLabel('Extra challenges');
  await expect(extra.getByRole('checkbox')).toHaveCount(7);
  await extra.getByRole('checkbox', { name: /Slow market/ }).click();
  await extra.getByRole('checkbox', { name: /Runaway inflation/ }).click();
  await expect(extra.getByText('Score and Legacy bonus: +20%')).toBeVisible();
  await page.getByRole('radio', { name: /Hard/ }).click();
  await expect(page.getByLabel('Extra challenges')).toHaveCount(0);
  await page.getByRole('radio', { name: /Medium/ }).click();
  await page.getByRole('button', { name: 'Open for business' }).click();
  await skipTour(page);
  const saved = await savedGame(page);
  expect(saved.modifiers).toEqual(['slow-market', 'inflation']);
  await openDock(page, 'Business');
  const sheet = page.getByRole('dialog', { name: 'Run the business' });
  const pressures = sheet.locator('#card-pressures');
  await pressures.getByRole('button', { name: 'Open' }).click();
  await expect(pressures.getByText('Wages each new year')).toBeVisible();
  await expect(pressures.getByText('+8%')).toBeVisible();
  await expect(pressures.getByText(/Extra challenges \(\+20% score and Legacy\)/)).toBeVisible();
  const rivals = sheet.locator('#card-rivals');
  await rivals.getByRole('button', { name: 'Open' }).click();
  await expect(rivals.getByText(/Price slasher/)).toBeVisible();
  await expect(rivals.getByText(/Quality snob/)).toBeVisible();
});

test('the fun cards: board meetings, team, daily quests, trophies and the what-if forecaster', async ({ page }) => {
  await freshCompany(page, 'Fun');
  await openDock(page, 'Business');
  const biz = page.getByRole('dialog', { name: 'Run the business' });
  const board = biz.locator('#card-board');
  await board.getByRole('button', { name: 'Open' }).click();
  await expect(board.getByText(/Set at month 3/)).toBeVisible();
  const team = biz.locator('#card-roster');
  await team.getByRole('button', { name: 'Open' }).click();
  await expect(team.getByText(/Hire someone in the Team panel to meet them here/)).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).click();

  await openDock(page, 'Missions');
  const missions = page.getByRole('dialog', { name: 'Missions' });
  const quests = missions.locator('#card-quests');
  await expect(quests.getByRole('button', { name: /Claim/ })).toHaveCount(3);
  await expect(quests.getByRole('button', { name: /Claim/ }).first()).toBeDisabled();
  await expect(quests.getByText('0/3 claimed')).toBeVisible();
  await expect(missions.locator('#card-trophies').getByText('Best Employer')).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).click();

  await openDock(page, 'Books');
  await page.getByRole('tab', { name: /Forecast/ }).click();
  const whatif = page.locator('#card-whatif');
  await expect(whatif.getByText(/same as now/).first()).toBeVisible();
  await whatif.getByLabel('Price change').fill('20');
  await expect(whatif.getByText(/Price \+20%/)).toBeVisible();
  await expect(whatif.getByRole('button', { name: 'Reset sliders' })).toBeVisible();
});

test('a finished quest can be claimed for gems, once', async ({ page }) => {
  await freshCompany(page, 'Quest');
  const gemsBefore = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('cfx:profile')!);
    p.quests = {
      day: new Date().toISOString().slice(0, 10), streak: 0, lastDone: null, bonusPaid: false,
      items: [{ id: 'months3', progress: 3, claimed: false }, { id: 'upgrade1', progress: 0, claimed: false }, { id: 'hire1', progress: 0, claimed: false }],
    };
    localStorage.setItem('cfx:profile', JSON.stringify(p));
    return p.gems as number;
  });
  await page.reload();
  await skipTourIfShown(page);
  await openDock(page, 'Missions');
  const quests = page.getByRole('dialog', { name: 'Missions' }).locator('#card-quests');
  await expect(quests.getByText('Close 3 months')).toBeVisible();
  await quests.getByRole('button', { name: 'Claim' }).first().click();
  await expect(quests.getByText('1/3 claimed')).toBeVisible();
  await expect(quests.getByRole('button', { name: 'Claimed' })).toHaveCount(1);
  const gemsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('cfx:profile')!).gems as number);
  expect(gemsAfter).toBe(gemsBefore + 5);
});

test('a company worth millions gets a helipad and the 3D scene still renders', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  g.history.at(-1).valuation.equityValue = 800_000_000;
  await page.addInitScript((game) => {
    if (localStorage.getItem('cfx:seeded')) return;
    localStorage.setItem('cfx:seeded', '1');
    localStorage.setItem('cfx:save:autosave', JSON.stringify(game));
    localStorage.setItem('cfx:meta:autosave', JSON.stringify({ slot: 'autosave', companyName: game.companyName, industryId: game.industryId, label: 'x', savedAt: new Date().toISOString(), status: 'playing' }));
    localStorage.setItem(`cfx:pref:tour:${game.industryId}`, 'done');
  }, g);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Player name' }).fill(`Heli${Date.now().toString(36).slice(-6)}`);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('section[aria-label="Your business"] canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('Batch A: mystery boxes, sticker album, hidden achievements and the rumour mill', async ({ page }) => {
  await freshCompany(page, 'Surp');
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('cfx:profile')!);
    p.boxes = 3;
    localStorage.setItem('cfx:profile', JSON.stringify(p));
  });
  await page.reload();
  await skipTourIfShown(page);
  await openDock(page, 'Business');
  const biz = page.getByRole('dialog', { name: 'Run the business' });
  const mill = biz.locator('#card-rumours');
  await mill.getByRole('button', { name: 'Open' }).click();
  await expect(mill.getByText(/No rumours right now/)).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).click();

  await openDock(page, 'Missions');
  const missions = page.getByRole('dialog', { name: 'Missions' });
  const boxes = missions.locator('#card-boxes');
  await expect(boxes.getByRole('button', { name: 'Open a box (3)' })).toBeVisible();
  await boxes.getByRole('button', { name: 'Open a box (3)' }).click();
  await expect(boxes.getByRole('status')).toBeVisible();
  await expect(boxes.getByRole('button', { name: 'Open a box (2)' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cfx:profile')!).boxes)).toBe(2);
  await expect(missions.locator('#card-album').getByText(/Sticker album \(\d+\/42\)/)).toBeVisible();
  await expect(missions.getByText('???').first()).toBeVisible();
});

test('Batch B: rival bosses with catchphrases and this year\'s mentor', async ({ page }) => {
  await freshCompany(page, 'Story');
  await openDock(page, 'Business');
  const biz = page.getByRole('dialog', { name: 'Run the business' });
  const rivals = biz.locator('#card-rivals');
  await rivals.getByRole('button', { name: 'Open' }).click();
  await expect(rivals.getByText(/Victor Crane/)).toBeVisible();
  await expect(rivals.getByText(/Everyone has a price/)).toBeVisible();
  const team = biz.locator('#card-roster');
  await team.getByRole('button', { name: 'Open' }).click();
  await expect(team.getByText(/This year's mentor: Dame Harriet Cole/)).toBeVisible();
});

test('Batch C: decorations, logo, photo studio, trophy hall and the year in review', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  g.awards = [{ year: 2026, id: 'profit' }, { year: 2027, id: 'growth' }];
  await page.addInitScript((game) => {
    if (localStorage.getItem('cfx:seeded')) return;
    localStorage.setItem('cfx:seeded', '1');
    localStorage.setItem('cfx:save:autosave', JSON.stringify(game));
    localStorage.setItem('cfx:meta:autosave', JSON.stringify({ slot: 'autosave', companyName: game.companyName, industryId: game.industryId, label: 'x', savedAt: new Date().toISOString(), status: 'playing' }));
    localStorage.setItem(`cfx:pref:tour:${game.industryId}`, 'done');
    localStorage.setItem('cfx:profile', JSON.stringify({ version: 3, xp: 0, achievements: { first_sale: 'x', first_profit: 'x', insured: 'x' }, missions: [], missionsCompleted: 0, daily: { lastClaim: null, streak: 0 }, legacyPoints: 0, legacyEarned: 0, prestigeCount: 0, perks: {}, gems: 400, boosts: [], rebirthsUsed: 0, runs: [], lifetime: { companies: 0, bankruptcies: 0, retired: 0, months: 0, bestStake: 0 } }));
  }, g);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Player name' }).fill(`Show${Date.now().toString(36).slice(-6)}`);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('section[aria-label="Your business"] canvas')).toBeVisible({ timeout: 20_000 });
  // Freeze game time so no month closes (and no celebration pops up) while the test clicks around.
  await clearOverlays(page);
  await page.clock.pauseAt(new Date(Date.now() + 1_000));

  // Settings: buy and place decorations, make a logo.
  await clearOverlays(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  const decor = page.locator('#card-decor');
  await decor.getByRole('button', { name: /Buy for 40/ }).click();
  await expect(decor.getByRole('button', { name: 'On the island' })).toHaveCount(1);
  await decor.getByRole('button', { name: 'On the island' }).click();
  await expect(decor.getByRole('button', { name: 'Place it' })).toHaveCount(1);
  await decor.getByRole('button', { name: 'Place it' }).click();
  const logo = page.locator('#card-logo');
  await logo.getByRole('button', { name: 'hex' }).click();
  await expect(logo.getByRole('button', { name: 'hex' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cfx:profile')!).logo.shape)).toBe('hex');
  await expect(page.getByRole('main').getByRole('img', { name: 'Company logo' })).toBeVisible();

  // Photo studio.
  await page.getByRole('button', { name: 'Close panel' }).dispatchEvent('click');
  await clearOverlays(page);
  await page.getByRole('button', { name: 'Photo mode' }).click();
  const studio = page.getByRole('dialog', { name: 'Photo studio' });
  await expect(studio.getByLabel('Photo preview')).toBeVisible();
  await studio.getByRole('button', { name: 'Sepia' }).click();
  await expect(studio.getByRole('button', { name: 'Sepia' })).toHaveAttribute('aria-pressed', 'true');
  await studio.getByRole('button', { name: 'Close' }).click();
  await expect(studio).toHaveCount(0);
  await expect(page.locator('section[aria-label="Your business"] canvas')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Batch C: the year in review appears at a new year', async ({ page }) => {
  test.setTimeout(120_000);
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  await openWithOldGame(page, g);
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  const dialog = page.getByRole('dialog', { name: /Year in review/ });
  for (let i = 0; i < 14 && !(await dialog.isVisible()); i++) {
    await clearOverlays(page);
    await page.clock.runFor(10_500);
  }
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText(/Revenue/).first()).toBeVisible();
  await page.getByRole('button', { name: 'On to next year' }).click();
  await expect(dialog).toHaveCount(0);
});

test('Batch D: advisors, risk meter, break-even, autopilot, cash calendar and saved plans', async ({ page }) => {
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  await openWithOldGame(page, g);
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  await clearOverlays(page);
  await openDock(page, 'Business');
  const biz = page.getByRole('dialog', { name: 'Run the business' });
  const advisors = biz.locator('#card-advisors');
  await advisors.getByRole('button', { name: 'Open' }).click();
  await expect(advisors.getByText(/Priya, your CFO/)).toBeVisible();
  await expect(advisors.getByText(/Marcus, head of marketing/)).toBeVisible();
  await expect(advisors.getByText(/Olu, head of operations/)).toBeVisible();
  const risk = biz.locator('#card-risk');
  await risk.getByRole('button', { name: 'Open' }).click();
  await expect(risk.getByText(/(Calm|Keep an eye on it|Danger|Critical): \d+/)).toBeVisible();
  const be = biz.locator('#card-breakeven');
  await be.getByRole('button', { name: 'Open' }).click();
  await expect(be.getByText(/Fixed costs last month/)).toBeVisible();
  const auto = biz.locator('#card-autopilot');
  await auto.getByRole('button', { name: 'Open' }).click();
  await auto.getByRole('button', { name: 'Add' }).first().click();
  await expect(auto.getByText(/of last month's sales/)).toBeVisible();
  expect((await savedGame(page)).rules).toEqual([{ kind: 'marketingPct', pct: 8 }]);
  await auto.getByRole('button', { name: 'Remove' }).click();
  await expect(auto.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  expect((await savedGame(page)).rules).toBeUndefined();
  await page.getByRole('button', { name: 'Close panel' }).click();

  await openDock(page, 'Finance');
  const cal = page.locator('#card-calendar');
  await cal.getByRole('button', { name: 'Open' }).click();
  await expect(cal.getByText(/Payroll and on-costs/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).click();

  await openDock(page, 'Books');
  await page.getByRole('tab', { name: /Forecast/ }).click();
  const whatif = page.locator('#card-whatif');
  await whatif.getByLabel('Price change').fill('10');
  await whatif.getByLabel('Plan name').fill('Premium');
  await whatif.getByRole('button', { name: 'Save plan' }).click();
  await expect(whatif.getByText('Saved plans')).toBeVisible();
  await expect(whatif.getByText('Premium', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cfx:profile')!).plans[0].name)).toBe('Premium');
  await whatif.getByRole('button', { name: 'Delete Premium' }).click();
  await expect(whatif.getByText('Saved plans')).toHaveCount(0);
});

test('Batch E: community goal, rival of the week, tournament, plan market and duels', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:pref:scene3d', 'false'); });
  await page.reload();
  await signIn(page, 'Comm');
  await page.getByRole('button', { name: 'New company' }).click();
  await page.getByRole('button', { name: 'Next: name it' }).click();
  await page.getByRole('button', { name: 'Next: difficulty' }).click();
  await page.getByRole('button', { name: 'Open for business' }).click();
  await expect(page.locator('.cfx-hud__name')).toBeVisible();
  await skipTour(page);
  await clearOverlays(page);
  await page.getByRole('button', { name: /Holding company and leaderboards/ }).click();
  await page.getByRole('tab', { name: 'Community' }).click();
  await expect(page.locator('#card-community')).toBeVisible();
  await expect(page.locator('#card-rival')).toBeVisible();
  await expect(page.locator('#card-tournament')).toBeVisible();
  await expect(page.locator('#card-market')).toBeVisible();
});

test('Batch F: culture, side ventures, reputation tier, season pass, skills and mastery', async ({ page }) => {
  test.setTimeout(120_000);
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  await openWithOldGame(page, g);
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  await clearOverlays(page);

  // Finance: back a venture.
  await openDock(page, 'Finance');
  const venture = page.locator('#card-venture');
  await venture.getByLabel('Venture').selectOption('safe');
  await venture.getByRole('button', { name: 'Back it' }).click();
  await expect.poll(async () => ((await savedGame(page)).ventures ?? []).length).toBe(1);
  await expect(venture.getByText(/until month/)).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).dispatchEvent('click');

  // Dashboard shows the reputation tier.
  await clearOverlays(page);
  await openDock(page, 'Books');
  await expect(page.getByRole('dialog', { name: /Books/ }).getByText(/^Reputation/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).dispatchEvent('click');
  await clearOverlays(page);

  // Missions: season pass, skills (none yet at level 1) and mastery.
  await openDock(page, 'Missions');
  const missions = page.getByRole('dialog', { name: 'Missions' });
  await expect(missions.locator('#card-pass')).toBeVisible();
  await expect(missions.locator('#card-skills').getByRole('button', { name: /Learn/ }).first()).toBeVisible();
  await expect(missions.locator('#card-mastery')).toBeVisible();
});

test('Batch F: a new company can pick a culture, and it shows in the pressures card', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:pref:scene3d', 'false'); });
  await page.reload();
  await signIn(page, 'Cult');
  await page.getByRole('button', { name: 'New company' }).click();
  await page.getByRole('button', { name: 'Next: name it' }).click();
  await page.getByRole('button', { name: 'Next: difficulty' }).click();
  await page.getByRole('radio', { name: /Frugal/ }).click();
  await page.getByRole('button', { name: 'Open for business' }).click();
  await expect(page.locator('.cfx-hud__name')).toBeVisible();
  await expect.poll(async () => (await savedGame(page)).modifiers).toEqual(['culture-frugal']);
});

test('Batch G: music and weather switches, and a first gets a party', async ({ page }) => {
  test.setTimeout(120_000);
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  g.prestigeLevel = 1; // the "new rank" milestone is reached at once
  await openWithOldGame(page, g);
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  await clearOverlays(page);

  // Settings: both switches persist.
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByLabel('Background music').check();
  await settings.getByLabel('Weather on the island').uncheck();
  expect(await page.evaluate(() => [localStorage.getItem('cfx:pref:music'), localStorage.getItem('cfx:pref:weather')])).toEqual(['on', 'off']);
  await settings.getByLabel('Background music').uncheck();
  await page.getByRole('button', { name: 'Close panel' }).dispatchEvent('click');

  // A player already being tracked for milestones gets a celebration the first time one is reached.
  await page.clock.runFor(10_500);
  await clearOverlays(page);
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('cfx:profile')!);
    p.milestones = [];
    localStorage.setItem('cfx:profile', JSON.stringify(p));
  });
  await page.reload();
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  const party = page.getByRole('dialog').filter({ hasText: /Milestone!/ });
  for (let i = 0; i < 14 && !(await party.isVisible()); i++) {
    const choice = page.locator('.cfx-choice').first();
    if (await choice.isVisible()) await choice.click();
    await page.clock.runFor(10_500);
  }
  await expect(party).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.cfx-confetti')).toBeVisible();
});

test('Batch H: puzzles, explain cards, glossary, audit day and the new case studies', async ({ page }) => {
  test.setTimeout(120_000);
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  await openWithOldGame(page, g);
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  await clearOverlays(page);

  // Books overview: an explain card. The first time a word is opened it joins the glossary.
  await openDock(page, 'Books');
  const books = page.getByRole('dialog', { name: /Books/ });
  await books.getByRole('button', { name: 'Explain EBITDA' }).click();
  await expect(books.getByRole('note').filter({ hasText: /interest, tax, depreciation/i })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cfx:profile')!).learn.terms)).toEqual(['ebitda']);
  await page.getByRole('button', { name: 'Close panel' }).dispatchEvent('click');
  await clearOverlays(page);

  // Missions: the two daily puzzles, audit day and the glossary.
  await openDock(page, 'Missions');
  const missions = page.getByRole('dialog', { name: 'Missions' });
  const spot = missions.locator('#card-spot');
  await expect(spot.getByRole('table', { name: 'Trial balance' })).toBeVisible();
  await spot.getByRole('group', { name: 'Which account is wrong?' }).getByRole('button').first().click();
  await expect(spot.getByRole('status')).toContainText(/Right!|Not quite\./);
  const detective = missions.locator('#card-detective');
  await detective.getByRole('group', { name: 'What is the problem?' }).getByRole('button').first().click();
  await expect(detective.getByRole('status')).toContainText(/Right!|Not quite\./);
  const learn = await page.evaluate(() => JSON.parse(localStorage.getItem('cfx:profile')!).learn);
  expect(learn.spotDay).toBeTruthy();
  expect(learn.detectiveDay).toBeTruthy();
  const audit = missions.locator('#card-audit');
  await audit.getByRole('button', { name: 'Open' }).click();
  await expect(audit.getByText(/auditors|Nothing to report/).first()).toBeVisible();
  const glossary = missions.locator('#card-glossary');
  await glossary.getByRole('button', { name: 'Open' }).click();
  await expect(glossary.getByText('EBITDA', { exact: true })).toBeVisible();
});

test('Batch H: the new case studies are on the start screen and play', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:pref:scene3d', 'false'); });
  await page.reload();
  await signIn(page, 'Case');
  for (const name of ['Case study: The cash crunch', 'Case study: The growth trap', 'Case study: The price war']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Case study: The price war' }).click();
  await page.getByRole('button', { name: 'Take the job' }).click();
  await expect(page.locator('.cfx-hud__name')).toHaveText('Ledgerly Ltd');
  await skipTour(page);
  const g = await savedGame(page);
  expect(g.scenarioId).toBe('price-war');
  expect(g.industryId).toBe('software');
});

test('V2 Batch B: customer segments, supplier choice and franchising', async ({ page }) => {
  test.setTimeout(120_000);
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  await openWithOldGame(page, g);
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  await clearOverlays(page);
  await openDock(page, 'Business');
  const biz = page.getByRole('dialog', { name: 'Run the business' });
  const seg = biz.locator('#card-segments');
  await seg.getByRole('button', { name: 'Open' }).click();
  await expect(seg.getByText(/Buy on price alone/)).toBeVisible();
  const sup = biz.locator('#card-supplier');
  await sup.getByRole('button', { name: 'Open' }).click();
  await sup.getByRole('button', { name: 'Switch' }).first().click();
  await expect.poll(async () => (await savedGame(page)).supplier).toBe('budget');
  const fr = biz.locator('#card-franchise');
  await fr.getByRole('button', { name: 'Open' }).click();
  await expect(fr.getByRole('button', { name: 'Open a franchise' })).toBeVisible();
});

test('V2 Batch C: pet, employee of the month, diary, newspaper, building names and hats', async ({ page }) => {
  test.setTimeout(120_000);
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  await openWithOldGame(page, g);
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  await clearOverlays(page);
  // Give the profile some gems so the pet and hat can be bought.
  await page.evaluate(() => {
    const raw = localStorage.getItem('cfx:profile');
    const p = raw ? JSON.parse(raw) : null;
    if (p) { p.gems = 500; localStorage.setItem('cfx:profile', JSON.stringify(p)); }
  });
  await page.clock.runFor(10_500);
  await clearOverlays(page);
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('cfx:profile')!);
    p.gems = 500;
    localStorage.setItem('cfx:profile', JSON.stringify(p));
  });
  await page.reload();
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  await clearOverlays(page);

  await openDock(page, 'Missions');
  const m = page.getByRole('dialog', { name: 'Missions' });
  await expect(m.locator('#card-news')).toBeVisible();
  await m.locator('#card-pet').getByLabel('Pet name').fill('Biscuit');
  await m.locator('#card-pet').getByRole('button', { name: 'Adopt' }).click();
  await expect(m.locator('#card-pet').getByText('Biscuit').first()).toBeVisible();
  await m.locator('#card-eom').getByRole('button', { name: 'Name them' }).click();
  await expect(m.locator('#card-eom').getByRole('button', { name: 'Done this month' })).toBeVisible();
  await m.locator('#card-diary').getByLabel('Diary entry').fill('A great start');
  await m.locator('#card-diary').getByRole('button', { name: 'Save' }).click();
  await expect(m.locator('#card-diary').getByText(/A great start/)).toBeVisible();
  const prof = await page.evaluate(() => JSON.parse(localStorage.getItem('cfx:profile')!));
  expect(prof.pet.name).toBe('Biscuit');
  expect(prof.eom).toHaveLength(1);
  expect(prof.diary[0].note).toBe('A great start');
  await page.getByRole('button', { name: 'Close panel' }).dispatchEvent('click');

  await clearOverlays(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  const st = page.getByRole('dialog', { name: 'Settings' });
  await st.locator('#card-wardrobe').getByRole('button', { name: /15 gems/ }).click();
  await expect(st.locator('#card-wardrobe').getByRole('button', { name: 'Wearing' })).toBeVisible();
  const first = st.locator('#card-names input').first();
  await first.fill('The Big Shed');
  expect(await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('cfx:profile')!).names))).toContain('The Big Shed');
});

test('V2 Batch D: chaos dial, ironman, speedrun, turnaround, boss badge area, puzzle league and seed sharing', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?seed=SHARED-1&sector=restaurant');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:pref:scene3d', 'false'); });
  await page.goto('/?seed=SHARED-1&sector=restaurant');
  await signIn(page, 'Modes');
  for (const name of [/Speedrun: a £1m company, fast/, /Case study: The turnaround/]) await expect(page.getByRole('button', { name })).toBeVisible();
  await page.getByRole('button', { name: 'New company' }).click();
  await expect(page.getByRole('radio', { name: /Restaurant/i }).first()).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Next: name it' }).click();
  await page.getByRole('button', { name: 'Next: difficulty' }).click();
  await expect(page.getByLabel('Seed', { exact: true })).toHaveValue('SHARED-1');
  await page.getByRole('checkbox', { name: /Ironman/ }).click();
  await page.getByRole('checkbox', { name: /Calm seas/ }).click();
  await page.getByRole('checkbox', { name: /Mayhem/ }).click();
  await expect(page.getByRole('checkbox', { name: /Calm seas/ })).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('button', { name: 'Open for business' }).click();
  await expect(page.locator('.cfx-hud__name')).toBeVisible();
  await skipTour(page);
  await expect.poll(async () => (await savedGame(page)).modifiers).toEqual(['chaos-mayhem', 'ironman']);
  await expect(page.locator('.cfx-hud__date')).toContainText('Ironman');
  expect((await savedGame(page)).seedLabel).toBe('SHARED-1');

  // Missions: answer the daily puzzle (also scores in the league), and the seed card shows the seed.
  await clearOverlays(page);
  await openDock(page, 'Missions');
  const m = page.getByRole('dialog', { name: 'Missions' });
  await m.locator('#card-spot').getByRole('group', { name: 'Which account is wrong?' }).getByRole('button').first().click();
  await expect(m.locator('#card-spot').getByRole('status')).toBeVisible();
  await expect(m.locator('#card-seed').getByLabel('Seed')).toHaveText('SHARED-1');
  await page.getByRole('button', { name: 'Close panel' }).dispatchEvent('click');
  await clearOverlays(page);
  // Undo is not allowed in Ironman.
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Undo last decision' })).toBeVisible();
});

test('V2 Batch E: land and its decorations, soundtracks, achievement trails and the museum', async ({ page }) => {
  test.setTimeout(120_000);
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  await openWithOldGame(page, g);
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  await clearOverlays(page);
  await page.clock.runFor(10_500);
  await clearOverlays(page);
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('cfx:profile')!);
    p.gems = 600;
    localStorage.setItem('cfx:profile', JSON.stringify(p));
  });
  await page.reload();
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  await clearOverlays(page);

  await page.getByRole('button', { name: 'Settings' }).click();
  const st = page.getByRole('dialog', { name: 'Settings' });
  // The playground needs the west lawn first.
  const playground = st.locator('#card-decor li', { hasText: 'Playground' });
  await expect(playground.getByRole('button', { name: /Needs the west lawn/ })).toBeDisabled();
  await st.locator('#card-land').locator('div', { hasText: 'West lawn' }).getByRole('button').first().click();
  await expect(st.locator('#card-land').getByText('Yours')).toBeVisible();
  await playground.getByRole('button', { name: /Buy for 35/ }).click();
  await expect(playground.getByRole('button', { name: 'On the island' })).toBeVisible();
  // A soundtrack.
  await st.locator('#card-tracks li', { hasText: 'Smoky jazz' }).getByRole('button', { name: /30 gems/ }).click();
  await expect(st.locator('#card-tracks li', { hasText: 'Smoky jazz' }).getByRole('button', { name: 'Playing' })).toBeVisible();
  const prof = await page.evaluate(() => JSON.parse(localStorage.getItem('cfx:profile')!));
  expect(prof.land).toEqual(['west']);
  expect(prof.tracks.selected).toBe('jazz');
  await page.getByRole('button', { name: 'Close panel' }).dispatchEvent('click');

  await clearOverlays(page);
  await openDock(page, 'Missions');
  const m = page.getByRole('dialog', { name: 'Missions' });
  await expect(m.locator('#card-trails').getByText('The money trail')).toBeVisible();
  await expect(m.locator('#card-museum')).toBeVisible();
});

test('V2: the 3D scene draws land, new decorations, hats, a pet and weather without errors', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('cfx:pref:weather', 'on');
    localStorage.setItem('cfx:pref:daynight', 'on');
  });
  await page.reload();
  await signIn(page, 'Scene2');
  await page.getByRole('button', { name: 'New company' }).click();
  await page.getByRole('button', { name: 'Next: name it' }).click();
  await page.getByRole('button', { name: 'Next: difficulty' }).click();
  await page.getByRole('button', { name: 'Open for business' }).click();
  await skipTour(page);
  await expect(page.locator('section[aria-label="Your business"] canvas')).toBeVisible({ timeout: 20_000 });
  // Give the profile land, decorations, a hat and a pet, then reload so the scene draws them.
  await page.evaluate(() => {
    const raw = localStorage.getItem('cfx:profile');
    const p = raw ? JSON.parse(raw) : {};
    p.gems = 999;
    p.land = ['west', 'east', 'north'];
    p.decor = { owned: ['playground', 'skatepark', 'treehouse', 'fountain'], placed: ['playground', 'skatepark', 'treehouse', 'fountain'] };
    p.wardrobe = { owned: ['crown'], equipped: 'crown' };
    p.pet = { kind: 'dog', name: 'Rex', adopted: '2026-10-01' };
    p.names = { ...(p.names ?? {}) };
    localStorage.setItem('cfx:profile', JSON.stringify(p));
  });
  await page.reload();
  await expect(page.locator('section[aria-label="Your business"] canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('img', { name: /Rex, your dog/ })).toBeVisible();
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
});

test('V2 Batch F: accountant\'s desk, tax sprint and the mock interview', async ({ page }) => {
  test.setTimeout(120_000);
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  await openWithOldGame(page, g);
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  await clearOverlays(page);
  await openDock(page, 'Missions');
  const m = page.getByRole('dialog', { name: 'Missions' });

  const desk = m.locator('#card-journal');
  await desk.getByRole('group', { name: 'Which entry?' }).getByRole('button').first().click();
  await expect(desk.getByRole('status')).toContainText(/Right!|Not quite\./);

  const sprint = m.locator('#card-sprint');
  await sprint.getByRole('button', { name: 'Start the clock' }).click();
  for (let i = 0; i < 10; i++) await sprint.getByRole('group', { name: 'Where does it go?' }).getByRole('button').first().click();
  await expect(sprint.getByRole('status')).toContainText(/You scored \d+ out of 100/);

  const iv = m.locator('#card-interview');
  await iv.getByRole('button', { name: 'Open' }).click();
  for (const q of ['liquidity', 'margin']) await iv.getByRole('group', { name: q }).getByRole('button').first().click();
  await iv.getByRole('group').nth(2).getByRole('button').first().click();
  await expect(iv.getByRole('status')).toContainText(/You got \d of 3/);

  const learn = await page.evaluate(() => JSON.parse(localStorage.getItem('cfx:profile')!).learn);
  expect(learn.journalDay).toBeTruthy();
  expect(learn.sprintDay).toBeTruthy();
  expect(learn.interviews).toHaveLength(1);
});

test('V3 Batch A: story campaign, founder backstory and the documentary', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:pref:scene3d', 'false'); });
  await page.reload();
  await signIn(page, 'Camp');
  await expect(page.getByRole('button', { name: /Chapter 1: The market stall/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Chapter 2: The first hire \(locked\)/ })).toBeDisabled();
  // A backstory can be chosen for a normal company.
  await page.getByRole('button', { name: 'New company' }).click();
  await page.getByRole('button', { name: 'Next: name it' }).click();
  await page.getByRole('button', { name: 'Next: difficulty' }).click();
  await page.getByRole('radio', { name: /Ex-banker/ }).click();
  await page.getByRole('button', { name: 'Open for business' }).click();
  await expect(page.locator('.cfx-hud__name')).toBeVisible();
  await expect.poll(async () => (await savedGame(page)).modifiers).toEqual(['origin-banker']);
  await skipTour(page);
  await clearOverlays(page);
  await openDock(page, 'Missions');
  const m = page.getByRole('dialog', { name: 'Missions' });
  await expect(m.locator('#card-documentary').getByText('The beginning')).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).dispatchEvent('click');
});

test('V3 Batch A: chapter one of the campaign starts as its own company', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:pref:scene3d', 'false'); });
  await page.reload();
  await signIn(page, 'Camp1');
  await page.getByRole('button', { name: /Chapter 1: The market stall/ }).click();
  await page.getByRole('button', { name: 'Take the job' }).click();
  await expect(page.locator('.cfx-hud__name')).toHaveText('Stall & Co');
  expect((await savedGame(page)).scenarioId).toBe('campaign-1');
});

test('V3 Batch B: product designer, hiring market, reviews, export markets and real estate', async ({ page }) => {
  test.setTimeout(120_000);
  const g = JSON.parse(readFileSync(join(process.cwd(), '../../packages/engine/test/fixtures/state-v4-software.json'), 'utf8'));
  await openWithOldGame(page, g);
  await expect(page.locator('.cfx-hud__name')).toHaveText(g.companyName);
  await clearOverlays(page);
  await openDock(page, 'Business');
  const biz = page.getByRole('dialog', { name: 'Run the business' });

  const design = biz.locator('#card-design');
  await design.getByRole('button', { name: 'Open' }).click();
  await design.getByLabel('Features').fill('70');
  await design.getByRole('button', { name: 'Redesign' }).click();
  await expect.poll(async () => (await savedGame(page)).design).toBe(70);

  const hire = biz.locator('#card-market-hire');
  await hire.getByRole('button', { name: 'Open' }).click();
  await hire.getByRole('button', { name: /^Hire/ }).first().click();
  await expect.poll(async () => ((await savedGame(page)).stars ?? []).length).toBe(1);

  const reviews = biz.locator('#card-reviews');
  await reviews.getByRole('button', { name: 'Open' }).click();
  await reviews.getByRole('button', { name: /^Reply to/ }).first().click();
  await expect.poll(async () => ((await savedGame(page)).replied ?? []).length).toBe(1);

  const ex = biz.locator('#card-export');
  await ex.getByRole('button', { name: 'Open' }).first().click();
  await expect(ex.getByText('Europe').first()).toBeVisible();
  const prop = biz.locator('#card-property');
  await prop.getByRole('button', { name: 'Open' }).click();
  await expect(prop.getByRole('button', { name: 'Buy the building' })).toBeVisible();
});
