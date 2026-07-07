import { randomInt } from "crypto";
import { createTencentSmsProvider } from "./tencent";
import { createUniSmsProvider } from "./unisms";
import { createAliyunSmsProvider } from "./aliyun";

/**
 * 短信服务商接口。
 * 有 Mock（打印到控制台）、腾讯云、合一、阿里云短信认证等实现，按环境变量自动选择，调用方无需改动。
 *
 * 两类服务商：
 * - 自管式（默认，managed 未设/为 false）：验证码由本应用生成、落库、校验，服务商只负责下发（腾讯云 / 合一 / Mock）。
 * - 托管式（managed=true）：验证码由服务商生成、下发并校验，本应用不落库（阿里云短信认证）。此时必须实现 verifyCode。
 */
export interface SmsProvider {
  /** 发送验证码短信。自管式传入本应用生成的 code；托管式忽略 code，由服务商生成 */
  sendCode(phone: string, code: string): Promise<void>;
  /** 是否托管式：验证码生命周期（生成/校验）由服务商负责 */
  readonly managed?: boolean;
  /** 托管式校验（managed=true 时必须实现）：由服务商校验验证码是否正确 */
  verifyCode?(phone: string, code: string): Promise<boolean>;
}

/** Mock 实现：不发真实短信，验证码打印到服务端控制台，便于本地开发调试 */
const mockSmsProvider: SmsProvider = {
  async sendCode(phone, code) {
    console.log(`\n[SMS:mock] 向 ${phone} 发送验证码：${code}（5 分钟内有效）\n`);
  },
};

/**
 * 按 SMS_PROVIDER 显式选择服务商：aliyun（阿里云短信认证）/ unisms（合一短信）/ tencent（腾讯云）/ 其它=Mock。
 * 用显式开关而非「检测到密钥就启用」，避免占位/半配置状态误发真实短信。
 * 初始化失败（配置不全等）会回落 Mock 并打日志。
 */
function resolveSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER;
  try {
    if (provider === "aliyun") return createAliyunSmsProvider();
    if (provider === "unisms") return createUniSmsProvider();
    if (provider === "tencent") return createTencentSmsProvider();
  } catch (error) {
    console.error(`[SMS] ${provider} 短信初始化失败，回落到 Mock：`, error);
    return mockSmsProvider;
  }
  return mockSmsProvider;
}

/** 当前启用的短信服务商 */
export const smsProvider: SmsProvider = resolveSmsProvider();

/** 生成 6 位数字验证码 */
export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** 验证码有效期（毫秒）：5 分钟 */
export const CODE_TTL_MS = 5 * 60 * 1000;

/** 同一手机号两次发送的最小间隔（毫秒）：60 秒 */
export const CODE_RESEND_INTERVAL_MS = 60 * 1000;
