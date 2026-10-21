import { expect, type Locator, type Page } from '@playwright/test';

type LocatorOptions = {
  labelFallback?: string;
  role?: 'button' | 'textbox' | 'combobox' | 'link' | 'menuitem' | 'option';
  timeout?: number;
};

type ClickOptions = {
  timeout?: number;
};

export function getTestData(key: string): string | undefined {
  const exact = process.env[key];
  if (exact) return exact;

  const upper = process.env[key.toUpperCase()];
  if (upper) return upper;

  const normalized = key.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  return process.env[normalized];
}

export function installNativeDialogHandler(page: Page): void {
  page.on('dialog', async (dialog) => {
    try {
      await dialog.accept();
    } catch {
      // Ignore rare cases where dialog closes before handling.
    }
  });
}

export async function resilientLocator(
  page: Page,
  selectors: string[],
  options: LocatorOptions = {},
): Promise<Locator> {
  const timeout = options.timeout ?? 15000;

  for (const selector of selectors) {
    const candidate = page.locator(selector).first();
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }

  if (options.role && options.labelFallback) {
    const byRole = page.getByRole(options.role, { name: new RegExp(options.labelFallback, 'i') }).first();
    if (await byRole.isVisible().catch(() => false)) {
      return byRole;
    }
  }

  if (options.labelFallback) {
    const byLabel = page.getByLabel(new RegExp(options.labelFallback, 'i')).first();
    if (await byLabel.isVisible().catch(() => false)) {
      return byLabel;
    }
  }

  throw new Error(`Unable to locate element. Selectors tried: ${selectors.join(', ')}`);
}

export async function safeClick(locator: Locator, options: ClickOptions = {}): Promise<void> {
  const timeout = options.timeout ?? 15000;
  await expect(locator).toBeVisible({ timeout });
  await expect(locator).toBeEnabled({ timeout });
  await locator.click({ timeout });
}

export async function safeFill(locator: Locator, value: string, timeout = 15000): Promise<void> {
  await expect(locator).toBeVisible({ timeout });
  await locator.fill(value, { timeout });
}
