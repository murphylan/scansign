"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useLoginStore } from "@/store/login-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, RefreshCw, CheckCircle2, Clock, Loader2 } from "lucide-react";
import type { ApiResponse, QRCodeResponse, StatusResponse } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { session, isLoading, error, setSession, updateStatus, setLoading, setError, setPollingId, reset } = useLoginStore();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const generateQRCode = useCallback(async () => {
    reset();
    setLoading(true);
    
    try {
      const response = await fetch("/api/qrcode/generate", {
        method: "POST",
      });
      const data: ApiResponse<QRCodeResponse> = await response.json();
      
      if (data.success && data.data) {
        setSession({
          token: data.data.token,
          status: "pending",
          createdAt: Date.now(),
          expiresAt: data.data.expiresAt,
        });
        setQrCodeUrl(data.data.qrCodeUrl);
        setTimeLeft(Math.floor((data.data.expiresAt - Date.now()) / 1000));
      } else {
        setError(data.error || "生成二维码失败");
      }
    } catch (err) {
      setError("网络错误，请重试");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [reset, setLoading, setSession, setError]);

  // 轮询检查状态
  useEffect(() => {
    if (!session?.token || session.status === "confirmed" || session.status === "expired") {
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/qrcode/status/${session.token}`);
        const data: ApiResponse<StatusResponse> = await response.json();
        
        if (data.success && data.data) {
          updateStatus(data.data.status, data.data.userInfo);
          
          if (data.data.status === "confirmed" && data.data.userInfo) {
            // 登录成功，跳转到会议首页
            router.push("/home");
          }
        }
      } catch (err) {
        console.error("Poll status error:", err);
      }
    };

    const id = setInterval(pollStatus, 2000);
    setPollingId(id);

    return () => {
      clearInterval(id);
    };
  }, [session?.token, session?.status, updateStatus, setPollingId, router]);

  // 倒计时
  useEffect(() => {
    if (!session?.expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0 && session.status === "pending") {
        updateStatus("expired");
      }
    };

    updateTimer();
    const id = setInterval(updateTimer, 1000);
    
    return () => clearInterval(id);
  }, [session?.expiresAt, session?.status, updateStatus]);

  // 初始化生成二维码
  useEffect(() => {
    generateQRCode();
  }, [generateQRCode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      
      {/* 网格背景 */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <Card className="w-full max-w-md relative animate-fade-in-up">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg animate-float">
            <Smartphone className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            扫码登录
          </CardTitle>
          <CardDescription className="text-base">
            使用微信扫描下方二维码完成登录
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 二维码容器 */}
          <div className="relative mx-auto w-72 h-72 rounded-2xl bg-white p-4 shadow-inner">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive p-4">
                <p className="text-center mb-4">{error}</p>
                <Button onClick={generateQRCode} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新生成
                </Button>
              </div>
            ) : session?.status === "expired" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl">
                <Clock className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">二维码已过期</p>
                <Button onClick={generateQRCode} size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新二维码
                </Button>
              </div>
            ) : session?.status === "confirmed" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl">
                <CheckCircle2 className="w-16 h-16 text-primary mb-3" />
                <p className="text-primary font-medium">登录成功</p>
              </div>
            ) : qrCodeUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="扫码登录二维码"
                  className="w-full h-full object-contain"
                />
                {/* 扫描动画 */}
                <div className="absolute inset-4 qr-scanner overflow-hidden pointer-events-none rounded-lg" />
              </>
            ) : null}
          </div>

          {/* 状态信息 */}
          <div className="text-center space-y-2">
            {session?.status === "pending" && timeLeft > 0 && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>二维码有效期：{formatTime(timeLeft)}</span>
              </div>
            )}

          </div>

          {/* 刷新按钮 */}
          {session?.status === "pending" && (
            <Button
              onClick={generateQRCode}
              variant="ghost"
              className="w-full"
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新二维码
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

