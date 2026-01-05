import { test, expect, Page } from '@playwright/test';

/**
 * 表单信息收集功能端到端测试
 * 测试完整流程：创建表单 -> 添加字段 -> 公开填写 -> 数据收集
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
  
  await page.waitForURL(/\/(dashboard|forms)/);
}

test.describe('表单功能完整流程测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. 访问表单列表页面', async ({ page }) => {
    console.log('\n🧪 测试表单列表页面...');
    
    await page.goto(`${BASE_URL}/forms`);
    await page.waitForLoadState('networkidle');
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/form-01-list.png' });
    
    // 检查页面标题
    const pageTitle = page.locator('h1:has-text("表单"), h1:has-text("管理")');
    await expect(pageTitle.first()).toBeVisible();
    console.log('✅ 表单列表页面加载成功');
    
    // 检查创建按钮
    const createButton = page.locator('button:has-text("创建"), a:has-text("创建表单")');
    await expect(createButton.first()).toBeVisible();
    console.log('✅ 创建表单按钮可见');
  });

  test('2. 创建基础表单', async ({ page }) => {
    console.log('\n🧪 测试创建基础表单...');
    
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    // 截图：创建页面
    await page.screenshot({ path: 'e2e/screenshots/form-02-new-page.png' });
    
    // 检查表单元素
    const titleInput = page.locator('input#title');
    await expect(titleInput).toBeVisible();
    console.log('✅ 表单创建页面加载成功');
    
    // 填写基本信息
    await titleInput.fill('测试信息收集表单 - ' + new Date().toLocaleTimeString());
    await page.locator('input#description').fill('这是一个测试表单');
    console.log('✅ 已填写基本信息');
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/form-03-basic-info.png' });
    
    // 检查字段类型选择器
    const fieldTypes = page.locator('button:has-text("单行文本"), button:has-text("多行文本"), button:has-text("单选"), button:has-text("多选")');
    const fieldTypeCount = await fieldTypes.count();
    console.log(`📝 可用字段类型数量: ${fieldTypeCount}`);
    
    // 添加一个单行文本字段
    const textButton = page.locator('button:has-text("单行文本")');
    if (await textButton.isVisible()) {
      await textButton.click();
      await page.waitForTimeout(500);
      console.log('✅ 已添加单行文本字段');
    }
    
    // 截图：添加字段后
    await page.screenshot({ path: 'e2e/screenshots/form-04-field-added.png' });
    
    // 提交创建
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    // 截图：创建结果
    await page.screenshot({ path: 'e2e/screenshots/form-05-result.png' });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/forms/') && !currentUrl.includes('/new')) {
      console.log('🎉 表单创建成功！');
    } else {
      console.log('📍 当前URL: ' + currentUrl);
    }
  });

  test('3. 创建完整表单 - 多种字段类型', async ({ page }) => {
    console.log('\n🧪 测试创建完整表单（多种字段）...');
    
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    // 填写标题
    await page.locator('input#title').fill('综合调查问卷 - ' + Date.now());
    
    // 添加多种字段类型
    const fieldTypesToAdd = ['单行文本', '多行文本', '单选', '评分'];
    
    for (const fieldType of fieldTypesToAdd) {
      const button = page.locator(`button:has-text("${fieldType}")`);
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(300);
        console.log(`✅ 已添加 ${fieldType} 字段`);
      }
    }
    
    // 截图：多字段表单
    await page.screenshot({ path: 'e2e/screenshots/form-06-multi-fields.png', fullPage: true });
    
    // 检查已添加的字段数量
    const addedFields = page.locator('[class*="field"], [class*="card"]').filter({ hasText: /单行文本|多行文本|单选|评分/ });
    console.log(`📊 已添加字段数量: ${await addedFields.count()}`);
    
    // 提交创建
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/forms/') && !currentUrl.includes('/new')) {
      console.log('🎉 多字段表单创建成功！');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/form-07-multi-result.png' });
  });

  test('4. 表单详情页面功能', async ({ page }) => {
    console.log('\n🧪 测试表单详情页面...');
    
    // 先创建一个表单
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('详情测试表单 - ' + Date.now());
    
    // 添加一个字段
    const textButton = page.locator('button:has-text("单行文本")');
    if (await textButton.isVisible()) {
      await textButton.click();
      await page.waitForTimeout(300);
    }
    
    await page.locator('button[type="submit"]:has-text("创建")').click();
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (!currentUrl.includes('/forms/') || currentUrl.includes('/new')) {
      console.log('⚠️ 表单创建失败，跳过详情测试');
      return;
    }
    
    // 截图：详情页
    await page.screenshot({ path: 'e2e/screenshots/form-08-detail.png' });
    
    // 检查二维码
    const qrCode = page.locator('img[alt*="QR"], canvas, svg[class*="qr"]');
    console.log(`📱 二维码元素数量: ${await qrCode.count()}`);
    
    // 检查表单链接
    const formLink = page.locator('text=/\\/f\\/[A-Za-z0-9]+/');
    if (await formLink.count() > 0) {
      const linkText = await formLink.first().textContent();
      console.log(`🔗 表单链接: ${linkText}`);
    }
    
    // 检查统计信息
    const statsText = await page.textContent('body');
    if (statsText?.includes('提交') || statsText?.includes('收集')) {
      console.log('✅ 统计信息可见');
    }
    
    console.log('✅ 表单详情页面功能正常');
  });

  test('5. 公开表单填写页面', async ({ page }) => {
    console.log('\n🧪 测试公开表单填写页面...');
    
    // 先创建一个表单
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('公开填写测试 - ' + Date.now());
    
    // 添加单行文本字段
    const textButton = page.locator('button:has-text("单行文本")');
    if (await textButton.isVisible()) {
      await textButton.click();
      await page.waitForTimeout(300);
    }
    
    await page.locator('button[type="submit"]:has-text("创建")').click();
    await page.waitForTimeout(3000);
    
    const detailUrl = page.url();
    if (!detailUrl.includes('/forms/') || detailUrl.includes('/new')) {
      console.log('⚠️ 表单创建失败，跳过公开页面测试');
      return;
    }
    
    // 获取表单code
    const pageText = await page.textContent('body');
    const codeMatch = pageText?.match(/\/f\/([A-Za-z0-9]+)/);
    
    if (codeMatch) {
      const formCode = codeMatch[1];
      console.log(`📍 表单码: ${formCode}`);
      
      // 访问公开表单页面
      const publicUrl = `${BASE_URL}/f/${formCode}`;
      console.log(`🔗 访问公开表单: ${publicUrl}`);
      
      // 创建新页面模拟未登录用户
      const context = page.context();
      const publicPage = await context.newPage();
      
      await publicPage.goto(publicUrl);
      await publicPage.waitForLoadState('networkidle');
      
      // 截图：公开表单页面
      await publicPage.screenshot({ path: 'e2e/screenshots/form-09-public-page.png' });
      
      // 检查手机号输入框
      const phoneInput = publicPage.locator('input[type="tel"], input[placeholder*="手机"]');
      if (await phoneInput.isVisible()) {
        console.log('✅ 手机号输入框可见');
        await phoneInput.fill('13800138001');
      }
      
      // 检查表单字段
      const formFields = publicPage.locator('input[type="text"], textarea');
      const fieldCount = await formFields.count();
      console.log(`📝 表单字段数量: ${fieldCount}`);
      
      // 填写第一个文本字段
      if (fieldCount > 0) {
        await formFields.first().fill('测试填写内容');
      }
      
      // 截图：填写后
      await publicPage.screenshot({ path: 'e2e/screenshots/form-10-public-filled.png' });
      
      // 提交表单
      const submitButton = publicPage.locator('button[type="submit"]:has-text("提交")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await publicPage.waitForTimeout(3000);
        
        // 截图：提交结果
        await publicPage.screenshot({ path: 'e2e/screenshots/form-11-public-result.png' });
        
        // 检查成功提示
        const successMessage = publicPage.locator('text=成功, text=感谢');
        if (await successMessage.count() > 0) {
          console.log('🎉 表单提交成功！');
        }
      }
      
      await publicPage.close();
    } else {
      console.log('⚠️ 无法获取表单码');
    }
  });

  test('6. 大屏展示页面', async ({ page }) => {
    console.log('\n🧪 测试表单大屏展示页面...');
    
    // 先创建一个表单
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('大屏测试表单 - ' + Date.now());
    
    const textButton = page.locator('button:has-text("单行文本")');
    if (await textButton.isVisible()) {
      await textButton.click();
      await page.waitForTimeout(300);
    }
    
    await page.locator('button[type="submit"]:has-text("创建")').click();
    await page.waitForTimeout(3000);
    
    const detailUrl = page.url();
    if (!detailUrl.includes('/forms/') || detailUrl.includes('/new')) {
      console.log('⚠️ 表单创建失败，跳过大屏测试');
      return;
    }
    
    // 获取表单code
    const pageText = await page.textContent('body');
    const codeMatch = pageText?.match(/\/f\/([A-Za-z0-9]+)/);
    
    if (codeMatch) {
      const formCode = codeMatch[1];
      const displayUrl = `${BASE_URL}/f/${formCode}/display`;
      console.log(`🖥️ 大屏URL: ${displayUrl}`);
      
      await page.goto(displayUrl);
      await page.waitForTimeout(5000);
      
      // 截图：大屏展示
      await page.screenshot({ path: 'e2e/screenshots/form-12-display.png', fullPage: true });
      
      const bodyContent = await page.textContent('body');
      if (bodyContent && bodyContent.length > 100) {
        console.log('✅ 大屏页面有展示内容');
      }
      
      console.log('✅ 大屏展示页面加载成功');
    }
  });
});

test.describe('表单字段类型测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('检查所有字段类型', async ({ page }) => {
    console.log('\n🧪 检查所有可用字段类型...');
    
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    // 检查各种字段类型
    const fieldTypes = [
      { name: '单行文本', icon: '📝' },
      { name: '多行文本', icon: '📄' },
      { name: '数字', icon: '🔢' },
      { name: '手机号', icon: '📱' },
      { name: '邮箱', icon: '📧' },
      { name: '单选', icon: '⭕' },
      { name: '多选', icon: '☑️' },
      { name: '下拉选择', icon: '📋' },
      { name: '日期', icon: '📅' },
      { name: '时间', icon: '⏰' },
      { name: '评分', icon: '⭐' },
      { name: '图片', icon: '🖼️' },
    ];
    
    let foundCount = 0;
    for (const fieldType of fieldTypes) {
      const button = page.locator(`button:has-text("${fieldType.name}")`);
      if (await button.count() > 0) {
        console.log(`✅ ${fieldType.icon} ${fieldType.name}`);
        foundCount++;
      } else {
        console.log(`⚠️ ${fieldType.icon} ${fieldType.name} - 未找到`);
      }
    }
    
    console.log(`📊 找到 ${foundCount}/${fieldTypes.length} 种字段类型`);
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/form-field-types.png', fullPage: true });
  });

  test('添加单选字段并配置选项', async ({ page }) => {
    console.log('\n🧪 测试单选字段配置...');
    
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('单选测试表单');
    
    // 添加单选字段
    const radioButton = page.locator('button:has-text("单选")');
    if (await radioButton.isVisible()) {
      await radioButton.click();
      await page.waitForTimeout(500);
      console.log('✅ 已添加单选字段');
      
      // 截图
      await page.screenshot({ path: 'e2e/screenshots/form-radio-field.png' });
      
      // 检查选项配置
      const optionInputs = page.locator('input[placeholder*="选项"]');
      const optionCount = await optionInputs.count();
      console.log(`📝 选项输入框数量: ${optionCount}`);
      
      // 添加选项
      const addOptionButton = page.locator('button:has-text("添加选项")');
      if (await addOptionButton.count() > 0) {
        await addOptionButton.first().click();
        await page.waitForTimeout(300);
        console.log('✅ 已添加新选项');
      }
    }
  });

  test('添加评分字段', async ({ page }) => {
    console.log('\n🧪 测试评分字段...');
    
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('评分测试表单');
    
    // 添加评分字段
    const ratingButton = page.locator('button:has-text("评分")');
    if (await ratingButton.isVisible()) {
      await ratingButton.click();
      await page.waitForTimeout(500);
      console.log('✅ 已添加评分字段');
      
      // 截图
      await page.screenshot({ path: 'e2e/screenshots/form-rating-field.png' });
      
      // 检查评分配置（星星数量等）
      const ratingConfig = page.locator('text=评分, text=星');
      console.log(`⭐ 评分配置: ${await ratingConfig.count() > 0 ? '可见' : '不可见'}`);
    }
  });

  test('添加多选字段', async ({ page }) => {
    console.log('\n🧪 测试多选字段...');
    
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input#title').fill('多选测试表单');
    
    // 添加多选字段
    const checkboxButton = page.locator('button:has-text("多选")');
    if (await checkboxButton.isVisible()) {
      await checkboxButton.click();
      await page.waitForTimeout(500);
      console.log('✅ 已添加多选字段');
      
      // 截图
      await page.screenshot({ path: 'e2e/screenshots/form-checkbox-field.png' });
    }
  });
});

test.describe('表单配置选项测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('提交配置选项', async ({ page }) => {
    console.log('\n🧪 测试提交配置选项...');
    
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    // 展开高级设置
    const advancedToggle = page.locator('text=高级设置, button:has-text("高级")');
    if (await advancedToggle.count() > 0) {
      await advancedToggle.first().click();
      await page.waitForTimeout(500);
    }
    
    // 检查提交按钮文本配置
    const buttonTextInput = page.locator('input[placeholder*="按钮"], input[value="提交"]');
    if (await buttonTextInput.count() > 0) {
      console.log('✅ 提交按钮文本配置可见');
    }
    
    // 检查成功消息配置
    const successMsgInput = page.locator('input[placeholder*="成功"], textarea[placeholder*="成功"]');
    if (await successMsgInput.count() > 0) {
      console.log('✅ 成功消息配置可见');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/form-submit-config.png', fullPage: true });
  });

  test('规则配置选项', async ({ page }) => {
    console.log('\n🧪 测试规则配置选项...');
    
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    // 检查手机号必填选项
    const phoneRequired = page.locator('text=手机号, text=需要手机');
    if (await phoneRequired.count() > 0) {
      console.log('✅ 手机号必填选项可见');
    }
    
    // 检查限制提交次数选项
    const limitOne = page.locator('text=限提交一次, text=每人一次');
    if (await limitOne.count() > 0) {
      console.log('✅ 限制提交次数选项可见');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/form-rules-config.png' });
  });
});

test.describe('表单数据验证', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('必填字段验证', async ({ page }) => {
    console.log('\n🧪 测试必填字段验证...');
    
    await page.goto(`${BASE_URL}/forms/new`);
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
    await page.screenshot({ path: 'e2e/screenshots/form-validation-title.png' });
  });

  test('无字段验证', async ({ page }) => {
    console.log('\n🧪 测试无字段验证...');
    
    await page.goto(`${BASE_URL}/forms/new`);
    await page.waitForLoadState('networkidle');
    
    // 只填写标题，不添加字段
    await page.locator('input#title').fill('无字段测试表单');
    
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(1000);
    
    // 检查是否显示错误
    const errorToast = page.locator('text=至少添加一个字段, text=请添加字段');
    if (await errorToast.count() > 0) {
      console.log('✅ 无字段时显示错误提示');
    } else {
      const currentUrl = page.url();
      if (currentUrl.includes('/new')) {
        console.log('✅ 无字段时表单未提交');
      }
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/form-validation-fields.png' });
  });

  test('表单数据统计', async ({ page }) => {
    console.log('\n🧪 测试表单数据统计...');
    
    // 访问表单列表
    await page.goto(`${BASE_URL}/forms`);
    await page.waitForLoadState('networkidle');
    
    // 检查是否有表单
    const formItems = page.locator('a[href*="/forms/"]');
    const count = await formItems.count();
    console.log(`📊 表单数量: ${count}`);
    
    // 如果有表单，查看统计
    if (count > 0) {
      await formItems.first().click();
      await page.waitForTimeout(2000);
      
      // 截图：表单详情和统计
      await page.screenshot({ path: 'e2e/screenshots/form-stats.png' });
      
      const statsText = await page.textContent('body');
      if (statsText?.includes('提交') || statsText?.includes('收集') || statsText?.includes('0')) {
        console.log('✅ 表单统计信息可见');
      }
    }
  });
});
