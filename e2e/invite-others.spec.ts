import {test, expect} from '@playwright/test';
import {testMultiplePeers} from "./common";

test('Start button is invisible if there is only one player', async ({ page }) => {
  await page.goto('.');

  await expect(page.getByTestId('start-button')).not.toBeVisible();
  await expect(page.getByTestId('continue-button')).not.toBeVisible();
});

test('Start button is visible if there are two players', async ({ browser }) => {
  const {
    hostPage,
    guestPages,
  } = await testMultiplePeers({browser});
  const guestPage = guestPages[0];

  await expect(guestPage.getByTestId('start-button')).not.toBeVisible();
  await expect(guestPage.getByTestId('continue-button')).not.toBeVisible();
  const guestStaging = guestPage.getByTestId('staging');
  await expect(guestStaging).toBeVisible();
  await expect(guestStaging).toHaveText(/Waiting/);

  await expect(hostPage.getByTestId('start-button')).toBeVisible();
});

test('Message Bars are working between two peers', async ({ browser }) => {
  const {
    hostPage,
    guestPages,
  } = await testMultiplePeers({browser});
  const guestPage = guestPages[0];

  const hostMessageInput = hostPage.getByTestId('message-input');
  await hostMessageInput.fill('ABC');
  await hostMessageInput.press('Enter');

  await expect(hostPage.getByTestId('message-0').locator('.message-text')).toHaveText('ABC');
  await expect(guestPage.getByTestId('message-0').locator('.message-text')).toHaveText('ABC');

  const guestMessageInput = guestPage.getByTestId('message-input');
  await guestMessageInput.fill('123');
  await guestMessageInput.press('Enter');

  await expect(hostPage.getByTestId('message-1').locator('.message-text')).toHaveText('123');
  await expect(guestPage.getByTestId('message-1').locator('.message-text')).toHaveText('123');
});
