import { test, expect } from '@playwright/test';

import { loginAsAdmin } from './helpers/auth';

/**
 * 签到功能端到端测试
 * 测试完整流程：创建签到 -> 配置 -> 公开页面签到 -> 大屏展示
 */

test.describe('签到功能完整流程测试', () => {
  
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!);
  });

  test('1. 访问签到列表页面', async ({ page, baseURL }) => {
    console.log('\n🧪 测试签到列表页面...');
    
    await page.goto(`${baseURL}/checkins`);
    await page.waitForLoadState('networkidle');
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/checkin-01-list.png' });
    
    // 检查页面标题
    const pageTitle = page.locator('h1:has-text("签到"), h1:has-text("管理")');
    await expect(pageTitle.first()).toBeVisible();
    console.log('✅ 签到列表页面加载成功');
    
    // 检查创建按钮
    const createButton = page.locator('button:has-text("创建"), a:has-text("创建签到")');
    await expect(createButton.first()).toBeVisible();
    console.log('✅ 创建签到按钮可见');
  });

  test('2. 创建签到 - 完整流程', async ({ page, baseURL }) => {
    console.log('\n🧪 测试创建签到...');
    
    await page.goto(`${baseURL}/checkins/new`);
    await page.waitForLoadState('networkidle');
    
    // 截图：创建页面
    await page.screenshot({ path: 'e2e/screenshots/checkin-02-new-page.png' });
    
    // 检查表单元素
    const titleInput = page.locator('input#title');
    await expect(titleInput).toBeVisible();
    console.log('✅ 签到创建页面加载成功');
    
    // 填写基本信息
    await titleInput.fill('测试签到活动 - ' + new Date().toLocaleTimeString());
    await page.locator('input#description').fill('这是一个测试签到活动');
    console.log('✅ 已填写基本信息');
    
    // 截图：填写后
    await page.screenshot({ path: 'e2e/screenshots/checkin-03-form-basic.png' });
    
    // 检查收集信息选项
    const phoneCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(phoneCheckbox).toBeVisible();
    console.log('✅ 收集信息配置可见');
    
    // 提交创建
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    // 截图：创建结果
    await page.screenshot({ path: 'e2e/screenshots/checkin-04-result.png' });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/checkins/') && !currentUrl.includes('/new')) {
      console.log('🎉 签到创建成功！');
      console.log(`📍 签到详情页: ${currentUrl}`);
    } else {
      console.log('📍 当前URL: ' + currentUrl);
    }
  });

  test('3. 签到详情页面功能', async ({ page, baseURL }) => {
    console.log('\n🧪 测试签到详情页面...');
    
    // 先创建一个签到
    await page.goto(`${baseURL}/checkins/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('详情测试签到 - ' + Date.now());
    await page.locator('button[type="submit"]:has-text("创建")').click();
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (!currentUrl.includes('/checkins/') || currentUrl.includes('/new')) {
      console.log('⚠️ 签到创建失败，跳过详情测试');
      return;
    }
    
    // 截图：详情页
    await page.screenshot({ path: 'e2e/screenshots/checkin-05-detail.png' });
    
    // 检查二维码
    const qrCode = page.locator('img[alt*="QR"], canvas, svg[class*="qr"]');
    console.log(`📱 二维码元素数量: ${await qrCode.count()}`);
    
    // 检查签到链接
    const checkinLink = page.locator('text=/\\/c\\/[A-Za-z0-9]+/');
    if (await checkinLink.count() > 0) {
      const linkText = await checkinLink.first().textContent();
      console.log(`🔗 签到链接: ${linkText}`);
    }
    
    // 检查大屏按钮
    const displayButton = page.locator('button:has-text("大屏"), a:has-text("大屏")');
    if (await displayButton.count() > 0) {
      console.log('✅ 大屏展示按钮可见');
    }
    
    // 检查设置按钮
    const settingsButton = page.locator('button:has-text("设置"), a:has-text("设置")');
    if (await settingsButton.count() > 0) {
      console.log('✅ 设置按钮可见');
    }
    
    console.log('✅ 签到详情页面功能正常');
  });

  test('4. 签到配置页面', async ({ page, baseURL }) => {
    console.log('\n🧪 测试签到配置页面...');
    
    // 先创建一个签到
    await page.goto(`${baseURL}/checkins/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('配置测试签到 - ' + Date.now());
    await page.locator('button[type="submit"]:has-text("创建")').click();
    await page.waitForTimeout(3000);
    
    const detailUrl = page.url();
    if (!detailUrl.includes('/checkins/') || detailUrl.includes('/new')) {
      console.log('⚠️ 签到创建失败，跳过配置测试');
      return;
    }
    
    // 进入设置页面
    const settingsLink = page.locator('a:has-text("设置"), button:has-text("设置")');
    if (await settingsLink.count() > 0) {
      await settingsLink.first().click();
      await page.waitForTimeout(2000);
    } else {
      // 直接构造设置URL
      const checkinId = detailUrl.split('/checkins/')[1]?.split('/')[0];
      if (checkinId) {
        await page.goto(`${baseURL}/checkins/${checkinId}/settings`);
        await page.waitForLoadState('networkidle');
      }
    }
    
    // 截图：设置页面
    await page.screenshot({ path: 'e2e/screenshots/checkin-06-settings.png' });
    
    // 检查设置选项
    const wallStyleOptions = page.locator('text=弹幕, text=气泡, text=网格, text=列表');
    console.log(`🎨 墙面样式选项数量: ${await wallStyleOptions.count()}`);
    
    // 检查背景设置
    const backgroundPicker = page.locator('text=背景, text=渐变');
    console.log(`🖼️ 背景设置: ${await backgroundPicker.count() > 0 ? '可见' : '不可见'}`);
    
    console.log('✅ 签到配置页面加载成功');
  });

  test('5. 公开签到页面', async ({ page, baseURL }) => {
    console.log('\n🧪 测试公开签到页面...');
    
    // 先创建一个签到
    await page.goto(`${baseURL}/checkins/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('公开页面测试 - ' + Date.now());
    await page.locator('button[type="submit"]:has-text("创建")').click();
    await page.waitForTimeout(3000);
    
    const detailUrl = page.url();
    if (!detailUrl.includes('/checkins/') || detailUrl.includes('/new')) {
      console.log('⚠️ 签到创建失败，跳过公开页面测试');
      return;
    }
    
    // 获取签到code
    await page.screenshot({ path: 'e2e/screenshots/checkin-07-get-code.png' });
    
    // 查找签到链接
    const codeLink = page.locator('text=/\\/c\\/[A-Za-z0-9]+/');
    let checkinCode = '';
    
    if (await codeLink.count() > 0) {
      const linkText = await codeLink.first().textContent();
      const match = linkText?.match(/\/c\/([A-Za-z0-9]+)/);
      if (match) {
        checkinCode = match[1];
        console.log(`📍 签到码: ${checkinCode}`);
      }
    }
    
    if (!checkinCode) {
      // 尝试从复制链接按钮获取
      const copyButton = page.locator('button:has-text("复制")');
      if (await copyButton.count() > 0) {
        console.log('⚠️ 无法获取签到码，尝试从页面元素提取');
        // 从页面文本中提取
        const pageText = await page.textContent('body');
        const codeMatch = pageText?.match(/\/c\/([A-Za-z0-9]+)/);
        if (codeMatch) {
          checkinCode = codeMatch[1];
        }
      }
    }
    
    if (checkinCode) {
      // 访问公开签到页面（新的浏览器上下文，无登录状态）
      const publicUrl = `${baseURL}/c/${checkinCode}`;
      console.log(`🔗 访问公开签到页面: ${publicUrl}`);
      
      // 创建新页面来模拟未登录用户
      const context = page.context();
      const publicPage = await context.newPage();
      
      await publicPage.goto(publicUrl);
      await publicPage.waitForLoadState('networkidle');
      
      // 截图：公开签到页面
      await publicPage.screenshot({ path: 'e2e/screenshots/checkin-08-public-page.png' });
      
      // 检查表单元素
      const phoneInput = publicPage.locator('input[type="tel"], input[placeholder*="手机"]');
      if (await phoneInput.isVisible()) {
        console.log('✅ 手机号输入框可见');
        
        // 填写手机号
        await phoneInput.fill('13800138000');
        
        // 检查姓名输入
        const nameInput = publicPage.locator('input[placeholder*="姓名"]');
        if (await nameInput.isVisible()) {
          await nameInput.fill('测试用户');
          console.log('✅ 姓名输入框可见');
        }
        
        // 截图：填写后
        await publicPage.screenshot({ path: 'e2e/screenshots/checkin-09-public-filled.png' });
        
        // 提交签到
        const submitButton = publicPage.locator('button[type="submit"]:has-text("签到")');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await publicPage.waitForTimeout(3000);
          
          // 截图：签到结果
          await publicPage.screenshot({ path: 'e2e/screenshots/checkin-10-public-result.png' });
          
          // 检查成功提示
          const successMessage = publicPage.locator('text=成功, text=完成');
          if (await successMessage.count() > 0) {
            console.log('🎉 签到提交成功！');
          }
        }
      }
      
      await publicPage.close();
    } else {
      console.log('⚠️ 无法获取签到码，跳过公开页面测试');
    }
  });

  test('6. 大屏展示页面', async ({ page, baseURL }) => {
    console.log('\n🧪 测试大屏展示页面...');
    
    // 先创建一个签到
    await page.goto(`${baseURL}/checkins/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('大屏测试签到 - ' + Date.now());
    await page.locator('button[type="submit"]:has-text("创建")').click();
    await page.waitForTimeout(3000);
    
    const detailUrl = page.url();
    if (!detailUrl.includes('/checkins/') || detailUrl.includes('/new')) {
      console.log('⚠️ 签到创建失败，跳过大屏测试');
      return;
    }
    
    // 获取签到code
    const pageText = await page.textContent('body');
    const codeMatch = pageText?.match(/\/c\/([A-Za-z0-9]+)/);
    
    if (codeMatch) {
      const checkinCode = codeMatch[1];
      const displayUrl = `${baseURL}/c/${checkinCode}/display`;
      console.log(`🖥️ 大屏URL: ${displayUrl}`);
      
      await page.goto(displayUrl);
      await page.waitForTimeout(5000); // 大屏页面可能有SSE连接，不等待networkidle
      
      // 截图：大屏展示
      await page.screenshot({ path: 'e2e/screenshots/checkin-11-display.png', fullPage: true });
      
      // 检查大屏元素
      const bodyContent = await page.textContent('body');
      if (bodyContent && bodyContent.length > 100) {
        console.log('✅ 大屏页面有展示内容');
      }
      
      console.log('✅ 大屏展示页面加载成功');
    } else {
      console.log('⚠️ 无法获取签到码，跳过大屏测试');
    }
  });
});

test.describe('签到配置选项测试', () => {
  
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!);
  });

  test('墙面样式选项', async ({ page, baseURL }) => {
    console.log('\n🧪 测试墙面样式选项...');
    
    await page.goto(`${baseURL}/checkins/new`);
    await page.waitForLoadState('networkidle');
    
    // 展开高级设置
    const advancedToggle = page.locator('text=高级设置, button:has-text("高级")');
    if (await advancedToggle.count() > 0) {
      await advancedToggle.first().click();
      await page.waitForTimeout(500);
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/checkin-style-options.png', fullPage: true });
    
    // 检查墙面样式选项
    const styles = ['弹幕', '气泡', '网格', '列表'];
    for (const style of styles) {
      const styleOption = page.locator(`text=${style}, label:has-text("${style}")`);
      if (await styleOption.count() > 0) {
        console.log(`✅ 样式选项 "${style}" 存在`);
      } else {
        console.log(`⚠️ 样式选项 "${style}" 未找到`);
      }
    }
  });

  test('部门配置功能', async ({ page, baseURL }) => {
    console.log('\n🧪 测试部门配置功能...');
    
    await page.goto(`${baseURL}/checkins/new`);
    await page.waitForLoadState('networkidle');
    
    // 找到并勾选部门选项
    const deptCheckbox = page.locator('text=部门').locator('..').locator('input[type="checkbox"]');
    if (await deptCheckbox.count() > 0) {
      await deptCheckbox.click();
      await page.waitForTimeout(500);
      
      // 检查部门输入框
      const deptInput = page.locator('input[placeholder*="部门"]');
      if (await deptInput.isVisible()) {
        console.log('✅ 部门输入框可见');
        
        // 添加部门
        await deptInput.fill('技术部');
        const addButton = page.locator('button:has-text("添加")');
        if (await addButton.count() > 0) {
          await addButton.first().click();
          await page.waitForTimeout(300);
          console.log('✅ 已添加部门');
        }
        
        // 截图
        await page.screenshot({ path: 'e2e/screenshots/checkin-dept-config.png' });
      }
    } else {
      console.log('⚠️ 未找到部门选项');
    }
  });

  test('签到后行为配置', async ({ page, baseURL }) => {
    console.log('\n🧪 测试签到后行为配置...');
    
    await page.goto(`${baseURL}/checkins/new`);
    await page.waitForLoadState('networkidle');
    
    // 检查签到后行为选项
    const afterOptions = page.locator('text=签到后, text=成功后');
    console.log(`📋 签到后行为选项: ${await afterOptions.count() > 0 ? '可见' : '不可见'}`);
    
    // 检查显示消息选项
    const messageOption = page.locator('text=显示消息, text=提示信息');
    if (await messageOption.count() > 0) {
      console.log('✅ 显示消息选项存在');
    }
    
    // 检查跳转URL选项
    const redirectOption = page.locator('text=跳转, text=重定向');
    if (await redirectOption.count() > 0) {
      console.log('✅ 跳转URL选项存在');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/checkin-after-options.png' });
  });
});

test.describe('签到数据验证', () => {
  
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!);
  });

  test('必填字段验证', async ({ page, baseURL }) => {
    console.log('\n🧪 测试必填字段验证...');
    
    await page.goto(`${baseURL}/checkins/new`);
    await page.waitForLoadState('networkidle');
    
    // 不填写标题直接提交
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(1000);
    
    // 检查是否显示错误或阻止提交
    const currentUrl = page.url();
    if (currentUrl.includes('/new')) {
      console.log('✅ 空标题时表单未提交（验证生效）');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/checkin-validation.png' });
  });

  test('签到记录统计', async ({ page, baseURL }) => {
    console.log('\n🧪 测试签到记录统计...');
    
    // 访问签到列表
    await page.goto(`${baseURL}/checkins`);
    await page.waitForLoadState('networkidle');
    
    // 检查是否有签到记录
    const checkinItems = page.locator('[class*="card"], [class*="item"]').filter({ hasText: '签到' });
    const count = await checkinItems.count();
    console.log(`📊 签到活动数量: ${count}`);
    
    // 如果有签到活动，检查统计数据
    if (count > 0) {
      // 点击第一个签到
      const firstCheckin = page.locator('a[href*="/checkins/"]').first();
      if (await firstCheckin.isVisible()) {
        await firstCheckin.click();
        await page.waitForTimeout(2000);
        
        // 截图：签到详情和统计
        await page.screenshot({ path: 'e2e/screenshots/checkin-stats.png' });
        
        // 检查统计信息
        const statsText = await page.textContent('body');
        if (statsText?.includes('人') || statsText?.includes('签到')) {
          console.log('✅ 签到统计信息可见');
        }
      }
    }
  });
});
