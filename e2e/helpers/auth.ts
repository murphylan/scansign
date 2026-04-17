import type { Page } from "@playwright/test";

/**
 * Prefer E2E_* in CI; fall back to ADMIN_* from .env.local (see .env.example).
 */
export function getAdminCredentials(): { email: string; password: string } {
  const email = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
  if (!email?.trim() || !password) {
    throw new Error(
      "Missing admin credentials for e2e. Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD or ADMIN_EMAIL / ADMIN_PASSWORD (e.g. in .env.local).",
    );
  }
  return { email: email.trim(), password };
}

export async function loginAsAdmin(page: Page, baseURL: string) {
  const { email, password } = getAdminCredentials();
  await page.goto(`${baseURL}/login`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator(
    'input[type="email"], input[name="email"], input[placeholder*="邮箱"]',
  );
  if (await emailInput.isVisible()) {
    await emailInput.fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
  }

  await page.waitForURL(
    /\/(dashboard|checkins|forms|votes|lotteries|apps|settings|me|admin)/,
  );
}
