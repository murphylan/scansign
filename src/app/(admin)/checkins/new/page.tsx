'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  UserCheck,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AfterCheckinType,
  WallStyle,
  Department,
  DEFAULT_CHECKIN_DISPLAY,
} from '@/types/checkin';
import { QRPosition } from '@/types/common';
import { createCheckinAction } from '@/server/actions/checkinAction';
import { BackgroundPicker, BackgroundConfig } from '@/components/shared/background-picker';
import { cn } from '@/lib/utils';

export default function NewCheckinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 基本信息
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // 字段配置
  const [needPhone, setNeedPhone] = useState(true);
  const [needName, setNeedName] = useState(true);
  const [needDepartment, setNeedDepartment] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDeptName, setNewDeptName] = useState('');

  // 签到后行为
  const [afterType, setAfterType] = useState<AfterCheckinType>('message');
  const [afterMessage, setAfterMessage] = useState('签到成功！');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [showVerifyCode, setShowVerifyCode] = useState(true);

  // 大屏配置
  const [wallStyle, setWallStyle] = useState<WallStyle>('danmaku');
  const [qrPosition, setQrPosition] = useState<QRPosition>('bottom-right');
  const [showStats, setShowStats] = useState(true);
  const [background, setBackground] = useState<BackgroundConfig>(
    DEFAULT_CHECKIN_DISPLAY.background as BackgroundConfig
  );

  // 允许重复签到
  const [allowRepeat, setAllowRepeat] = useState(false);

  function addDepartment() {
    if (!newDeptName.trim()) return;
    setDepartments([
      ...departments,
      { id: `dept_${Date.now()}`, name: newDeptName.trim() },
    ]);
    setNewDeptName('');
  }

  function removeDepartment(id: string) {
    setDepartments(departments.filter((d) => d.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('请输入签到标题');
      return;
    }

    setLoading(true);
    try {
      const config = {
        fields: {
          phone: needPhone,
          name: needName,
          department: needDepartment,
          custom: [] as string[],
        },
        afterCheckin: {
          type: afterType,
          message: afterMessage,
          redirectUrl: afterType === 'redirect' ? redirectUrl : undefined,
          showVerifyCode,
        },
        allowRepeat,
        departments: needDepartment ? departments.map(d => ({ id: d.id, name: d.name })) : [],
      };

      const display = {
        ...DEFAULT_CHECKIN_DISPLAY,
        wallStyle,
        showStats,
        background,
        qrCode: {
          ...DEFAULT_CHECKIN_DISPLAY.qrCode,
          position: qrPosition,
        },
      };

      const res = await createCheckinAction({
        title: title.trim(),
        description: description.trim() || undefined,
        config: JSON.parse(JSON.stringify(config)),
        display: JSON.parse(JSON.stringify(display)),
      });

      if (res.success) {
        toast.success('创建成功');
        router.push(`/checkins/${res.data?.id}`);
      } else {
        toast.error(res.error || '创建失败');
      }
    } catch {
      toast.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/checkins">
          <Button variant="ghost" size="icon" className="-ml-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
          <UserCheck className="h-5 w-5 text-emerald-600" strokeWidth={1.9} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">创建签到</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">配置签到信息和展示方式</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 基本信息 */}
        <div className="rounded-2xl bg-cell p-5 shadow-sm">
          <h2 className="mb-4 text-[15px] font-semibold text-foreground">基本信息</h2>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">
                签到标题 <span className="text-primary">*</span>
              </Label>
              <Input
                id="title"
                placeholder="如：2026年会签到"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Input
                id="description"
                placeholder="签到活动的简单描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 收集信息 */}
        <div className="rounded-2xl bg-cell p-5 shadow-sm">
          <h2 className="mb-1 text-[15px] font-semibold text-foreground">收集信息</h2>
          <p className="mb-4 text-sm text-muted-foreground">选择签到时需要收集的信息</p>
          <div className="flex flex-wrap gap-3">
            {/* 手机号 */}
            <label
              className={cn(
                'flex min-w-[100px] flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                needPhone ? 'border-primary bg-primary/5' : 'border-border active:bg-muted'
              )}
            >
              <input
                type="checkbox"
                checked={needPhone}
                onChange={(e) => setNeedPhone(e.target.checked)}
                className="sr-only"
              />
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2',
                  needPhone ? 'border-primary bg-primary' : 'border-muted-foreground/50'
                )}
              >
                {needPhone && (
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12">
                    <path fill="currentColor" d="M10.28 2.28a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0L1.22 6.34a.75.75 0 0 1 1.06-1.06l2 2 4.97-4.97a.75.75 0 0 1 1.06 0Z" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">手机号</span>
            </label>
            {/* 姓名 */}
            <label
              className={cn(
                'flex min-w-[100px] flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                needName ? 'border-primary bg-primary/5' : 'border-border active:bg-muted'
              )}
            >
              <input
                type="checkbox"
                checked={needName}
                onChange={(e) => setNeedName(e.target.checked)}
                className="sr-only"
              />
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2',
                  needName ? 'border-primary bg-primary' : 'border-muted-foreground/50'
                )}
              >
                {needName && (
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12">
                    <path fill="currentColor" d="M10.28 2.28a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0L1.22 6.34a.75.75 0 0 1 1.06-1.06l2 2 4.97-4.97a.75.75 0 0 1 1.06 0Z" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">姓名</span>
            </label>
            {/* 部门 */}
            <label
              className={cn(
                'flex min-w-[100px] flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                needDepartment ? 'border-primary bg-primary/5' : 'border-border active:bg-muted'
              )}
            >
              <input
                type="checkbox"
                checked={needDepartment}
                onChange={(e) => setNeedDepartment(e.target.checked)}
                className="sr-only"
              />
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2',
                  needDepartment ? 'border-primary bg-primary' : 'border-muted-foreground/50'
                )}
              >
                {needDepartment && (
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12">
                    <path fill="currentColor" d="M10.28 2.28a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0L1.22 6.34a.75.75 0 0 1 1.06-1.06l2 2 4.97-4.97a.75.75 0 0 1 1.06 0Z" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">部门</span>
            </label>
          </div>

          {/* 部门列表 */}
          {needDepartment && (
            <div className="mt-4 space-y-3">
              <Label>部门列表</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入部门名称"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDepartment())}
                />
                <Button type="button" variant="secondary" onClick={addDepartment}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {departments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {departments.map((dept) => (
                    <span
                      key={dept.id}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                    >
                      {dept.name}
                      <button
                        type="button"
                        onClick={() => removeDepartment(dept.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 签到后行为 */}
        <div className="rounded-2xl bg-cell p-5 shadow-sm">
          <h2 className="mb-1 text-[15px] font-semibold text-foreground">签到后行为</h2>
          <p className="mb-4 text-sm text-muted-foreground">用户签到成功后的操作</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label
              className={cn(
                'flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4 transition-colors',
                afterType === 'message' ? 'border-primary bg-primary/5' : 'border-border active:bg-muted'
              )}
            >
              <input
                type="radio"
                name="afterType"
                value="message"
                checked={afterType === 'message'}
                onChange={() => setAfterType('message')}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-foreground">显示成功</span>
              <span className="text-xs text-muted-foreground">显示签到成功消息</span>
            </label>
            <label
              className={cn(
                'flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4 transition-colors',
                afterType === 'redirect' ? 'border-primary bg-primary/5' : 'border-border active:bg-muted'
              )}
            >
              <input
                type="radio"
                name="afterType"
                value="redirect"
                checked={afterType === 'redirect'}
                onChange={() => setAfterType('redirect')}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-foreground">跳转页面</span>
              <span className="text-xs text-muted-foreground">跳转到指定 URL</span>
            </label>
            <label
              className={cn(
                'flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4 transition-colors',
                afterType === 'none' ? 'border-primary bg-primary/5' : 'border-border active:bg-muted'
              )}
            >
              <input
                type="radio"
                name="afterType"
                value="none"
                checked={afterType === 'none'}
                onChange={() => setAfterType('none')}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-foreground">无操作</span>
              <span className="text-xs text-muted-foreground">直接停留在当前页</span>
            </label>
          </div>

          {afterType === 'message' && (
            <div className="mt-4 space-y-2">
              <Label>成功消息</Label>
              <Input
                value={afterMessage}
                onChange={(e) => setAfterMessage(e.target.value)}
                placeholder="签到成功！"
              />
            </div>
          )}

          {afterType === 'redirect' && (
            <div className="mt-4 space-y-2">
              <Label>跳转 URL</Label>
              <Input
                type="url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://example.com/welcome"
              />
            </div>
          )}

          <label className="mt-4 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showVerifyCode}
              onChange={(e) => setShowVerifyCode(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">显示验证码（用于后续修改信息）</span>
          </label>
        </div>

        {/* 高级设置 */}
        <div className="overflow-hidden rounded-2xl bg-cell shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-4 text-[15px] font-semibold text-foreground transition-colors active:bg-muted"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            高级设置
            {showAdvanced ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          {showAdvanced && (
            <div className="space-y-6 px-5 pb-5">
              {/* 大屏配置 */}
              <div className="space-y-3">
                <p className="text-[13px] font-semibold text-muted-foreground">大屏签到墙样式</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      { value: 'danmaku', label: '弹幕' },
                      { value: 'grid', label: '网格' },
                      { value: 'list', label: '列表' },
                      { value: 'bubble', label: '气泡' },
                    ] as { value: WallStyle; label: string }[]
                  ).map((style) => (
                    <label
                      key={style.value}
                      className={cn(
                        'flex cursor-pointer items-center justify-center rounded-xl border p-3 text-sm font-medium transition-colors',
                        wallStyle === style.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-foreground active:bg-muted'
                      )}
                    >
                      <input
                        type="radio"
                        name="wallStyle"
                        value={style.value}
                        checked={wallStyle === style.value}
                        onChange={() => setWallStyle(style.value as WallStyle)}
                        className="sr-only"
                      />
                      {style.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 二维码位置 */}
              <div className="space-y-3">
                <p className="text-[13px] font-semibold text-muted-foreground">大屏二维码位置</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {(
                    [
                      { value: 'top-left', label: '左上' },
                      { value: 'top-center', label: '中上' },
                      { value: 'top-right', label: '右上' },
                      { value: 'hidden', label: '隐藏' },
                      { value: 'middle-left', label: '左中' },
                      { value: 'middle-center', label: '中心' },
                      { value: 'middle-right', label: '右中' },
                      { value: 'bottom-left', label: '左下' },
                      { value: 'bottom-center', label: '中下' },
                      { value: 'bottom-right', label: '右下' },
                    ] as { value: QRPosition; label: string }[]
                  ).map((pos) => (
                    <label
                      key={pos.value}
                      className={cn(
                        'flex cursor-pointer items-center justify-center rounded-xl border p-2 text-sm transition-colors',
                        qrPosition === pos.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground active:bg-muted'
                      )}
                    >
                      <input
                        type="radio"
                        name="qrPosition"
                        value={pos.value}
                        checked={qrPosition === pos.value}
                        onChange={() => setQrPosition(pos.value as QRPosition)}
                        className="sr-only"
                      />
                      {pos.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showStats}
                    onChange={(e) => setShowStats(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">大屏显示统计信息</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowRepeat}
                    onChange={(e) => setAllowRepeat(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">允许重复签到（无需验证码即可修改）</span>
                </label>
              </div>

              {/* 背景设置 */}
              <BackgroundPicker
                value={background}
                onChange={setBackground}
              />
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center gap-3 pt-1">
          <Link href="/checkins" className="flex-1">
            <Button type="button" variant="outline" className="h-12 w-full">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="h-12 flex-1 text-base font-medium">
            {loading ? '创建中...' : '创建签到'}
          </Button>
        </div>
      </form>
    </div>
  );
}
