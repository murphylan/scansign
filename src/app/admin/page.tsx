"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RegisteredUser, ApiResponse, UserListResponse } from "@/types";
import { 
  Users, 
  RefreshCw, 
  Phone, 
  Building2, 
  Clock, 
  UserPlus, 
  UserCog,
  Wifi,
  WifiOff,
  Bell
} from "lucide-react";

export default function AdminPage() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [newUserAlert, setNewUserAlert] = useState<RegisteredUser | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 加载用户列表
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/list");
      const data: ApiResponse<UserListResponse> = await response.json();
      if (data.success && data.data) {
        setUsers(data.data.users);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error("Load users error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 建立 SSE 连接
  useEffect(() => {
    loadUsers();

    const connectSSE = () => {
      const eventSource = new EventSource("/api/user/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "connected" || data.type === "heartbeat") {
            setIsConnected(true);
            return;
          }

          if (data.type === "register" && data.user) {
            // 新用户注册
            setUsers((prev) => [data.user, ...prev]);
            setTotal((prev) => prev + 1);
            setNewUserAlert(data.user);
            
            // 3秒后清除提醒
            setTimeout(() => setNewUserAlert(null), 3000);
          } else if (data.type === "update" && data.user) {
            // 用户信息更新
            setUsers((prev) =>
              prev.map((u) => (u.id === data.user.id ? data.user : u))
            );
          }
        } catch (err) {
          console.error("Parse SSE message error:", err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        // 5秒后重连
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60000) {
      return "刚刚";
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`;
    } else if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString("zh-CN", { 
        month: "2-digit", 
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* 背景 */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/5 -z-10" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10" />

      {/* 新用户提醒 */}
      {newUserAlert && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-up">
          <Card className="bg-primary/90 text-primary-foreground shadow-2xl border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">新用户注册</p>
                <p className="text-sm opacity-90">
                  {newUserAlert.username} - {newUserAlert.departmentName}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              用户管理
            </h1>
            <p className="text-muted-foreground mt-1">
              实时查看注册用户信息
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 连接状态 */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              isConnected 
                ? "bg-primary/10 text-primary" 
                : "bg-destructive/10 text-destructive"
            }`}>
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4" />
                  实时连接
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  连接断开
                </>
              )}
            </div>

            <Button onClick={loadUsers} variant="outline" disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总用户数</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">今日注册</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => {
                    const today = new Date();
                    const userDate = new Date(u.registeredAt);
                    return userDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <UserCog className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">信息更新</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.updatedAt > u.registeredAt).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 用户列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              最近注册
            </CardTitle>
            <CardDescription>
              按注册时间倒序显示最近100位用户
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && users.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无注册用户</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">用户名</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">手机号</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">部门</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">注册时间</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr 
                        key={user.id} 
                        className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                          index === 0 && newUserAlert?.id === user.id ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-medium text-primary-foreground">
                              {user.username.slice(0, 1)}
                            </div>
                            <span className="font-medium">{user.username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="w-3.5 h-3.5" />
                            {user.phone}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {user.departmentName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">
                          {formatTime(user.registeredAt)}
                        </td>
                        <td className="py-3 px-4">
                          {user.updatedAt > user.registeredAt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-500">
                              <UserCog className="w-3 h-3" />
                              已修改
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-500">
                              <UserPlus className="w-3 h-3" />
                              新注册
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

