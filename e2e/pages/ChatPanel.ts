import {Locator, Page} from '@playwright/test';

/**
 * Page object for the chat panel (MessageBar component). It is rendered
 * inline on the lobby page and as a floating collapsible panel on the game
 * screen, but exposes the same testids in both variants.
 */
export class ChatPanel {
  readonly root: Locator;
  readonly titleBar: Locator;
  readonly input: Locator;
  readonly sendButton: Locator;
  readonly noMessages: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('message-bar');
    this.titleBar = this.root.getByTestId('title-bar');
    this.input = this.root.getByTestId('message-input');
    this.sendButton = this.root.getByTestId('send-message-button');
    this.noMessages = this.root.getByTestId('no-messages');
  }

  /** The i-th entry (chat message or game event) in the panel. */
  message(i: number): Locator {
    return this.root.getByTestId(`message-${i}`);
  }

  /** The text body of the i-th entry, when it is a chat message. */
  messageText(i: number): Locator {
    return this.message(i).getByTestId('message-text');
  }

  async send(text: string) {
    await this.input.fill(text);
    await this.input.press('Enter');
  }

  /** Collapse/expand the floating panel (game screen only). */
  async toggleCollapsed() {
    await this.titleBar.click();
  }
}
