import { redirect } from "next/navigation";

// 手机号验证码登录即注册，注册页并入登录页。
export default function RegisterPage() {
  redirect("/login");
}
