import {test, expect} from '@playwright/test';
import {expectTestIdsToBeVisible} from "./common";

test('The components are expected to be visible when opened', async ({ page }) => {
  await page.goto('.');
  await expectTestIdsToBeVisible(page, [
    'staging',
    'my-player-avatar',
    'message-bar',
    'my-name-input',
    ['invitation', 'room-link'],
  ]);
});

test('Message Bar is working', async ({ page }) => {
  await page.goto('.');
  const testMessages = ['text123', 'ABC'];

  await expectTestIdsToBeVisible(page, [
    ['message-bar', 'no-messages'],
  ]);

  const messageBar = page.getByTestId('message-bar');

  const messageInput = messageBar.getByTestId('message-input');

  const sendMessage = async (message: string) => {
    await messageInput.fill(message);
    await messageInput.press('Enter');
  };

  await sendMessage(testMessages[0]);

  await expect(messageInput).toHaveValue('');
  await expect(page.getByTestId('no-message')).not.toBeVisible();

  await expect(page.getByTestId('message-0').locator('.message-text')).toHaveText(testMessages[0]);

  await sendMessage(testMessages[1]);
  await expect(page.getByTestId('message-1').locator('.message-text')).toHaveText(testMessages[1]);

  const titleBar = messageBar.getByTestId('title-bar');
  await expect(titleBar).toBeVisible();

  await titleBar.click();
  await expect(messageBar).toHaveClass(/collapsed/);
  await expect(messageInput).not.toBeInViewport();

  await titleBar.click();
  await expect(messageBar).not.toHaveClass(/collapsed/);
  await expect(messageInput).toBeInViewport();
});
