"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarPlus,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createUserAction,
  grantSubscriptionAction,
  listOpsUsersAction,
  revokePaidAction,
  setTrialDaysAction,
  updateUserAction,
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
  type DialogMode = { kind: "create" } | { kind: "edit"; user: OpsUserRow };
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    nickname: "",
    trialDays: 3,
    role: "USER" as "USER" | "ADMIN",
  });

  const openCreate = () => {
    setForm({
      email: "",
      password: "",
      nickname: "",
      trialDays: 3,
      role: "USER",
    });
    setDialog({ kind: "create" });
  };

  const openEdit = (u: OpsUserRow) => {
    setForm({
      email: u.email,
      password: "",
      nickname: u.nickname ?? "",
      trialDays: u.trialDays,
      role: u.role,
    });
    setDialog({ kind: "edit", user: u });
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialog(null);
  };

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

  const onSetTrial = async (userId: string, current: number) => {
    const days = window.prompt(
      "设置试用天数（0～365，覆盖原值）",
      String(current)
    );
    if (days === null) return;
    const n = parseInt(days, 10);
    if (Number.isNaN(n)) {
      toast.error("请输入有效数字");
      return;
    }
    const res = await setTrialDaysAction(userId, n);
    if (res.success) {
      toast.success("已更新试用天数");
      void load();
    } else {
      toast.error(res.error ?? "失败");
    }
  };

  const onSubmitDialog = async () => {
    if (!dialog) return;

    if (dialog.kind === "create") {
      if (!form.email.trim() || !form.password.trim()) {
        toast.error("请填写邮箱和密码");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (dialog.kind === "create") {
        const res = await createUserAction({
          email: form.email.trim(),
          password: form.password,
          nickname: form.nickname.trim() || undefined,
          trialDays: form.trialDays,
          role: form.role,
        });
        if (res.success) {
          toast.success("用户已创建");
          setDialog(null);
          void load();
        } else {
          toast.error(res.error ?? "创建失败");
        }
      } else {
        const res = await updateUserAction({
          userId: dialog.user.id,
          nickname: form.nickname.trim(),
          trialDays: form.trialDays,
          role: form.role,
          password: form.password.trim() || undefined,
        });
        if (res.success) {
          toast.success("已保存");
          setDialog(null);
          void load();
        } else {
          toast.error(res.error ?? "保存失败");
        }
      }
    } finally {
      setSubmitting(false);
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
          <Button size="sm" onClick={openCreate}>
            <UserPlus className="h-4 w-4 mr-1" />
            添加用户
          </Button>
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
          placeholder="搜索邮箱或昵称"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()}
        />
        <Button type="button" onClick={applySearch}>
          搜索
        </Button>
      </div>

      <div className="overflow-x-auto">
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-20 rounded-lg border border-border">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm rounded-lg border border-border overflow-hidden">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left">
                <th className="px-3 py-3 font-medium text-center whitespace-nowrap">在线</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">邮箱</th>
                <th className="px-3 py-3 font-medium text-center whitespace-nowrap">角色</th>
                <th className="px-3 py-3 font-medium text-center whitespace-nowrap">试用</th>
                <th className="px-3 py-3 font-medium text-center whitespace-nowrap">付费</th>
                <th className="px-3 py-3 font-medium text-center whitespace-nowrap">套餐</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">订阅到期</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap text-right">最后活跃</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap text-right">注册</th>
                <th className="px-3 py-3 font-medium text-right whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30 align-middle">
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span
                      className={
                        r.online ? "text-emerald-600 font-medium" : "text-muted-foreground"
                      }
                    >
                      {r.online ? "●" : "○"}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap" title={r.email}>
                    {r.email}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">{r.role}</td>
                  <td className="px-3 py-3 text-center tabular-nums whitespace-nowrap">
                    {r.trialDays}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {r.isPaid ? "是" : "否"}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {subscriptionPlanLabel(r.subscriptionPlan)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs tabular-nums">
                    {r.subscriptionEndsAt
                      ? new Date(r.subscriptionEndsAt).toLocaleString("zh-CN")
                      : "—"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-right tabular-nums">
                    {r.lastSeenAt
                      ? new Date(r.lastSeenAt).toLocaleString("zh-CN")
                      : "—"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-right tabular-nums">
                    {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-nowrap justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        title="编辑"
                        aria-label="编辑"
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {r.role !== "ADMIN" && (
                        <>
                          <Select
                            value=""
                            title="开通/续期套餐"
                            aria-label="开通套餐"
                            className="h-7 w-[110px] py-0 text-xs"
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              void onGrant(r.id, v as SubscriptionPlan);
                              e.currentTarget.value = "";
                            }}
                          >
                            <option value="" disabled>
                              + 开通…
                            </option>
                            <option value="MONTHLY">+ 月（30 天）</option>
                            <option value="QUARTERLY">+ 季（90 天）</option>
                            <option value="PAY_PER_USE">+ 次（3 天）</option>
                            <option value="YEARLY">+ 年（365 天）</option>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            title="设置试用天数"
                            aria-label="设置试用天数"
                            onClick={() => onSetTrial(r.id, r.trialDays)}
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2"
                            title="清除付费状态"
                            aria-label="清除付费"
                            onClick={() => onRevoke(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-base font-semibold">
                {dialog.kind === "create" ? "添加用户" : "编辑用户"}
              </h2>
              <button
                type="button"
                disabled={submitting}
                onClick={closeDialog}
                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-email">邮箱</Label>
                <Input
                  id="form-email"
                  type="email"
                  autoComplete="off"
                  value={form.email}
                  disabled={dialog.kind === "edit"}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, email: e.target.value }))
                  }
                  placeholder="user@example.com"
                />
                {dialog.kind === "edit" && (
                  <p className="text-xs text-muted-foreground">
                    邮箱作为登录账号，不可修改。
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-password">
                  {dialog.kind === "create" ? "初始密码" : "重置密码（留空则不改）"}
                </Label>
                <Input
                  id="form-password"
                  type="text"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, password: e.target.value }))
                  }
                  placeholder="至少 6 个字符"
                />
                <p className="text-xs text-muted-foreground">
                  {dialog.kind === "create"
                    ? "请将该密码告知用户，建议其登录后立即修改。"
                    : "如需重置密码，请填写新密码并告知用户。"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-nickname">昵称（可选）</Label>
                <Input
                  id="form-nickname"
                  value={form.nickname}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, nickname: e.target.value }))
                  }
                  placeholder="留空时用邮箱前缀"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="form-trial">试用天数</Label>
                  <Input
                    id="form-trial"
                    type="number"
                    min={0}
                    max={365}
                    value={form.trialDays}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        trialDays: Math.max(
                          0,
                          Math.min(365, parseInt(e.target.value, 10) || 0)
                        ),
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="form-role">角色</Label>
                  <Select
                    id="form-role"
                    value={form.role}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        role: e.target.value as "USER" | "ADMIN",
                      }))
                    }
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={closeDialog}
              >
                取消
              </Button>
              <Button type="button" disabled={submitting} onClick={onSubmitDialog}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {dialog.kind === "create" ? "创建" : "保存"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
