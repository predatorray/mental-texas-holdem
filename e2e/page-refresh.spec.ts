import {test, expect} from './coverage-fixture';
import {Page} from '@playwright/test';
import {testMultiplePeers} from "./common";

/**
 * Wait for the check/call action button to appear on one of the given pages.
 * Returns the page where the button became visible.
 */
async function waitForTurn(pages: Page[]): Promise<Page> {
  return await Promise.race(
    pages.map(page =>
      page.getByTestId('check-or-call-action-button')
        .waitFor({state: 'visible', timeout: 30_000})
        .then(() => page)
    )
  );
}

/**
 * Perform a check or call on whichever page currently has the turn.
 */
async function checkOrCallOnTurn(pages: Page[]): Promise<Page> {
  const page = await waitForTurn(pages);
  const button = page.getByTestId('check-or-call-action-button');
  await button.click();
  await button.waitFor({state: 'hidden', timeout: 10_000});
  return page;
}

test('Guest refreshes mid-game and reconnects', async ({ browser }) => {
  test.setTimeout(60_000);

  const {hostPage, guestPages} = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  await hostPage.getByTestId('start-button').click();

  for (const page of allPages) {
    await expect(page.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible();
  }

  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);
  await waitForTurn(allPages);

  await guestPage.reload();

  await expect(guestPage.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible({timeout: 30_000});
  for (let i = 0; i < 3; i++) {
    await expect(guestPage.getByTestId(`board-card-${i}`)).not.toHaveAttribute('alt', 'Back');
  }
});

test('Action buttons survive guest refresh when it is their turn', async ({ browser }) => {
  test.setTimeout(60_000);

  const {hostPage, guestPages} = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  await hostPage.getByTestId('start-button').click();

  for (const page of allPages) {
    await expect(page.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible();
  }

  // Wait for whoever has the first turn; if it's the host, pass turn to guest
  const firstTurn = await waitForTurn(allPages);
  if (firstTurn === hostPage) {
    await hostPage.getByTestId('check-or-call-action-button').click();
  }

  await expect(guestPage.getByTestId('check-or-call-action-button')).toBeVisible();

  await guestPage.reload();

  await expect(guestPage.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible({timeout: 30_000});
  await expect(guestPage.getByTestId('check-or-call-action-button')).toBeVisible();
});

test('Action buttons survive host refresh when it is their turn', async ({ browser }) => {
  test.setTimeout(60_000);

  const {hostPage, guestPages} = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  await hostPage.getByTestId('start-button').click();

  for (const page of allPages) {
    await expect(page.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible();
  }

  // Wait for whoever has the first turn; if it's the guest, pass turn to host
  const firstTurn = await waitForTurn(allPages);
  if (firstTurn === guestPage) {
    await guestPage.getByTestId('check-or-call-action-button').click();
  }

  await expect(hostPage.getByTestId('check-or-call-action-button')).toBeVisible();

  await hostPage.reload();

  await expect(hostPage.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible({timeout: 30_000});
  await expect(hostPage.getByTestId('check-or-call-action-button')).toBeVisible();
});

test('Host refreshes mid-game and reconnects', async ({ browser }) => {
  test.setTimeout(60_000);

  const {hostPage, guestPages} = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  await hostPage.getByTestId('start-button').click();

  for (const page of allPages) {
    await expect(page.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible();
  }

  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);
  await waitForTurn(allPages);

  await hostPage.reload();

  await expect(hostPage.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible({timeout: 45_000});
  for (let i = 0; i < 3; i++) {
    await expect(hostPage.getByTestId(`board-card-${i}`)).not.toHaveAttribute('alt', 'Back');
  }
});

// Bug 1: After guest refresh in preflop, game gets stuck in CHECK loop — community cards never appear
test('Guest refreshes preflop, then game progresses through flop', async ({ browser }) => {
  test.setTimeout(90_000);

  const {hostPage, guestPages} = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  await hostPage.getByTestId('start-button').click();
  // Wait for the game to actually start (action button visible means protocol complete)
  await waitForTurn(allPages);
  for (const page of allPages) {
    await expect(page.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible({timeout: 30_000});
  }

  // Host (SB) calls
  await checkOrCallOnTurn(allPages);

  // Guest (BB) refreshes before checking
  await guestPage.reload();
  await expect(guestPage.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible({timeout: 30_000});

  // Guest should see CHECK button and can continue
  await expect(guestPage.getByTestId('check-or-call-action-button')).toBeVisible();
  await guestPage.getByTestId('check-or-call-action-button').click();

  // Flop should be revealed (3 face-up board cards)
  for (const page of allPages) {
    for (let i = 0; i < 3; i++) {
      await expect(page.getByTestId(`board-card-${i}`)).not.toHaveAttribute('alt', 'Back');
    }
  }

  // Game should continue: flop betting
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // Turn card revealed
  for (const page of allPages) {
    await expect(page.getByTestId('board-card-3')).not.toHaveAttribute('alt', 'Back');
  }
});

// Bug 2: Host refresh breaks the game — host has no gameRoomId URL param
test('Host refreshes preflop, then game progresses through flop', async ({ browser }) => {
  test.setTimeout(90_000);

  const {hostPage, guestPages} = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  await hostPage.getByTestId('start-button').click();
  // Wait for the game to actually start (action button appears after protocol + newRound)
  await expect(hostPage.getByTestId('check-or-call-action-button')).toBeVisible({timeout: 30_000});
  await expect(guestPage.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible({timeout: 30_000});

  // Host (SB) refreshes before taking any action
  await hostPage.reload();
  await expect(hostPage.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible({timeout: 30_000});

  // Host should see CALL button after reconnect
  await expect(hostPage.getByTestId('check-or-call-action-button')).toBeVisible();

  // Complete preflop
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // Flop should be revealed
  for (const page of allPages) {
    for (let i = 0; i < 3; i++) {
      await expect(page.getByTestId(`board-card-${i}`)).not.toHaveAttribute('alt', 'Back');
    }
  }

  // Continue through flop
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // Turn card revealed
  for (const page of allPages) {
    await expect(page.getByTestId('board-card-3')).not.toHaveAttribute('alt', 'Back');
  }
});

// Comprehensive: full game with random guest refresh mid-flop
test('Full game with guest refresh during flop betting', async ({ browser }) => {
  test.setTimeout(90_000);

  const {hostPage, guestPages} = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  await hostPage.getByTestId('start-button').click();
  for (const page of allPages) {
    await expect(page.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible();
  }

  // Preflop: both check/call
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // Flop action appears
  await waitForTurn(allPages);

  // Guest refreshes during flop
  await guestPage.reload();
  await expect(guestPage.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible({timeout: 30_000});

  // Flop cards should still be visible after refresh
  for (let i = 0; i < 3; i++) {
    await expect(guestPage.getByTestId(`board-card-${i}`)).not.toHaveAttribute('alt', 'Back');
  }

  // Continue through flop
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // Turn card revealed
  for (const page of allPages) {
    await expect(page.getByTestId('board-card-3')).not.toHaveAttribute('alt', 'Back');
  }

  // Continue through turn
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // River card revealed
  for (const page of allPages) {
    await expect(page.getByTestId('board-card-4')).not.toHaveAttribute('alt', 'Back');
  }

  // Final round
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // Game should end
  const continueButton = hostPage.getByTestId('continue-button');
  await expect(continueButton).toBeVisible();
});

// Comprehensive: full game with host refresh during turn betting
test('Full game with host refresh during turn betting', async ({ browser }) => {
  test.setTimeout(90_000);

  const {hostPage, guestPages} = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  await hostPage.getByTestId('start-button').click();
  for (const page of allPages) {
    await expect(page.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible();
  }

  // Preflop
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // Flop
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // Turn action appears
  await waitForTurn(allPages);

  // Host refreshes during turn
  await hostPage.reload();
  await expect(hostPage.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible({timeout: 30_000});

  // Turn card should be visible
  await expect(hostPage.getByTestId('board-card-3')).not.toHaveAttribute('alt', 'Back');

  // Continue through turn
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // River card revealed
  for (const page of allPages) {
    await expect(page.getByTestId('board-card-4')).not.toHaveAttribute('alt', 'Back');
  }

  // Final round
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // Game should end
  const continueButton = hostPage.getByTestId('continue-button');
  await expect(continueButton).toBeVisible();
});
