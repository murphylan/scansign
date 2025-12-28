'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Form, FormResponse, FormField } from '@/types/form';

export default function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  async function fetchForm() {
    try {
      const res = await fetch(`/api/forms/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setForm(data.data);
      }
    } catch {
      console.error('Failed to fetch form');
    }
  }

  async function fetchResponses() {
    try {
      const res = await fetch(`/api/forms/${resolvedParams.id}/responses?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setResponses(data.data?.responses || []);
      }
    } catch {
      console.error('Failed to fetch responses');
    }
  }

  async function fetchQRCode() {
    if (!form) return;
    try {
      const res = await fetch(`/api/forms/${resolvedParams.id}/qrcode`);
      if (res.ok) {
        const data = await res.json();
        setQrCodeUrl(data.data?.qrCodeUrl);
      }
    } catch {
      console.error('Failed to fetch QR code');
    }
  }

  useEffect(() => {
    Promise.all([fetchForm(), fetchResponses()]).finally(() => {
      setLoading(false);
    });
  }, [resolvedParams.id]);

  useEffect(() => {
    if (form) {
      fetchQRCode();
    }
  }, [form]);

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
  }, [form, resolvedParams.id]);

  async function handleStatusChange(status: 'active' | 'paused') {
    try {
      const res = await fetch(`/api/forms/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchForm();
      }
    } catch {
      console.error('Failed to update status');
    }
  }

  function copyLink() {
    if (!form) return;
    const url = `${window.location.origin}/f/${form.code}`;
    navigator.clipboard.writeText(url);
  }

  function exportCSV() {
    window.open(`/api/forms/${resolvedParams.id}/responses?format=csv`, '_blank');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">表单不存在</h2>
        <Link href="/forms">
          <Button>返回列表</Button>
        </Link>
      </div>
    );
  }

  const mobileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${form.code}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${form.code}/display`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/forms">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{form.title}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  form.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : form.status === 'paused'
                    ? 'bg-yellow-500/10 text-yellow-500'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {form.status === 'active'
                  ? '进行中'
                  : form.status === 'paused'
                  ? '已暂停'
                  : '已结束'}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              {form.description || '无描述'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            导出CSV
          </Button>
          {form.status === 'active' ? (
            <Button
              variant="outline"
              onClick={() => handleStatusChange('paused')}
            >
              <Pause className="h-4 w-4 mr-2" />
              暂停
            </Button>
          ) : form.status === 'paused' ? (
            <Button onClick={() => handleStatusChange('active')}>
              <Play className="h-4 w-4 mr-2" />
              恢复
            </Button>
          ) : null}
          <Link href={`/forms/${resolvedParams.id}/settings`}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              设置
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总提交</p>
                <p className="text-3xl font-bold mt-1">{form.stats.responseCount}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Download className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">字段数</p>
                <p className="text-3xl font-bold mt-1">{form.config.fields.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <LayoutList className="h-6 w-6 text-blue-500" />
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
                  /f/{form.code}
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
              表单二维码
            </CardTitle>
            <CardDescription>扫码填写表单</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {qrCodeUrl ? (
              <>
                <div className="p-4 bg-white rounded-xl">
                  <img src={qrCodeUrl} alt="表单二维码" className="w-48 h-48" />
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  扫码或访问 <code className="bg-secondary px-1 rounded">/f/{form.code}</code>
                </p>
                <a href={qrCodeUrl} download={`form-${form.code}.png`}>
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

        {/* 最近提交 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                最近提交
              </CardTitle>
              <CardDescription>最近收到的表单响应</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchResponses}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无提交记录
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {responses.map((response) => (
                  <div
                    key={response.id}
                    className="p-4 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {response.phone || '匿名用户'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(response.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {form.config.fields.slice(0, 4).map((field) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '-';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

