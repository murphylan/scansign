import { test, type Page } from "@playwright/test";

/**
 * Murphy 互动工具集 - 产品宣传截图脚本
 *
 * 用于生成产品宣传文档所需的高质量截图
 * 运行命令: pnpm test promo-screenshots.spec.ts
 *
 * 截图输出目录: e2e/promo/
 */

// 超时设置
test.setTimeout(300000);

// ==========================================
// 配置
// ==========================================
const BASE_URL = "http://localhost:3000";
const ADMIN_EMAIL = "murphylan@hotmail.com";
const ADMIN_PASSWORD = "15871352105abc";

// 截图输出目录
const PROMO_DIR = "e2e/promo";

// 等待时间
const SHORT_WAIT = 500;
const MEDIUM_WAIT = 1000;
const LONG_WAIT = 2000;

// ==========================================
// 工具函数
// ==========================================

async function wait(ms = SHORT_WAIT) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function screenshot(page: Page, name: string, fullPage = false) {
  await page.screenshot({
    path: `${PROMO_DIR}/${name}.png`,
    fullPage,
  });
  console.log(`  📸 ${name}.png`);
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[type="email"], input[name="email"]');
  if (await emailInput.isVisible()) {
    await emailInput.fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await wait(2500);
  }
}

async function extractCode(page: Page, pattern: RegExp): Promise<string | null> {
  const pageText = await page.textContent("body");
  const match = pageText?.match(pattern);
  return match ? match[1] : null;
}

// ==========================================
// 主测试 - 宣传截图
// ==========================================

test.describe("📸 产品宣传截图", () => {
  test.beforeAll(async () => {
    console.log("\n🚀 开始生成产品宣传截图...\n");
    console.log(`📁 截图输出目录: ${PROMO_DIR}/\n`);
  });

  // ==========================================
  // 1. 首页与登录
  // ==========================================
  test("1️⃣ 首页与登录页面", async ({ page }) => {
    console.log("📍 首页与登录页面截图");

    // 1.1 首页
    await page.goto(BASE_URL);
    await wait(LONG_WAIT);
    await screenshot(page, "01-home-hero", false);

    // 滚动展示功能模块
    await page.evaluate(() => window.scrollBy(0, 400));
    await wait(MEDIUM_WAIT);
    await screenshot(page, "01-home-features", false);

    // 1.2 登录页
    await page.goto(`${BASE_URL}/login`);
    await wait(MEDIUM_WAIT);
    await screenshot(page, "02-login-page", false);
  });

  // ==========================================
  // 2. 管理后台
  // ==========================================
  test("2️⃣ 管理后台概览", async ({ page }) => {
    console.log("📍 管理后台截图");

    await login(page);

    // 2.1 控制台
    await page.goto(`${BASE_URL}/dashboard`);
    await wait(LONG_WAIT);
    await screenshot(page, "03-dashboard", false);

    // 2.2 签到管理列表
    await page.goto(`${BASE_URL}/checkins`);
    await wait(MEDIUM_WAIT);
    await screenshot(page, "04-checkins-list", false);

    // 2.3 投票管理列表
    await page.goto(`${BASE_URL}/votes`);
    await wait(MEDIUM_WAIT);
    await screenshot(page, "05-votes-list", false);

    // 2.4 抽奖管理列表
    await page.goto(`${BASE_URL}/lotteries`);
    await wait(MEDIUM_WAIT);
    await screenshot(page, "06-lotteries-list", false);

    // 2.5 表单管理列表
    await page.goto(`${BASE_URL}/forms`);
    await wait(MEDIUM_WAIT);
    await screenshot(page, "07-forms-list", false);
  });

  // ==========================================
  // 3. 签到功能
  // ==========================================
  test("3️⃣ 签到功能截图", async ({ page }) => {
    console.log("📍 签到功能截图");

    await login(page);

    // 3.1 创建签到页面
    await page.goto(`${BASE_URL}/checkins/new`);
    await wait(MEDIUM_WAIT);
    await screenshot(page, "10-checkin-new", true);

    // 填写表单并创建
    const titleInput = page.locator("input#title");
    if (await titleInput.isVisible()) {
      await titleInput.fill("年会签到活动");
      await page.locator("input#description").fill("欢迎参加2026年度员工大会");
    }

    await screenshot(page, "10-checkin-form-filled", true);

    // 创建签到
    const createBtn = page.locator('button[type="submit"]:has-text("创建")');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await wait(2500);
    }

    // 3.2 签到详情页
    if (!page.url().includes("/new")) {
      await screenshot(page, "11-checkin-detail", true);

      // 获取签到码
      const checkinCode = await extractCode(page, /\/c\/([A-Za-z0-9]+)/);
      const checkinId = page.url().match(/checkins\/([^/]+)/)?.[1];

      // 3.3 设置页面
      if (checkinId) {
        await page.goto(`${BASE_URL}/checkins/${checkinId}/settings`);
        await wait(MEDIUM_WAIT);
        await screenshot(page, "12-checkin-settings", true);
      }

      // 3.4 手机端签到页
      if (checkinCode) {
        await page.goto(`${BASE_URL}/c/${checkinCode}`);
        await wait(LONG_WAIT);
        await screenshot(page, "13-checkin-mobile", false);

        // 填写信息
        const phoneInput = page.locator('input[type="tel"]');
        if (await phoneInput.isVisible()) {
          await phoneInput.fill("13800138000");
          const nameInput = page.locator('input[placeholder*="姓名"]');
          if (await nameInput.isVisible()) {
            await nameInput.fill("张三");
          }
          await screenshot(page, "13-checkin-mobile-filled", false);
        }

        // 3.5 大屏展示
        await page.goto(`${BASE_URL}/c/${checkinCode}/display`);
        await wait(LONG_WAIT);
        await screenshot(page, "14-checkin-display", false);
      }
    }
  });

  // ==========================================
  // 4. 投票功能 - 多模板
  // ==========================================
  test("4️⃣ 投票功能截图", async ({ page }) => {
    console.log("📍 投票功能截图");

    await login(page);

    // 4.1 创建投票页面 - 模板选择
    await page.goto(`${BASE_URL}/votes/new`);
    await wait(MEDIUM_WAIT);
    await screenshot(page, "20-vote-templates", false);

    // 4.2 简单投票
    const simpleTemplate = page.locator('button:has-text("简单投票")');
    if (await simpleTemplate.isVisible()) {
      await simpleTemplate.click();
      await wait(MEDIUM_WAIT);
      await screenshot(page, "21-vote-simple-form", true);

      // 填写表单
      const titleInput = page.locator("input#title");
      if (await titleInput.isVisible()) {
        await titleInput.fill("年会节目投票");
      }

      const createBtn = page.locator('button[type="submit"]:has-text("创建")');
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await wait(2500);
      }

      // 获取投票码
      const voteCode = await extractCode(page, /\/v\/([A-Za-z0-9]+)/);
      if (voteCode) {
        // 手机端
        await page.goto(`${BASE_URL}/v/${voteCode}`);
        await wait(LONG_WAIT);
        await screenshot(page, "22-vote-simple-mobile", false);

        // 大屏
        await page.goto(`${BASE_URL}/v/${voteCode}/display`);
        await wait(LONG_WAIT);
        await screenshot(page, "23-vote-simple-display", false);
      }
    }

    // 4.3 候选人投票
    await page.goto(`${BASE_URL}/votes/new`);
    await wait(MEDIUM_WAIT);

    const candidateTemplate = page.locator('button:has-text("候选人")');
    if (await candidateTemplate.isVisible()) {
      await candidateTemplate.click();
      await wait(MEDIUM_WAIT);
      await screenshot(page, "24-vote-candidate-form", true);

      const titleInput = page.locator("input#title");
      if (await titleInput.isVisible()) {
        await titleInput.fill("优秀员工评选");
      }

      const createBtn = page.locator('button[type="submit"]:has-text("创建")');
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await wait(2500);
      }

      const voteCode = await extractCode(page, /\/v\/([A-Za-z0-9]+)/);
      if (voteCode) {
        await page.goto(`${BASE_URL}/v/${voteCode}`);
        await wait(LONG_WAIT);
        await screenshot(page, "25-vote-candidate-mobile", false);

        await page.goto(`${BASE_URL}/v/${voteCode}/display`);
        await wait(LONG_WAIT);
        await screenshot(page, "26-vote-candidate-display", false);
      }
    }

    // 4.4 PK对决投票
    await page.goto(`${BASE_URL}/votes/new`);
    await wait(MEDIUM_WAIT);

    const versusTemplate = page.locator('button:has-text("PK"), button:has-text("对决")');
    if (await versusTemplate.first().isVisible()) {
      await versusTemplate.first().click();
      await wait(MEDIUM_WAIT);
      await screenshot(page, "27-vote-versus-form", true);

      const titleInput = page.locator("input#title");
      if (await titleInput.isVisible()) {
        await titleInput.fill("巅峰对决");
      }

      const createBtn = page.locator('button[type="submit"]:has-text("创建")');
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await wait(2500);
      }

      const voteCode = await extractCode(page, /\/v\/([A-Za-z0-9]+)/);
      if (voteCode) {
        await page.goto(`${BASE_URL}/v/${voteCode}/display`);
        await wait(LONG_WAIT);
        await screenshot(page, "28-vote-versus-display", false);
      }
    }
  });

  // ==========================================
  // 5. 抽奖功能 - 多模式
  // ==========================================
  test("5️⃣ 抽奖功能截图", async ({ page }) => {
    console.log("📍 抽奖功能截图");

    await login(page);

    // 5.1 创建抽奖页面
    await page.goto(`${BASE_URL}/lotteries/new`);
    await wait(MEDIUM_WAIT);
    await screenshot(page, "30-lottery-new", true);

    // 5.2 转盘模式
    const wheelOption = page.locator('label:has-text("转盘")').first();
    if (await wheelOption.isVisible()) {
      await wheelOption.click();
      await wait(SHORT_WAIT);
    }

    const titleInput = page.locator("input#title");
    if (await titleInput.isVisible()) {
      await titleInput.fill("年会大转盘");
    }
    await screenshot(page, "31-lottery-wheel-form", true);

    let createBtn = page.locator('button[type="submit"]:has-text("创建")');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await wait(2500);
    }

    let lotteryCode = await extractCode(page, /\/l\/([A-Za-z0-9]+)/);
    let lotteryId = page.url().match(/lotteries\/([^/]+)/)?.[1];

    if (lotteryCode) {
      // 手机端
      await page.goto(`${BASE_URL}/l/${lotteryCode}`);
      await wait(LONG_WAIT);
      await screenshot(page, "32-lottery-mobile", false);

      // 转盘大屏
      await page.goto(`${BASE_URL}/l/${lotteryCode}/display`);
      await wait(LONG_WAIT);
      await screenshot(page, "33-lottery-wheel-display", false);
    }

    // 5.3 老虎机模式
    await page.goto(`${BASE_URL}/lotteries/new`);
    await wait(MEDIUM_WAIT);

    const slotOption = page.locator('label:has-text("老虎机")').first();
    if (await slotOption.isVisible()) {
      await slotOption.click();
      await wait(SHORT_WAIT);

      const titleInput2 = page.locator("input#title");
      if (await titleInput2.isVisible()) {
        await titleInput2.fill("幸运老虎机");
      }
      await screenshot(page, "34-lottery-slot-form", true);

      createBtn = page.locator('button[type="submit"]:has-text("创建")');
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await wait(2500);
      }

      lotteryCode = await extractCode(page, /\/l\/([A-Za-z0-9]+)/);
      if (lotteryCode) {
        await page.goto(`${BASE_URL}/l/${lotteryCode}/display`);
        await wait(LONG_WAIT);
        await screenshot(page, "35-lottery-slot-display", false);
      }
    }

    // 5.4 翻牌模式
    await page.goto(`${BASE_URL}/lotteries/new`);
    await wait(MEDIUM_WAIT);

    const cardOption = page.locator('label:has-text("翻牌")').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await wait(SHORT_WAIT);

      const titleInput3 = page.locator("input#title");
      if (await titleInput3.isVisible()) {
        await titleInput3.fill("神秘翻牌");
      }

      createBtn = page.locator('button[type="submit"]:has-text("创建")');
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await wait(2500);
      }

      lotteryCode = await extractCode(page, /\/l\/([A-Za-z0-9]+)/);
      if (lotteryCode) {
        await page.goto(`${BASE_URL}/l/${lotteryCode}/display`);
        await wait(LONG_WAIT);
        await screenshot(page, "36-lottery-card-display", false);
      }
    }

    // 5.5 九宫格模式
    await page.goto(`${BASE_URL}/lotteries/new`);
    await wait(MEDIUM_WAIT);

    const gridOption = page.locator('label:has-text("九宫格")').first();
    if (await gridOption.isVisible()) {
      await gridOption.click();
      await wait(SHORT_WAIT);

      const titleInput4 = page.locator("input#title");
      if (await titleInput4.isVisible()) {
        await titleInput4.fill("九宫格抽奖");
      }

      createBtn = page.locator('button[type="submit"]:has-text("创建")');
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await wait(2500);
      }

      lotteryCode = await extractCode(page, /\/l\/([A-Za-z0-9]+)/);
      if (lotteryCode) {
        await page.goto(`${BASE_URL}/l/${lotteryCode}/display`);
        await wait(LONG_WAIT);
        await screenshot(page, "37-lottery-grid-display", false);
      }
    }

    // 5.6 设置页面
    if (lotteryId) {
      await page.goto(`${BASE_URL}/lotteries/${lotteryId}/settings`);
      await wait(MEDIUM_WAIT);
      await screenshot(page, "38-lottery-settings", true);
    }
  });

  // ==========================================
  // 6. 表单功能
  // ==========================================
  test("6️⃣ 表单功能截图", async ({ page }) => {
    console.log("📍 表单功能截图");

    await login(page);

    // 6.1 创建表单页面
    await page.goto(`${BASE_URL}/forms/new`);
    await wait(MEDIUM_WAIT);
    await screenshot(page, "40-form-new", true);

    // 填写表单信息
    const titleInput = page.locator("input#title");
    if (await titleInput.isVisible()) {
      await titleInput.fill("活动报名表");
    }

    // 滚动展示字段类型
    await page.evaluate(() => window.scrollBy(0, 300));
    await wait(SHORT_WAIT);
    await screenshot(page, "41-form-field-types", true);

    // 创建表单
    const createBtn = page.locator('button[type="submit"]:has-text("创建")');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await wait(2500);
    }

    // 6.2 表单详情页
    if (!page.url().includes("/new")) {
      await screenshot(page, "42-form-detail", true);

      const formCode = await extractCode(page, /\/f\/([A-Za-z0-9]+)/);

      // 6.3 手机端表单
      if (formCode) {
        await page.goto(`${BASE_URL}/f/${formCode}`);
        await wait(LONG_WAIT);
        await screenshot(page, "43-form-mobile", false);

        // 6.4 大屏展示
        await page.goto(`${BASE_URL}/f/${formCode}/display`);
        await wait(LONG_WAIT);
        await screenshot(page, "44-form-display", false);
      }
    }
  });

  // ==========================================
  // 7. 移动端视图（使用移动端尺寸）
  // ==========================================
  test("7️⃣ 移动端视图截图", async ({ browser }) => {
    console.log("📍 移动端视图截图");

    // 创建移动端尺寸的页面
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone X
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    const page = await context.newPage();

    // 登录
    await login(page);

    // 获取一个现有的签到码（先创建一个）
    await page.goto(`${BASE_URL}/checkins/new`);
    await wait(MEDIUM_WAIT);

    const titleInput = page.locator("input#title");
    if (await titleInput.isVisible()) {
      await titleInput.fill("移动端测试签到");
    }

    const createBtn = page.locator('button[type="submit"]:has-text("创建")');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await wait(2500);
    }

    const checkinCode = await extractCode(page, /\/c\/([A-Za-z0-9]+)/);

    if (checkinCode) {
      // 7.1 移动端签到页
      await page.goto(`${BASE_URL}/c/${checkinCode}`);
      await wait(LONG_WAIT);
      await screenshot(page, "50-mobile-checkin", false);

      // 填写信息
      const phoneInput = page.locator('input[type="tel"]');
      if (await phoneInput.isVisible()) {
        await phoneInput.fill("13800138000");
        const nameInput = page.locator('input[placeholder*="姓名"]');
        if (await nameInput.isVisible()) {
          await nameInput.fill("李四");
        }
        await screenshot(page, "50-mobile-checkin-filled", false);
      }
    }

    // 创建投票
    await page.goto(`${BASE_URL}/votes/new`);
    await wait(MEDIUM_WAIT);

    const simpleTemplate = page.locator('button:has-text("简单投票")');
    if (await simpleTemplate.isVisible()) {
      await simpleTemplate.click();
      await wait(MEDIUM_WAIT);

      const voteTitle = page.locator("input#title");
      if (await voteTitle.isVisible()) {
        await voteTitle.fill("移动端投票测试");
      }

      const voteCreateBtn = page.locator('button[type="submit"]:has-text("创建")');
      if (await voteCreateBtn.isVisible()) {
        await voteCreateBtn.click();
        await wait(2500);
      }

      const voteCode = await extractCode(page, /\/v\/([A-Za-z0-9]+)/);
      if (voteCode) {
        await page.goto(`${BASE_URL}/v/${voteCode}`);
        await wait(LONG_WAIT);
        await screenshot(page, "51-mobile-vote", false);
      }
    }

    // 创建抽奖
    await page.goto(`${BASE_URL}/lotteries/new`);
    await wait(MEDIUM_WAIT);

    const lotteryTitle = page.locator("input#title");
    if (await lotteryTitle.isVisible()) {
      await lotteryTitle.fill("移动端抽奖测试");
    }

    const lotteryCreateBtn = page.locator('button[type="submit"]:has-text("创建")');
    if (await lotteryCreateBtn.isVisible()) {
      await lotteryCreateBtn.click();
      await wait(2500);
    }

    const lotteryCode = await extractCode(page, /\/l\/([A-Za-z0-9]+)/);
    if (lotteryCode) {
      await page.goto(`${BASE_URL}/l/${lotteryCode}`);
      await wait(LONG_WAIT);
      await screenshot(page, "52-mobile-lottery", false);
    }

    await context.close();
  });

  test.afterAll(async () => {
    console.log("\n✅ 宣传截图生成完成！");
    console.log(`📁 截图位于: ${PROMO_DIR}/`);
    console.log("\n📋 截图清单:");
    console.log("   01-home-*        首页相关");
    console.log("   02-login-*       登录页面");
    console.log("   03~07-*          管理后台");
    console.log("   10~14-checkin-*  签到功能");
    console.log("   20~28-vote-*     投票功能");
    console.log("   30~38-lottery-*  抽奖功能");
    console.log("   40~44-form-*     表单功能");
    console.log("   50~52-mobile-*   移动端视图");
  });
});
