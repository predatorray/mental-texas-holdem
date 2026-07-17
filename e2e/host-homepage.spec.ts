import {test, expect} from './coverage-fixture';
import {PokerApp} from './pages';

test('The lobby components are visible when opened', async ({ page }) => {
  const app = new PokerApp(page);
  await app.goto();

  await expect(app.lobby.root).toBeVisible();
  await expect(app.lobby.staging).toBeVisible();
  await expect(app.lobby.playersCard).toBeVisible();
  await expect(app.lobby.myAvatar).toBeVisible();
  await expect(app.lobby.myNameInput).toBeVisible();
  await expect(app.lobby.roomLink).toBeVisible();
  await expect(app.chat.root).toBeVisible();
});

test('The host is the only player listed before anyone joins', async ({ page }) => {
  const app = new PokerApp(page);
  await app.goto();

  await expect(app.lobby.playerRow(0)).toBeVisible();
  await expect(app.lobby.playerRow(1)).not.toBeVisible();
  await expect(app.lobby.startButton).not.toBeVisible();
});

test('Lobby chat is working', async ({ page }) => {
  const app = new PokerApp(page);
  await app.goto();
  const testMessages = ['text123', 'ABC'];

  await expect(app.chat.noMessages).toBeVisible();

  await app.chat.send(testMessages[0]);

  await expect(app.chat.input).toHaveValue('');
  await expect(app.chat.noMessages).not.toBeVisible();
  await expect(app.chat.messageText(0)).toHaveText(testMessages[0]);

  await app.chat.send(testMessages[1]);
  await expect(app.chat.messageText(1)).toHaveText(testMessages[1]);
});
