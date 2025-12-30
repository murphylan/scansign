/**
 * 短码生成器
 * 生成易读的6位短码，用于URL访问
 */

// 使用易读字符集（排除容易混淆的字符如0,O,1,I,l等）
const CHARSET = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * 生成随机短码
 * @param length 短码长度，默认6位
 * @returns 随机短码
 */
export function generateCode(length: number = 6): string {
  let code = '';
  const charsetLength = CHARSET.length;
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charsetLength);
    code += CHARSET[randomIndex];
  }
  
  return code;
}

/**
 * 生成唯一短码（带检查回调）
 * @param checkExists 检查短码是否存在的回调函数
 * @param maxAttempts 最大尝试次数
 * @returns 唯一短码
 */
export async function generateUniqueCode(
  checkExists: (code: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateCode();
    const exists = await checkExists(code);
    if (!exists) {
      return code;
    }
  }
  
  // 如果多次尝试都失败，增加长度
  const longerCode = generateCode(8);
  return longerCode;
}

/**
 * 验证短码格式
 * @param code 短码
 * @returns 是否有效
 */
export function isValidCode(code: string): boolean {
  if (!code || code.length < 4 || code.length > 10) {
    return false;
  }
  
  const validPattern = /^[a-z0-9]+$/;
  return validPattern.test(code);
}

/**
 * 生成验证码（3位数字）
 * @returns 3位数字验证码
 */
export function generateVerifyCode(): string {
  return String(Math.floor(100 + Math.random() * 900));
}

/**
 * 生成UUID
 * 支持非安全上下文（HTTP）和旧版浏览器
 */
export function generateId(): string {
  // 优先使用原生 crypto.randomUUID（需要安全上下文）
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // 降级方案：手动生成 UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

