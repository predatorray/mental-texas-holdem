import {Browser, expect, Page} from '@playwright/test';
import {LobbyPage} from './LobbyPage';
import {GameTablePage} from './GameTablePage';
import {ChatPanel} from './ChatPanel';

/**
 * Root page object for the Mental Texas Hold'em app. Wraps a Playwright Page
 * and exposes the lobby, game table, and chat page objects.
 */
export class PokerApp {
  readonly lobby: LobbyPage;
  readonly table: GameTablePage;
  readonly chat: ChatPanel;

  constructor(readonly page: Page) {
    this.lobby = new LobbyPage(page);
    this.table = new GameTablePage(page);
    this.chat = new ChatPanel(page);
  }

  /** Open the app; pass a room link to join an existing room as a guest. */
  async goto(link = '.') {
    await this.page.goto(link);
  }

  async reload() {
    await this.page.reload();
  }
}

/**
 * Create a room with a host and the given number of guests, all joined via
 * the lobby invite link. Waits until every peer is in the lobby.
 */
export async function createRoom(props: {
  browser: Browser;
  guests?: number;
  viewport?: {width: number; height: number};
}): Promise<{host: PokerApp; guests: PokerApp[]}> {
  const context = await props.browser.newContext(
    props.viewport ? {viewport: props.viewport} : {}
  );

  const host = new PokerApp(await context.newPage());
  await host.goto();

  await expect(host.lobby.roomLink).toBeVisible();
  const roomLink = await host.lobby.roomLinkValue();

  const guests: PokerApp[] = [];
  for (let i = 0; i < (props.guests ?? 1); i++) {
    const guest = new PokerApp(await context.newPage());
    await guest.goto(roomLink);
    guests.push(guest);
  }

  return {host, guests};
}
