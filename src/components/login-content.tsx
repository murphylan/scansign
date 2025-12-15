"use client";

import { useEffect, useCallback, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, RefreshCw, Clock, Loader2 } from "lucide-react";
import type { ApiResponse, QRCodeResponse } from "@/types";

export default function LoginContent() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const generateQRCode = useCallback(async () => {
    setIsLoading(true);
    setIsExpired(false);
    
    try {
      const response = await fetch("/api/qrcode/generate", {
        method: "POST",
      });
      const data: ApiResponse<QRCodeResponse> = await response.json();
      
      if (data.success && data.data) {
        setQrCodeUrl(data.data.qrCodeUrl);
        setExpiresAt(data.data.expiresAt);
        setTimeLeft(Math.floor((data.data.expiresAt - Date.now()) / 1000));
      }
    } catch (err) {
      console.error("Generate QR code error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化生成二维码
  useEffect(() => {
    generateQRCode();
  }, [generateQRCode]);

  // 倒计时
  useEffect(() => {
    if (!expiresAt || isExpired) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setIsExpired(true);
      }
    };

    updateTimer();
    const id = setInterval(updateTimer, 1000);
    
    return () => clearInterval(id);
  }, [expiresAt, isExpired]);

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
            扫码签到
          </CardTitle>
          <CardDescription className="text-base">
            使用微信扫描下方二维码完成签到
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 二维码容器 */}
          <div className="relative mx-auto w-72 h-72 rounded-2xl bg-white p-4 shadow-inner">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            ) : isExpired ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl">
                <Clock className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">二维码已过期</p>
                <Button onClick={generateQRCode} size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新二维码
                </Button>
              </div>
            ) : qrCodeUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="扫码签到二维码"
                  className="w-full h-full object-contain"
                />
                {/* 扫描动画 */}
                <div className="absolute inset-4 qr-scanner overflow-hidden pointer-events-none rounded-lg" />
              </>
            ) : null}
          </div>

          {/* 倒计时 */}
          <div className="text-center space-y-2">
            {!isExpired && timeLeft > 0 && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>二维码有效期：{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          {/* 刷新按钮 */}
          {!isExpired && (
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

