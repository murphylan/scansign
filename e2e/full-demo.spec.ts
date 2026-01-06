import { test, type Page } from "@playwright/test";

/**
 * Murphy 互动工具集 - 产品宣传视频脚本
 * 
 * 功能演示流程：
 * 1. 开场 - 首页展示
 * 2. 登录流程
 * 3. 控制台概览
 * 4. 签到功能演示（创建 + 手机端 + 大屏 + 设置修改）
 * 5. 投票功能演示（分别展示不同模板 + 手机端 + 大屏 + 设置修改）
 * 6. 抽奖功能演示（分别展示不同模板 + 手机端 + 大屏 + 设置修改）
 * 7. 表单功能演示（创建 + 手机端 + 大屏）
 * 8. 谢幕
 */

// 超时设置：20分钟
test.setTimeout(1200000);

// ==========================================
// 配置
// ==========================================
const BASE_URL = "http://localhost:3000";
const ADMIN_EMAIL = "murphylan@hotmail.com";
const ADMIN_PASSWORD = "15871352105abc";
const WEBSITE_URL = "https://murphylan.cloud";

// 每个场景停留时间（毫秒）
const SCENE_DURATION = 2500;
const SHORT_WAIT = 600;
const MEDIUM_WAIT = 1200;
const LONG_WAIT = 2000;

// ==========================================
// 工具函数
// ==========================================

async function wait(ms = SHORT_WAIT) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function smoothScroll(page: Page, deltaY: number, steps = 6) {
  const step = deltaY / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, step);
    await wait(50);
  }
}

async function typeSlowly(locator: any, text: string, delay = 60) {
  await locator.click();
  await wait(150);
  for (const char of text) {
    await locator.pressSequentially(char, { delay });
  }
}

async function showCaption(page: Page, title: string, subtitle?: string, duration = SCENE_DURATION) {
  await page.evaluate(({ title, subtitle }) => {
    const existing = document.getElementById('demo-caption');
    if (existing) existing.remove();
    
    const container = document.createElement('div');
    container.id = 'demo-caption';
    container.style.cssText = `
      position: fixed;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(20, 20, 40, 0.95) 100%);
      backdrop-filter: blur(20px);
      padding: 20px 36px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      text-align: center;
      min-width: 300px;
      max-width: 600px;
    `;
    
    if (!document.getElementById('demo-caption-styles')) {
      const style = document.createElement('style');
      style.id = 'demo-caption-styles';
      style.textContent = `
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.cssText = `color: #fff; font-size: 22px; font-weight: 700; margin-bottom: ${subtitle ? '8px' : '0'};`;
    container.appendChild(titleEl);
    
    if (subtitle) {
      const subtitleEl = document.createElement('div');
      subtitleEl.textContent = subtitle;
      subtitleEl.style.cssText = 'color: rgba(255, 255, 255, 0.8); font-size: 15px;';
      container.appendChild(subtitleEl);
    }
    
    document.body.appendChild(container);
  }, { title, subtitle });
  
  await wait(400 + duration);
  
  await page.evaluate(() => {
    const caption = document.getElementById('demo-caption');
    if (caption) {
      caption.style.animation = 'fadeOut 0.4s ease-out forwards';
      setTimeout(() => caption.remove(), 400);
    }
  });
  await wait(400);
}

async function showFeature(page: Page, title: string, subtitle?: string, duration = SCENE_DURATION) {
  await showCaption(page, `【${title}】`, subtitle, duration);
}

async function extractCode(page: Page, pattern: RegExp): Promise<string | null> {
  const pageText = await page.textContent('body');
  const match = pageText?.match(pattern);
  return match ? match[1] : null;
}

// ==========================================
// 主测试 - 宣传视频
// ==========================================

test("🎬 Murphy 互动工具集 - 产品宣传视频", async ({ page }) => {
  console.log("🎬 开始录制宣传视频...\n");

  // ==========================================
  // 第一幕：开场 - 首页展示
  // ==========================================
  console.log("📍 第一幕：开场");
  
  await page.goto(BASE_URL);
  await wait(LONG_WAIT);
  
  await showCaption(page, "🚀 Murphy 互动工具集", "签到 · 投票 · 抽奖 · 表单 一站式解决方案", 3500);
  
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  await showCaption(page, "✨ 简单四步，开启互动", "进入控制台 → 创建活动 → 分享二维码 → 开始互动", 2500);

  // ==========================================
  // 第二幕：登录流程
  // ==========================================
  console.log("📍 第二幕：登录");
  
  await page.goto(`${BASE_URL}/login`);
  await wait(MEDIUM_WAIT);
  
  await showFeature(page, "安全登录", "支持邮箱账号登录", 1800);
  
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  await typeSlowly(emailInput, ADMIN_EMAIL);
  await wait(400);
  
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await wait(2500);

  // ==========================================
  // 第三幕：控制台概览
  // ==========================================
  console.log("📍 第三幕：控制台");
  
  await page.goto(`${BASE_URL}/dashboard`);
  await wait(LONG_WAIT);
  
  await showFeature(page, "控制台", "统一管理所有活动，快速创建", 2500);
  
  await smoothScroll(page, 150);
  await wait(MEDIUM_WAIT);

  // ==========================================
  // 第四幕：签到功能
  // ==========================================
  console.log("📍 第四幕：签到功能");
  
  await page.goto(`${BASE_URL}/checkins`);
  await wait(MEDIUM_WAIT);
  await showFeature(page, "签到管理", "扫码签到，大屏互动", 2000);
  
  // 4.1 创建签到
  await page.goto(`${BASE_URL}/checkins/new`);
  await wait(MEDIUM_WAIT);
  
  await showFeature(page, "创建签到", "自定义签到信息", 2000);
  
  const checkinTitle = page.locator('input#title');
  if (await checkinTitle.isVisible()) {
    await typeSlowly(checkinTitle, "公司年会签到");
  }
  
  await smoothScroll(page, 250);
  await wait(MEDIUM_WAIT);
  
  const createCheckinBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createCheckinBtn.isVisible()) {
    await createCheckinBtn.click();
    await wait(2500);
  }
  
  let checkinCode: string | null = null;
  if (!page.url().includes('/new')) {
    checkinCode = await extractCode(page, /\/c\/([A-Za-z0-9]+)/);
    console.log(`  📍 签到码: ${checkinCode}`);
  }
  
  // 4.2 手机端
  if (checkinCode) {
    await page.goto(`${BASE_URL}/c/${checkinCode}`);
    await wait(LONG_WAIT);
    await showCaption(page, "📱 手机端签到", "用户扫码签到界面", 2500);
    
    // 4.3 大屏
    await page.goto(`${BASE_URL}/c/${checkinCode}/display`);
    await wait(LONG_WAIT);
    await showCaption(page, "🖥️ 签到大屏", "实时显示签到动态", 2500);
    
    // 4.4 设置页面
    const checkinId = page.url().match(/checkins\/([^/]+)/)?.[1];
    if (checkinId) {
      await page.goto(`${BASE_URL}/checkins/${checkinId}/settings`);
      await wait(MEDIUM_WAIT);
      await showCaption(page, "⚙️ 签到设置", "背景、字段、大屏样式配置", 2500);
      await smoothScroll(page, 300);
      await wait(MEDIUM_WAIT);
    }
  }

  // ==========================================
  // 第五幕：投票功能（多模板展示）
  // ==========================================
  console.log("📍 第五幕：投票功能");
  
  await page.goto(`${BASE_URL}/votes`);
  await wait(MEDIUM_WAIT);
  await showFeature(page, "投票管理", "多种投票模板", 2000);
  
  // 5.1 简单投票模板
  await page.goto(`${BASE_URL}/votes/new`);
  await wait(MEDIUM_WAIT);
  
  await showFeature(page, "投票模板", "选择适合的投票样式", 2000);
  
  const simpleTemplate = page.locator('button:has-text("简单投票")');
  if (await simpleTemplate.isVisible()) {
    await simpleTemplate.click();
    await wait(MEDIUM_WAIT);
  }
  
  await showCaption(page, "📊 简单投票", "快速创建文字选项投票", 2000);
  
  const voteTitle1 = page.locator('input#title');
  if (await voteTitle1.isVisible()) {
    await typeSlowly(voteTitle1, "年会节目投票");
  }
  
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  let createVoteBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createVoteBtn.isVisible()) {
    await createVoteBtn.click();
    await wait(2500);
  }
  
  let voteCode1: string | null = null;
  let voteId1: string | null = null;
  if (!page.url().includes('/new')) {
    voteCode1 = await extractCode(page, /\/v\/([A-Za-z0-9]+)/);
    voteId1 = page.url().match(/votes\/([^/]+)/)?.[1] || null;
    console.log(`  📍 简单投票码: ${voteCode1}`);
  }
  
  if (voteCode1) {
    // 手机端
    await page.goto(`${BASE_URL}/v/${voteCode1}`);
    await wait(LONG_WAIT);
    await showCaption(page, "📱 简单投票手机端", "清晰的选项展示", 2500);
    
    // 大屏
    await page.goto(`${BASE_URL}/v/${voteCode1}/display`);
    await wait(LONG_WAIT);
    await showCaption(page, "🖥️ 投票大屏", "实时结果可视化", 2500);
  }
  
  // 5.2 图文投票模板
  await page.goto(`${BASE_URL}/votes/new`);
  await wait(MEDIUM_WAIT);
  
  const imageTemplate = page.locator('button:has-text("图文投票")');
  if (await imageTemplate.isVisible()) {
    await imageTemplate.click();
    await wait(MEDIUM_WAIT);
  }
  
  await showCaption(page, "🖼️ 图文投票", "支持图片展示的投票", 2000);
  
  const voteTitle2 = page.locator('input#title');
  if (await voteTitle2.isVisible()) {
    await typeSlowly(voteTitle2, "最佳设计评选");
  }
  
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  createVoteBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createVoteBtn.isVisible()) {
    await createVoteBtn.click();
    await wait(2500);
  }
  
  let voteCode2: string | null = null;
  if (!page.url().includes('/new')) {
    voteCode2 = await extractCode(page, /\/v\/([A-Za-z0-9]+)/);
    console.log(`  📍 图文投票码: ${voteCode2}`);
    
    if (voteCode2) {
      await page.goto(`${BASE_URL}/v/${voteCode2}`);
      await wait(LONG_WAIT);
      await showCaption(page, "📱 图文投票手机端", "精美的卡片布局", 2500);
      
      await page.goto(`${BASE_URL}/v/${voteCode2}/display`);
      await wait(LONG_WAIT);
      await showCaption(page, "🖥️ 图文投票大屏", "适合现场评选", 2500);
    }
  }
  
  // 5.3 候选人投票模板
  await page.goto(`${BASE_URL}/votes/new`);
  await wait(MEDIUM_WAIT);
  
  const candidateTemplate = page.locator('button:has-text("候选人")');
  if (await candidateTemplate.isVisible()) {
    await candidateTemplate.click();
    await wait(MEDIUM_WAIT);
  }
  
  await showCaption(page, "👥 候选人投票", "适合人物评选场景", 2000);
  
  const voteTitle3 = page.locator('input#title');
  if (await voteTitle3.isVisible()) {
    await typeSlowly(voteTitle3, "优秀员工评选");
  }
  
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  createVoteBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createVoteBtn.isVisible()) {
    await createVoteBtn.click();
    await wait(2500);
  }
  
  let voteCode3: string | null = null;
  if (!page.url().includes('/new')) {
    voteCode3 = await extractCode(page, /\/v\/([A-Za-z0-9]+)/);
    console.log(`  📍 候选人投票码: ${voteCode3}`);
    
    if (voteCode3) {
      await page.goto(`${BASE_URL}/v/${voteCode3}`);
      await wait(LONG_WAIT);
      await showCaption(page, "📱 候选人手机端", "头像+姓名展示", 2500);
      
      await page.goto(`${BASE_URL}/v/${voteCode3}/display`);
      await wait(LONG_WAIT);
      await showCaption(page, "🖥️ 候选人大屏", "适合年会颁奖", 2500);
    }
  }

  // ==========================================
  // 第六幕：抽奖功能（多模式展示）
  // ==========================================
  console.log("📍 第六幕：抽奖功能");
  
  await page.goto(`${BASE_URL}/lotteries`);
  await wait(MEDIUM_WAIT);
  await showFeature(page, "抽奖管理", "四种抽奖动画模式", 2000);
  
  // 6.1 转盘模式
  await page.goto(`${BASE_URL}/lotteries/new`);
  await wait(MEDIUM_WAIT);
  
  await showCaption(page, "🎡 转盘抽奖", "经典大转盘效果", 2000);
  
  const lotteryTitle1 = page.locator('input#title');
  if (await lotteryTitle1.isVisible()) {
    await typeSlowly(lotteryTitle1, "年会转盘抽奖");
  }
  
  // 确保选择转盘模式
  const wheelOption = page.locator('label:has-text("转盘")').first();
  if (await wheelOption.isVisible()) {
    await wheelOption.click();
    await wait(500);
  }
  
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  let createLotteryBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createLotteryBtn.isVisible()) {
    await createLotteryBtn.click();
    await wait(2500);
  }
  
  let lotteryCode1: string | null = null;
  let lotteryId1: string | null = null;
  if (!page.url().includes('/new')) {
    lotteryCode1 = await extractCode(page, /\/l\/([A-Za-z0-9]+)/);
    lotteryId1 = page.url().match(/lotteries\/([^/]+)/)?.[1] || null;
    console.log(`  📍 转盘抽奖码: ${lotteryCode1}`);
  }
  
  if (lotteryCode1) {
    await page.goto(`${BASE_URL}/l/${lotteryCode1}`);
    await wait(LONG_WAIT);
    await showCaption(page, "📱 抽奖签到页", "用户扫码签到参与", 2500);
    
    await page.goto(`${BASE_URL}/l/${lotteryCode1}/display`);
    await wait(LONG_WAIT);
    await showCaption(page, "🖥️ 转盘大屏", "主持人控制抽奖", 3000);
    await wait(MEDIUM_WAIT);
  }
  
  // 6.2 老虎机模式
  await page.goto(`${BASE_URL}/lotteries/new`);
  await wait(MEDIUM_WAIT);
  
  const lotteryTitle2 = page.locator('input#title');
  if (await lotteryTitle2.isVisible()) {
    await typeSlowly(lotteryTitle2, "老虎机抽奖");
  }
  
  const slotOption = page.locator('label:has-text("老虎机")').first();
  if (await slotOption.isVisible()) {
    await slotOption.click();
    await wait(500);
  }
  
  await showCaption(page, "🎰 老虎机抽奖", "三列滚动效果", 2000);
  
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  createLotteryBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createLotteryBtn.isVisible()) {
    await createLotteryBtn.click();
    await wait(2500);
  }
  
  let lotteryCode2: string | null = null;
  if (!page.url().includes('/new')) {
    lotteryCode2 = await extractCode(page, /\/l\/([A-Za-z0-9]+)/);
    console.log(`  📍 老虎机抽奖码: ${lotteryCode2}`);
    
    if (lotteryCode2) {
      await page.goto(`${BASE_URL}/l/${lotteryCode2}/display`);
      await wait(LONG_WAIT);
      await showCaption(page, "🖥️ 老虎机大屏", "依次停止效果", 3000);
    }
  }
  
  // 6.3 翻牌模式
  await page.goto(`${BASE_URL}/lotteries/new`);
  await wait(MEDIUM_WAIT);
  
  const lotteryTitle3 = page.locator('input#title');
  if (await lotteryTitle3.isVisible()) {
    await typeSlowly(lotteryTitle3, "翻牌抽奖");
  }
  
  const cardOption = page.locator('label:has-text("翻牌")').first();
  if (await cardOption.isVisible()) {
    await cardOption.click();
    await wait(500);
  }
  
  await showCaption(page, "🃏 翻牌抽奖", "神秘感十足", 2000);
  
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  createLotteryBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createLotteryBtn.isVisible()) {
    await createLotteryBtn.click();
    await wait(2500);
  }
  
  let lotteryCode3: string | null = null;
  if (!page.url().includes('/new')) {
    lotteryCode3 = await extractCode(page, /\/l\/([A-Za-z0-9]+)/);
    console.log(`  📍 翻牌抽奖码: ${lotteryCode3}`);
    
    if (lotteryCode3) {
      await page.goto(`${BASE_URL}/l/${lotteryCode3}/display`);
      await wait(LONG_WAIT);
      await showCaption(page, "🖥️ 翻牌大屏", "3D翻转揭晓", 3000);
    }
  }
  
  // 6.4 九宫格模式
  await page.goto(`${BASE_URL}/lotteries/new`);
  await wait(MEDIUM_WAIT);
  
  const lotteryTitle4 = page.locator('input#title');
  if (await lotteryTitle4.isVisible()) {
    await typeSlowly(lotteryTitle4, "九宫格抽奖");
  }
  
  const gridOption = page.locator('label:has-text("九宫格")').first();
  if (await gridOption.isVisible()) {
    await gridOption.click();
    await wait(500);
  }
  
  await showCaption(page, "⬜ 九宫格抽奖", "跑马灯效果", 2000);
  
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  createLotteryBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createLotteryBtn.isVisible()) {
    await createLotteryBtn.click();
    await wait(2500);
  }
  
  let lotteryCode4: string | null = null;
  if (!page.url().includes('/new')) {
    lotteryCode4 = await extractCode(page, /\/l\/([A-Za-z0-9]+)/);
    console.log(`  📍 九宫格抽奖码: ${lotteryCode4}`);
    
    if (lotteryCode4) {
      await page.goto(`${BASE_URL}/l/${lotteryCode4}/display`);
      await wait(LONG_WAIT);
      await showCaption(page, "🖥️ 九宫格大屏", "顺时针跑马灯", 3000);
    }
  }
  
  // 6.5 展示抽奖设置
  if (lotteryId1) {
    await page.goto(`${BASE_URL}/lotteries/${lotteryId1}/settings`);
    await wait(MEDIUM_WAIT);
    await showCaption(page, "⚙️ 抽奖设置", "奖项配置、背景、动画模式", 2500);
    await smoothScroll(page, 300);
    await wait(MEDIUM_WAIT);
  }

  // ==========================================
  // 第七幕：表单功能
  // ==========================================
  console.log("📍 第七幕：表单功能");
  
  await page.goto(`${BASE_URL}/forms`);
  await wait(MEDIUM_WAIT);
  await showFeature(page, "表单管理", "信息收集，数据导出", 2000);
  
  // 7.1 创建表单
  await page.goto(`${BASE_URL}/forms/new`);
  await wait(MEDIUM_WAIT);
  
  await showFeature(page, "创建表单", "丰富的字段类型", 2000);
  
  const formTitle = page.locator('input#title');
  if (await formTitle.isVisible()) {
    await typeSlowly(formTitle, "活动报名表");
  }
  
  await smoothScroll(page, 200);
  await wait(MEDIUM_WAIT);
  
  await showCaption(page, "📝 字段类型", "文本·单选·多选·评分·上传", 2000);
  
  const createFormBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createFormBtn.isVisible()) {
    await createFormBtn.click();
    await wait(2500);
  }
  
  let formCode: string | null = null;
  if (!page.url().includes('/new')) {
    formCode = await extractCode(page, /\/f\/([A-Za-z0-9]+)/);
    console.log(`  📍 表单码: ${formCode}`);
  }
  
  if (formCode) {
    await page.goto(`${BASE_URL}/f/${formCode}`);
    await wait(LONG_WAIT);
    await showCaption(page, "📱 手机端表单", "简洁的填写界面", 2500);
    
    await page.goto(`${BASE_URL}/f/${formCode}/display`);
    await wait(LONG_WAIT);
    await showCaption(page, "🖥️ 表单大屏", "实时统计展示", 2500);
  }

  // ==========================================
  // 第八幕：谢幕
  // ==========================================
  console.log("📍 第八幕：谢幕");
  
  await page.goto(BASE_URL);
  await wait(LONG_WAIT);
  
  await page.evaluate((websiteUrl) => {
    const overlay = document.createElement('div');
    overlay.id = 'demo-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 99998;
      animation: fadeIn 1s ease-out;
    `;
    
    const container = document.createElement('div');
    container.id = 'demo-caption';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 99999;
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 40, 60, 0.95) 100%);
      backdrop-filter: blur(30px);
      padding: 50px 80px;
      border-radius: 24px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: scaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    
    if (!document.getElementById('demo-final-styles')) {
      const style = document.createElement('style');
      style.id = 'demo-final-styles';
      style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
      `;
      document.head.appendChild(style);
    }
    
    container.innerHTML = `
      <div style="font-size: 56px; margin-bottom: 16px;">🚀</div>
      <div style="color: #fff; font-size: 36px; font-weight: 700; margin-bottom: 12px;">Murphy 互动工具集</div>
      <div style="color: rgba(255,255,255,0.8); font-size: 20px; margin-bottom: 24px;">让活动更精彩</div>
      <div style="width: 50px; height: 3px; background: linear-gradient(90deg, #10b981, #3b82f6); margin: 0 auto 24px; border-radius: 2px;"></div>
      <div style="color: rgba(255,255,255,0.9); font-size: 16px; margin-bottom: 24px;">✅ 签到 &nbsp;&nbsp; ✅ 投票 &nbsp;&nbsp; ✅ 抽奖 &nbsp;&nbsp; ✅ 表单</div>
      <div style="color: #60a5fa; font-size: 18px; margin-bottom: 16px;">${websiteUrl}</div>
      <div style="color: rgba(255,255,255,0.5); font-size: 14px;">感谢观看</div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(container);
  }, WEBSITE_URL);
  
  await wait(5000);
  
  console.log("\n✅ 视频录制完成！");
  console.log("📁 视频文件位于: e2e/test-results/*/video.webm");
});
