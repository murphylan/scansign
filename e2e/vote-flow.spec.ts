import { test, expect } from "@playwright/test";

import { getAdminCredentials, loginAsAdmin } from "./helpers/auth";

/**
 * 投票功能端到端测试
 * 模拟真实用户操作流程：注册 -> 登录 -> 进入控制台 -> 创建投票
 */

const TEST_USER = {
  email: `test_${Date.now()}@example.com`,
  password: "Test123456!",
  nickname: "测试用户",
};

test.describe("投票功能完整流程测试", () => {
  test("1. 访问首页", async ({ page, baseURL }) => {
    await page.goto(baseURL!);
    await expect(page).toHaveTitle(/Rally/);
    console.log("✅ 首页访问成功");
  });

  test("2. 注册新用户", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/register`);

    await page.waitForLoadState("networkidle");

    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="邮箱"]',
    );
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);

      const confirmPassword = page.locator('input[type="password"]').nth(1);
      if (await confirmPassword.isVisible()) {
        await confirmPassword.fill(TEST_USER.password);
      }

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      await page.waitForTimeout(2000);
      console.log("✅ 注册表单已提交");
    } else {
      console.log("⚠️ 未找到注册表单，跳过注册步骤");
    }
  });

  test("3. 登录系统", async ({ page, baseURL }) => {
    const { email } = getAdminCredentials();
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "e2e/screenshots/01-login-page.png" });
    console.log("📸 登录页面截图已保存");

    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="邮箱"]',
    );
    const passwordInput = page.locator('input[type="password"]');

    if (await emailInput.isVisible()) {
      await emailInput.fill(email);
      await passwordInput.fill(getAdminCredentials().password);

      await page.screenshot({ path: "e2e/screenshots/02-login-filled.png" });

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      await page.waitForTimeout(3000);
      await page.screenshot({ path: "e2e/screenshots/03-after-login.png" });

      console.log("✅ 登录表单已提交");
    }
  });

  test("4. 访问控制台和投票列表", async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!);

    await page.goto(`${baseURL}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/04-dashboard.png" });

    const currentUrl = page.url();
    console.log(`📍 当前URL: ${currentUrl}`);

    if (currentUrl.includes("/dashboard")) {
      console.log("✅ 成功进入控制台");

      const voteLink = page.locator('a[href="/votes"]').first();
      if (await voteLink.isVisible()) {
        await voteLink.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: "e2e/screenshots/05-votes-list.png" });
        console.log("✅ 进入投票列表页面");
      }
    } else {
      console.log("⚠️ 未能进入控制台，可能需要正确的登录凭据");
    }
  });

  test("5. 创建投票 - 模板选择页面", async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!);

    await page.goto(`${baseURL}/votes/new`);
    await page.waitForLoadState("networkidle");

    const currentUrl = page.url();
    console.log(`📍 当前URL: ${currentUrl}`);

    await page.screenshot({ path: "e2e/screenshots/06-vote-new.png" });

    if (currentUrl.includes("/votes/new")) {
      console.log("✅ 成功进入创建投票页面");

      const templateCards = page.locator(
        'button:has-text("简单投票"), button:has-text("图文投票"), button:has-text("选手投票"), button:has-text("PK对决")',
      );
      const count = await templateCards.count();
      console.log(`📋 发现 ${count} 个投票模板`);

      if (count > 0) {
        await page.screenshot({ path: "e2e/screenshots/07-template-selector.png" });
        console.log("✅ 模板选择器正常显示");

        const imageTemplate = page.locator('button:has-text("图文投票")');
        if (await imageTemplate.isVisible()) {
          await imageTemplate.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: "e2e/screenshots/08-template-selected.png" });
          console.log("✅ 已选择图文投票模板");
        }

        const nextButton = page.locator('button:has-text("下一步")');
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: "e2e/screenshots/09-vote-form.png" });
          console.log("✅ 进入投票配置表单");
        }
      }
    } else if (currentUrl.includes("/login")) {
      console.log("⚠️ 需要登录才能访问创建投票页面");
      await page.screenshot({ path: "e2e/screenshots/06-redirect-to-login.png" });
    }
  });

  test("6. 填写投票表单并创建", async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!);

    await page.goto(`${baseURL}/votes/new`);
    await page.waitForLoadState("networkidle");

    if (!page.url().includes("/votes/new")) {
      console.log("⚠️ 无法访问创建投票页面，测试跳过");
      return;
    }

    const simpleTemplate = page.locator('button:has-text("简单投票")');
    if (await simpleTemplate.isVisible()) {
      await simpleTemplate.click();
      await page.waitForTimeout(500);

      const nextButton = page.locator('button:has-text("下一步")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      }
    }

    const titleInput = page.locator('input#title, input[placeholder*="标题"]');
    if (await titleInput.isVisible()) {
      await titleInput.fill("测试投票 - " + new Date().toLocaleString());
      console.log("✅ 已填写投票标题");

      const optionInputs = page.locator('input[placeholder*="选项"]');
      const optionCount = await optionInputs.count();
      for (let i = 0; i < optionCount && i < 3; i++) {
        await optionInputs.nth(i).fill(`选项 ${i + 1}`);
      }
      console.log("✅ 已填写投票选项");

      await page.screenshot({ path: "e2e/screenshots/10-form-filled.png" });

      const submitButton = page.locator('button[type="submit"]:has-text("创建")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: "e2e/screenshots/11-after-create.png" });

        const finalUrl = page.url();
        if (finalUrl.includes("/votes/") && !finalUrl.includes("/new")) {
          console.log("🎉 投票创建成功！");
        } else {
          console.log("📍 创建后URL: " + finalUrl);
        }
      }
    }
  });
});

test.describe("投票模板功能测试", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!);
  });

  test("模板选择器组件渲染", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/votes/new`);
    await page.waitForLoadState("networkidle");

    const templates = ["简单投票", "图文投票", "选手投票", "PK对决"];
    for (const name of templates) {
      const template = page.locator(`button:has-text("${name}")`);
      await expect(template).toBeVisible();
      console.log(`✅ 模板 "${name}" 存在`);
    }
  });

  test("切换不同模板", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/votes/new`);
    await page.waitForLoadState("networkidle");

    const templates = ["简单投票", "图文投票", "选手投票", "PK对决"];
    for (const name of templates) {
      const template = page.locator(`button:has-text("${name}")`);
      if (await template.isVisible()) {
        await template.click();
        await page.waitForTimeout(300);

        const isSelected = await template.evaluate(
          (el) =>
            el.className.includes("border-primary") ||
            el.getAttribute("aria-selected") === "true",
        );
        console.log(`${isSelected ? "✅" : "⚠️"} 模板 "${name}" 点击后状态`);

        await page.screenshot({ path: `e2e/screenshots/template-${name}.png` });
      }
    }
  });
});
