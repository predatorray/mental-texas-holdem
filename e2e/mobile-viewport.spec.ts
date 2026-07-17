import {test, expect} from './coverage-fixture';
import {createRoom, PokerApp} from './pages';

/**
 * Responsiveness regression tests: the lobby and the game table must fit a
 * phone-sized viewport without horizontal overflow, and the main controls
 * must stay visible and usable.
 */

const PHONE_VIEWPORT = {width: 390, height: 844};

async function expectNoHorizontalOverflow(app: PokerApp) {
  const overflow = await app.page.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test('Lobby fits a phone-sized screen', async ({ browser }) => {
  const context = await browser.newContext({viewport: PHONE_VIEWPORT});
  const app = new PokerApp(await context.newPage());
  await app.goto();

  await expect(app.lobby.staging).toBeVisible();
  await expect(app.lobby.roomLink).toBeVisible();
  await expect(app.lobby.playersCard).toBeVisible();
  await expectNoHorizontalOverflow(app);
});

test('Game table fits a phone-sized screen', async ({ browser }) => {
  test.setTimeout(60_000);

  const {host, guests} = await createRoom({browser, viewport: PHONE_VIEWPORT});
  const guest = guests[0];

  await host.lobby.startGame();

  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  // The acting player's controls must be visible on a phone screen
  await expect(host.table.checkOrCallButton).toBeVisible();
  await expect(host.table.pot).toBeVisible();

  for (const app of [host, guest]) {
    await expectNoHorizontalOverflow(app);
  }
});
