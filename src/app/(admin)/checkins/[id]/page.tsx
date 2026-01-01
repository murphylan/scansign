'use client';

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!checkin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">签到不存在</h2>
        <Link href="/checkins">
          <Button>返回列表</Button>
        </Link>
      </div>
    );
  }

  const mobileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${checkin.code}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${checkin.code}/display`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/checkins">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{checkin.title}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  checkin.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : checkin.status === 'paused'
                    ? 'bg-yellow-500/10 text-yellow-500'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {checkin.status === 'active'
                  ? '进行中'
                  : checkin.status === 'paused'
                  ? '已暂停'
                  : '已结束'}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              {checkin.description || '无描述'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {checkin.status === 'active' ? (
            <Button
              variant="outline"
              onClick={() => handleStatusChange('paused')}
            >
              <Pause className="h-4 w-4 mr-2" />
              暂停
            </Button>
          ) : checkin.status === 'paused' ? (
            <Button onClick={() => handleStatusChange('active')}>
              <Play className="h-4 w-4 mr-2" />
              恢复
            </Button>
          ) : null}
          <Link href={`/checkins/${resolvedParams.id}/settings`}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              设置
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-linear-to-br from-emerald-500/10 to-green-600/10 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总签到</p>
                <p className="text-3xl font-bold mt-1">{checkin.stats?.total ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">今日签到</p>
                <p className="text-3xl font-bold mt-1">{checkin.stats?.today ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">手机端链接</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-secondary px-2 py-1 rounded truncate">
                  /c/{checkin.code}
                </code>
                <Button variant="ghost" size="icon" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Link href={mobileUrl} target="_blank">
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">大屏展示</p>
              <Link href={displayUrl} target="_blank">
                <Button className="w-full gap-2">
                  <Monitor className="h-4 w-4" />
                  打开大屏
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 二维码 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              签到二维码
            </CardTitle>
            <CardDescription>扫码签到入口</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {qrCodeUrl ? (
              <>
                <div className="p-4 bg-white rounded-xl">
                  <img src={qrCodeUrl} alt="签到二维码" className="w-48 h-48" />
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  扫码或访问 <code className="bg-secondary px-1 rounded">/c/{checkin.code}</code>
                </p>
                <a href={qrCodeUrl} download={`checkin-${checkin.code}.png`}>
                  <Button variant="outline" size="sm" className="mt-3 gap-2">
                    <Download className="h-4 w-4" />
                    下载二维码
                  </Button>
                </a>
              </>
            ) : (
              <div className="h-48 w-48 bg-secondary rounded-xl flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 签到记录 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                签到记录
              </CardTitle>
              <CardDescription>最近签到的用户</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchRecords}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无签到记录
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-medium">
                        {record.participant?.name?.charAt(0) || record.participant?.phone?.slice(-2) || '?'}
                      </div>
                      <div>
                        <p className="font-medium">
                          {record.participant?.name || '未填写姓名'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{record.participant?.phone}</span>
                          {record.departmentName && (
                            <>
                              <span>·</span>
                              <span>{record.departmentName}</span>
                            </>
                          )}
                          {record.verifyCode && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-amber-600">
                                <Key className="h-3 w-3" />
                                {record.verifyCode}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.checkedInAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
