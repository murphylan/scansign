"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  sendSmsCodeAction,
  loginWithCodeAction,
  loginWithPasswordAction,
  setPasswordAction,
  logoutAction,
  changeNicknameAction,
} from "@/server/actions/authAction";
import type {
  LoginWithCodeFormData,
  LoginWithPasswordFormData,
  SetPasswordFormData,
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

  /** 手机号+密码登录（已注册用户） */
  const loginWithPassword = useCallback(
    async (data: LoginWithPasswordFormData) => {
      setError(null);
      startTransition(async () => {
        const res = await loginWithPasswordAction(data);
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

  /** 设置/修改密码（登录态下）。返回是否成功。 */
  const setPassword = useCallback(async (data: SetPasswordFormData) => {
    setError(null);
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const res = await setPasswordAction(data);
        if (res.success) {
          toast.success("密码设置成功");
          resolve(true);
        } else {
          setError(res.error || "设置密码失败");
          toast.error(res.error || "设置密码失败");
          resolve(false);
        }
      });
    });
  }, []);

  return {
    sendCode,
    loginWithCode,
    loginWithPassword,
    logout,
    changeNickname,
    setPassword,
    isPending,
    error,
    setError,
  };
}
