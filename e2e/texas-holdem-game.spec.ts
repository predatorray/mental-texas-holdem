import {test, expect, Page} from '@playwright/test';
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
 * Waits for the button to disappear after clicking to avoid race conditions.
 */
async function checkOrCallOnTurn(pages: Page[]): Promise<Page> {
  const page = await waitForTurn(pages);
  const button = page.getByTestId('check-or-call-action-button');
  await button.click();
  await button.waitFor({state: 'hidden', timeout: 10_000});
  return page;
}

test('Game of two peers check/call only', async ({ browser }) => {
  const {
    hostPage,
    guestPages,
  } = await testMultiplePeers({browser});
  const guestPage = guestPages[0];

  const startButton = hostPage.getByTestId('start-button');
  await expect(startButton).toBeVisible();
  await expect(startButton).toHaveText(/start/);
  await startButton.click();

  for (let page of [hostPage, guestPage]) {
    const opponent = page.getByTestId('opponents').getByTestId('opponent-0');
    await expect(opponent).toBeVisible();
    await expect(opponent.locator('.bankroll').first()).toBeVisible();
  }

  const hostCallOrCheckButton = hostPage.getByTestId('check-or-call-action-button');
  await expect(hostCallOrCheckButton).toBeVisible();
  await expect(hostCallOrCheckButton).toHaveText(/CALL/);
  await hostCallOrCheckButton.click();
  await expect(hostCallOrCheckButton).not.toBeVisible();

  const guestCallOrCheckButton = guestPage.getByTestId('check-or-call-action-button');
  await expect(guestCallOrCheckButton).toBeVisible();
  await expect(guestCallOrCheckButton).toHaveText(/CHECK/);
  await guestCallOrCheckButton.click();
  await expect(guestCallOrCheckButton).not.toBeVisible();

  for (let page of [hostPage, guestPage]) {
    const pot = page.getByTestId('pot');
    await expect(pot).toHaveText(/4/);

    const flopCards = [
      page.getByTestId('board-card-0'),
      page.getByTestId('board-card-1'),
      page.getByTestId('board-card-2'),
    ];
    for (let flopCard of flopCards) {
      await expect(flopCard).toBeVisible();
      await expect(flopCard).not.toHaveAttribute('alt', 'Back');
    }
    const nonFlopCards = [
      page.getByTestId('board-card-3'),
      page.getByTestId('board-card-4'),
    ];
    for (let nonFlopCard of nonFlopCards) {
      await expect(nonFlopCard).toBeVisible();
      await expect(nonFlopCard).toHaveAttribute('alt', 'Back');
    }
  }

  await hostCallOrCheckButton.click();
  await guestCallOrCheckButton.click();

  for (let page of [hostPage, guestPage]) {
    const turnCard = page.getByTestId('board-card-3');
    await expect(turnCard).toBeVisible();
    await expect(turnCard).not.toHaveAttribute('alt', 'Back');

    const riverCard = page.getByTestId('board-card-4');
    await expect(riverCard).toBeVisible();
    await expect(riverCard).toHaveAttribute('alt', 'Back');
  }

  await hostCallOrCheckButton.click();
  await guestCallOrCheckButton.click();

  for (let page of [hostPage, guestPage]) {
    const riverCard = page.getByTestId('board-card-4');
    await expect(riverCard).toBeVisible();
    await expect(riverCard).not.toHaveAttribute('alt', 'Back');
  }

  await hostCallOrCheckButton.click();
  await guestCallOrCheckButton.click();

  await expect(hostCallOrCheckButton).not.toBeVisible();
  await expect(guestCallOrCheckButton).not.toBeVisible();

  const continueButton = hostPage.getByTestId('continue-button');
  await expect(continueButton).toBeVisible();
  await expect(continueButton).toHaveText(/continue/);
});

test('Game of two peers where one folds preflop', async ({ browser }) => {
  const {
    hostPage,
    guestPages,
  } = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  // Start the game
  await hostPage.getByTestId('start-button').click();

  // Wait for the game to start — opponents visible
  for (let page of allPages) {
    await expect(page.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible();
  }

  // Preflop: host is SB and acts first with a CALL.
  // The fold button should be visible since callAmount > 0
  const hostCallButton = hostPage.getByTestId('check-or-call-action-button');
  const hostFoldButton = hostPage.getByTestId('fold-action-button');
  await expect(hostCallButton).toBeVisible();
  await expect(hostCallButton).toHaveText(/CALL/);
  await expect(hostFoldButton).toBeVisible();
  await hostFoldButton.click();

  // Round should end immediately — the guest (BB) wins by LastOneWins
  await expect(hostCallButton).not.toBeVisible();
  await expect(guestPage.getByTestId('check-or-call-action-button')).not.toBeVisible();

  // Continue button should appear for the host to start next round
  const continueButton = hostPage.getByTestId('continue-button');
  await expect(continueButton).toBeVisible();
});

test('Game of two peers where one folds on the flop', async ({ browser }) => {
  const {
    hostPage,
    guestPages,
  } = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  await hostPage.getByTestId('start-button').click();

  for (let page of allPages) {
    await expect(page.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible();
  }

  // Preflop: both players check/call to see the flop
  // Host (SB) calls, Guest (BB) checks
  await checkOrCallOnTurn(allPages);
  await checkOrCallOnTurn(allPages);

  // Wait for the flop action button to appear (ensures flop+hole cards are dealt)
  await waitForTurn(allPages);

  // Flop should be revealed
  for (let page of allPages) {
    for (let i = 0; i < 3; i++) {
      await expect(page.getByTestId(`board-card-${i}`)).not.toHaveAttribute('alt', 'Back');
    }
  }

  // Flop: host (SB) acts first post-flop. Raise 1 pot, then guest folds.
  const hostRaiseButton = hostPage.getByTestId('raise-1-pot-action-button');
  await expect(hostRaiseButton).toBeVisible();
  await hostRaiseButton.click();

  // Guest should now see CALL and FOLD buttons
  const guestFoldButton = guestPage.getByTestId('fold-action-button');
  await expect(guestFoldButton).toBeVisible();
  await guestFoldButton.click();

  // Round should end — host wins by fold
  await expect(hostPage.getByTestId('check-or-call-action-button')).not.toBeVisible();
  await expect(guestPage.getByTestId('check-or-call-action-button')).not.toBeVisible();

  const continueButton = hostPage.getByTestId('continue-button');
  await expect(continueButton).toBeVisible();
});

test('Game of two peers with a raise and call', async ({ browser }) => {
  const {
    hostPage,
    guestPages,
  } = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  await hostPage.getByTestId('start-button').click();

  for (let page of allPages) {
    await expect(page.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible();
  }

  // Preflop: Host (SB) raises 1/2 pot instead of just calling
  const hostRaiseButton = hostPage.getByTestId('raise-half-pot-action-button');
  await expect(hostRaiseButton).toBeVisible();
  await hostRaiseButton.click();

  // Guest (BB) should see a CALL button (not CHECK, since host raised)
  const guestCallButton = guestPage.getByTestId('check-or-call-action-button');
  await expect(guestCallButton).toBeVisible();
  await expect(guestCallButton).toHaveText(/CALL/);
  await guestCallButton.click();

  // Wait for flop action button to appear (ensures cards are dealt)
  await waitForTurn(allPages);

  // Flop should be revealed
  for (let page of allPages) {
    for (let i = 0; i < 3; i++) {
      await expect(page.getByTestId(`board-card-${i}`)).not.toHaveAttribute('alt', 'Back');
    }
  }

  // Continue through flop, turn, river with check/call
  for (let stage = 0; stage < 3; stage++) {
    await checkOrCallOnTurn(allPages);
    await checkOrCallOnTurn(allPages);
  }

  // Round should be finished
  for (let page of allPages) {
    await expect(page.getByTestId('check-or-call-action-button')).not.toBeVisible();
  }

  const continueButton = hostPage.getByTestId('continue-button');
  await expect(continueButton).toBeVisible();
});

// NOTE: Multi-round tests are skipped because the mental poker protocol
// does not currently complete a second shuffle within the same session.
test.skip('Game of two peers play two consecutive rounds', async ({ browser }) => {
  const {
    hostPage,
    guestPages,
  } = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  // --- Round 1 ---
  await hostPage.getByTestId('start-button').click();
  for (let stage = 0; stage < 4; stage++) {
    await checkOrCallOnTurn(allPages);
    await checkOrCallOnTurn(allPages);
  }
  const continueButton = hostPage.getByTestId('continue-button');
  await expect(continueButton).toBeVisible();

  // --- Round 2 ---
  await continueButton.click();
  for (let stage = 0; stage < 4; stage++) {
    await checkOrCallOnTurn(allPages);
    await checkOrCallOnTurn(allPages);
  }
  await expect(hostPage.getByTestId('continue-button')).toBeVisible();
});

test('Game of two peers with all-in preflop', async ({ browser }) => {
  const {
    hostPage,
    guestPages,
  } = await testMultiplePeers({browser});
  const guestPage = guestPages[0];
  const allPages = [hostPage, guestPage];

  await hostPage.getByTestId('start-button').click();

  for (let page of allPages) {
    await expect(page.getByTestId('opponents').getByTestId('opponent-0')).toBeVisible();
  }

  // Host (SB) goes all-in preflop
  const hostAllInButton = hostPage.getByTestId('all-in-action-button');
  await expect(hostAllInButton).toBeVisible();
  await hostAllInButton.click();

  // Guest (BB) can call (all-in) or fold
  // Let's have guest call the all-in
  const guestCallButton = guestPage.getByTestId('check-or-call-action-button');
  await expect(guestCallButton).toBeVisible();
  await expect(guestCallButton).toHaveText(/CALL/);
  await guestCallButton.click();

  // Both all-in: all community cards should be revealed and round should end
  // All 5 board cards should be face-up (scope to table to avoid modal duplicates)
  for (let page of allPages) {
    const table = page.getByTestId('table');
    for (let i = 0; i < 5; i++) {
      await expect(table.getByTestId(`board-card-${i}`)).toBeVisible();
      await expect(table.getByTestId(`board-card-${i}`)).not.toHaveAttribute('alt', 'Back');
    }
  }

  // No more action buttons
  for (let page of allPages) {
    await expect(page.getByTestId('check-or-call-action-button')).not.toBeVisible();
  }

  const continueButton = hostPage.getByTestId('continue-button');
  await expect(continueButton).toBeVisible();
});
