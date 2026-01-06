import { test, type Page, type BrowserContext } from "@playwright/test";

/**
 * Murphy 互动工具集 - 产品宣传视频脚本
 * 
 * 功能演示流程：
 * 1. 开场 - 首页展示
 * 2. 登录流程
 * 3. 控制台概览
 * 4. 签到功能演示（创建 + 手机端 + 大屏 + 设置修改）
 * 5. 投票功能演示（2种模板 + 手机端 + 大屏）
 * 6. 抽奖功能演示（转盘展示 + 手机端 + 大屏）
 * 7. 表单功能演示（创建 + 手机端 + 大屏）
 * 8. 谢幕
 */

// 超时设置：15分钟
test.setTimeout(900000);

// ==========================================
// 配置
// ==========================================
const BASE_URL = "http://localhost:3000";
const ADMIN_EMAIL = "murphylan@hotmail.com";
const ADMIN_PASSWORD = "15871352105abc";
const WEBSITE_URL = "https://murphylan.cloud";

// 每个场景停留时间（毫秒）
const SCENE_DURATION = 3000;
const SHORT_WAIT = 800;
const MEDIUM_WAIT = 1500;
const LONG_WAIT = 2500;

// ==========================================
// 工具函数
// ==========================================

/** 等待指定时间 */
async function wait(ms = SHORT_WAIT) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 平滑滚动 */
async function smoothScroll(page: Page, deltaY: number, steps = 8) {
  const step = deltaY / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, step);
    await wait(60);
  }
}

/** 模拟打字效果 */
async function typeSlowly(locator: any, text: string, delay = 80) {
  await locator.click();
  await wait(200);
  for (const char of text) {
    await locator.pressSequentially(char, { delay });
  }
}

/** 展示区域 - 鼠标移动 */
async function showcaseArea(page: Page, areas: Array<{x: number, y: number}>) {
  for (const area of areas) {
    await page.mouse.move(area.x, area.y);
    await wait(400);
  }
}

/**
 * 显示演示文字说明（带动画效果）
 */
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
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.88) 0%, rgba(20, 20, 40, 0.92) 100%);
      backdrop-filter: blur(20px);
      padding: 24px 40px;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      text-align: center;
      min-width: 350px;
      max-width: 700px;
    `;
    
    if (!document.getElementById('demo-caption-styles')) {
      const style = document.createElement('style');
      style.id = 'demo-caption-styles';
      style.textContent = `
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; transform: translateX(-50%) translateY(-15px); }
        }
      `;
      document.head.appendChild(style);
    }
    
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: ${subtitle ? '10px' : '0'};
    `;
    container.appendChild(titleEl);
    
    if (subtitle) {
      const subtitleEl = document.createElement('div');
      subtitleEl.textContent = subtitle;
      subtitleEl.style.cssText = `
        color: rgba(255, 255, 255, 0.85);
        font-size: 16px;
      `;
      container.appendChild(subtitleEl);
    }
    
    document.body.appendChild(container);
  }, { title, subtitle });
  
  await wait(500 + duration);
  
  await page.evaluate(() => {
    const caption = document.getElementById('demo-caption');
    if (caption) {
      caption.style.animation = 'fadeOut 0.5s ease-out forwards';
      setTimeout(() => caption.remove(), 500);
    }
  });
  await wait(500);
}

/** 显示功能介绍 */
async function showFeature(page: Page, title: string, subtitle?: string, duration = SCENE_DURATION) {
  await showCaption(page, `【${title}】`, subtitle, duration);
}

/** 页面转场 - 先显示页面，再弹出文字 */
async function transitionTo(page: Page, url: string, title: string, subtitle?: string) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await wait(MEDIUM_WAIT);
  await showFeature(page, title, subtitle);
  await wait(500);
}

/** 隐藏说明文字 */
async function hideCaption(page: Page) {
  await page.evaluate(() => {
    const caption = document.getElementById('demo-caption');
    if (caption) {
      caption.style.animation = 'fadeOut 0.5s ease-out forwards';
      setTimeout(() => caption.remove(), 500);
    }
  });
  await wait(500);
}

/** 从页面内容提取 code */
async function extractCode(page: Page, pattern: RegExp): Promise<string | null> {
  const pageText = await page.textContent('body');
  const match = pageText?.match(pattern);
  return match ? match[1] : null;
}

// ==========================================
// 主测试 - 宣传视频
// ==========================================

test("🎬 Murphy 互动工具集 - 产品宣传视频", async ({ page, context }) => {
  console.log("🎬 开始录制宣传视频...\n");

  // ==========================================
  // 第一幕：开场 - 首页展示
  // ==========================================
  console.log("📍 第一幕：开场");
  
  await page.goto(BASE_URL);
  await wait(LONG_WAIT);
  
  // 展示首页
  await showCaption(page, "🚀 Murphy 互动工具集", "签到 · 投票 · 抽奖 · 表单 一站式解决方案", 4000);
  
  // 平滑滚动展示功能卡片
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  // 鼠标悬停展示各功能卡片
  await showcaseArea(page, [
    { x: 300, y: 450 },
    { x: 500, y: 450 },
    { x: 700, y: 450 },
    { x: 900, y: 450 },
  ]);
  await wait(MEDIUM_WAIT);
  
  // 滚动到快速开始
  await smoothScroll(page, 200);
  await wait(MEDIUM_WAIT);
  
  await showCaption(page, "✨ 简单四步，开启互动", "进入控制台 → 创建活动 → 分享二维码 → 开始互动", 3000);

  // ==========================================
  // 第二幕：登录流程
  // ==========================================
  console.log("📍 第二幕：登录");
  
  await page.goto(`${BASE_URL}/login`);
  await wait(MEDIUM_WAIT);
  
  await showFeature(page, "安全登录", "支持邮箱账号登录", 2000);
  
  // 演示登录
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  await typeSlowly(emailInput, ADMIN_EMAIL);
  await wait(500);
  await typeSlowly(page.locator('input[type="password"]'), "••••••••••");
  await wait(500);
  
  // 真实登录
  await page.locator('input[type="password"]').clear();
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await wait(3000);

  // ==========================================
  // 第三幕：控制台概览
  // ==========================================
  console.log("📍 第三幕：控制台");
  
  await page.goto(`${BASE_URL}/dashboard`);
  await wait(LONG_WAIT);
  
  await showFeature(page, "控制台", "统一管理所有活动，数据一目了然", 3000);
  
  await smoothScroll(page, 200);
  await wait(MEDIUM_WAIT);

  // ==========================================
  // 第四幕：签到功能（完整演示）
  // ==========================================
  console.log("📍 第四幕：签到功能");
  
  await transitionTo(page, `${BASE_URL}/checkins`, "签到管理", "扫码签到，大屏互动，实时统计");
  await wait(MEDIUM_WAIT);
  
  // 4.1 创建签到
  await page.goto(`${BASE_URL}/checkins/new`);
  await wait(MEDIUM_WAIT);
  
  await showFeature(page, "创建签到", "自定义签到信息，支持多种背景主题", 2500);
  
  const checkinTitle = page.locator('input#title');
  if (await checkinTitle.isVisible()) {
    await typeSlowly(checkinTitle, "公司年会签到");
    await wait(500);
  }
  
  // 展示背景选择
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  await showCaption(page, "🎨 丰富的背景主题", "支持渐变色、纯色、自定义图片", 2500);
  
  // 提交创建
  const createCheckinBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createCheckinBtn.isVisible()) {
    await createCheckinBtn.click();
    await wait(3000);
  }
  
  // 获取签到详情页 code
  let checkinCode: string | null = null;
  if (!page.url().includes('/new')) {
    await showFeature(page, "签到详情", "二维码分享，实时查看签到情况", 2500);
    checkinCode = await extractCode(page, /\/c\/([A-Za-z0-9]+)/);
    console.log(`  📍 签到码: ${checkinCode}`);
  }
  
  // 4.2 手机端签到页面
  if (checkinCode) {
    const publicCheckinUrl = `${BASE_URL}/c/${checkinCode}`;
    await page.goto(publicCheckinUrl);
    await wait(LONG_WAIT);
    
    await showCaption(page, "📱 手机端签到页面", "用户扫码后的签到界面", 3000);
    
    // 模拟填写签到信息
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="手机"]');
    if (await phoneInput.isVisible()) {
      await typeSlowly(phoneInput, "13800138000");
      await wait(500);
    }
    
    const nameInput = page.locator('input[placeholder*="姓名"], input[placeholder*="名字"]');
    if (await nameInput.isVisible()) {
      await typeSlowly(nameInput, "张三");
      await wait(500);
    }
    
    await wait(MEDIUM_WAIT);
    
    // 4.3 签到大屏展示
    const displayUrl = `${BASE_URL}/c/${checkinCode}/display`;
    await page.goto(displayUrl);
    await wait(LONG_WAIT);
    
    await showCaption(page, "🖥️ 签到大屏展示", "实时显示签到动态，适合现场大屏投放", 3500);
    await wait(MEDIUM_WAIT);
    
    // 4.4 回到设置页面修改
    await page.goto(`${BASE_URL}/checkins`);
    await wait(MEDIUM_WAIT);
    
    // 点击最新创建的签到
    const checkinLinks = page.locator('a[href*="/checkins/"]');
    if (await checkinLinks.count() > 0) {
      await checkinLinks.first().click();
      await wait(MEDIUM_WAIT);
      
      // 点击设置按钮
      const settingsBtn = page.locator('button:has-text("设置"), a:has-text("设置")');
      if (await settingsBtn.count() > 0) {
        await settingsBtn.first().click();
        await wait(MEDIUM_WAIT);
        
        await showCaption(page, "⚙️ 签到设置", "可随时修改背景、字段等配置", 2500);
        await smoothScroll(page, 200);
        await wait(MEDIUM_WAIT);
      }
    }
  }

  // ==========================================
  // 第五幕：投票功能（2种模板演示）
  // ==========================================
  console.log("📍 第五幕：投票功能");
  
  await transitionTo(page, `${BASE_URL}/votes`, "投票管理", "单选多选，实时结果，数据可视化");
  await wait(MEDIUM_WAIT);
  
  // 5.1 简单投票模板
  await page.goto(`${BASE_URL}/votes/new`);
  await wait(MEDIUM_WAIT);
  
  await showFeature(page, "模板选择", "多种投票模板，满足不同场景", 2500);
  
  // 选择简单投票
  const simpleTemplate = page.locator('button:has-text("简单投票")');
  if (await simpleTemplate.isVisible()) {
    await simpleTemplate.click();
    await wait(MEDIUM_WAIT);
  }
  
  await showCaption(page, "📊 简单投票模板", "快速创建文字投票，适合会议决策", 2500);
  
  const voteTitle = page.locator('input#title');
  if (await voteTitle.isVisible()) {
    await typeSlowly(voteTitle, "年会节目投票");
    await wait(500);
  }
  
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  // 创建简单投票
  const createVoteBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createVoteBtn.isVisible()) {
    await createVoteBtn.click();
    await wait(3000);
  }
  
  // 获取投票 code
  let voteCode1: string | null = null;
  if (!page.url().includes('/new')) {
    await showFeature(page, "投票详情", "实时查看投票结果", 2000);
    voteCode1 = await extractCode(page, /\/v\/([A-Za-z0-9]+)/);
    console.log(`  📍 投票码1: ${voteCode1}`);
  }
  
  // 5.2 手机端投票页面
  if (voteCode1) {
    const publicVoteUrl = `${BASE_URL}/v/${voteCode1}`;
    await page.goto(publicVoteUrl);
    await wait(LONG_WAIT);
    
    await showCaption(page, "📱 手机端投票页面", "简洁的投票界面，一键参与", 3000);
    await wait(MEDIUM_WAIT);
    
    // 5.3 投票大屏展示
    const voteDisplayUrl = `${BASE_URL}/v/${voteCode1}/display`;
    await page.goto(voteDisplayUrl);
    await wait(LONG_WAIT);
    
    await showCaption(page, "🖥️ 投票大屏展示", "实时显示投票结果，数据可视化", 3500);
    await wait(MEDIUM_WAIT);
  }
  
  // 5.4 图文投票模板
  await page.goto(`${BASE_URL}/votes/new`);
  await wait(MEDIUM_WAIT);
  
  const imageTemplate = page.locator('button:has-text("图文投票")');
  if (await imageTemplate.isVisible()) {
    await imageTemplate.click();
    await wait(MEDIUM_WAIT);
  }
  
  await showCaption(page, "🖼️ 图文投票模板", "支持图片展示，适合产品评选", 2500);
  
  const voteTitle2 = page.locator('input#title');
  if (await voteTitle2.isVisible()) {
    await typeSlowly(voteTitle2, "最佳设计作品评选");
    await wait(500);
  }
  
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  // 展示图片上传区域
  await showCaption(page, "📷 支持图片上传", "为每个选项添加精美图片", 2500);
  
  // 创建图文投票
  const createVoteBtn2 = page.locator('button[type="submit"]:has-text("创建")');
  if (await createVoteBtn2.isVisible()) {
    await createVoteBtn2.click();
    await wait(3000);
  }
  
  // 5.5 图文投票手机端和大屏
  let voteCode2: string | null = null;
  if (!page.url().includes('/new')) {
    voteCode2 = await extractCode(page, /\/v\/([A-Za-z0-9]+)/);
    console.log(`  📍 投票码2: ${voteCode2}`);
    
    if (voteCode2) {
      // 手机端
      await page.goto(`${BASE_URL}/v/${voteCode2}`);
      await wait(LONG_WAIT);
      
      await showCaption(page, "📱 图文投票手机端", "精美的图文展示效果", 2500);
      await wait(MEDIUM_WAIT);
      
      // 大屏
      await page.goto(`${BASE_URL}/v/${voteCode2}/display`);
      await wait(LONG_WAIT);
      
      await showCaption(page, "🖥️ 图文投票大屏", "适合现场展示的大屏效果", 3000);
      await wait(MEDIUM_WAIT);
    }
  }

  // ==========================================
  // 第六幕：抽奖功能（转盘展示）
  // ==========================================
  console.log("📍 第六幕：抽奖功能");
  
  await transitionTo(page, `${BASE_URL}/lotteries`, "抽奖管理", "多种模式，精彩动画，现场互动");
  await wait(MEDIUM_WAIT);
  
  // 6.1 创建抽奖
  await page.goto(`${BASE_URL}/lotteries/new`);
  await wait(MEDIUM_WAIT);
  
  await showFeature(page, "创建抽奖", "设置奖品和中奖概率", 2500);
  
  const lotteryTitle = page.locator('input#title');
  if (await lotteryTitle.isVisible()) {
    await typeSlowly(lotteryTitle, "年会幸运抽奖");
    await wait(500);
  }
  
  // 展示抽奖模式选择
  await smoothScroll(page, 150);
  await wait(MEDIUM_WAIT);
  
  await showCaption(page, "🎡 多种抽奖模式", "转盘抽奖 · 老虎机 · 翻牌 · 九宫格", 2500);
  
  // 确保选择转盘模式
  const wheelOption = page.locator('label:has-text("转盘")').first();
  if (await wheelOption.isVisible()) {
    await wheelOption.click();
    await wait(500);
  }
  
  // 展示奖品配置
  await smoothScroll(page, 300);
  await wait(MEDIUM_WAIT);
  
  await showCaption(page, "🎁 灵活的奖品配置", "自定义奖品、数量、中奖概率", 2500);
  
  // 创建抽奖
  const createLotteryBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createLotteryBtn.isVisible()) {
    await createLotteryBtn.click();
    await wait(3000);
  }
  
  // 6.2 抽奖详情页
  let lotteryCode: string | null = null;
  if (!page.url().includes('/new')) {
    await showFeature(page, "抽奖详情", "扫码参与，大屏展示抽奖过程", 2500);
    lotteryCode = await extractCode(page, /\/l\/([A-Za-z0-9]+)/);
    console.log(`  📍 抽奖码: ${lotteryCode}`);
  }
  
  // 6.3 手机端抽奖页面（展示转盘）
  if (lotteryCode) {
    const publicLotteryUrl = `${BASE_URL}/l/${lotteryCode}`;
    await page.goto(publicLotteryUrl);
    await wait(LONG_WAIT);
    
    // 等待转盘加载
    await wait(2000);
    
    await showCaption(page, "📱 手机端抽奖页面", "精美的转盘抽奖界面", 3500);
    
    // 检查并填写手机号
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="手机"]');
    if (await phoneInput.isVisible()) {
      await typeSlowly(phoneInput, "13800138001");
      await wait(MEDIUM_WAIT);
    }
    
    await wait(MEDIUM_WAIT);
    
    // 6.4 抽奖大屏展示
    const lotteryDisplayUrl = `${BASE_URL}/l/${lotteryCode}/display`;
    await page.goto(lotteryDisplayUrl);
    await wait(LONG_WAIT);
    
    // 等待大屏动画加载
    await wait(2000);
    
    await showCaption(page, "🖥️ 抽奖大屏展示", "现场大屏互动，精彩抽奖动画", 3500);
    await wait(MEDIUM_WAIT);
  }

  // ==========================================
  // 第七幕：表单功能
  // ==========================================
  console.log("📍 第七幕：表单功能");
  
  await transitionTo(page, `${BASE_URL}/forms`, "表单管理", "信息收集，提交预览，数据导出");
  await wait(MEDIUM_WAIT);
  
  // 7.1 创建表单
  await page.goto(`${BASE_URL}/forms/new`);
  await wait(MEDIUM_WAIT);
  
  await showFeature(page, "创建表单", "拖拽式字段配置，灵活自定义", 2500);
  
  const formTitle = page.locator('input#title');
  if (await formTitle.isVisible()) {
    await typeSlowly(formTitle, "活动报名表");
    await wait(500);
  }
  
  // 展示字段配置
  await smoothScroll(page, 200);
  await wait(MEDIUM_WAIT);
  
  await showCaption(page, "📝 丰富的字段类型", "文本 · 单选 · 多选 · 评分 · 图片上传", 2500);
  
  // 添加字段
  const addFieldBtn = page.locator('button:has-text("添加字段")');
  if (await addFieldBtn.isVisible()) {
    await addFieldBtn.click();
    await wait(MEDIUM_WAIT);
    
    await showCaption(page, "🔧 灵活的字段配置", "必填验证、提示文字、默认值", 2500);
  }
  
  // 创建表单
  const createFormBtn = page.locator('button[type="submit"]:has-text("创建")');
  if (await createFormBtn.isVisible()) {
    await createFormBtn.click();
    await wait(3000);
  }
  
  // 7.2 表单详情
  let formCode: string | null = null;
  if (!page.url().includes('/new')) {
    await showFeature(page, "表单详情", "查看提交数据，支持导出", 2500);
    formCode = await extractCode(page, /\/f\/([A-Za-z0-9]+)/);
    console.log(`  📍 表单码: ${formCode}`);
  }
  
  // 7.3 手机端表单页面
  if (formCode) {
    const publicFormUrl = `${BASE_URL}/f/${formCode}`;
    await page.goto(publicFormUrl);
    await wait(LONG_WAIT);
    
    await showCaption(page, "📱 手机端表单页面", "简洁的表单填写界面", 3000);
    
    // 模拟填写表单
    const textInputs = page.locator('input[type="text"], input[type="tel"]');
    if (await textInputs.count() > 0) {
      const firstInput = textInputs.first();
      if (await firstInput.isVisible()) {
        await typeSlowly(firstInput, "测试数据");
        await wait(500);
      }
    }
    
    await wait(MEDIUM_WAIT);
    
    // 7.4 表单大屏展示
    const formDisplayUrl = `${BASE_URL}/f/${formCode}/display`;
    await page.goto(formDisplayUrl);
    await wait(LONG_WAIT);
    
    await showCaption(page, "🖥️ 表单大屏展示", "实时显示提交数据统计", 3500);
    await wait(MEDIUM_WAIT);
  }

  // ==========================================
  // 第八幕：谢幕
  // ==========================================
  console.log("📍 第八幕：谢幕");
  
  await page.goto(BASE_URL);
  await wait(LONG_WAIT);
  
  // 最终谢幕
  await page.evaluate((websiteUrl) => {
    // 添加遮罩
    const overlay = document.createElement('div');
    overlay.id = 'demo-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
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
      padding: 60px 100px;
      border-radius: 30px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: scaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    
    // 添加动画样式
    if (!document.getElementById('demo-final-styles')) {
      const style = document.createElement('style');
      style.id = 'demo-final-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Logo
    const logo = document.createElement('div');
    logo.textContent = '🚀';
    logo.style.cssText = 'font-size: 64px; margin-bottom: 20px;';
    container.appendChild(logo);
    
    // 标题
    const title = document.createElement('div');
    title.textContent = 'Murphy 互动工具集';
    title.style.cssText = `
      color: #fff;
      font-size: 42px;
      font-weight: 700;
      margin-bottom: 15px;
      background: linear-gradient(135deg, #fff 0%, #a0d8ef 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    `;
    container.appendChild(title);
    
    // 副标题
    const subtitle = document.createElement('div');
    subtitle.textContent = '让活动更精彩';
    subtitle.style.cssText = 'color: rgba(255,255,255,0.8); font-size: 24px; margin-bottom: 30px;';
    container.appendChild(subtitle);
    
    // 分隔线
    const divider = document.createElement('div');
    divider.style.cssText = 'width: 60px; height: 3px; background: linear-gradient(90deg, #10b981, #3b82f6); margin: 0 auto 30px; border-radius: 2px;';
    container.appendChild(divider);
    
    // 功能列表
    const features = document.createElement('div');
    features.innerHTML = '✅ 签到 &nbsp;&nbsp; ✅ 投票 &nbsp;&nbsp; ✅ 抽奖 &nbsp;&nbsp; ✅ 表单';
    features.style.cssText = 'color: rgba(255,255,255,0.9); font-size: 18px; margin-bottom: 30px;';
    container.appendChild(features);
    
    // 网站地址
    const url = document.createElement('div');
    url.textContent = websiteUrl;
    url.style.cssText = 'color: #60a5fa; font-size: 20px; margin-bottom: 20px;';
    container.appendChild(url);
    
    // 感谢语
    const thanks = document.createElement('div');
    thanks.textContent = '感谢观看';
    thanks.style.cssText = 'color: rgba(255,255,255,0.6); font-size: 16px;';
    container.appendChild(thanks);
    
    document.body.appendChild(overlay);
    document.body.appendChild(container);
  }, WEBSITE_URL);
  
  await wait(6000);
  
  console.log("\n✅ 视频录制完成！");
  console.log("📁 视频文件位于: e2e/test-results/*/video.webm");
});
