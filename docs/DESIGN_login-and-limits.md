# 设计文档：手机号验证码登录 + 免费额度定位 + 参与去重限制

> 状态：**设计稿（未动代码）**，供后续改造参照。
> 关联：产品分析见 `main/docs/product/murphy-cloud/sign-analysis.md`（钩子 vs 生意 决策）。
> 参考实现：chess 项目（同级目录）已落地手机号验证码登录，本文多处可直接复用。

---

## 0. 最重要的前提：两个「手机号」别混

设计里出现两种手机号，诉求完全不同，改造时务必分开对待：

| | ① 登录侧：**创建者账号** | ② 参与侧：**投票/签到的人** |
|---|---|---|
| 是谁 | 办活动的人（HR/老师/婚庆/运营） | 扫码来参与的观众 |
| 是否登录 | **要**（手机号+验证码） | **不登录**，扫码即用 |
| 「免费次数/时段」针对 | ✅ 账号的免费额度 | ❌ |
| 「一天只能投一次」针对 | ❌ | ✅ 参与去重 |

- 第 1 章 = 登录侧改造（账号 + 免费额度）
- 第 2 章 = 参与侧改造（去重限制）

---

## 1. 登录侧：手机号验证码登录 + 免费额度

### 1.1 现状（scansign）

- 账号体系：`email`(唯一,必填) + `password`(bcrypt,必填)，见 `src/server/db/schema/users.ts`。
- 认证态：自实现 session（DB `sessions` 表 token + HttpOnly Cookie），核心函数 `createSession()` 在 `src/server/actions/authAction.ts`。
- 试用：注册送 3 天（`trialStartAt`/`trialDays`），到期墙，判定逻辑在 `src/lib/auth-utils.ts`。
- 管理员/运营台准入靠 email 匹配环境变量（`ADMIN_EMAIL` / `OPS_SUPER_USER_EMAIL`）。

### 1.2 可直接复用 chess 的资产

chess 的手机号登录逻辑干净、无框架耦合，可几乎原样搬运：

| chess 文件 | 作用 | 搬运方式 |
|---|---|---|
| `lib/sms/`（aliyun/tencent/unisms + 内嵌 mock） | 短信发送，`SMS_PROVIDER` 切换，默认 mock 控制台打印 | 复制到 `src/server/sms/` |
| `lib/verification.ts` | 验证码生成、5 分钟有效、60 秒重发冷却、`findOrCreateUser`（登录即注册） | 复制到 `src/server/verification.ts`，去掉阿里云"托管式"分支，仅保留自管式 |
| `verification_codes` 表 | `id / phone / code / expiresAt / consumed / createdAt`；发送前删同号旧码 | 加入 drizzle schema |
| 手机号正则 | `/^1[3-9]\d{9}$/` | 前后端各校验一次 |

**关键差异**：chess 用 next-auth(JWT)，scansign 是自实现 session。
**决策：不引入 next-auth。** 搬运验证码逻辑后，登录成功直接复用 scansign 现有 `createSession()`。这是最省事路线。

短信成本：阿里云/腾讯云短信约 ¥0.03/条，**无需任何微信资质**。先用 mock（零成本跑通全流程），上线前填 `SMS_PROVIDER` + 服务商密钥即可切真实短信。

### 1.3 账号改造要点（登录侧）

- `users` 表加 `phone`(唯一) 作登录主标识；`email`/`password` 改为可空（遗留）。
- 新增 server action：`sendSmsCodeAction(phone)`、`loginWithCodeAction(phone, code)`；删除/停用 `loginAction`/`registerAction`/`changePasswordAction`。
- **登录即注册**：首次验证码登录自动建号并起算免费额度，去掉独立注册页（`/register` 重定向到 `/login`）。
- 管理员/运营台准入改手机号：新增 `ADMIN_PHONE` / `OPS_SUPER_USER_PHONE`；改 `src/config/ops.ts` 及 `(admin)/layout`、`(ops)/layout`、`opsAction.requireOps` 的判断。
- 前端展示 email 处改 phone：`settings`、`me`、`sidebar`、`mobile-header`、`ops/console` 列表（运营看手机号联系收款，是正向收益）。

### 1.4 免费额度模型（"某些次数/某时段免费"）

把「3 天时间墙」换成「**免费额度制**」，额度挂在手机号账号上。三选一：

| 模型 | 规则 | 优点 | 缺点 | 适合 |
|------|------|------|------|------|
| 按次 | 每号免费创建 N 场（或每月 N 场） | 直观 | 低频用户永远用不完≈白送 | 想控成本 |
| **按规模（推荐做「钩子」）** | 永久免费不限场次，但每场人数 ≤ M（如 50）或功能受限 | 永远可回来用→引流最强；大活动自然付费 | 小活动永久免费 | 通用版做流量入口 |
| 按时段 | 注册后首 X 天全功能免费 | 制造紧迫 | 低频场景里 X 天可能一场没办 = 现状老问题 | 不推荐 |

> **推荐**：通用版走「**按规模免费**」——付费点从"时间到了"改为"规模不够用了"，同时根治"3 天太短、还没办活动就到期"。
> 技术上很轻：账号即手机号，额度是 user 表上一个上限字段，或按其名下活动数实时算。

---

## 2. 参与侧：一人一票 / 一天一票

### 2.1 现状（scansign）— 探查结论

- 投票记录 `VoteRecord`（`src/server/db/schema/votes.ts`）有 `phone`、`deviceFingerprint`、`voterIp` 列，但**默认不采集手机号**；`voterIp` 代码从不写入。
- 去重现状：主提交入口 `submitVoteAction`（`src/server/actions/publicAction.ts`，约 489–571 行）用**设备指纹去重**（存 localStorage，见 `src/lib/utils/fingerprint.ts`，**清缓存即可绕过**）；若提供 `phone` 再按手机号查一次。
- **无任何数据库唯一约束兜底**。
- **后门**：老路由 `POST /api/votes/[id]/submit`、`POST /api/checkins/[id]/records` 去重更弱甚至没有，可直接 POST 绕过。
- 手机号采集由 `config.requirePhone` 控制（voteAction 默认 false，但 `types/vote.ts` 的 `DEFAULT_VOTE_CONFIG.requirePhone=true`，两处不一致，需统一）。
- 签到 `doCheckinAction`（publicAction.ts 约 127–336 行）：设备限制默认开，手机号重复时"更新"而非拒绝。

### 2.2 防作弊设计（核心，已按"零成本优先"重构）

**不可能三角**：免费 + 严防作弊 + 匿名大规模，三者不可兼得。任何零成本方案，对手有动机+技术都能绕。所以先分清威胁等级、再决定花不花钱。

#### 威胁分级 → 方案分级

| 作弊等级 | 场景 | 方案 | 谁承担成本 |
|---|---|---|---|
| 弱：自己多投几票 | 班级/公司人气投票 | 免费栈（见下） | 平台零成本 |
| 中：脚本批量刷票 | 有小奖评选 | 免费栈 + 免费行为验证码 | 平台零成本 |
| 强：水军/买票/点击农场 | 有利益大评选 | 短信验证 / 微信 openid | **转嫁给办活动的客户** |

#### 成本的正确解法：谁需要严防，谁付费

不要由平台为每条短信垫付。改为：
- **免费休闲投票**：不提供强模式 → 平台零成本，免费栈防到"弱~中"级足够。
- **需严防的有奖评选**：把「短信验证 / 强防作弊」做成**付费开关**，短信费转嫁给该场活动的客户。要严防的人本就愿付费。
- 结论：**免费场景不花钱，花钱场景客户买单，平台永不垫付。**"短信太贵"问题消解。

#### 零成本免费防作弊栈（防君子+防脚本，非防专业刷票，诚实标注边界）

叠加多个免费信号，把作弊成本抬到远高于一场普通投票的价值：

1. **升级设备指纹**：当前是 localStorage（`src/lib/utils/fingerprint.ts`，清缓存即破）→ 换开源 FingerprintJS（canvas/WebGL/字体/音频综合），**存服务端**哈希比对。
2. **HttpOnly 签名 Cookie**：首次投票下发，比 localStorage 难清。
3. **IP 限速 + 异常检测**：启用 schema 里闲置的 `voterIp`；同 IP/网段每日限量、检测"几秒狂投同选项"突刺。NAT 会误伤 → 只做软限速不硬封。
4. **免费行为验证码**：Cloudflare Turnstile（完全免费）或腾讯验证码（免费额度）——专挡自动化脚本，拦"中级作弊"性价比最高。
5. **半实名 + 公示**：填姓名 + 手机号后 4 位并公开展示，社交压力。
6. **人工审计后台**（免费且强）：给创建者"可疑记录"面板（同指纹/同 IP/时间突刺高亮），可人工作废票。人在环里，对小规模评选极有效。
7. **结构性防作弊**：一人一天一票（而非一次性）、每选项限量、要求微信内打开（校验 `MicroMessenger` UA）、评委权重+大众票混合计分。

> 组合 1+2+3+4+6 = 零成本、防到"脚本+随手重复"的实用方案。**不是不可破，但抬高了作弊成本。**

#### 微信 openid（记录，暂不做）

行业里"免费又强"的匿名去重是微信公众号 OAuth 拿 `openid`（一微信号一唯一 id，天然一人一票，**不按次收费**）。但需**认证服务号（约 ¥300/年 + 主体资质）**，卡在"微信资质成本"上。定位：**固定年费、摊到每票≈0，有收入后的最优升级**，现在不做。

#### 三档识别依据（供 `identityBasis` 配置）

| 档 | 识别依据 | 强度 | 成本 |
|---|---|---|---|
| 弱 | 免费栈（指纹+Cookie+IP+验证码） | 弱~中 | 平台 0 |
| 中 | 免费栈 + 填手机号（不验证） | 中 | 平台 0 |
| 强 | 手机号+短信验证 / 微信 openid | 高 | **客户付费**（付费开关，默认关）|

### 2.3 新增活动配置项

落到已有 config jsonb，无需大改表：

```
limitType:      'unlimited' | 'once_total' | 'once_per_day' | 'n_per_day'
identityBasis:  'free' | 'phone' | 'strong'   // free=免费栈; phone=+填号; strong=短信/openid(付费)
maxPerDay?:     number                        // n_per_day 时用
requireCaptcha: boolean                       // 是否启用免费行为验证码(默认建议 true)
antiCheat: {                                  // 免费栈开关（默认全开，零成本）
  fingerprint: boolean, cookie: boolean, ipRateLimit: boolean, wechatUaOnly: boolean
}
```

- 一人一票（`once_total`）：按 `identityBasis` 查重，已投则拒。
- 一天一票（`once_per_day`）：查重条件加 `AND votedAt 落在今天`。

### 2.4 数据库兜底约束（防并发写穿）

代码查重之外补唯一索引（现在完全没有）：
- `once_total` + phone → `UNIQUE(voteId, phone)`
- `once_per_day` + phone → 对 `(voteId, phone, 投票日)` 建唯一索引（加一个"投票日"列或表达式/生成列索引）
- 签到同理，按 `(checkinId, phone[, 日])`。

### 2.5 必须堵掉的后门

`POST /api/votes/[id]/submit` 与 `POST /api/checkins/[id]/records` 需补齐与主入口一致的校验，或直接废弃——否则任何限制都能被直接 POST 绕过。

---

## 3. 改造清单（供日后执行，按阶段）

**阶段一 · 登录改造**
1. schema：`users` 加 `phone`；新增 `verification_codes` 表；`email`/`password` 改可空。
2. 搬运 `lib/sms/` + `lib/verification.ts`（去托管式分支）。
3. `authAction`：加 `sendSmsCodeAction` / `loginWithCodeAction`，复用 `createSession()`；删旧邮箱登录。
4. 准入改手机号（`ADMIN_PHONE` / `OPS_SUPER_USER_PHONE`）+ 各展示点 email→phone。
5. 前端：登录页改手机号+验证码（60 秒倒计时），`/register` 重定向；`.env.example` 补 `SMS_PROVIDER` 等。
6. 依赖：按选用服务商 `npm i @alicloud/dypnsapi20170525 @alicloud/openapi-client @alicloud/tea-util`（或腾讯云 SDK）。

**阶段二 · 免费额度定位**
7. user 表加额度/上限字段（或按活动数实时算）；改 `auth-utils.ts` 的可用性判定，从"时间墙"改"额度/规模墙"。
8. 到量提示页 + `/ops/console` 开通逻辑对齐。

**阶段三 · 参与去重**
9. vote/checkin config 加 `limitType` / `identityBasis` / `maxPerDay`，创建页暴露开关。
10. `submitVoteAction` / `doCheckinAction` 按配置查重（含"当天"逻辑）。
11. 加数据库唯一索引兜底。
12. 堵老 API 后门。
13. 免费防作弊栈：升级设备指纹（FingerprintJS 开源，服务端存储）、下发 HttpOnly 签名 Cookie、启用 `voterIp` 做 IP 限速+异常检测、接入免费行为验证码（Cloudflare Turnstile / 腾讯验证码）、创建者"可疑记录"审计后台。
14. （强档）复用验证码逻辑做参与者短信验证，仅在付费开关下可用；微信 openid 作为有收入后的升级项，暂不做。

---

## 4. 待决策项（改造前需拍板）

1. **免费模型**：走推荐的「按规模免费」（永久免费+人数上限），还是「按次」（每号免费 N 场）？
2. **参与去重默认强度**：默认「免费栈（指纹+Cookie+IP+免费行为验证码+人工审计）」，「强档·短信/openid」做成付费开关、成本转嫁客户——是否认可？（见 §2.2 重构后的防作弊设计）
3. **登录改造范围**：确认「复用 chess 逻辑 + 复用 Sign 现有 session、不引入 next-auth」这条路线？

---

## 附：成本测算速记

- 创建者登录短信：低频，一个创建者一次登录 1 条，成本可忽略。
- 参与者防作弊：免费栈（指纹+Cookie+IP+免费验证码+审计）平台零成本，作默认；短信验证（强档）≈ 人数 × ¥0.03，**做成付费开关、成本转嫁办活动的客户，平台不垫付**。
- 微信 openid 防作弊：认证服务号约 ¥300/年（固定，非按次），摊到每票≈0，定位为有收入后的最优升级。
- 短信服务商资质：阿里云/腾讯云短信签名+模板需主体（个体户即可），**但 mock 模式零成本先跑通，上线前再补**。
