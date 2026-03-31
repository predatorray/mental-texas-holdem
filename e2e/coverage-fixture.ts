import { test as base, Browser, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const COVERAGE_DIR = path.join(__dirname, '..', '.nyc_output');
const IS_COVERAGE = !!process.env.COVERAGE;

async function collectCoverage(page: Page): Promise<Record<string, unknown> | null> {
  try {
    if (page.isClosed()) return null;
    return await page.evaluate(() => (window as any).__coverage__ ?? null);
  } catch {
    return null;
  }
}

function mergeCoverage(
  target: Record<string, any>,
  source: Record<string, any>,
): Record<string, any> {
  for (const [file, fileCov] of Object.entries(source)) {
    if (!target[file]) {
      target[file] = fileCov;
      continue;
    }
    const t = target[file] as any;
    const s = fileCov as any;
    for (const key of Object.keys(s.s ?? {})) {
      t.s[key] = (t.s[key] ?? 0) + (s.s[key] ?? 0);
    }
    for (const key of Object.keys(s.f ?? {})) {
      t.f[key] = (t.f[key] ?? 0) + (s.f[key] ?? 0);
    }
    for (const key of Object.keys(s.b ?? {})) {
      t.b[key] = (t.b[key] ?? []).map(
        (v: number, i: number) => v + ((s.b[key] ?? [])[i] ?? 0),
      );
    }
  }
  return target;
}

let testCounter = 0;

function writeCoverageFile(data: Record<string, any>) {
  if (Object.keys(data).length === 0) return;
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
  const filename = `e2e-${process.pid}-${++testCounter}.json`;
  fs.writeFileSync(path.join(COVERAGE_DIR, filename), JSON.stringify(data));
}

async function collectFromContext(context: BrowserContext): Promise<Record<string, any>> {
  const merged: Record<string, any> = {};
  for (const page of context.pages()) {
    const cov = await collectCoverage(page);
    if (cov) mergeCoverage(merged, cov);
  }
  return merged;
}

export const test = base.extend<
  { _coverageContext: void },
  { _coverageBrowser: Browser }
>({
  // Override the default context to collect coverage before closing (for page-based tests)
  context: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);

    if (IS_COVERAGE) {
      const cov = await collectFromContext(context);
      writeCoverageFile(cov);
    }

    await context.close();
  },

  // Worker-scoped: wrap browser.newContext to auto-collect coverage from
  // manually created contexts (for multi-page tests using testMultiplePeers)
  _coverageBrowser: [
    async ({ browser }, use) => {
      if (!IS_COVERAGE) {
        await use(browser);
        return;
      }

      const origNewContext = browser.newContext.bind(browser);
      const trackedContexts: BrowserContext[] = [];

      (browser as any).newContext = async function (
        ...args: Parameters<Browser['newContext']>
      ) {
        const ctx = await origNewContext(...args);
        trackedContexts.push(ctx);

        // Intercept context.close to collect coverage before actually closing
        const origClose = ctx.close.bind(ctx);
        (ctx as any).close = async function () {
          const cov = await collectFromContext(ctx);
          writeCoverageFile(cov);
          return origClose();
        };

        return ctx;
      };

      await use(browser);
    },
    { scope: 'worker', auto: true },
  ],
});

export { expect } from '@playwright/test';
