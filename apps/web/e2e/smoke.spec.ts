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

test('prestige explains what you keep and what resets, with stats and history one tap away', async ({ page }) => {
  await freshCompany(page, 'Rank');
  await openDock(page, 'Prestige');
  const sheet = page.getByRole('dialog', { name: 'Prestige & Legacy' });
  await expect(sheet.getByText('You keep')).toBeVisible();
  await expect(sheet.getByText('Resets to day one')).toBeVisible();
  await expect(sheet.getByLabel('Prestige rank 0')).toBeVisible();
  await expect(sheet.getByText(/Prestige now to become Operator/)).toBeVisible();
  await sheet.getByRole('tab', { name: 'Stats & history' }).click();
  await expect(sheet.getByText('Lifetime')).toBeVisible();
  await expect(sheet.getByText('Achievements')).toBeVisible();
  await sheet.getByRole('tab', { name: 'Prestige' }).click();
  await expect(sheet.getByText('You keep')).toBeVisible();
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
  const name = await challenge.locator('.font-display', { hasText: /^Challenge \w+ Ltd$/ }).first().innerText();
  expect(name).toMatch(/^Challenge \w+ Ltd$/);
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
