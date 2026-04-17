import { test, expect } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";

/**
 * 登录后管理端主要入口与「新建」页，确保路由与鉴权正常。
 */
const ADMIN_PATHS = [
  "/dashboard",
  "/apps",
  "/checkins",
  "/checkins/new",
  "/forms",
  "/forms/new",
  "/votes",
  "/votes/new",
  "/lotteries",
  "/lotteries/new",
  "/settings",
  "/me",
  "/me/billing",
  "/admin",
];

test.describe("管理端路由（已登录）", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!);
  });

  for (const pathname of ADMIN_PATHS) {
    test(`${pathname} 可访问`, async ({ page, baseURL }) => {
      const res = await page.goto(`${baseURL}${pathname}`);
      expect(res, `response for ${pathname}`).toBeTruthy();
      expect(res!.status()).toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible();
      await expect(page).not.toHaveURL(/\/login$/);
    });
  }

  test("/ops/console 超级管理员可访问或重定向", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/ops/console`);
    await expect(page.locator("body")).toBeVisible();
    const url = page.url();
    const ok =
      url.includes("/ops/console") ||
      url.includes("/login") ||
      url.includes("/dashboard");
    expect(ok, `unexpected URL after ops: ${url}`).toBeTruthy();
  });
});
