"use client";

// 1. React
import { useCallback, useState, useTransition } from "react";

// 2. Next.js
import { useRouter } from "next/navigation";

// 3. Third-party
import { toast } from "sonner";

// 4. Server Actions
import {
  loginAction,
  registerAction,
  logoutAction,
  changePasswordAction,
  changeNicknameAction,
} from "@/server/actions/authAction";

// 5. Types
import type {
  LoginFormData,
  RegisterFormData,
  ChangePasswordFormData,
  ChangeNicknameFormData,
} from "@/types/user-types";

export function useAuth() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (data: LoginFormData) => {
      setError(null);

      startTransition(async () => {
        const res = await loginAction(data);

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

  const register = useCallback(
    async (data: RegisterFormData) => {
      setError(null);

      startTransition(async () => {
        const res = await registerAction(data);

        if (res.success) {
          toast.success("注册成功");
          router.push("/dashboard");
          router.refresh();
        } else {
          setError(res.error || "注册失败");
          toast.error(res.error || "注册失败");
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

  const changePassword = useCallback(
    async (data: ChangePasswordFormData) => {
      setError(null);

      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await changePasswordAction(data);

          if (res.success) {
            toast.success("密码修改成功");
            resolve(true);
          } else {
            setError(res.error || "修改密码失败");
            toast.error(res.error || "修改密码失败");
            resolve(false);
          }
        });
      });
    },
    []
  );

  const changeNickname = useCallback(
    async (data: ChangeNicknameFormData) => {
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
    },
    []
  );

  return {
    login,
    register,
    logout,
    changePassword,
    changeNickname,
    isPending,
    error,
    setError,
  };
}

