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
  await openDock(page, 'Team');
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
  await expect(page.getByText(`E2E ${name}`)).toBeVisible();
});
