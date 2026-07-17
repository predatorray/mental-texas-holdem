import {test, expect} from './coverage-fixture';
import {checkOrCallOnTurn, createRoom, waitForTurn} from './pages';

test('Guest refreshes mid-game and reconnects', async ({ browser }) => {
  test.setTimeout(60_000);

  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await host.lobby.startGame();

  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);
  await waitForTurn(allTables);

  await guest.reload();

  await guest.table.waitForGameStarted();
  await guest.table.expectBoardCardsFaceUp([0, 1, 2]);
});

test('Action buttons survive guest refresh when it is their turn', async ({ browser }) => {
  test.setTimeout(60_000);

  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await host.lobby.startGame();

  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  // Wait for whoever has the first turn; if it's the host, pass turn to guest
  const firstTurn = await waitForTurn(allTables);
  if (firstTurn === host.table) {
    await host.table.checkOrCall();
  }

  await expect(guest.table.checkOrCallButton).toBeVisible();

  await guest.reload();

  await guest.table.waitForGameStarted();
  await expect(guest.table.checkOrCallButton).toBeVisible();
});

test('Action buttons survive host refresh when it is their turn', async ({ browser }) => {
  test.setTimeout(60_000);

  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await host.lobby.startGame();

  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  // Wait for whoever has the first turn; if it's the guest, pass turn to host
  const firstTurn = await waitForTurn(allTables);
  if (firstTurn === guest.table) {
    await guest.table.checkOrCall();
  }

  await expect(host.table.checkOrCallButton).toBeVisible();

  await host.reload();

  await host.table.waitForGameStarted();
  await expect(host.table.checkOrCallButton).toBeVisible();
});

test('Host refreshes mid-game and reconnects', async ({ browser }) => {
  test.setTimeout(60_000);

  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await host.lobby.startGame();

  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);
  await waitForTurn(allTables);

  await host.reload();

  await host.table.waitForGameStarted(45_000);
  await host.table.expectBoardCardsFaceUp([0, 1, 2]);
});

// Bug 1: After guest refresh in preflop, game gets stuck in CHECK loop — community cards never appear
test('Guest refreshes preflop, then game progresses through flop', async ({ browser }) => {
  test.setTimeout(90_000);

  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await host.lobby.startGame();
  // Wait for the game to actually start (action button visible means protocol complete)
  await waitForTurn(allTables);
  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  // Host (SB) calls
  await checkOrCallOnTurn(allTables);

  // Guest (BB) refreshes before checking
  await guest.reload();
  await guest.table.waitForGameStarted();

  // Guest should see CHECK button and can continue
  await expect(guest.table.checkOrCallButton).toBeVisible();
  await guest.table.checkOrCall();

  // Flop should be revealed (3 face-up board cards)
  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([0, 1, 2]);
  }

  // Game should continue: flop betting
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // Turn card revealed
  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([3]);
  }
});

// Bug 2: Host refresh breaks the game — host has no gameRoomId URL param
test('Host refreshes preflop, then game progresses through flop', async ({ browser }) => {
  test.setTimeout(90_000);

  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await host.lobby.startGame();
  // Wait for the game to actually start (action button appears after protocol + newRound)
  await expect(host.table.checkOrCallButton).toBeVisible({timeout: 30_000});
  await guest.table.waitForGameStarted();

  // Host (SB) refreshes before taking any action
  await host.reload();
  await host.table.waitForGameStarted();

  // Host should see CALL button after reconnect
  await expect(host.table.checkOrCallButton).toBeVisible();

  // Complete preflop
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // Flop should be revealed
  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([0, 1, 2]);
  }

  // Continue through flop
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // Turn card revealed
  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([3]);
  }
});

// Comprehensive: full game with random guest refresh mid-flop
test('Full game with guest refresh during flop betting', async ({ browser }) => {
  test.setTimeout(90_000);

  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await host.lobby.startGame();
  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  // Preflop: both check/call
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // Flop action appears
  await waitForTurn(allTables);

  // Guest refreshes during flop
  await guest.reload();
  await guest.table.waitForGameStarted();

  // Flop cards should still be visible after refresh
  await guest.table.expectBoardCardsFaceUp([0, 1, 2]);

  // Continue through flop
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // Turn card revealed
  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([3]);
  }

  // Continue through turn
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // River card revealed
  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([4]);
  }

  // Final round
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // Game should end
  await expect(host.table.continueButton).toBeVisible();
});

// Comprehensive: full game with host refresh during turn betting
test('Full game with host refresh during turn betting', async ({ browser }) => {
  test.setTimeout(90_000);

  const {host, guests} = await createRoom({browser});
  const guest = guests[0];
  const allTables = [host.table, guest.table];

  await host.lobby.startGame();
  for (const app of [host, guest]) {
    await app.table.waitForGameStarted();
  }

  // Preflop
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // Flop
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // Turn action appears
  await waitForTurn(allTables);

  // Host refreshes during turn
  await host.reload();
  await host.table.waitForGameStarted();

  // Turn card should be visible
  await host.table.expectBoardCardsFaceUp([3]);

  // Continue through turn
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // River card revealed
  for (const table of allTables) {
    await table.expectBoardCardsFaceUp([4]);
  }

  // Final round
  await checkOrCallOnTurn(allTables);
  await checkOrCallOnTurn(allTables);

  // Game should end
  await expect(host.table.continueButton).toBeVisible();
});
