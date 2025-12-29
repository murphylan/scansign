# Murphy 互动工具集

> **📱 手机扫码提示**: 请使用局域网 IP 地址访问管理后台（如 `http://172.20.10.10:3000` 而非 `localhost`），这样生成的二维码才能被手机正常访问。启动服务后可在终端看到 Network 地址。

一个面向全社会的多场景互动工具平台，支持签到、投票、抽奖、表单等功能。

## 技术栈

- ⚛️ **Framework** - Next.js 16 (App Router)
- 📝 **Language** - TypeScript
- 🎨 **Styling** - Tailwind CSS v4
- 🧩 **Components** - Shadcn-ui
- ✅ **Schema Validations** - Zod
- 🗂️ **State Management** - Zustand

## 功能模块

### 📝 签到 (已完成)
- 独立创建签到活动，获得唯一短码
- 大屏展示，二维码位置可配置（9宫格任意位置）
- 手机扫码签到，支持收集姓名、部门等信息
- 签到后可配置：显示成功消息、跳转指定URL、无操作
- 实时弹幕欢迎、统计展示
- 3位验证码防止恶意修改

### 📊 投票 (已完成)
- 定制化投票主题
- 单选/多选支持
- 实时结果展示（SSE推送）
- 多种图表可视化（饼图、柱状图、进度条、对决模式）
- 允许修改投票、匿名投票等规则配置
- 大屏二维码位置可配置

### 🎁 抽奖 (已完成)
- 多种抽奖模式（转盘、老虎机）
- 精彩动画效果
- 自定义奖品和概率
- 每人抽奖次数限制
- 实时中奖推送和名单展示
- 大屏中奖弹幕效果

### 🎁 抽奖特性 (原开发中)
- 多种抽奖模式（转盘、滚动、红包雨等）
- 奖品设置与概率配置
- 精彩的抽奖动画

### 📋 表单 (已完成)
- 定制化表单字段（文本、数字、手机号、邮箱、单选、多选、下拉、日期、时间、评分等）
- 提交前预览确认
- 提交后成功反馈、跳转支持
- 每人限提交一次、需要手机号等规则
- SSE 实时推送新提交
- CSV 数据导出

## 页面结构

### 公开页面（参与者）
| 功能 | 手机端入口 | 大屏展示 | 状态 |
|------|-----------|----------|------|
| 签到 | `/c/{code}` | `/c/{code}/display` | ✅ 已完成 |
| 投票 | `/v/{code}` | `/v/{code}/display` | ✅ 已完成 |
| 表单 | `/f/{code}` | `/f/{code}/display` | ✅ 已完成 |
| 抽奖 | `/l/{code}` | `/l/{code}/display` | ✅ 已完成 |

### 管理后台
| 页面 | 地址 | 说明 |
|------|------|------|
| 首页 | `/` | 产品介绍页 |
| 控制台 | `/dashboard` | 管理后台首页 |
| 签到管理 | `/checkins` | 签到列表 |
| 创建签到 | `/checkins/new` | 创建新签到 |
| 签到详情 | `/checkins/{id}` | 查看签到数据 |
| 投票管理 | `/votes` | 投票列表 |
| 创建投票 | `/votes/new` | 创建新投票 |
| 投票详情 | `/votes/{id}` | 查看投票数据 |
| 表单管理 | `/forms` | 表单列表 |
| 创建表单 | `/forms/new` | 创建新表单 |
| 表单详情 | `/forms/{id}` | 查看表单数据 |
| 抽奖管理 | `/lotteries` | 抽奖列表 |
| 创建抽奖 | `/lotteries/new` | 创建新抽奖 |
| 抽奖详情 | `/lotteries/{id}` | 查看抽奖数据 |

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

访问 http://localhost:3000

### 生产构建

```bash
pnpm build
pnpm start
```

## 使用流程

### 管理员操作

1. 访问控制台 `/dashboard`
2. 点击「创建签到」
3. 配置签到标题、收集信息、签到后行为等
4. 创建成功后获得签到短码
5. 打开大屏展示 `/c/{code}/display`
6. 分享手机端链接或二维码给参与者

### 参与者操作

1. 扫描二维码或访问 `/c/{code}`
2. 填写手机号、姓名等信息
3. 点击「确认签到」
4. 签到成功，大屏实时显示欢迎弹幕

## 大屏二维码位置

二维码可配置在大屏的9个位置：

```
┌─────────────────────────────┐
│  左上     中上     右上      │
│                             │
│  左中     中心     右中      │
│                             │
│  左下     中下     右下      │
└─────────────────────────────┘
```

也可以选择「隐藏」，二维码不显示在大屏上。

## 项目结构

```
src/
├── app/
│   ├── (admin)/              # 管理后台
│   │   ├── dashboard/        # 控制台
│   │   ├── checkins/         # 签到管理
│   │   │   ├── new/          # 创建签到
│   │   │   └── [id]/         # 签到详情
│   │   └── layout.tsx        # 后台布局
│   ├── (public)/             # 公开页面
│   │   └── c/[code]/         # 签到
│   │       ├── page.tsx      # 手机端
│   │       └── display/      # 大屏
│   ├── api/
│   │   └── checkins/         # 签到 API
│   ├── page.tsx              # 首页
│   └── layout.tsx            # 根布局
├── components/
│   ├── ui/                   # 基础组件
│   └── display/              # 大屏组件
│       ├── qr-code-widget.tsx
│       ├── danmaku.tsx
│       ├── stats-widget.tsx
│       ├── vote-charts.tsx   # 投票图表组件
│       ├── lottery-wheel.tsx # 抽奖转盘组件
│       └── lottery-slot.tsx  # 老虎机组件
├── lib/
│   ├── stores/               # 数据存储
│   │   ├── checkin-store.ts
│   │   ├── vote-store.ts
│   │   ├── form-store.ts
│   │   └── lottery-store.ts
│   └── utils/
│       └── code-generator.ts
└── types/
    ├── common.ts             # 通用类型
    ├── checkin.ts            # 签到类型
    ├── vote.ts               # 投票类型
    ├── form.ts               # 表单类型
    └── lottery.ts            # 抽奖类型
```

## API 接口

### 签到相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/checkins` | 获取签到列表 |
| POST | `/api/checkins` | 创建签到 |
| GET | `/api/checkins/{id}` | 获取签到详情 |
| PATCH | `/api/checkins/{id}` | 更新签到 |
| DELETE | `/api/checkins/{id}` | 删除签到 |
| GET | `/api/checkins/{id}/qrcode` | 获取二维码 |
| GET | `/api/checkins/{id}/records` | 获取签到记录 |
| POST | `/api/checkins/{id}/confirm` | 执行签到 |
| GET | `/api/checkins/{id}/stream` | SSE 实时推送 |
| GET | `/api/checkins/code/{code}` | 根据短码获取签到 |

### 投票相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/votes` | 获取投票列表 |
| POST | `/api/votes` | 创建投票 |
| GET | `/api/votes/{id}` | 获取投票详情 |
| PATCH | `/api/votes/{id}` | 更新投票 |
| DELETE | `/api/votes/{id}` | 删除投票 |
| POST | `/api/votes/{id}?action=reset` | 重置投票结果 |
| GET | `/api/votes/{id}/qrcode` | 获取二维码 |
| POST | `/api/votes/{id}/submit` | 提交投票 |
| GET | `/api/votes/{id}/submit?phone=xxx` | 检查是否已投票 |
| GET | `/api/votes/{id}/stream` | SSE 实时推送 |
| GET | `/api/votes/code/{code}` | 根据短码获取投票 |

### 表单相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/forms` | 获取表单列表 |
| POST | `/api/forms` | 创建表单 |
| GET | `/api/forms/{id}` | 获取表单详情 |
| PATCH | `/api/forms/{id}` | 更新表单 |
| DELETE | `/api/forms/{id}` | 删除表单 |
| GET | `/api/forms/{id}/qrcode` | 获取二维码 |
| GET | `/api/forms/{id}/responses` | 获取提交列表 |
| GET | `/api/forms/{id}/responses?format=csv` | 导出 CSV |
| POST | `/api/forms/{id}/submit` | 提交表单 |
| GET | `/api/forms/{id}/submit?phone=xxx` | 检查是否已提交 |
| GET | `/api/forms/{id}/stream` | SSE 实时推送 |
| GET | `/api/forms/code/{code}` | 根据短码获取表单 |

### 抽奖相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/lotteries` | 获取抽奖列表 |
| POST | `/api/lotteries` | 创建抽奖 |
| GET | `/api/lotteries/{id}` | 获取抽奖详情 |
| PATCH | `/api/lotteries/{id}` | 更新抽奖 |
| DELETE | `/api/lotteries/{id}` | 删除抽奖 |
| POST | `/api/lotteries/{id}?action=reset` | 重置抽奖 |
| GET | `/api/lotteries/{id}/qrcode` | 获取二维码 |
| POST | `/api/lotteries/{id}/draw` | 执行抽奖 |
| GET | `/api/lotteries/{id}/draw?phone=xxx` | 检查抽奖次数 |
| GET | `/api/lotteries/{id}/records` | 获取中奖记录 |
| GET | `/api/lotteries/{id}/stream` | SSE 实时推送 |
| GET | `/api/lotteries/code/{code}` | 根据短码获取抽奖 |

## 环境变量

```env
# 应用基础URL（用于生成二维码链接）
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 生产环境注意事项

1. **数据存储**: 当前使用内存存储，生产环境建议使用 Redis 或数据库
2. **域名配置**: 需要配置正确的 `NEXT_PUBLIC_BASE_URL`
3. **HTTPS**: 生产环境必须使用 HTTPS
4. **跨域配置**: 在 `next.config.ts` 中配置 `allowedDevOrigins`

## License

MIT
