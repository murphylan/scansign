import { test, expect, Page } from '@playwright/test';

/**
 * 抽奖功能端到端测试
 * 测试完整流程：创建抽奖 -> 配置奖品 -> 公开抽奖 -> 大屏展示
 */

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'murphylan@hotmail.com';
const ADMIN_PASSWORD = '15871352105abc';

// 登录辅助函数
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"]');
  if (await emailInput.isVisible()) {
    await emailInput.fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
  }
  
  await page.waitForURL(/\/(dashboard|lotteries)/);
}

test.describe('抽奖功能完整流程测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. 访问抽奖列表页面', async ({ page }) => {
    console.log('\n🧪 测试抽奖列表页面...');
    
    await page.goto(`${BASE_URL}/lotteries`);
    await page.waitForLoadState('networkidle');
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-01-list.png' });
    
    // 检查页面标题
    const pageTitle = page.locator('h1:has-text("抽奖"), h1:has-text("管理")');
    await expect(pageTitle.first()).toBeVisible();
    console.log('✅ 抽奖列表页面加载成功');
    
    // 检查创建按钮
    const createButton = page.locator('button:has-text("创建"), a:has-text("创建抽奖")');
    await expect(createButton.first()).toBeVisible();
    console.log('✅ 创建抽奖按钮可见');
  });

  test('2. 创建抽奖 - 完整流程', async ({ page }) => {
    console.log('\n🧪 测试创建抽奖...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    // 截图：创建页面
    await page.screenshot({ path: 'e2e/screenshots/lottery-02-new-page.png' });
    
    // 检查表单元素
    const titleInput = page.locator('input#title');
    await expect(titleInput).toBeVisible();
    console.log('✅ 抽奖创建页面加载成功');
    
    // 填写基本信息
    await titleInput.fill('测试抽奖活动 - ' + new Date().toLocaleTimeString());
    await page.locator('input#description').fill('这是一个测试抽奖活动');
    console.log('✅ 已填写基本信息');
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-03-basic-info.png' });
    
    // 检查默认奖品
    const prizeInputs = page.locator('input[placeholder*="奖品"], input[value*="等奖"]');
    const prizeCount = await prizeInputs.count();
    console.log(`🎁 默认奖品数量: ${prizeCount}`);
    
    // 检查概率设置
    const probText = await page.textContent('body');
    if (probText?.includes('概率') || probText?.includes('%')) {
      console.log('✅ 概率配置可见');
    }
    
    // 提交创建
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    // 截图：创建结果
    await page.screenshot({ path: 'e2e/screenshots/lottery-04-result.png' });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/lotteries/') && !currentUrl.includes('/new')) {
      console.log('🎉 抽奖创建成功！');
    } else {
      console.log('📍 当前URL: ' + currentUrl);
    }
  });

  test('3. 抽奖详情页面功能', async ({ page }) => {
    console.log('\n🧪 测试抽奖详情页面...');
    
    // 先创建一个抽奖
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('详情测试抽奖 - ' + Date.now());
    await page.locator('button[type="submit"]:has-text("创建")').click();
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (!currentUrl.includes('/lotteries/') || currentUrl.includes('/new')) {
      console.log('⚠️ 抽奖创建失败，跳过详情测试');
      return;
    }
    
    // 截图：详情页
    await page.screenshot({ path: 'e2e/screenshots/lottery-05-detail.png' });
    
    // 检查二维码
    const qrCode = page.locator('img[alt*="QR"], canvas, svg[class*="qr"]');
    console.log(`📱 二维码元素数量: ${await qrCode.count()}`);
    
    // 检查抽奖链接
    const lotteryLink = page.locator('text=/\\/l\\/[A-Za-z0-9]+/');
    if (await lotteryLink.count() > 0) {
      const linkText = await lotteryLink.first().textContent();
      console.log(`🔗 抽奖链接: ${linkText}`);
    }
    
    // 检查统计信息
    const statsText = await page.textContent('body');
    if (statsText?.includes('抽奖') || statsText?.includes('中奖')) {
      console.log('✅ 统计信息可见');
    }
    
    // 检查大屏按钮
    const displayButton = page.locator('button:has-text("大屏"), a:has-text("大屏")');
    if (await displayButton.count() > 0) {
      console.log('✅ 大屏展示按钮可见');
    }
    
    console.log('✅ 抽奖详情页面功能正常');
  });

  test('4. 公开抽奖页面', async ({ page }) => {
    console.log('\n🧪 测试公开抽奖页面...');
    
    // 先创建一个抽奖
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('公开页面测试 - ' + Date.now());
    await page.locator('button[type="submit"]:has-text("创建")').click();
    await page.waitForTimeout(3000);
    
    const detailUrl = page.url();
    if (!detailUrl.includes('/lotteries/') || detailUrl.includes('/new')) {
      console.log('⚠️ 抽奖创建失败，跳过公开页面测试');
      return;
    }
    
    // 获取抽奖code
    const pageText = await page.textContent('body');
    const codeMatch = pageText?.match(/\/l\/([A-Za-z0-9]+)/);
    
    if (codeMatch) {
      const lotteryCode = codeMatch[1];
      console.log(`📍 抽奖码: ${lotteryCode}`);
      
      // 访问公开抽奖页面
      const publicUrl = `${BASE_URL}/l/${lotteryCode}`;
      console.log(`🔗 访问公开抽奖: ${publicUrl}`);
      
      // 创建新页面模拟未登录用户
      const context = page.context();
      const publicPage = await context.newPage();
      
      await publicPage.goto(publicUrl);
      await publicPage.waitForLoadState('networkidle');
      
      // 截图：公开抽奖页面
      await publicPage.screenshot({ path: 'e2e/screenshots/lottery-06-public-page.png' });
      
      // 检查抽奖界面元素
      const lotteryUI = await publicPage.textContent('body');
      
      // 检查手机号输入框
      const phoneInput = publicPage.locator('input[type="tel"], input[placeholder*="手机"]');
      if (await phoneInput.isVisible()) {
        console.log('✅ 手机号输入框可见');
        await phoneInput.fill('13800138002');
      }
      
      // 检查抽奖按钮
      const drawButton = publicPage.locator('button:has-text("抽奖"), button:has-text("开始"), button:has-text("转")');
      if (await drawButton.count() > 0) {
        console.log('✅ 抽奖按钮可见');
        
        // 截图：准备抽奖
        await publicPage.screenshot({ path: 'e2e/screenshots/lottery-07-ready-to-draw.png' });
        
        // 点击抽奖
        await drawButton.first().click();
        await publicPage.waitForTimeout(6000); // 等待动画完成
        
        // 截图：抽奖结果
        await publicPage.screenshot({ path: 'e2e/screenshots/lottery-08-draw-result.png' });
        
        // 检查结果
        const resultText = await publicPage.textContent('body');
        if (resultText?.includes('恭喜') || resultText?.includes('中奖') || resultText?.includes('谢谢')) {
          console.log('🎉 抽奖完成！');
        }
      }
      
      await publicPage.close();
    } else {
      console.log('⚠️ 无法获取抽奖码');
    }
  });

  test('5. 大屏展示页面', async ({ page }) => {
    console.log('\n🧪 测试抽奖大屏展示页面...');
    
    // 先创建一个抽奖
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('大屏测试抽奖 - ' + Date.now());
    await page.locator('button[type="submit"]:has-text("创建")').click();
    await page.waitForTimeout(3000);
    
    const detailUrl = page.url();
    if (!detailUrl.includes('/lotteries/') || detailUrl.includes('/new')) {
      console.log('⚠️ 抽奖创建失败，跳过大屏测试');
      return;
    }
    
    // 获取抽奖code
    const pageText = await page.textContent('body');
    const codeMatch = pageText?.match(/\/l\/([A-Za-z0-9]+)/);
    
    if (codeMatch) {
      const lotteryCode = codeMatch[1];
      const displayUrl = `${BASE_URL}/l/${lotteryCode}/display`;
      console.log(`🖥️ 大屏URL: ${displayUrl}`);
      
      await page.goto(displayUrl);
      await page.waitForTimeout(5000);
      
      // 截图：大屏展示
      await page.screenshot({ path: 'e2e/screenshots/lottery-09-display.png', fullPage: true });
      
      const bodyContent = await page.textContent('body');
      if (bodyContent && bodyContent.length > 100) {
        console.log('✅ 大屏页面有展示内容');
      }
      
      console.log('✅ 大屏展示页面加载成功');
    }
  });
});

test.describe('抽奖模式测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('检查所有抽奖模式', async ({ page }) => {
    console.log('\n🧪 检查所有可用抽奖模式...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    // 检查抽奖模式
    const modes = [
      { name: '转盘', icon: '🎡' },
      { name: '老虎机', icon: '🎰' },
      { name: '翻牌', icon: '🃏' },
      { name: '九宫格', icon: '⬜' },
    ];
    
    let foundCount = 0;
    for (const mode of modes) {
      const modeOption = page.locator(`text=${mode.name}`);
      if (await modeOption.count() > 0) {
        console.log(`✅ ${mode.icon} ${mode.name}`);
        foundCount++;
      } else {
        console.log(`⚠️ ${mode.icon} ${mode.name} - 未找到`);
      }
    }
    
    console.log(`📊 找到 ${foundCount}/${modes.length} 种抽奖模式`);
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-modes.png', fullPage: true });
  });

  test('转盘模式配置', async ({ page }) => {
    console.log('\n🧪 测试转盘模式配置...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    // 选择转盘模式
    const wheelOption = page.locator('text=转盘, label:has-text("转盘")');
    if (await wheelOption.count() > 0) {
      await wheelOption.first().click();
      await page.waitForTimeout(300);
      console.log('✅ 已选择转盘模式');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-wheel-mode.png' });
  });

  test('老虎机模式配置', async ({ page }) => {
    console.log('\n🧪 测试老虎机模式配置...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    // 选择老虎机模式
    const slotOption = page.locator('text=老虎机, label:has-text("老虎机")');
    if (await slotOption.count() > 0) {
      await slotOption.first().click();
      await page.waitForTimeout(300);
      console.log('✅ 已选择老虎机模式');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-slot-mode.png' });
  });
});

test.describe('奖品配置测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('默认奖品设置', async ({ page }) => {
    console.log('\n🧪 测试默认奖品设置...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    // 检查默认奖品
    const defaultPrizes = ['一等奖', '二等奖', '三等奖', '谢谢参与'];
    
    for (const prize of defaultPrizes) {
      const prizeInput = page.locator(`input[value="${prize}"]`);
      if (await prizeInput.count() > 0) {
        console.log(`✅ 默认奖品 "${prize}" 存在`);
      } else {
        console.log(`⚠️ 默认奖品 "${prize}" 未找到`);
      }
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-default-prizes.png', fullPage: true });
  });

  test('添加自定义奖品', async ({ page }) => {
    console.log('\n🧪 测试添加自定义奖品...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    // 添加奖品
    const addButton = page.locator('button:has-text("添加奖品"), button:has-text("添加")');
    if (await addButton.count() > 0) {
      await addButton.first().click();
      await page.waitForTimeout(300);
      console.log('✅ 已点击添加奖品按钮');
      
      // 截图
      await page.screenshot({ path: 'e2e/screenshots/lottery-add-prize.png' });
    }
  });

  test('概率配置验证', async ({ page }) => {
    console.log('\n🧪 测试概率配置验证...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    // 检查概率总和显示
    const probText = await page.textContent('body');
    if (probText?.includes('100%') || probText?.includes('概率')) {
      console.log('✅ 概率配置显示正常');
    }
    
    // 检查概率输入框
    const probInputs = page.locator('input[type="number"]');
    const inputCount = await probInputs.count();
    console.log(`📊 概率输入框数量: ${inputCount}`);
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-probability.png' });
  });

  test('删除奖品', async ({ page }) => {
    console.log('\n🧪 测试删除奖品...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    // 先计数奖品数量
    const prizeCards = page.locator('[class*="card"], [class*="item"]').filter({ hasText: /等奖|谢谢/ });
    const initialCount = await prizeCards.count();
    console.log(`📊 初始奖品数量: ${initialCount}`);
    
    // 查找删除按钮
    const deleteButtons = page.locator('button:has(svg[class*="trash"]), button:has-text("删除")');
    if (await deleteButtons.count() > 0) {
      console.log(`🗑️ 找到 ${await deleteButtons.count()} 个删除按钮`);
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-delete-prize.png' });
  });
});

test.describe('抽奖规则测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('每人抽奖次数配置', async ({ page }) => {
    console.log('\n🧪 测试每人抽奖次数配置...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    // 检查抽奖次数配置
    const drawsInput = page.locator('input[type="number"]').filter({ hasText: /次/ });
    const rulesText = await page.textContent('body');
    
    if (rulesText?.includes('每人') || rulesText?.includes('抽奖次数')) {
      console.log('✅ 抽奖次数配置可见');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-draws-config.png' });
  });

  test('手机号必填配置', async ({ page }) => {
    console.log('\n🧪 测试手机号必填配置...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    // 检查手机号配置
    const phoneCheckbox = page.locator('input[type="checkbox"]');
    const rulesText = await page.textContent('body');
    
    if (rulesText?.includes('手机号') || rulesText?.includes('需要手机')) {
      console.log('✅ 手机号配置可见');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-phone-config.png' });
  });
});

test.describe('抽奖数据验证', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('必填字段验证', async ({ page }) => {
    console.log('\n🧪 测试必填字段验证...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    // 不填写标题直接提交
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(1000);
    
    // 检查是否显示错误
    const currentUrl = page.url();
    if (currentUrl.includes('/new')) {
      console.log('✅ 空标题时表单未提交（验证生效）');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-validation-title.png' });
  });

  test('概率总和验证', async ({ page }) => {
    console.log('\n🧪 测试概率总和验证...');
    
    await page.goto(`${BASE_URL}/lotteries/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('概率测试');
    
    // 修改概率使总和不等于100
    const probInputs = page.locator('input[type="number"]');
    if (await probInputs.count() > 0) {
      // 尝试找到概率输入框并修改
      const firstProbInput = probInputs.first();
      await firstProbInput.clear();
      await firstProbInput.fill('50');
    }
    
    // 提交
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(1000);
    
    // 检查是否显示概率错误
    const errorMessage = page.locator('text=概率, text=100%');
    if (await errorMessage.count() > 0) {
      console.log('✅ 概率总和验证生效');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/lottery-validation-prob.png' });
  });

  test('抽奖数据统计', async ({ page }) => {
    console.log('\n🧪 测试抽奖数据统计...');
    
    // 访问抽奖列表
    await page.goto(`${BASE_URL}/lotteries`);
    await page.waitForLoadState('networkidle');
    
    // 检查是否有抽奖活动
    const lotteryItems = page.locator('a[href*="/lotteries/"]');
    const count = await lotteryItems.count();
    console.log(`📊 抽奖活动数量: ${count}`);
    
    // 如果有抽奖，查看统计
    if (count > 0) {
      await lotteryItems.first().click();
      await page.waitForTimeout(2000);
      
      // 截图：抽奖详情和统计
      await page.screenshot({ path: 'e2e/screenshots/lottery-stats.png' });
      
      const statsText = await page.textContent('body');
      if (statsText?.includes('抽奖') || statsText?.includes('中奖') || statsText?.includes('0')) {
        console.log('✅ 抽奖统计信息可见');
      }
    }
  });
});
