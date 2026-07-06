'use client';

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  FileText,
  Download,
  Monitor,
  Copy,
  ExternalLink,
  Settings,
  QrCode,
  Pause,
  Play,
  RefreshCw,
  LayoutList,
} from 'lucide-react';

import {
  getFormAction,
  getFormResponsesAction,
  updateFormAction,
} from '@/server/actions/formAction';
import { copyToClipboard } from '@/lib/utils/clipboard';

interface FormData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  config: {
    fields: Array<{ id: string; label: string }>;
  };
  stats: {
    responseCount: number;
  };
}

interface FormResponse {
  id: string;
  phone: string | null;
  submittedAt: number;
  data: Record<string, unknown>;
}

export default function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [form, setForm] = useState<FormData | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const fetchForm = useCallback(async () => {
    const res = await getFormAction(resolvedParams.id);
    if (res.success && res.data) {
      setForm(res.data as FormData);
    }
  }, [resolvedParams.id]);

  const fetchResponses = useCallback(async () => {
    const res = await getFormResponsesAction(resolvedParams.id, 20);
    if (res.success && res.data) {
      setResponses(res.data as FormResponse[]);
    }
  }, [resolvedParams.id]);

  const generateQRCode = useCallback(async (code: string) => {
    try {
      const url = `${window.location.origin}/f/${code}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
      setQrCodeUrl(qrUrl);
    } catch {
      console.error('Failed to generate QR code');
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchForm(), fetchResponses()]).finally(() => {
      setLoading(false);
    });
  }, [fetchForm, fetchResponses]);

  useEffect(() => {
    if (form?.code) {
      generateQRCode(form.code);
    }
  }, [form?.code, generateQRCode]);

  // SSE 实时更新
  useEffect(() => {
    if (!form) return;

    const eventSource = new EventSource(`/api/forms/${resolvedParams.id}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new') {
          fetchResponses();
          fetchForm();
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [form, resolvedParams.id, fetchResponses, fetchForm]);

  const handleStatusChange = useCallback(async (status: 'active' | 'paused') => {
    const res = await updateFormAction(resolvedParams.id, { status });
    if (res.success) {
      toast.success(status === 'active' ? '已恢复' : '已暂停');
      fetchForm();
    } else {
      toast.error(res.error || '操作失败');
    }
  }, [resolvedParams.id, fetchForm]);

  const copyLink = useCallback(async () => {
    if (!form) return;
    const url = `${window.location.origin}/f/${form.code}`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('链接已复制');
    } else {
      toast.error('复制失败，请手动复制');
    }
  }, [form]);

  const exportCSV = useCallback(() => {
    window.open(`/api/forms/${resolvedParams.id}/responses?format=csv`, '_blank');
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-xl font-semibold">表单不存在</h2>
        <Link href="/forms">
          <Button>返回列表</Button>
        </Link>
      </div>
    );
  }

  const mobileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${form.code}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${form.code}/display`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Link href="/forms">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{form.title}</h1>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  form.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : form.status === 'paused'
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {form.status === 'active'
                  ? '进行中'
                  : form.status === 'paused'
                  ? '已暂停'
                  : '已结束'}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {form.description || '无描述'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-14">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-1.5 h-4 w-4" />
            导出CSV
          </Button>
          {form.status === 'active' ? (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange('paused')}>
              <Pause className="mr-1.5 h-4 w-4" />
              暂停
            </Button>
          ) : form.status === 'paused' ? (
            <Button size="sm" onClick={() => handleStatusChange('active')}>
              <Play className="mr-1.5 h-4 w-4" />
              恢复
            </Button>
          ) : null}
          <Link href={`/forms/${resolvedParams.id}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="mr-1.5 h-4 w-4" />
              设置
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats & Links */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* 总提交 */}
        <div className="flex items-center justify-between rounded-2xl bg-cell p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">总提交</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{form.stats?.responseCount ?? 0}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50">
            <FileText className="h-6 w-6 text-violet-600" strokeWidth={1.9} />
          </div>
        </div>

        {/* 字段数 */}
        <div className="flex items-center justify-between rounded-2xl bg-cell p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">字段数</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{form.config?.fields?.length ?? 0}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <LayoutList className="h-6 w-6 text-blue-600" strokeWidth={1.9} />
          </div>
        </div>

        {/* 手机端链接 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm">
          <p className="mb-2 text-sm font-medium text-muted-foreground">手机端链接</p>
          <div className="flex items-center gap-1.5">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
              /f/{form.code}
            </code>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
            <Link href={mobileUrl} target="_blank">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 大屏展示 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm">
          <p className="mb-2 text-sm font-medium text-muted-foreground">大屏展示</p>
          <Link href={displayUrl} target="_blank">
            <Button className="w-full gap-2">
              <Monitor className="h-4 w-4" />
              打开大屏
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 二维码 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
              <QrCode className="h-[18px] w-[18px] text-violet-600" strokeWidth={1.9} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">表单二维码</h2>
              <p className="text-xs text-muted-foreground">扫码填写表单</p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            {qrCodeUrl ? (
              <>
                <div className="rounded-xl bg-white p-4">
                  <img src={qrCodeUrl} alt="表单二维码" className="h-48 w-48" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  扫码或访问 <code className="rounded bg-muted px-1">/f/{form.code}</code>
                </p>
                <a href={qrCodeUrl} download={`form-${form.code}.png`}>
                  <Button variant="outline" size="sm" className="mt-3 gap-2">
                    <Download className="h-4 w-4" />
                    下载二维码
                  </Button>
                </a>
              </>
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-muted">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </div>

        {/* 最近提交 */}
        <div className="overflow-hidden rounded-2xl bg-cell shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <FileText className="h-[18px] w-[18px] text-violet-600" strokeWidth={1.9} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">最近提交</h2>
                <p className="text-xs text-muted-foreground">最近收到的表单响应</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchResponses}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          {responses.length === 0 ? (
            <div className="px-4 pb-4 text-center">
              <p className="text-sm text-muted-foreground">暂无提交记录</p>
            </div>
          ) : (
            <div className="max-h-[400px] space-y-px overflow-y-auto px-4 pb-4">
              {responses.map((response) => (
                <div
                  key={response.id}
                  className="rounded-xl bg-muted/50 p-3.5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {response.phone || '匿名用户'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(response.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(form.config?.fields ?? []).slice(0, 4).map((field) => (
                      <div key={field.id} className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {field.label}:
                        </span>{' '}
                        {formatValue(response.data[field.id])}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '-';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
