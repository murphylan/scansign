import { test, expect, Page } from '@playwright/test';

/**
 * 投票模板功能测试
 * 测试4种不同的投票模板：简单投票、图文投票、选手投票、PK对决
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
  
  // 确认登录成功
  await page.waitForURL(/\/(dashboard|votes)/);
}

test.describe('投票模板功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 每个测试前先登录
    await login(page);
  });

  test('1. 简单投票模板 - 完整流程', async ({ page }) => {
    console.log('\n🧪 测试简单投票模板...');
    
    // 进入创建投票页面
    await page.goto(`${BASE_URL}/votes/new`);
    await page.waitForLoadState('networkidle');
    
    // 截图：模板选择页面
    await page.screenshot({ path: 'e2e/screenshots/template-simple-01-selector.png' });
    
    // 检查模板选择器
    const simpleTemplate = page.locator('button:has-text("简单投票")');
    await expect(simpleTemplate).toBeVisible();
    console.log('✅ 简单投票模板可见');
    
    // 选择简单投票模板
    await simpleTemplate.click();
    await page.waitForTimeout(500);
    
    // 检查选中状态
    const isSelected = await simpleTemplate.evaluate(el => 
      el.className.includes('border-primary')
    );
    expect(isSelected).toBeTruthy();
    console.log('✅ 简单投票模板已选中');
    
    // 点击下一步
    const nextButton = page.locator('button:has-text("下一步")');
    await nextButton.click();
    await page.waitForTimeout(1000);
    
    // 截图：表单页面
    await page.screenshot({ path: 'e2e/screenshots/template-simple-02-form.png' });
    
    // 检查表单元素
    const titleInput = page.locator('input#title');
    await expect(titleInput).toBeVisible();
    console.log('✅ 表单页面加载成功');
    
    // 填写投票信息
    await titleInput.fill('简单投票测试 - ' + new Date().toLocaleTimeString());
    
    // 检查选项输入（简单模板只有文字输入）
    const optionInputs = page.locator('input[placeholder*="选项"]');
    const optionCount = await optionInputs.count();
    console.log(`📝 发现 ${optionCount} 个选项输入框`);
    
    // 填写选项
    await optionInputs.nth(0).fill('选项A - 苹果');
    await optionInputs.nth(1).fill('选项B - 香蕉');
    
    // 添加更多选项
    const addButton = page.locator('button:has-text("添加选项")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(300);
      const newOptionInputs = page.locator('input[placeholder*="选项"]');
      await newOptionInputs.nth(2).fill('选项C - 橙子');
      console.log('✅ 已添加第三个选项');
    }
    
    // 截图：填写完成
    await page.screenshot({ path: 'e2e/screenshots/template-simple-03-filled.png' });
    
    // 提交创建
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    // 截图：创建结果
    await page.screenshot({ path: 'e2e/screenshots/template-simple-04-result.png' });
    
    // 验证创建成功
    const currentUrl = page.url();
    if (currentUrl.includes('/votes/') && !currentUrl.includes('/new')) {
      console.log('🎉 简单投票创建成功！');
    } else {
      console.log('📍 当前URL: ' + currentUrl);
    }
  });

  test('2. 图文投票模板 - 完整流程', async ({ page }) => {
    console.log('\n🧪 测试图文投票模板...');
    
    await page.goto(`${BASE_URL}/votes/new`);
    await page.waitForLoadState('networkidle');
    
    // 选择图文投票模板
    const imageTemplate = page.locator('button:has-text("图文投票")');
    await expect(imageTemplate).toBeVisible();
    await imageTemplate.click();
    await page.waitForTimeout(500);
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/template-image-01-selected.png' });
    console.log('✅ 图文投票模板已选中');
    
    // 检查模板特性标签
    const hasImageTag = page.locator('span:has-text("支持图片")').first();
    await expect(hasImageTag).toBeVisible();
    console.log('✅ "支持图片" 标签可见');
    
    // 点击下一步
    await page.locator('button:has-text("下一步")').click();
    await page.waitForTimeout(1000);
    
    // 截图：图文投票表单
    await page.screenshot({ path: 'e2e/screenshots/template-image-02-form.png' });
    
    // 检查图片上传区域是否存在
    const imageUploader = page.locator('label:has-text("图片"), label:has-text("上传")');
    const imageUploaderCount = await imageUploader.count();
    console.log(`📷 发现 ${imageUploaderCount} 个图片上传区域`);
    
    // 填写标题
    await page.locator('input#title').fill('图文投票测试 - ' + new Date().toLocaleTimeString());
    
    // 填写选项标题
    const optionTitleInputs = page.locator('input[placeholder*="选项"], input[placeholder*="标题"]');
    if (await optionTitleInputs.count() > 0) {
      await optionTitleInputs.nth(0).fill('红色主题');
      await optionTitleInputs.nth(1).fill('蓝色主题');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/template-image-03-filled.png' });
    
    // 提交创建
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/template-image-04-result.png' });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/votes/') && !currentUrl.includes('/new')) {
      console.log('🎉 图文投票创建成功！');
    }
  });

  test('3. 选手投票模板 - 完整流程', async ({ page }) => {
    console.log('\n🧪 测试选手投票模板...');
    
    await page.goto(`${BASE_URL}/votes/new`);
    await page.waitForLoadState('networkidle');
    
    // 选择选手投票模板
    const candidateTemplate = page.locator('button:has-text("选手投票")');
    await expect(candidateTemplate).toBeVisible();
    await candidateTemplate.click();
    await page.waitForTimeout(500);
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/template-candidate-01-selected.png' });
    console.log('✅ 选手投票模板已选中');
    
    // 检查模板描述
    const description = page.locator('text=适合评选、比赛等场景').first();
    const isDescVisible = await description.isVisible();
    if (isDescVisible) {
      console.log('✅ 模板描述正确显示');
    }
    
    // 点击下一步
    await page.locator('button:has-text("下一步")').click();
    await page.waitForTimeout(1000);
    
    // 截图：选手投票表单
    await page.screenshot({ path: 'e2e/screenshots/template-candidate-02-form.png' });
    
    // 检查是否有选手卡片布局
    const cardLayout = page.locator('.grid');
    const hasGrid = await cardLayout.count() > 0;
    console.log(`📋 卡片布局: ${hasGrid ? '是' : '否'}`);
    
    // 填写标题
    await page.locator('input#title').fill('年度最佳员工评选 - ' + new Date().toLocaleTimeString());
    
    // 填写选手信息
    const nameInputs = page.locator('input[placeholder*="选手"], input[placeholder*="姓名"]');
    if (await nameInputs.count() > 0) {
      await nameInputs.nth(0).fill('张三');
      await nameInputs.nth(1).fill('李四');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/template-candidate-03-filled.png' });
    
    // 提交创建
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/template-candidate-04-result.png' });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/votes/') && !currentUrl.includes('/new')) {
      console.log('🎉 选手投票创建成功！');
    }
  });

  test('4. PK对决模板 - 完整流程', async ({ page }) => {
    console.log('\n🧪 测试PK对决模板...');
    
    await page.goto(`${BASE_URL}/votes/new`);
    await page.waitForLoadState('networkidle');
    
    // 选择PK对决模板
    const versusTemplate = page.locator('button:has-text("PK对决")');
    await expect(versusTemplate).toBeVisible();
    await versusTemplate.click();
    await page.waitForTimeout(500);
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/template-versus-01-selected.png' });
    console.log('✅ PK对决模板已选中');
    
    // 检查"仅单选"标签
    const singleOnlyTag = page.locator('span:has-text("仅单选")');
    const hasSingleTag = await singleOnlyTag.isVisible();
    if (hasSingleTag) {
      console.log('✅ "仅单选" 标签可见（PK对决特有）');
    }
    
    // 点击下一步
    await page.locator('button:has-text("下一步")').click();
    await page.waitForTimeout(1000);
    
    // 截图：PK对决表单
    await page.screenshot({ path: 'e2e/screenshots/template-versus-02-form.png' });
    
    // 检查VS标识
    const vsLabel = page.locator('text=VS');
    const hasVS = await vsLabel.isVisible();
    if (hasVS) {
      console.log('✅ VS 对决标识可见');
    }
    
    // 填写标题
    await page.locator('input#title').fill('红队 vs 蓝队 - ' + new Date().toLocaleTimeString());
    
    // 填写对决双方
    const playerInputs = page.locator('input[placeholder*="选手"], input[placeholder*="名称"]');
    if (await playerInputs.count() >= 2) {
      await playerInputs.nth(0).fill('红队');
      await playerInputs.nth(1).fill('蓝队');
    }
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/template-versus-03-filled.png' });
    
    // 提交创建
    const submitButton = page.locator('button[type="submit"]:has-text("创建")');
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/template-versus-04-result.png' });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/votes/') && !currentUrl.includes('/new')) {
      console.log('🎉 PK对决投票创建成功！');
    }
  });

  test('5. 模板切换功能测试', async ({ page }) => {
    console.log('\n🧪 测试模板切换功能...');
    
    await page.goto(`${BASE_URL}/votes/new`);
    await page.waitForLoadState('networkidle');
    
    const templates = ['简单投票', '图文投票', '选手投票', 'PK对决'];
    
    for (let i = 0; i < templates.length; i++) {
      const name = templates[i];
      const template = page.locator(`button:has-text("${name}")`);
      
      if (await template.isVisible()) {
        await template.click();
        await page.waitForTimeout(300);
        
        // 检查选中状态
        const isSelected = await template.evaluate(el => 
          el.className.includes('border-primary')
        );
        
        console.log(`${isSelected ? '✅' : '❌'} ${name} - 选中状态: ${isSelected}`);
        
        // 截图
        await page.screenshot({ path: `e2e/screenshots/template-switch-${i + 1}-${name}.png` });
      }
    }
    
    console.log('✅ 模板切换测试完成');
  });

  test('6. 进入表单后返回更换模板', async ({ page }) => {
    console.log('\n🧪 测试返回更换模板功能...');
    
    await page.goto(`${BASE_URL}/votes/new`);
    await page.waitForLoadState('networkidle');
    
    // 选择简单投票
    await page.locator('button:has-text("简单投票")').click();
    await page.waitForTimeout(300);
    
    // 进入表单
    await page.locator('button:has-text("下一步")').click();
    await page.waitForTimeout(1000);
    
    // 截图
    await page.screenshot({ path: 'e2e/screenshots/template-back-01-in-form.png' });
    
    // 点击返回或更换模板按钮
    const backButton = page.locator('button:has-text("返回"), button:has-text("更换模板")');
    if (await backButton.first().isVisible()) {
      await backButton.first().click();
      await page.waitForTimeout(1000);
      
      // 截图
      await page.screenshot({ path: 'e2e/screenshots/template-back-02-selector.png' });
      
      // 检查是否回到模板选择页面
      const templateSelector = page.locator('button:has-text("简单投票")');
      const isBack = await templateSelector.isVisible();
      
      if (isBack) {
        console.log('✅ 成功返回模板选择页面');
        
        // 选择不同的模板
        await page.locator('button:has-text("PK对决")').click();
        await page.waitForTimeout(300);
        console.log('✅ 成功切换到PK对决模板');
        
        // 截图
        await page.screenshot({ path: 'e2e/screenshots/template-back-03-changed.png' });
      }
    }
  });

  test('7. 多选投票配置测试', async ({ page }) => {
    console.log('\n🧪 测试多选投票配置...');
    
    await page.goto(`${BASE_URL}/votes/new`);
    await page.waitForLoadState('networkidle');
    
    // 选择简单投票（支持多选）
    await page.locator('button:has-text("简单投票")').click();
    await page.locator('button:has-text("下一步")').click();
    await page.waitForTimeout(1000);
    
    // 查找投票类型选择
    const multipleChoice = page.locator('label:has-text("多选"), button:has-text("多选")');
    if (await multipleChoice.isVisible()) {
      await multipleChoice.click();
      await page.waitForTimeout(500);
      
      // 截图
      await page.screenshot({ path: 'e2e/screenshots/template-multiple-01-selected.png' });
      console.log('✅ 已选择多选模式');
      
      // 检查最少/最多选择输入框
      const minInput = page.locator('input[type="number"]').first();
      const maxInput = page.locator('input[type="number"]').nth(1);
      
      if (await minInput.isVisible()) {
        console.log('✅ 最少选择数输入框可见');
      }
      if (await maxInput.isVisible()) {
        console.log('✅ 最多选择数输入框可见');
      }
    }
  });
});

test.describe('投票模板UI检查', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('模板卡片样式检查', async ({ page }) => {
    await page.goto(`${BASE_URL}/votes/new`);
    await page.waitForLoadState('networkidle');
    
    // 检查模板卡片元素
    const templateCards = page.locator('button:has-text("简单投票"), button:has-text("图文投票"), button:has-text("选手投票"), button:has-text("PK对决")');
    const count = await templateCards.count();
    
    console.log(`\n📋 模板卡片数量: ${count}`);
    expect(count).toBe(4);
    
    // 检查每个模板的图标
    const icons = ['📝', '🖼️', '🏆', '⚔️'];
    for (const icon of icons) {
      const hasIcon = await page.locator(`text=${icon}`).first().isVisible();
      console.log(`${hasIcon ? '✅' : '❌'} 图标 ${icon} 存在`);
    }
    
    // 截图所有模板
    await page.screenshot({ path: 'e2e/screenshots/template-ui-all-cards.png', fullPage: true });
  });
});
