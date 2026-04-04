'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Save,
} from 'lucide-react';
import {
  AfterCheckinType,
  WallStyle,
  Department,
  DEFAULT_CHECKIN_DISPLAY,
} from '@/types/checkin';
import { QRPosition } from '@/types/common';
import { getCheckinAction, updateCheckinAction } from '@/server/actions/checkinAction';
import { BackgroundPicker, BackgroundConfig } from '@/components/shared/background-picker';

interface CheckinConfig {
  fields?: {
    phone?: boolean;
    name?: boolean;
    department?: boolean;
  };
  afterCheckin?: {
    type?: AfterCheckinType;
    message?: string;
    redirectUrl?: string;
    showVerifyCode?: boolean;
  };
  allowRepeat?: boolean;
  departments?: Department[];
  durationMinutes?: number;
  security?: {
    enableDeviceLimit?: boolean;
    maxCheckinPerDevice?: number;
  };
}

interface CheckinDisplay {
  wallStyle?: WallStyle;
  showStats?: boolean;
  qrCode?: {
    show?: boolean;
    position?: QRPosition;
    size?: string;
  };
  welcomeTemplate?: string;
  background?: BackgroundConfig;
}

export default function CheckinSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [welcomeTemplate, setWelcomeTemplate] = useState('🎉 欢迎 {{name}} 加入！');
  const [background, setBackground] = useState<BackgroundConfig>(
    DEFAULT_CHECKIN_DISPLAY.background as BackgroundConfig
  );

  // 允许重复签到
  const [allowRepeat, setAllowRepeat] = useState(false);
  
  // 有效期配置（分钟）
  const [durationMinutes, setDurationMinutes] = useState(5);
  
  // 安全配置
  const [enableDeviceLimit, setEnableDeviceLimit] = useState(true);

  const fetchCheckin = useCallback(async () => {
    const res = await getCheckinAction(resolvedParams.id);
    if (res.success && res.data) {
      const data = res.data;
      setTitle(data.title);
      setDescription(data.description || '');

      // 解析 config
      const config = (data.config || {}) as CheckinConfig;
      setNeedPhone(config.fields?.phone ?? true);
      setNeedName(config.fields?.name ?? true);
      setNeedDepartment(config.fields?.department ?? false);
      setDepartments(config.departments || []);
      setAfterType(config.afterCheckin?.type || 'message');
      setAfterMessage(config.afterCheckin?.message || '签到成功！');
      setRedirectUrl(config.afterCheckin?.redirectUrl || '');
      setShowVerifyCode(config.afterCheckin?.showVerifyCode ?? true);
      setAllowRepeat(config.allowRepeat ?? false);
      setDurationMinutes(config.durationMinutes ?? 5);
      setEnableDeviceLimit(config.security?.enableDeviceLimit ?? true);

      // 解析 display
      const display = (data.display || {}) as CheckinDisplay;
      setWallStyle(display.wallStyle || 'danmaku');
      setQrPosition(display.qrCode?.position || 'bottom-right');
      setShowStats(display.showStats ?? true);
      setWelcomeTemplate(display.welcomeTemplate || '🎉 欢迎 {{name}} 加入！');
      if (display.background) {
        setBackground(display.background);
      }
    } else {
      toast.error('签到不存在');
      router.push('/checkins');
    }
    setLoading(false);
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchCheckin();
  }, [fetchCheckin]);

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

    setSaving(true);
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
        durationMinutes: Math.min(Math.max(1, durationMinutes), 60), // 限制在 1-60 分钟
        security: {
          enableDeviceLimit,
          maxCheckinPerDevice: 1,
        },
      };

      const display = {
        ...DEFAULT_CHECKIN_DISPLAY,
        wallStyle,
        showStats,
        welcomeTemplate,
        background,
        qrCode: {
          ...DEFAULT_CHECKIN_DISPLAY.qrCode,
          position: qrPosition,
        },
      };

      const res = await updateCheckinAction(resolvedParams.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        config: JSON.parse(JSON.stringify(config)),
        display: JSON.parse(JSON.stringify(display)),
      });

      if (res.success) {
        toast.success('保存成功');
        router.push(`/checkins/${resolvedParams.id}`);
      } else {
        toast.error(res.error || '保存失败');
      }
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/checkins/${resolvedParams.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">签到设置</h1>
          <p className="text-muted-foreground mt-1">
            修改签到配置和展示方式
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">签到标题 *</Label>
              <Input
                id="title"
                placeholder="如：2024年会签到"
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
          </CardContent>
        </Card>

        {/* 收集信息 */}
        <Card>
          <CardHeader>
            <CardTitle>收集信息</CardTitle>
            <CardDescription>选择签到时需要收集的信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <label className="flex items-center gap-2 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors flex-1 min-w-[100px]">
                <input
                  type="checkbox"
                  checked={needPhone}
                  onChange={(e) => setNeedPhone(e.target.checked)}
                  className="rounded"
                />
                <span>手机号</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors flex-1 min-w-[100px]">
                <input
                  type="checkbox"
                  checked={needName}
                  onChange={(e) => setNeedName(e.target.checked)}
                  className="rounded"
                />
                <span>姓名</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors flex-1 min-w-[100px]">
                <input
                  type="checkbox"
                  checked={needDepartment}
                  onChange={(e) => setNeedDepartment(e.target.checked)}
                  className="rounded"
                />
                <span>部门</span>
              </label>
            </div>

            {/* 部门列表 */}
            {needDepartment && (
              <div className="space-y-3 pt-2">
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
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-sm"
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
          </CardContent>
        </Card>

        {/* 签到后行为 */}
        <Card>
          <CardHeader>
            <CardTitle>签到后行为</CardTitle>
            <CardDescription>用户签到成功后的操作</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <label
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${afterType === 'message'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-secondary/50'
                  }`}
              >
                <input
                  type="radio"
                  name="afterType"
                  value="message"
                  checked={afterType === 'message'}
                  onChange={() => setAfterType('message')}
                  className="sr-only"
                />
                <span className="font-medium">显示成功</span>
                <span className="text-xs text-muted-foreground">显示签到成功消息</span>
              </label>
              <label
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${afterType === 'redirect'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-secondary/50'
                  }`}
              >
                <input
                  type="radio"
                  name="afterType"
                  value="redirect"
                  checked={afterType === 'redirect'}
                  onChange={() => setAfterType('redirect')}
                  className="sr-only"
                />
                <span className="font-medium">跳转页面</span>
                <span className="text-xs text-muted-foreground">跳转到指定 URL</span>
              </label>
              <label
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${afterType === 'none'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-secondary/50'
                  }`}
              >
                <input
                  type="radio"
                  name="afterType"
                  value="none"
                  checked={afterType === 'none'}
                  onChange={() => setAfterType('none')}
                  className="sr-only"
                />
                <span className="font-medium">无操作</span>
                <span className="text-xs text-muted-foreground">直接停留在当前页</span>
              </label>
            </div>

            {afterType === 'message' && (
              <div className="space-y-2">
                <Label>成功消息</Label>
                <Input
                  value={afterMessage}
                  onChange={(e) => setAfterMessage(e.target.value)}
                  placeholder="签到成功！"
                />
              </div>
            )}

            {afterType === 'redirect' && (
              <div className="space-y-2">
                <Label>跳转 URL</Label>
                <Input
                  type="url"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://example.com/welcome"
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showVerifyCode}
                onChange={(e) => setShowVerifyCode(e.target.checked)}
                className="rounded"
              />
              <span>显示验证码（用于后续修改信息）</span>
            </label>
          </CardContent>
        </Card>

        {/* 高级设置 */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <CardTitle className="flex items-center justify-between">
              高级设置
              {showAdvanced ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CardTitle>
          </CardHeader>
          {showAdvanced && (
            <CardContent className="space-y-6">
              {/* 弹幕模板 */}
              <div className="space-y-2">
                <Label>弹幕欢迎模板</Label>
                <Input
                  value={welcomeTemplate}
                  onChange={(e) => setWelcomeTemplate(e.target.value)}
                  placeholder="🎉 欢迎 {{name}} 加入！"
                />
                <p className="text-xs text-muted-foreground">
                  使用 {"{{name}}"} 代表签到者姓名
                </p>
              </div>

              {/* 大屏配置 */}
              <div className="space-y-4">
                <Label>大屏签到墙样式</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: 'danmaku', label: '弹幕' },
                    { value: 'grid', label: '网格' },
                    { value: 'list', label: '列表' },
                    { value: 'bubble', label: '气泡' },
                  ].map((style) => (
                    <label
                      key={style.value}
                      className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${wallStyle === style.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-secondary/50'
                        }`}
                    >
                      <input
                        type="radio"
                        name="wallStyle"
                        value={style.value}
                        checked={wallStyle === style.value}
                        onChange={() => setWallStyle(style.value as WallStyle)}
                        className="sr-only"
                      />
                      <span>{style.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 二维码位置 */}
              <div className="space-y-4">
                <Label>大屏二维码位置</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[
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
                  ].map((pos) => (
                    <label
                      key={pos.value}
                      className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all text-sm ${qrPosition === pos.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-secondary/50'
                        }`}
                    >
                      <input
                        type="radio"
                        name="qrPosition"
                        value={pos.value}
                        checked={qrPosition === pos.value}
                        onChange={() => setQrPosition(pos.value as QRPosition)}
                        className="sr-only"
                      />
                      <span>{pos.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 签到有效期 */}
              <div className="space-y-2">
                <Label>签到有效期（分钟）</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 5)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    范围：1-60 分钟，过期后无法签到
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableDeviceLimit}
                    onChange={(e) => setEnableDeviceLimit(e.target.checked)}
                    className="rounded"
                  />
                  <span>启用设备限制（同一手机只能签到一次）</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStats}
                    onChange={(e) => setShowStats(e.target.checked)}
                    className="rounded"
                  />
                  <span>大屏显示统计信息</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRepeat}
                    onChange={(e) => setAllowRepeat(e.target.checked)}
                    className="rounded"
                  />
                  <span>允许重复签到（无需验证码即可修改）</span>
                </label>
              </div>

              {/* 背景设置 */}
              <BackgroundPicker
                value={background}
                onChange={setBackground}
              />
            </CardContent>
          )}
        </Card>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-3">
          <Link href={`/checkins/${resolvedParams.id}`}>
            <Button type="button" variant="outline">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </form>
    </div>
  );
}

