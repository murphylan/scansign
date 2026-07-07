import * as TencentCloudSms from "tencentcloud-sdk-nodejs-sms";
import type { SmsProvider } from "./index";

const SmsClient = TencentCloudSms.sms.v20210111.Client;

/**
 * 腾讯云短信 provider（云 API 3.0）。
 * 依赖 TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY / TENCENT_SMS_SDK_APP_ID /
 * TENCENT_SMS_SIGN_NAME / TENCENT_SMS_TEMPLATE_ID（模板含 {1} 验证码占位）/ TENCENT_SMS_REGION(可选)
 */
export function createTencentSmsProvider(): SmsProvider {
  const secretId = process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;
  const sdkAppId = process.env.TENCENT_SMS_SDK_APP_ID;
  const signName = process.env.TENCENT_SMS_SIGN_NAME;
  const templateId = process.env.TENCENT_SMS_TEMPLATE_ID;
  const region = process.env.TENCENT_SMS_REGION || "ap-guangzhou";

  if (!secretId || !secretKey || !sdkAppId || !signName || !templateId) {
    throw new Error(
      "腾讯云短信配置不完整，请检查 TENCENTCLOUD_* / TENCENT_SMS_* 环境变量"
    );
  }

  const client = new SmsClient({
    credential: { secretId, secretKey },
    region,
    profile: { httpProfile: { endpoint: "sms.tencentcloudapi.com" } },
  });

  return {
    async sendCode(phone, code) {
      const res = await client.SendSms({
        PhoneNumberSet: [`+86${phone}`],
        SmsSdkAppId: sdkAppId,
        SignName: signName,
        TemplateId: templateId,
        TemplateParamSet: [code],
      });
      const status = res.SendStatusSet?.[0];
      if (!status || status.Code !== "Ok") {
        throw new Error(
          `腾讯云短信发送失败：${status?.Code ?? "未知"} ${status?.Message ?? ""}`
        );
      }
    },
  };
}
