/**
 * 运营台 /ops/console 准入邮箱。
 * 优先 OPS_SUPER_USER_EMAIL，否则与 ADMIN_EMAIL 一致，最后回退占位符。
 */
export const OPS_SUPER_USER_EMAIL =
  process.env.OPS_SUPER_USER_EMAIL?.trim() ||
  process.env.ADMIN_EMAIL?.trim() ||
  "admin@example.com";

/** 视为「在线」的最后活跃时间窗口（分钟） */
export const OPS_ONLINE_WITHIN_MINUTES = 5;
