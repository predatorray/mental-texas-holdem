import {expect, Locator, Page} from '@playwright/test';

/**
 * Page object for the in-game poker table screen: community cards, pot,
 * opponents, the player's own seat and action buttons, and the
 * between-rounds staging panel.
 */
export class GameTablePage {
  readonly table: Locator;
  readonly pot: Locator;
  readonly opponents: Locator;
  readonly staging: Locator;
  readonly continueButton: Locator;
  readonly myBankroll: Locator;

  readonly checkOrCallButton: Locator;
  readonly foldButton: Locator;
  readonly raiseHalfPotButton: Locator;
  readonly raisePotButton: Locator;
  readonly raiseTwicePotButton: Locator;
  readonly allInButton: Locator;

  readonly scoreBoardToggle: Locator;
  readonly scoreBoardCloseButton: Locator;

  constructor(readonly page: Page) {
    this.table = page.getByTestId('table');
    this.pot = page.getByTestId('pot');
    this.opponents = page.getByTestId('opponents');
    this.staging = page.getByTestId('staging');
    this.continueButton = page.getByTestId('continue-button');
    this.myBankroll = page.getByTestId('my-bankroll');

    this.checkOrCallButton = page.getByTestId('check-or-call-action-button');
    this.foldButton = page.getByTestId('fold-action-button');
    this.raiseHalfPotButton = page.getByTestId('raise-half-pot-action-button');
    this.raisePotButton = page.getByTestId('raise-1-pot-action-button');
    this.raiseTwicePotButton = page.getByTestId('raise-twice-pot-action-button');
    this.allInButton = page.getByTestId('all-in-action-button');

    this.scoreBoardToggle = page.getByTestId('score-board-toggle');
    this.scoreBoardCloseButton = page.getByTestId('modal-close');
  }

  /** The i-th opponent seat (0-based, clockwise from the player). */
  opponent(i: number): Locator {
    return this.opponents.getByTestId(`opponent-${i}`);
  }

  opponentBankroll(i: number): Locator {
    return this.opponent(i).getByTestId('bankroll');
  }

  /**
   * The i-th community card (0-4). Scoped to the table so it does not match
   * the copies rendered inside the showdown score board.
   */
  boardCard(i: number): Locator {
    return this.table.getByTestId(`board-card-${i}`);
  }

  /** Assert the given community cards are revealed (facing up). */
  async expectBoardCardsFaceUp(indices: number[]) {
    for (const i of indices) {
      await expect(this.boardCard(i)).toBeVisible();
      await expect(this.boardCard(i)).not.toHaveAttribute('alt', 'Back');
    }
  }

  /** Assert the given community cards are still facing down. */
  async expectBoardCardsFaceDown(indices: number[]) {
    for (const i of indices) {
      await expect(this.boardCard(i)).toBeVisible();
      await expect(this.boardCard(i)).toHaveAttribute('alt', 'Back');
    }
  }

  async waitForGameStarted(timeout = 30_000) {
    await expect(this.opponent(0)).toBeVisible({timeout});
  }

  async checkOrCall() {
    await this.checkOrCallButton.click();
  }

  async fold() {
    await this.foldButton.click();
  }
}

/**
 * Wait until it is someone's turn on one of the given tables and return that
 * table.
 */
export async function waitForTurn(tables: GameTablePage[], timeout = 30_000): Promise<GameTablePage> {
  return await Promise.race(
    tables.map(table =>
      table.checkOrCallButton
        .waitFor({state: 'visible', timeout})
        .then(() => table)
    )
  );
}

/**
 * Perform a check or call on whichever table currently has the turn. Waits
 * for the button to disappear after clicking to avoid race conditions.
 */
export async function checkOrCallOnTurn(tables: GameTablePage[]): Promise<GameTablePage> {
  const table = await waitForTurn(tables);
  await table.checkOrCallButton.click();
  await table.checkOrCallButton.waitFor({state: 'hidden', timeout: 10_000});
  return table;
}
