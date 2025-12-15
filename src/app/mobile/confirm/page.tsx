"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { userInfoSchema } from "@/types";
import type { ApiResponse, Department, RegisteredUser, UserCheckResponse } from "@/types";
import { User, Phone, CheckCircle2, XCircle, Loader2, ShieldCheck, Building2, UserPlus, LogIn, KeyRound } from "lucide-react";

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
        const response = await fetch("/api/departments");
        const data: ApiResponse<Department[]> = await response.json();
        if (data.success && data.data) {
          setDepartments(data.data);
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
      const response = await fetch("/api/user/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data: ApiResponse<UserCheckResponse> = await response.json();
      
      if (data.success && data.data?.exists && data.data.user) {
        setExistingUser(data.data.user);
        // 填充已有信息
        setUsername(data.data.user.username);
        setDepartmentId(data.data.user.departmentId);
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
      const response = await fetch("/api/user/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          departmentId,
          excludeUserId: existingUser?.id,
        }),
      });
      const data: ApiResponse<{ duplicate: boolean }> = await response.json();
      return data.success && data.data?.duplicate === true;
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
      const response = await fetch("/api/qrcode/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          username: validation.data.username,
          phone: validation.data.phone,
          departmentId: validation.data.departmentId,
          existingUserId: existingUser?.id,
          verifyCode: existingUser ? verifyCode : undefined,
        }),
      });

      const data: ApiResponse<{ verifyCode?: string }> = await response.json();

      if (data.success) {
        // 新用户签到成功，保存返回的验证码
        if (data.data?.verifyCode) {
          setReturnedVerifyCode(data.data.verifyCode);
        }
        setSubmitStatus("success");
      } else {
        setSubmitStatus("error");
        setErrorMessage(data.error || "操作失败");
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
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </main>
    );
  }

  // 成功状态
  if (submitStatus === "success") {
    const isNewUser = !!returnedVerifyCode;
    
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Card className="w-full max-w-sm text-center animate-fade-in-up">
          <CardContent className="pt-12 pb-8 space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-glow">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              <span className="text-primary">{username}</span> {isNewUser ? "签到成功" : "修改成功"}
            </h2>
            
            {/* 新用户显示验证码 */}
            {returnedVerifyCode && (
              <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <KeyRound className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600">您的专属验证码</span>
                </div>
                <p className="text-4xl font-bold text-amber-500 tracking-widest">
                  {returnedVerifyCode}
                </p>
                <p className="text-xs text-amber-600/80 mt-2">
                  请牢记此验证码，修改信息时需要验证
                </p>
              </div>
            )}
            
            <p className="text-muted-foreground">
              您可以关闭此页面
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  // 错误状态（无效链接等）
  if (submitStatus === "error" && !token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-destructive/5 via-background to-background">
        <Card className="w-full max-w-sm text-center animate-fade-in-up">
          <CardContent className="pt-12 pb-8 space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">链接无效</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  // 判断是新用户还是老用户
  const isReturningUser = !!existingUser;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent" />
      
      <Card className="w-full max-w-sm relative animate-fade-in-up">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
            isReturningUser 
              ? "bg-gradient-to-br from-cyan-500 to-blue-500" 
              : "bg-gradient-to-br from-primary to-accent"
          }`}>
            {isReturningUser ? (
              <LogIn className="w-7 h-7 text-white" />
            ) : (
              <UserPlus className="w-7 h-7 text-primary-foreground" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {isReturningUser ? "欢迎回来" : "用户签到"}
          </CardTitle>
          <CardDescription>
            {isReturningUser 
              ? "您已签到，可确认或修改信息后登录" 
              : "请输入您的信息完成签到"
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 手机号 */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                手机号码
                {isReturningUser && (
                  <span className="text-xs text-cyan-500 font-normal">(已注册)</span>
                )}
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
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>

            {/* 用户名 */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
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
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>

            {/* 部门选择 */}
            <div className="space-y-2">
              <Label htmlFor="department" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
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
              {errors.departmentId && (
                <p className="text-sm text-destructive">{errors.departmentId}</p>
              )}
            </div>

            {/* 老用户验证码输入 */}
            {isReturningUser && (
              <div className="space-y-2">
                <Label htmlFor="verifyCode" className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  验证码
                  <span className="text-xs text-amber-500 font-normal">(首次签到时获得)</span>
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
                {errors.verifyCode && (
                  <p className="text-sm text-destructive">{errors.verifyCode}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  如忘记验证码，请联系管理员获取
                </p>
              </div>
            )}

            {/* 错误提示 */}
            {submitStatus === "error" && errorMessage && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive text-center">{errorMessage}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <Button
              type="submit"
              className={`w-full h-12 text-base font-medium ${
                isReturningUser 
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600" 
                  : ""
              }`}
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  提交中...
                </>
              ) : isReturningUser ? (
                <>
                  <LogIn className="w-5 h-5" />
                  确认修改
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  确认签到
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            {isReturningUser 
              ? "输入验证码后方可修改信息"
              : "签到成功后将获得专属验证码，请妥善保管"
            }
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function MobileConfirmPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
