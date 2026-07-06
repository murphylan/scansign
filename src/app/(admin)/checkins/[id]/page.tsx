'use client';

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  UserCheck,
  Users,
  Monitor,
  Copy,
  ExternalLink,
  Settings,
  QrCode,
  Download,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  getCheckinAction,
  getCheckinRecordsAction,
  updateCheckinAction,
  deleteCheckinRecordAction,
} from '@/server/actions/checkinAction';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { copyToClipboard } from '@/lib/utils/clipboard';

// 页面内部使用的类型（匹配 Server Action 返回的数据结构）
interface CheckinData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  stats: {
    total: number;
    today: number;
  };
}

interface RecordData {
  id: string;
  participant: {
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  departmentName: string | null;
  verifyCode: string | null;
  isConfirmed: boolean;
  checkedInAt: number;
}

export default function CheckinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [checkin, setCheckin] = useState<CheckinData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecordData | null>(null);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCheckin = useCallback(async () => {
    const res = await getCheckinAction(resolvedParams.id);
    if (res.success && res.data) {
      setCheckin(res.data as CheckinData);
    }
  }, [resolvedParams.id]);

  const fetchRecords = useCallback(async () => {
    const res = await getCheckinRecordsAction(resolvedParams.id);
    if (res.success && res.data) {
      setRecords(res.data as RecordData[]);
    }
  }, [resolvedParams.id]);

  const generateQRCode = useCallback(async (code: string) => {
    try {
      const url = `${window.location.origin}/c/${code}`;
      // 使用 QR Code API 生成二维码
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
      setQrCodeUrl(qrUrl);
    } catch {
      console.error('Failed to generate QR code');
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchCheckin(), fetchRecords()]).finally(() => {
      setLoading(false);
    });
  }, [fetchCheckin, fetchRecords]);

  useEffect(() => {
    if (checkin?.code) {
      generateQRCode(checkin.code);
    }
  }, [checkin?.code, generateQRCode]);

  // SSE 实时更新
  useEffect(() => {
    if (!checkin) return;

    const eventSource = new EventSource(`/api/checkins/${resolvedParams.id}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new' || data.type === 'update') {
          fetchRecords();
          fetchCheckin();
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [checkin, resolvedParams.id, fetchRecords, fetchCheckin]);

  const handleStatusChange = useCallback(async (status: 'active' | 'paused') => {
    const res = await updateCheckinAction(resolvedParams.id, { status });
    if (res.success) {
      toast.success(status === 'active' ? '已恢复' : '已暂停');
      fetchCheckin();
    } else {
      toast.error(res.error || '操作失败');
    }
  }, [resolvedParams.id, fetchCheckin]);

  const copyLink = useCallback(async () => {
    if (!checkin) return;
    const url = `${window.location.origin}/c/${checkin.code}`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('链接已复制');
    } else {
      toast.error('复制失败，请手动复制');
    }
  }, [checkin]);

  const handleDeleteRecord = useCallback(async (record: RecordData) => {
    setDeletingId(record.id);
    const res = await deleteCheckinRecordAction(record.id);
    setDeletingId(null);
    setDeleteTarget(null);

    if (res.success) {
      toast.success('删除成功');
      fetchRecords();
      fetchCheckin();
    } else {
      toast.error(res.error || '删除失败');
    }
  }, [fetchRecords, fetchCheckin]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!checkin) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-xl font-semibold">签到不存在</h2>
        <Link href="/checkins">
          <Button>返回列表</Button>
        </Link>
      </div>
    );
  }

  const mobileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${checkin.code}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${checkin.code}/display`;

  return (
    <div className="space-y-4">
      {/* 活动身份卡 */}
      <div className="rounded-2xl bg-cell p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
            <UserCheck className="h-6 w-6 text-emerald-600" strokeWidth={1.9} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold tracking-tight">{checkin.title}</h1>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  checkin.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : checkin.status === 'paused'
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {checkin.status === 'active'
                  ? '进行中'
                  : checkin.status === 'paused'
                  ? '已暂停'
                  : '已结束'}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {checkin.description || '无描述'}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {checkin.status === 'active' ? (
            <Button variant="outline" onClick={() => handleStatusChange('paused')}>
              <Pause className="mr-1.5 h-4 w-4" />
              暂停
            </Button>
          ) : checkin.status === 'paused' ? (
            <Button onClick={() => handleStatusChange('active')}>
              <Play className="mr-1.5 h-4 w-4" />
              恢复
            </Button>
          ) : (
            <Button variant="outline" disabled>
              已结束
            </Button>
          )}
          <Link href={`/checkins/${resolvedParams.id}/settings`} className="block">
            <Button variant="outline" className="w-full">
              <Settings className="mr-1.5 h-4 w-4" />
              设置
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-2xl bg-cell p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">总签到</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{checkin.stats?.total ?? 0}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Users className="h-6 w-6 text-emerald-600" strokeWidth={1.9} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-cell p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">今日签到</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{checkin.stats?.today ?? 0}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <UserCheck className="h-6 w-6 text-blue-600" strokeWidth={1.9} />
          </div>
        </div>
      </div>

      {/* 签到入口（二维码 + 链接 + 大屏） + 记录 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 签到入口 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <QrCode className="h-[18px] w-[18px] text-emerald-600" strokeWidth={1.9} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">签到入口</h2>
              <p className="text-xs text-muted-foreground">扫码或投屏参与</p>
            </div>
          </div>

          <div className="flex flex-col items-center">
            {qrCodeUrl ? (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border/60">
                <img src={qrCodeUrl} alt="签到二维码" className="h-44 w-44" />
              </div>
            ) : (
              <div className="flex h-[188px] w-[188px] items-center justify-center rounded-2xl bg-muted">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>

          {/* 手机端链接 */}
          <div className="mt-4 flex items-center gap-1 rounded-xl bg-muted/60 px-3 py-2">
            <code className="flex-1 truncate text-xs">/c/{checkin.code}</code>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyLink} title="复制链接">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Link href={mobileUrl} target="_blank">
              <Button variant="ghost" size="icon" className="h-7 w-7" title="打开手机端">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* 主次操作 */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href={displayUrl} target="_blank" className="block">
              <Button className="w-full gap-1.5">
                <Monitor className="h-4 w-4" />
                打开大屏
              </Button>
            </Link>
            {qrCodeUrl ? (
              <a href={qrCodeUrl} download={`checkin-${checkin.code}.png`} className="block">
                <Button variant="outline" className="w-full gap-1.5">
                  <Download className="h-4 w-4" />
                  下载码
                </Button>
              </a>
            ) : (
              <Button variant="outline" className="w-full gap-1.5" disabled>
                <Download className="h-4 w-4" />
                下载码
              </Button>
            )}
          </div>
        </div>

        {/* 签到记录 */}
        <div className="overflow-hidden rounded-2xl bg-cell shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <Users className="h-[18px] w-[18px] text-emerald-600" strokeWidth={1.9} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">签到记录</h2>
                <p className="text-xs text-muted-foreground">最近签到的用户</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchRecords}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {records.length === 0 ? (
            <div className="py-10 text-center">
              <UserCheck className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">暂无签到记录</p>
            </div>
          ) : (
            <div className="mt-2 max-h-[400px] overflow-y-auto [&>*:last-child]:after:hidden">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="weui-hairline-bottom weui-hairline-inset relative flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-600">
                    {record.participant?.name?.charAt(0) ||
                      record.participant?.phone?.slice(-2) ||
                      '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {record.participant?.name || '未填写姓名'}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {record.participant?.phone && (
                        <span>{record.participant.phone}</span>
                      )}
                      {record.departmentName && (
                        <span>{record.departmentName}</span>
                      )}
                      {record.verifyCode && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Key className="h-3 w-3" />
                          {record.verifyCode}
                        </span>
                      )}
                      <span className="hidden sm:inline">
                        {new Date(record.checkedInAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteTarget(record)}
                    disabled={deletingId === record.id}
                  >
                    {deletingId === record.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="删除签到记录"
        description={`确定要删除 ${deleteTarget?.participant?.name || deleteTarget?.participant?.phone || '此用户'} 的签到记录吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        isLoading={!!deletingId}
        onConfirm={() => { if (deleteTarget) handleDeleteRecord(deleteTarget); }}
      />
    </div>
  );
}
