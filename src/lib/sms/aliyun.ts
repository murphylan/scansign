import Dypnsapi, {
  SendSmsVerifyCodeRequest,
  CheckSmsVerifyCodeRequest,
} from "@alicloud/dypnsapi20170525";
import { Config } from "@alicloud/openapi-client";
import type { SmsProvider } from "./index";

/**
 * 阿里云「号码认证服务 · 短信认证」provider（Dypnsapi）。
 * 个人实名即可开通，无需企业营业执照、无需自行申请签名/模板——用控制台预置的系统签名与验证码模板即可。
 *
 * 与腾讯云/合一不同：验证码由阿里云生成、下发并校验（托管式，managed=true）。
 * 因此本 provider 同时实现 sendCode（发送）和 verifyCode（校验），
 * 调用方（lib/verification.ts）不再本地生成或落库验证码。
 */
export function createAliyunSmsProvider(): SmsProvider {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;
  const schemeName = process.env.ALIYUN_SMS_SCHEME_NAME;
  const templateParam =
    process.env.ALIYUN_SMS_TEMPLATE_PARAM || '{"code":"##code##","min":"5"}';
  const endpoint = process.env.ALIYUN_DYPNSAPI_ENDPOINT || "dypnsapi.aliyuncs.com";

  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    throw new Error(
      "阿里云短信认证配置不完整：需 ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET / ALIYUN_SMS_SIGN_NAME / ALIYUN_SMS_TEMPLATE_CODE"
    );
  }

  const config = new Config({ accessKeyId, accessKeySecret });
  config.endpoint = endpoint;
  const client = new Dypnsapi(config);

  return {
    managed: true,

    // 验证码由阿里云生成，入参 code 忽略。有效期 5 分钟、6 位纯数字、60 秒发送间隔。
    async sendCode(phone) {
      const req = new SendSmsVerifyCodeRequest({
        phoneNumber: phone,
        signName,
        templateCode,
        templateParam,
        ...(schemeName ? { schemeName } : {}),
        codeType: 1,
        codeLength: 6,
        validTime: 300,
        interval: 60,
      });
      const res = await client.sendSmsVerifyCode(req);
      const body = res.body;
      if (body?.code !== "OK") {
        throw new Error(
          `阿里云短信发送失败：${body?.code ?? "未知"} ${body?.message ?? ""}`
        );
      }
    },

    async verifyCode(phone, code) {
      const req = new CheckSmsVerifyCodeRequest({
        phoneNumber: phone,
        verifyCode: code,
        ...(schemeName ? { schemeName } : {}),
      });
      const res = await client.checkSmsVerifyCode(req);
      return (
        res.body?.code === "OK" && res.body?.model?.verifyResult === "PASS"
      );
    },
  };
}
