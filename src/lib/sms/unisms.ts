import UniSMS from "unisms";
import type { SmsProvider } from "./index";

/**
 * uni-sms（合一短信）provider。个人实名即可申请，无需营业执照。
 * 依赖 UNISMS_ACCESS_KEY_ID / UNISMS_ACCESS_KEY_SECRET(可选) / UNISMS_SIGNATURE / UNISMS_TEMPLATE_ID（模板变量 {code}）
 */
export function createUniSmsProvider(): SmsProvider {
  const accessKeyId = process.env.UNISMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.UNISMS_ACCESS_KEY_SECRET;
  const signature = process.env.UNISMS_SIGNATURE;
  const templateId = process.env.UNISMS_TEMPLATE_ID;

  if (!accessKeyId || !signature || !templateId) {
    throw new Error(
      "uni-sms 配置不完整：需 UNISMS_ACCESS_KEY_ID / UNISMS_SIGNATURE / UNISMS_TEMPLATE_ID"
    );
  }

  const client = new UniSMS(
    accessKeySecret ? { accessKeyId, accessKeySecret } : { accessKeyId }
  );

  return {
    async sendCode(phone, code) {
      const ret = await client.send({
        to: phone,
        signature,
        templateId,
        templateData: { code },
      });
      const message = ret.data?.messages?.[0];
      if (!message || message.status !== "sent") {
        throw new Error(`uni-sms 发送失败：${JSON.stringify(ret.data ?? ret)}`);
      }
    },
  };
}
