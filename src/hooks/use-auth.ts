"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  sendSmsCodeAction,
  loginWithCodeAction,
  logoutAction,
  changeNicknameAction,
} from "@/server/actions/authAction";
import type {
  LoginWithCodeFormData,
  ChangeNicknameFormData,
} from "@/types/user-types";

export function useAuth() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /** 发送短信验证码。返回是否成功。 */
  const sendCode = useCallback(async (phone: string) => {
    setError(null);
    const res = await sendSmsCodeAction({ phone });
    if (res.success) {
      toast.success("验证码已发送");
      return true;
    }
    setError(res.error || "发送验证码失败");
    toast.error(res.error || "发送验证码失败");
    return false;
  }, []);

  /** 手机号+验证码登录（登录即注册） */
  const loginWithCode = useCallback(
    async (data: LoginWithCodeFormData) => {
      setError(null);
      startTransition(async () => {
        const res = await loginWithCodeAction(data);
        if (res.success) {
          toast.success("登录成功");
          router.push("/dashboard");
          router.refresh();
        } else {
          setError(res.error || "登录失败");
          toast.error(res.error || "登录失败");
        }
      });
    },
    [router]
  );

  const logout = useCallback(async () => {
    startTransition(async () => {
      const res = await logoutAction();
      if (res.success) {
        toast.success("已退出登录");
        router.push("/login");
        router.refresh();
      } else {
        toast.error(res.error || "退出登录失败");
      }
    });
  }, [router]);

  const changeNickname = useCallback(async (data: ChangeNicknameFormData) => {
    setError(null);
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const res = await changeNicknameAction(data);
        if (res.success) {
          toast.success("昵称修改成功");
          resolve(true);
        } else {
          setError(res.error || "修改昵称失败");
          toast.error(res.error || "修改昵称失败");
          resolve(false);
        }
      });
    });
  }, []);

  return {
    sendCode,
    loginWithCode,
    logout,
    changeNickname,
    isPending,
    error,
    setError,
  };
}
