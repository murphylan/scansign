import { defineConfig, devices } from '@playwright/test';

// 是否录制宣传视频模式
const isVideoMode = process.env.VIDEO_MODE === 'true';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/report' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: isVideoMode ? 'off' : 'on-first-retry',
    screenshot: isVideoMode ? 'off' : 'on',
    video: isVideoMode 
      ? { mode: 'on', size: { width: 1280, height: 720 } }  // 720p 16:9
      : 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 视频模式下使用固定视口
        ...(isVideoMode && { viewport: { width: 1280, height: 720 } }),
      },
    },
  ],
  outputDir: 'e2e/test-results',
  timeout: isVideoMode ? 600000 : 60000,  // 视频模式 10 分钟超时
});
