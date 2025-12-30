'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  FileText,
  Monitor,
  Share2,
  ArrowRight,
  Pause,
  Play,
  Copy,
  ExternalLink,
  Download,
  LayoutList,
} from 'lucide-react';

import {
  listFormsAction,
  updateFormAction,
  deleteFormAction,
} from '@/server/actions/formAction';
import { DeleteConfirm } from '@/components/shared';
import { copyToClipboard } from '@/lib/utils/clipboard';

interface FormListItem {
  id: string;
  code: string;
  title: string;
  status: string;
  fields?: unknown[];
  responseCount: number;
}

export default function FormsPage() {
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    const res = await listFormsAction();
    if (res.success && res.data) {
      setForms(res.data as FormListItem[]);
    } else {
      toast.error(res.error || '获取表单列表失败');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleStatusChange = useCallback(async (id: string, status: 'active' | 'paused') => {
    setPendingId(id);
    const res = await updateFormAction(id, { status });
    if (res.success) {
      toast.success(status === 'active' ? '已恢复' : '已暂停');
      fetchForms();
    } else {
      toast.error(res.error || '操作失败');
    }
    setPendingId(null);
  }, [fetchForms]);

  const handleDelete = useCallback(async (id: string) => {
    setPendingId(id);
    const res = await deleteFormAction(id);
    if (res.success) {
      toast.success('已删除');
      fetchForms();
    } else {
      toast.error(res.error || '删除失败');
    }
    setPendingId(null);
  }, [fetchForms]);

  const copyLink = useCallback(async (code: string) => {
    const url = `${window.location.origin}/f/${code}`;
    const success = await copyToClipboard(url);
    toast[success ? 'success' : 'error'](success ? '链接已复制' : '复制失败');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">表单管理</h1>
          <p className="text-muted-foreground mt-1">
            创建和管理信息收集表单
          </p>
        </div>
        <Link href="/forms/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            创建表单
          </Button>
        </Link>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            表单列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : forms.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">暂无表单</h3>
              <p className="text-muted-foreground mb-4">
                创建您的第一个信息收集表单
              </p>
              <Link href="/forms/new">
                <Button>创建表单</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/30 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{form.title}</h4>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            form.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : form.status === 'paused'
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : form.status === 'ended'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}
                        >
                          {form.status === 'active'
                            ? '进行中'
                            : form.status === 'paused'
                            ? '已暂停'
                            : form.status === 'ended'
                            ? '已结束'
                            : '草稿'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <LayoutList className="h-3.5 w-3.5" />
                          {(form.fields as unknown[])?.length ?? 0} 个字段
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3.5 w-3.5" />
                          {form.responseCount ?? 0} 份提交
                        </span>
                        <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">
                          /f/{form.code}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="复制链接"
                      onClick={() => copyLink(form.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Link href={`/f/${form.code}`} target="_blank">
                      <Button variant="ghost" size="icon" title="手机端预览">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/f/${form.code}/display`} target="_blank">
                      <Button variant="ghost" size="icon" title="打开大屏">
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" title="分享">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    
                    {form.status === 'active' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="暂停"
                        disabled={pendingId === form.id}
                        onClick={() => handleStatusChange(form.id, 'paused')}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : form.status === 'paused' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="恢复"
                        disabled={pendingId === form.id}
                        onClick={() => handleStatusChange(form.id, 'active')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : null}

                    <DeleteConfirm
                      entityName={form.title}
                      isLoading={pendingId === form.id}
                      onConfirm={() => handleDelete(form.id)}
                    />

                    <Link href={`/forms/${form.id}`}>
                      <Button variant="ghost" size="icon" title="详情">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
