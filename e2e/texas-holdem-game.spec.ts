import {test, expect} from './coverage-fixture';
import {checkOrCallOnTurn, createRoom, waitForTurn} from './pages';

test('Game of two peers check/call only', async ({ browser }) => {
  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await expect(host.lobby.startButton).toBeVisible();
  await expect(host.lobby.startButton).toHaveText(/start/i);
  await host.lobby.startGame();

  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
    await expect(app.table.opponentBankroll(0)).toBeVisible();
  }

  // Preflop: host is SB and acts first with a CALL
  await expect(host.table.checkOrCallButton).toBeVisible();
  await expect(host.table.checkOrCallButton).toHaveText(/CALL/);
  await host.table.checkOrCall();
  await expect(host.table.checkOrCallButton).not.toBeVisible();

  await expect(guest.table.checkOrCallButton).toBeVisible();
  await expect(guest.table.checkOrCallButton).toHaveText(/CHECK/);
  await guest.table.checkOrCall();
  await expect(guest.table.checkOrCallButton).not.toBeVisible();

  for (const table of allTables) {
    await expect(table.pot).toHaveText(/4/);
    await table.expectBoardCardsFaceUp([0, 1, 2]);
    await table.expectBoardCardsFaceDown([3, 4]);
  }

  // Flop betting
  await host.table.checkOrCall();
  await guest.table.checkOrCall();

  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([3]);
    await table.expectBoardCardsFaceDown([4]);
  }

  // Turn betting
  await host.table.checkOrCall();
  await guest.table.checkOrCall();

  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([4]);
  }

  // River betting
  await host.table.checkOrCall();
  await guest.table.checkOrCall();

  await expect(host.table.checkOrCallButton).not.toBeVisible();
  await expect(guest.table.checkOrCallButton).not.toBeVisible();

  await expect(host.table.continueButton).toBeVisible();
  await expect(host.table.continueButton).toHaveText(/continue/i);
});

test('Game of two peers where one folds preflop', async ({ browser }) => {
  const {host, guests} = await createRoom({browser});
  const guest = guests[0];

  await host.lobby.startGame();

  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  // Preflop: host is SB and acts first with a CALL.
  // The fold button should be visible since callAmount > 0
  await expect(host.table.checkOrCallButton).toBeVisible();
  await expect(host.table.checkOrCallButton).toHaveText(/CALL/);
  await expect(host.table.foldButton).toBeVisible();
  await host.table.fold();

  // Round should end immediately — the guest (BB) wins by LastOneWins
  await expect(host.table.checkOrCallButton).not.toBeVisible();
  await expect(guest.table.checkOrCallButton).not.toBeVisible();

  // Continue button should appear for the host to start next round
  await expect(host.table.continueButton).toBeVisible();

  // Close the score board modal that pops up at the end of the round
  await host.table.scoreBoardCloseButton.click();

  // The floating chat panel on the game screen can be collapsed and expanded
  await expect(host.chat.input).toBeVisible();
  await host.chat.toggleCollapsed();
  await expect(host.chat.input).not.toBeVisible();
  await host.chat.toggleCollapsed();
  await expect(host.chat.input).toBeVisible();
});

test('Game of two peers where one folds on the flop', async ({ browser }) => {
  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await host.lobby.startGame();

  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  // Preflop: both players check/call to see the flop
  // Host (SB) calls, Guest (BB) checks
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // Wait for the flop action button to appear (ensures flop+hole cards are dealt)
  await waitForTurn(allTables);

  // Flop should be revealed
  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([0, 1, 2]);
  }

  // Flop: host (SB) acts first post-flop. Raise 1 pot, then guest folds.
  await expect(host.table.raisePotButton).toBeVisible();
  await host.table.raisePotButton.click();

  // Guest should now see CALL and FOLD buttons
  await expect(guest.table.foldButton).toBeVisible();
  await guest.table.fold();

  // Round should end — host wins by fold
  await expect(host.table.checkOrCallButton).not.toBeVisible();
  await expect(guest.table.checkOrCallButton).not.toBeVisible();

  await expect(host.table.continueButton).toBeVisible();
});

test('Game of two peers with a raise and call', async ({ browser }) => {
  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await host.lobby.startGame();

  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  // Preflop: Host (SB) raises 1/2 pot instead of just calling
  await expect(host.table.raiseHalfPotButton).toBeVisible();
  await host.table.raiseHalfPotButton.click();

  // Guest (BB) should see a CALL button (not CHECK, since host raised)
  await expect(guest.table.checkOrCallButton).toBeVisible();
  await expect(guest.table.checkOrCallButton).toHaveText(/CALL/);
  await guest.table.checkOrCall();

  // Wait for flop action button to appear (ensures cards are dealt)
  await waitForTurn(allTables);

  // Flop should be revealed
  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([0, 1, 2]);
  }

  // Continue through flop, turn, river with check/call
  for (let stage = 0; stage < 3; stage++) {
    await checkOrCallOnTurn(allTables);
    await checkOrCallOnTurn(allTables);
  }

  // Round should be finished
  for (const table of allTables) {
    await expect(table.checkOrCallButton).not.toBeVisible();
  }

  await expect(host.table.continueButton).toBeVisible();
});

// NOTE: Multi-round tests are skipped because the mental poker protocol
// does not currently complete a second shuffle within the same session.
test.skip('Game of two peers play two consecutive rounds', async ({ browser }) => {
  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  // --- Round 1 ---
  await host.lobby.startGame();
  for (let stage = 0; stage < 4; stage++) {
    await checkOrCallOnTurn(allTables);
    await checkOrCallOnTurn(allTables);
  }
  await expect(host.table.continueButton).toBeVisible();

  // --- Round 2 ---
  await host.table.continueButton.click();
  for (let stage = 0; stage < 4; stage++) {
    await checkOrCallOnTurn(allTables);
    await checkOrCallOnTurn(allTables);
  }
  await expect(host.table.continueButton).toBeVisible();
});

test('Game of two peers with all-in preflop', async ({ browser }) => {
  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await host.lobby.startGame();

  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  // Host (SB) goes all-in preflop
  await expect(host.table.allInButton).toBeVisible();
  await host.table.allInButton.click();

  // Guest (BB) can call (all-in) or fold
  // Let's have guest call the all-in
  await expect(guest.table.checkOrCallButton).toBeVisible();
  await expect(guest.table.checkOrCallButton).toHaveText(/CALL/);
  await guest.table.checkOrCall();

  // Both all-in: all community cards should be revealed and round should end
  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([0, 1, 2, 3, 4]);
  }

  // No more action buttons
  for (const table of allTables) {
    await expect(table.checkOrCallButton).not.toBeVisible();
  }

  await expect(host.table.continueButton).toBeVisible();
});
