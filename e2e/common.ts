import {Browser, expect, Locator, Page} from "@playwright/test";

export async function expectTestIdsToBeVisible(page: Page, testids: (string | string[])[]) {
  for (let testid of testids) {
    if (typeof testid === 'string') {
      await expect(page.getByTestId(testid)).toBeVisible();
    } else {
      let locator: Locator | null = null;
      for (let subpath of testid) {
        locator = (locator ?? page).getByTestId(subpath);
      }
      await expect(locator!).toBeVisible();
    }
  }
}

export async function testMultiplePeers(
  props: {
    browser: Browser;
    guests?: number;
  }
) {
  const context = await props.browser.newContext();
  const hostPage = await context.newPage();
  await hostPage.goto('.');

  const roomLink = hostPage.getByTestId('room-link');
  await expect(roomLink).toBeVisible();
  const roomLinkHref = await roomLink.inputValue();

  const guestPages: Page[] = [];
  for (let i = 0; i < (props.guests ?? 1); i++) {
    const guestPage = await context.newPage();
    await guestPage.goto(roomLinkHref);

    guestPages.push(guestPage);
  }

  return {
    hostPage,
    guestPages,
  }
}
