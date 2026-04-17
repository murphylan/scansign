import { test, expect } from "@playwright/test";

/**
 * 无需登录的公开路由冒烟：确保页面可访问且主体渲染。
 */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/home",
  "/success",
  "/mobile/confirm",
];

test.describe("公开路由", () => {
  for (const pathname of PUBLIC_PATHS) {
    test(`GET ${pathname} 可访问`, async ({ page }) => {
      const res = await page.goto(pathname);
      expect(res?.status(), `HTTP status for ${pathname}`).toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
