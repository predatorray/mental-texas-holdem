import {test, expect} from './coverage-fixture';
import {createRoom, PokerApp} from './pages';

test('Start button is invisible if there is only one player', async ({ page }) => {
  const app = new PokerApp(page);
  await app.goto();

  await expect(app.lobby.startButton).not.toBeVisible();
  await expect(app.table.continueButton).not.toBeVisible();
});

test('Start button is visible if there are two players', async ({ browser }) => {
  const {host, guests} = await createRoom({browser});
  const guest = guests[0];

  await expect(guest.lobby.startButton).not.toBeVisible();
  await expect(guest.table.continueButton).not.toBeVisible();
  await expect(guest.lobby.staging).toBeVisible();
  await expect(guest.lobby.staging).toHaveText(/Waiting/);

  await expect(host.lobby.startButton).toBeVisible();
});

test('Both players appear in the lobby player list', async ({ browser }) => {
  const {host, guests} = await createRoom({browser});
  const guest = guests[0];

  for (const app of [host, guest]) {
    await expect(app.lobby.playerRow(0)).toBeVisible();
    await expect(app.lobby.playerRow(1)).toBeVisible();
  }
});

test('A player name entered in the lobby is visible to the other peer', async ({ browser }) => {
  const {host, guests} = await createRoom({browser});
  const guest = guests[0];

  await host.lobby.setMyName('Alice');

  await expect(host.lobby.playersCard).toHaveText(/Alice/);
  await expect(guest.lobby.playersCard).toHaveText(/Alice/, {timeout: 15_000});
});

test('Message Bars are working between two peers', async ({ browser }) => {
  const {host, guests} = await createRoom({browser});
  const guest = guests[0];

  await host.chat.send('ABC');

  await expect(host.chat.messageText(0)).toHaveText('ABC');
  await expect(guest.chat.messageText(0)).toHaveText('ABC');

  await guest.chat.send('123');

  await expect(host.chat.messageText(1)).toHaveText('123');
  await expect(guest.chat.messageText(1)).toHaveText('123');
});
