import {test, expect} from '@playwright/test';
import {testMultiplePeers} from "./common";

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
