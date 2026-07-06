"use client";

import { useEffect, useState, useCallback, Suspense } from "react";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

import { toast } from "sonner";
import {
  Plus,
  Users,
  Monitor,
  Copy,
  ExternalLink,
  ArrowRight,
  Pause,
  Play,
  Share2,
  BarChart3,
  Download,
  LayoutList,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteConfirm } from "@/components/shared";
import { copyToClipboard } from "@/lib/utils/clipboard";
import { appTabs, type AppTabKey } from "@/components/admin/nav-config";

import { listCheckinsAction, updateCheckinAction, deleteCheckinAction } from "@/server/actions/checkinAction";
import { listVotesAction, updateVoteAction, deleteVoteAction } from "@/server/actions/voteAction";
import { listFormsAction, updateFormAction, deleteFormAction } from "@/server/actions/formAction";
import { listLotteriesAction, updateLotteryAction, deleteLotteryAction } from "@/server/actions/lotteryAction";

interface CheckinItem {
  id: string;
  code: string;
  title: string;
  status: string;
  stats: { total: number; today: number };
  createdAt: number;
}

interface VoteItem {
  id: string;
  code: string;
  title: string;
  status: string;
  voteType: string;
  options: unknown[];
  totalVotes: number;
}

interface FormItem {
  id: string;
  code: string;
  title: string;
  status: string;
  fields?: unknown[];
  responseCount: number;
}

interface LotteryItem {
  id: string;
  code: string;
  title: string;
  status: string;
  config?: { mode?: string };
  prizes?: unknown[];
  participantCount: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "进行中", cls: "bg-emerald-500/10 text-emerald-500" },
    paused: { label: "已暂停", cls: "bg-yellow-500/10 text-yellow-500" },
    ended: { label: "已结束", cls: "bg-muted text-muted-foreground" },
    draft: { label: "草稿", cls: "bg-blue-500/10 text-blue-500" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0", s.cls)}>
      {s.label}
    </span>
  );
}

function StatusActions({
  id,
  status,
  pending,
  onToggle,
}: {
  id: string;
  status: string;
  pending: boolean;
  onToggle: (id: string, status: "active" | "paused") => void;
}) {
  if (status === "active") {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7" title="暂停" disabled={pending} onClick={() => onToggle(id, "paused")}>
        <Pause className="h-3.5 w-3.5" />
      </Button>
    );
  }
  if (status === "paused") {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7" title="恢复" disabled={pending} onClick={() => onToggle(id, "active")}>
        <Play className="h-3.5 w-3.5" />
      </Button>
    );
  }
  return null;
}

// --- Checkin List ---
function CheckinList() {
  const [items, setItems] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    const res = await listCheckinsAction();
    if (res.success && res.data) setItems(res.data as CheckinItem[]);
    else toast.error(res.error || "获取签到列表失败");
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const toggle = useCallback(async (id: string, status: "active" | "paused") => {
    setPendingId(id);
    const res = await updateCheckinAction(id, { status });
    res.success ? toast.success(status === "active" ? "已恢复" : "已暂停") : toast.error(res.error || "操作失败");
    fetch_();
    setPendingId(null);
  }, [fetch_]);

  const remove = useCallback(async (id: string) => {
    setPendingId(id);
    const res = await deleteCheckinAction(id);
    res.success ? toast.success("已删除") : toast.error(res.error || "删除失败");
    fetch_();
    setPendingId(null);
  }, [fetch_]);

  const copy = useCallback(async (code: string) => {
    const ok = await copyToClipboard(`${window.location.origin}/c/${code}`);
    toast[ok ? "success" : "error"](ok ? "链接已复制" : "复制失败");
  }, []);

  if (loading) return <ListSkeleton />;
  if (items.length === 0) return <EmptyState label="签到" href="/checkins/new" />;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl bg-cell p-3 shadow-sm active:bg-muted transition-colors">
          <Link href={`/checkins/${item.id}`} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-emerald-600" strokeWidth={1.9} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm truncate">{item.title}</span>
                <StatusBadge status={item.status} />
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{item.stats?.total ?? 0} 人</span>
                <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-[10px]">/{item.code}</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
          <div className="flex items-center gap-0.5 mt-2 pt-2 border-t border-border">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(item.code)}><Copy className="h-3.5 w-3.5" /></Button>
            <Link href={`/c/${item.code}`} target="_blank"><Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
            <Link href={`/c/${item.code}/display`} target="_blank"><Button variant="ghost" size="icon" className="h-7 w-7"><Monitor className="h-3.5 w-3.5" /></Button></Link>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Share2 className="h-3.5 w-3.5" /></Button>
            <StatusActions id={item.id} status={item.status} pending={pendingId === item.id} onToggle={toggle} />
            <DeleteConfirm entityName={item.title} isLoading={pendingId === item.id} onConfirm={() => remove(item.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Vote List ---
function VoteList() {
  const [items, setItems] = useState<VoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    const res = await listVotesAction();
    if (res.success && res.data) setItems(res.data as VoteItem[]);
    else toast.error(res.error || "获取投票列表失败");
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const toggle = useCallback(async (id: string, status: "active" | "paused") => {
    setPendingId(id);
    const res = await updateVoteAction(id, { status });
    res.success ? toast.success(status === "active" ? "已恢复" : "已暂停") : toast.error(res.error || "操作失败");
    fetch_();
    setPendingId(null);
  }, [fetch_]);

  const remove = useCallback(async (id: string) => {
    setPendingId(id);
    const res = await deleteVoteAction(id);
    res.success ? toast.success("已删除") : toast.error(res.error || "删除失败");
    fetch_();
    setPendingId(null);
  }, [fetch_]);

  const copy = useCallback(async (code: string) => {
    const ok = await copyToClipboard(`${window.location.origin}/v/${code}`);
    toast[ok ? "success" : "error"](ok ? "链接已复制" : "复制失败");
  }, []);

  if (loading) return <ListSkeleton />;
  if (items.length === 0) return <EmptyState label="投票" href="/votes/new" />;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl bg-cell p-3 shadow-sm active:bg-muted transition-colors">
          <Link href={`/votes/${item.id}`} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-blue-600" strokeWidth={1.9} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm truncate">{item.title}</span>
                <StatusBadge status={item.status} />
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                  {item.voteType === "single" ? "单选" : "多选"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{(item.options as unknown[])?.length ?? 0} 选项</span>
                <span>{item.totalVotes ?? 0} 票</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
          <div className="flex items-center gap-0.5 mt-2 pt-2 border-t border-border">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(item.code)}><Copy className="h-3.5 w-3.5" /></Button>
            <Link href={`/v/${item.code}`} target="_blank"><Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
            <Link href={`/v/${item.code}/display`} target="_blank"><Button variant="ghost" size="icon" className="h-7 w-7"><Monitor className="h-3.5 w-3.5" /></Button></Link>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Share2 className="h-3.5 w-3.5" /></Button>
            <StatusActions id={item.id} status={item.status} pending={pendingId === item.id} onToggle={toggle} />
            <DeleteConfirm entityName={item.title} isLoading={pendingId === item.id} onConfirm={() => remove(item.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Form List ---
function FormList() {
  const [items, setItems] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    const res = await listFormsAction();
    if (res.success && res.data) setItems(res.data as FormItem[]);
    else toast.error(res.error || "获取表单列表失败");
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const toggle = useCallback(async (id: string, status: "active" | "paused") => {
    setPendingId(id);
    const res = await updateFormAction(id, { status });
    res.success ? toast.success(status === "active" ? "已恢复" : "已暂停") : toast.error(res.error || "操作失败");
    fetch_();
    setPendingId(null);
  }, [fetch_]);

  const remove = useCallback(async (id: string) => {
    setPendingId(id);
    const res = await deleteFormAction(id);
    res.success ? toast.success("已删除") : toast.error(res.error || "删除失败");
    fetch_();
    setPendingId(null);
  }, [fetch_]);

  const copy = useCallback(async (code: string) => {
    const ok = await copyToClipboard(`${window.location.origin}/f/${code}`);
    toast[ok ? "success" : "error"](ok ? "链接已复制" : "复制失败");
  }, []);

  if (loading) return <ListSkeleton />;
  if (items.length === 0) return <EmptyState label="表单" href="/forms/new" />;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl bg-cell p-3 shadow-sm active:bg-muted transition-colors">
          <Link href={`/forms/${item.id}`} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <LayoutList className="h-5 w-5 text-violet-600" strokeWidth={1.9} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm truncate">{item.title}</span>
                <StatusBadge status={item.status} />
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{(item.fields as unknown[])?.length ?? 0} 字段</span>
                <span>{item.responseCount ?? 0} 份</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
          <div className="flex items-center gap-0.5 mt-2 pt-2 border-t border-border">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(item.code)}><Copy className="h-3.5 w-3.5" /></Button>
            <Link href={`/f/${item.code}`} target="_blank"><Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
            <Link href={`/f/${item.code}/display`} target="_blank"><Button variant="ghost" size="icon" className="h-7 w-7"><Monitor className="h-3.5 w-3.5" /></Button></Link>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Share2 className="h-3.5 w-3.5" /></Button>
            <StatusActions id={item.id} status={item.status} pending={pendingId === item.id} onToggle={toggle} />
            <DeleteConfirm entityName={item.title} isLoading={pendingId === item.id} onConfirm={() => remove(item.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Lottery List ---
function LotteryList() {
  const [items, setItems] = useState<LotteryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    const res = await listLotteriesAction();
    if (res.success && res.data) setItems(res.data as LotteryItem[]);
    else toast.error(res.error || "获取抽奖列表失败");
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const toggle = useCallback(async (id: string, status: "active" | "paused") => {
    setPendingId(id);
    const res = await updateLotteryAction(id, { status });
    res.success ? toast.success(status === "active" ? "已恢复" : "已暂停") : toast.error(res.error || "操作失败");
    fetch_();
    setPendingId(null);
  }, [fetch_]);

  const remove = useCallback(async (id: string) => {
    setPendingId(id);
    const res = await deleteLotteryAction(id);
    res.success ? toast.success("已删除") : toast.error(res.error || "删除失败");
    fetch_();
    setPendingId(null);
  }, [fetch_]);

  const copy = useCallback(async (code: string) => {
    const ok = await copyToClipboard(`${window.location.origin}/l/${code}`);
    toast[ok ? "success" : "error"](ok ? "链接已复制" : "复制失败");
  }, []);

  if (loading) return <ListSkeleton />;
  if (items.length === 0) return <EmptyState label="抽奖" href="/lotteries/new" />;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl bg-cell p-3 shadow-sm active:bg-muted transition-colors">
          <Link href={`/lotteries/${item.id}`} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-amber-600" strokeWidth={1.9} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm truncate">{item.title}</span>
                <StatusBadge status={item.status} />
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                  {item.config?.mode === "wheel" ? "转盘" : item.config?.mode === "slot" ? "老虎机" : item.config?.mode}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{(item.prizes as unknown[])?.length ?? 0} 奖品</span>
                <span>{item.participantCount ?? 0} 人</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
          <div className="flex items-center gap-0.5 mt-2 pt-2 border-t border-border">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(item.code)}><Copy className="h-3.5 w-3.5" /></Button>
            <Link href={`/l/${item.code}`} target="_blank"><Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
            <Link href={`/l/${item.code}/display`} target="_blank"><Button variant="ghost" size="icon" className="h-7 w-7"><Monitor className="h-3.5 w-3.5" /></Button></Link>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Share2 className="h-3.5 w-3.5" /></Button>
            <StatusActions id={item.id} status={item.status} pending={pendingId === item.id} onToggle={toggle} />
            <DeleteConfirm entityName={item.title} isLoading={pendingId === item.id} onConfirm={() => remove(item.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Shared UI ---
function ListSkeleton() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function EmptyState({ label, href }: { label: string; href: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-muted-foreground mb-3">暂无{label}活动</p>
      <Link href={href}>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          创建{label}
        </Button>
      </Link>
    </div>
  );
}

const TAB_COMPONENTS: Record<AppTabKey, React.ComponentType> = {
  checkins: CheckinList,
  votes: VoteList,
  forms: FormList,
  lotteries: LotteryList,
};

// 企业化：tab 图标统一为“浅底色块 + 品牌色图标”
const TAB_ICON_STYLE: Record<AppTabKey, { tint: string; fg: string }> = {
  checkins: { tint: "bg-emerald-50", fg: "text-emerald-600" },
  votes: { tint: "bg-blue-50", fg: "text-blue-600" },
  forms: { tint: "bg-violet-50", fg: "text-violet-600" },
  lotteries: { tint: "bg-amber-50", fg: "text-amber-600" },
};

function AppsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as AppTabKey | null;
  const activeTab = appTabs.find((t) => t.key === tabParam)?.key ?? appTabs[0].key;

  const setTab = useCallback(
    (key: AppTabKey) => {
      router.replace(`/apps?tab=${key}`, { scroll: false });
    },
    [router]
  );

  const currentTab = appTabs.find((t) => t.key === activeTab)!;
  const TabContent = TAB_COMPONENTS[activeTab];

  return (
    <div className="flex flex-1 min-h-0 -mx-4 -my-4 lg:-m-6">
      {/* Vertical Tab Strip */}
      <div className="w-[72px] shrink-0 border-r border-border bg-page overflow-y-auto">
        {appTabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const style = TAB_ICON_STYLE[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={cn(
                "relative w-full flex flex-col items-center gap-1.5 py-4 transition-colors",
                isActive ? "bg-cell text-primary" : "text-muted-foreground active:bg-cell/50"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary" />
              )}
              <div
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center",
                  isActive ? style.tint : "bg-muted"
                )}
              >
                <tab.icon
                  className={cn("h-[18px] w-[18px]", isActive ? style.fg : "text-muted-foreground")}
                  strokeWidth={1.9}
                />
              </div>
              <span className={cn("text-[11px] leading-none", isActive ? "font-semibold" : "font-medium")}>
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Content Header */}
        <div className="sticky top-0 z-10 bg-cell border-b border-border px-3 py-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{currentTab.name}管理</h2>
          <Link href={currentTab.createHref}>
            <Button size="sm" className="gap-1 h-7 text-xs px-2.5">
              <Plus className="h-3.5 w-3.5" />
              创建
            </Button>
          </Link>
        </div>

        {/* List */}
        <div className="p-3">
          <TabContent />
        </div>
      </div>
    </div>
  );
}

export default function AppsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <AppsContent />
    </Suspense>
  );
}
