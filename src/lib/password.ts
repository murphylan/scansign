import bcrypt from "bcryptjs";

/** bcrypt 加盐轮数 */
const SALT_ROUNDS = 10;

/** 明文密码 → bcrypt 哈希 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** 校验明文密码是否匹配哈希 */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
