"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  MobilePage,
  NavBar,
  LoadingScreen,
  ResultScreen,
} from "@/components/mobile";
import { userInfoSchema } from "@/types";
import type { Department, RegisteredUser } from "@/types";
import { User, Phone, CheckCircle2, XCircle, Loader2, ShieldCheck, Building2, UserPlus, LogIn, KeyRound } from "lucide-react";

import {
  getDepartmentsAction,
  checkUserPhoneAction,
  checkUsernameAction,
  confirmLoginAction,
} from "@/server/actions/userAction";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // 表单状态
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [errors, setErrors] = useState<{ username?: string; phone?: string; departmentId?: string; verifyCode?: string }>({});

  // 页面状态
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // 用户状态
  const [existingUser, setExistingUser] = useState<RegisteredUser | null>(null);

  // 新用户签到成功后返回的验证码
  const [returnedVerifyCode, setReturnedVerifyCode] = useState<string | null>(null);

  // 部门列表
  const [departments, setDepartments] = useState<Department[]>([]);

  // 加载部门列表
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await getDepartmentsAction();
        if (res.success && res.data) {
          setDepartments(res.data);
        }
      } catch (err) {
        console.error("Load departments error:", err);
      }
    };
    loadDepartments();
  }, []);

  // 检查手机号是否已注册
  const checkPhone = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber || !/^1[3-9]\d{9}$/.test(phoneNumber)) return;

    try {
      const res = await checkUserPhoneAction(phoneNumber);

      if (res.success && res.data?.exists && res.data.user) {
        setExistingUser(res.data.user);
        // 填充已有信息
        setUsername(res.data.user.username);
        setDepartmentId(res.data.user.departmentId);
      } else {
        setExistingUser(null);
      }
    } catch (err) {
      console.error("Check phone error:", err);
    }
  }, []);

  // 初始化
  useEffect(() => {
    if (!token) {
      setSubmitStatus("error");
      setErrorMessage("无效的登录链接");
    }
    setIsLoading(false);
  }, [token]);

  // 验证单个字段
  const validateField = (field: "username" | "phone" | "departmentId", value: string) => {
    const result = userInfoSchema.shape[field].safeParse(value);
    if (!result.success) {
      setErrors((prev) => ({ ...prev, [field]: result.error.errors[0].message }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // 手机号变化时检查
  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setVerifyCode(""); // 清空验证码
    if (/^1[3-9]\d{9}$/.test(value)) {
      checkPhone(value);
    } else {
      setExistingUser(null);
      setUsername("");
      setDepartmentId("");
    }
  };

  // 检查用户名重复
  const checkUsernameConflict = async (): Promise<boolean> => {
    if (!username || !departmentId) return false;

    try {
      const res = await checkUsernameAction(username, departmentId, existingUser?.id);
      return res.success && res.data?.duplicate === true;
    } catch {
      return false;
    }
  };

  // 提交表单（新用户注册或老用户更新）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 完整验证
    const validation = userInfoSchema.safeParse({ username, phone, departmentId });
    if (!validation.success) {
      const fieldErrors: { username?: string; phone?: string; departmentId?: string } = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as "username" | "phone" | "departmentId";
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // 老用户必须输入验证码
    if (existingUser && !verifyCode) {
      setErrors((prev) => ({ ...prev, verifyCode: "请输入验证码" }));
      return;
    }

    if (existingUser && !/^\d{3}$/.test(verifyCode)) {
      setErrors((prev) => ({ ...prev, verifyCode: "验证码为3位数字" }));
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setErrorMessage("");

    // 检查用户名重复
    const isDuplicate = await checkUsernameConflict();
    if (isDuplicate) {
      setErrors({ username: "该部门已存在同名用户" });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await confirmLoginAction({
        token: token!,
        username: validation.data.username,
        phone: validation.data.phone,
        departmentId: validation.data.departmentId,
        existingUserId: existingUser?.id,
        verifyCode: existingUser ? verifyCode : undefined,
      });

      if (res.success) {
        // 新用户签到成功，保存返回的验证码
        if (res.data?.verifyCode) {
          setReturnedVerifyCode(res.data.verifyCode);
        }
        setSubmitStatus("success");
      } else {
        setSubmitStatus("error");
        setErrorMessage(res.error || "操作失败");
      }
    } catch {
      setSubmitStatus("error");
      setErrorMessage("网络错误，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 加载中
  if (isLoading) {
    return <LoadingScreen />;
  }

  // 成功状态
  if (submitStatus === "success") {
    const isNewUser = !!returnedVerifyCode;

    return (
      <ResultScreen
        tone="success"
        icon={<CheckCircle2 />}
        title={
          <>
            <span className="text-primary">{username}</span> {isNewUser ? "签到成功" : "修改成功"}
          </>
        }
        description="您可以关闭此页面"
      >
        {returnedVerifyCode && (
          <div className="rounded-xl bg-cell p-5 shadow-sm">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <KeyRound className="h-4 w-4 text-accent" />
              <span className="text-sm">您的专属验证码</span>
            </div>
            <p className="mt-1 font-mono text-4xl font-bold tracking-widest text-primary">
              {returnedVerifyCode}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              请牢记此验证码，修改信息时需要验证
            </p>
          </div>
        )}
      </ResultScreen>
    );
  }

  // 错误状态（无效链接等）
  if (submitStatus === "error" && !token) {
    return (
      <ResultScreen
        tone="danger"
        icon={<XCircle />}
        title="链接无效"
        description={errorMessage}
      />
    );
  }

  // 判断是新用户还是老用户
  const isReturningUser = !!existingUser;

  return (
    <MobilePage>
      <NavBar title={isReturningUser ? "欢迎回来" : "用户签到"} />

      {/* 头部品牌 */}
      <div className="flex flex-col items-center px-6 pb-2 pt-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
          {isReturningUser ? (
            <LogIn className="h-8 w-8 text-white" />
          ) : (
            <UserPlus className="h-8 w-8 text-white" />
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {isReturningUser ? "您已签到，可确认或修改信息后登录" : "请输入您的信息完成签到"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-4 mt-2 space-y-5 rounded-xl bg-cell p-5 shadow-sm">
        {/* 手机号 */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            手机号码
            {isReturningUser && <span className="text-xs font-normal text-cyan-500">(已注册)</span>}
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="请输入手机号码"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={() => validateField("phone", phone)}
            className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
            disabled={isSubmitting}
          />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
        </div>

        {/* 用户名 */}
        <div className="space-y-2">
          <Label htmlFor="username" className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            用户名
          </Label>
          <Input
            id="username"
            type="text"
            placeholder="请输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => validateField("username", username)}
            className={errors.username ? "border-destructive focus-visible:ring-destructive" : ""}
            disabled={isSubmitting}
          />
          {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
        </div>

        {/* 部门选择 */}
        <div className="space-y-2">
          <Label htmlFor="department" className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            所属部门
          </Label>
          <Select
            id="department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            onBlur={() => validateField("departmentId", departmentId)}
            className={errors.departmentId ? "border-destructive focus-visible:ring-destructive" : ""}
            disabled={isSubmitting}
          >
            <option value="">请选择部门</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </Select>
          {errors.departmentId && <p className="text-sm text-destructive">{errors.departmentId}</p>}
        </div>

        {/* 老用户验证码输入 */}
        {isReturningUser && (
          <div className="space-y-2">
            <Label htmlFor="verifyCode" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent" />
              验证码
              <span className="text-xs font-normal text-accent">(首次签到时获得)</span>
            </Label>
            <Input
              id="verifyCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              placeholder="请输入3位验证码"
              value={verifyCode}
              onChange={(e) => {
                setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 3));
                setErrors((prev) => ({ ...prev, verifyCode: undefined }));
              }}
              className={`text-center text-xl tracking-widest ${errors.verifyCode ? "border-destructive focus-visible:ring-destructive" : ""}`}
              disabled={isSubmitting}
            />
            {errors.verifyCode && <p className="text-sm text-destructive">{errors.verifyCode}</p>}
            <p className="text-xs text-muted-foreground">如忘记验证码，请联系管理员获取</p>
          </div>
        )}

        {/* 错误提示 */}
        {submitStatus === "error" && errorMessage && (
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-center text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        {/* 提交按钮 */}
        <Button type="submit" className="h-12 w-full text-base font-medium" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              提交中...
            </>
          ) : isReturningUser ? (
            <>
              <LogIn className="h-5 w-5" />
              确认修改
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              确认签到
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {isReturningUser ? "输入验证码后方可修改信息" : "签到成功后将获得专属验证码，请妥善保管"}
        </p>
      </form>
    </MobilePage>
  );
}

export default function MobileConfirmPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ConfirmContent />
    </Suspense>
  );
}
