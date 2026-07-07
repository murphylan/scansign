/**
 * 运营台 /ops/console 准入手机号。
 * 优先 OPS_SUPER_USER_PHONE，否则与 ADMIN_PHONE 一致，最后回退占位符。
 */
export const OPS_SUPER_USER_PHONE =
  process.env.OPS_SUPER_USER_PHONE?.trim() ||
  process.env.ADMIN_PHONE?.trim() ||
  "___no_ops_user___";

/** 视为「在线」的最后活跃时间窗口（分钟） */
export const OPS_ONLINE_WITHIN_MINUTES = 5;
