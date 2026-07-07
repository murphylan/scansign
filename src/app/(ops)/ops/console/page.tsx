"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  extendTrialAction,
  grantSubscriptionAction,
  listOpsUsersAction,
  revokePaidAction,
  type OpsUserRow,
} from "@/server/actions/opsAction";
import type { SubscriptionPlan } from "@/types/user-types";
import { subscriptionPlanLabel } from "@/lib/pricing";

const POLL_MS = 5000;

export default function OpsConsolePage() {
  const [rows, setRows] = useState<OpsUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");

  const load = useCallback(async () => {
    const res = await listOpsUsersAction(search.trim() || undefined);
    if (!res.success) {
      toast.error(res.error ?? "加载失败");
      setRows([]);
      return;
    }
    setRows(res.data ?? []);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await listOpsUsersAction(search.trim() || undefined);
      if (cancelled) return;
      if (!res.success) {
        toast.error(res.error ?? "加载失败");
        setRows([]);
      } else {
        setRows(res.data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [search]);

  useEffect(() => {
    const t = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  const applySearch = () => {
    setSearch(searchDraft);
  };

  const onGrant = async (userId: string, plan: SubscriptionPlan) => {
    const res = await grantSubscriptionAction(userId, plan);
    if (res.success) {
      toast.success("已开通/续期");
      void load();
    } else {
      toast.error(res.error ?? "失败");
    }
  };

  const onExtendTrial = async (userId: string) => {
    const days = window.prompt("延长试用天数（1～365）", "7");
    if (!days) return;
    const n = parseInt(days, 10);
    const res = await extendTrialAction(userId, n);
    if (res.success) {
      toast.success("已延长试用");
      void load();
    } else {
      toast.error(res.error ?? "失败");
    }
  };

  const onRevoke = async (userId: string) => {
    if (!window.confirm("确定清除该用户付费标记与订阅截止日期？")) return;
    const res = await revokePaidAction(userId);
    if (res.success) {
      toast.success("已更新");
      void load();
    } else {
      toast.error(res.error ?? "失败");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">用户运营台</h1>
          <p className="text-sm text-muted-foreground mt-1">
            约每 {POLL_MS / 1000}s 自动刷新 · 在线为最近活跃
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            返回管理后台
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void load();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
        </div>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="搜索手机号或昵称"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()}
        />
        <Button type="button" onClick={applySearch}>
          搜索
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="p-3 font-medium">在线</th>
                <th className="p-3 font-medium">手机号</th>
                <th className="p-3 font-medium">角色</th>
                <th className="p-3 font-medium">试用天数</th>
                <th className="p-3 font-medium">付费</th>
                <th className="p-3 font-medium">套餐</th>
                <th className="p-3 font-medium">订阅到期</th>
                <th className="p-3 font-medium">最后活跃</th>
                <th className="p-3 font-medium">注册</th>
                <th className="p-3 font-medium w-[320px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-3">
                    <span
                      className={
                        r.online ? "text-emerald-600 font-medium" : "text-muted-foreground"
                      }
                    >
                      {r.online ? "●" : "○"}
                    </span>
                  </td>
                  <td className="p-3 max-w-[200px] truncate" title={r.phone ?? ""}>
                    {r.phone ?? "—"}
                  </td>
                  <td className="p-3">{r.role}</td>
                  <td className="p-3">{r.trialDays}</td>
                  <td className="p-3">{r.isPaid ? "是" : "否"}</td>
                  <td className="p-3">{subscriptionPlanLabel(r.subscriptionPlan)}</td>
                  <td className="p-3 whitespace-nowrap">
                    {r.subscriptionEndsAt
                      ? new Date(r.subscriptionEndsAt).toLocaleString("zh-CN")
                      : "—"}
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs">
                    {r.lastSeenAt
                      ? new Date(r.lastSeenAt).toLocaleString("zh-CN")
                      : "—"}
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs">
                    {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="p-3">
                    {r.role === "ADMIN" ? (
                      <span className="text-muted-foreground text-xs">管理员</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={() => onGrant(r.id, "MONTHLY")}
                        >
                          +月
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={() => onGrant(r.id, "QUARTERLY")}
                        >
                          +季
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={() => onGrant(r.id, "PAY_PER_USE")}
                        >
                          +次(3天)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => onExtendTrial(r.id)}
                        >
                          延试用
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => onRevoke(r.id)}
                        >
                          清付费
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
