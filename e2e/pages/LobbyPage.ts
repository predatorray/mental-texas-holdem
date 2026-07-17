import {Locator, Page} from '@playwright/test';

/**
 * Page object for the pre-game lobby, where players gather, chat, share the
 * invite link, and the host configures and starts the game.
 */
export class LobbyPage {
  readonly root: Locator;
  /** Host: the game-settings card. Guest: the "waiting for host" card. */
  readonly staging: Locator;
  readonly invitation: Locator;
  readonly roomLink: Locator;
  readonly copyLinkButton: Locator;
  readonly startButton: Locator;
  readonly playersCard: Locator;
  readonly myAvatar: Locator;
  readonly myNameInput: Locator;
  readonly initialFundAmountInput: Locator;
  readonly encryptionKeyLengthSelect: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('lobby');
    this.staging = page.getByTestId('staging');
    this.invitation = page.getByTestId('invitation');
    this.roomLink = this.invitation.getByTestId('room-link');
    this.copyLinkButton = this.invitation.getByTestId('copy-link-button');
    this.startButton = page.getByTestId('start-button');
    this.playersCard = page.getByTestId('lobby-players');
    this.myAvatar = page.getByTestId('my-player-avatar');
    this.myNameInput = page.getByTestId('my-name-input');
    this.initialFundAmountInput = page.getByTestId('initial-fund-amount-input');
    this.encryptionKeyLengthSelect = page.getByTestId('encryption-key-length-option');
  }

  /** The i-th row in the player list. */
  playerRow(i: number): Locator {
    return this.playersCard.getByTestId(`lobby-player-${i}`);
  }

  /** The sharable invite link for this room. */
  async roomLinkValue(): Promise<string> {
    return await this.roomLink.inputValue();
  }

  async setMyName(name: string) {
    await this.myNameInput.fill(name);
    await this.myNameInput.press('Enter');
  }

  /** Host only: start the first round. */
  async startGame() {
    await this.startButton.click();
  }
}
