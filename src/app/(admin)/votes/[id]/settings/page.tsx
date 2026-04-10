'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Vote,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { VoteType, ChartType, VOTE_TEMPLATES } from '@/types/vote';
import { QRPosition } from '@/types/common';
import { getVoteAction, updateVoteAction } from '@/server/actions/voteAction';
import { BackgroundPicker, BackgroundConfig } from '@/components/shared/background-picker';
import { VoteOptionEditor } from '@/components/shared/vote-option-editor';
import { VoteTemplateSelector } from '@/components/shared/vote-template-selector';
import type { VoteTemplate, VoteOption } from '@/types/vote';

interface VoteConfig {
  template?: VoteTemplate;
  voteType?: string;
  minSelect?: number;
  maxSelect?: number;
  requirePhone?: boolean;
  allowChange?: boolean;
  anonymous?: boolean;
  showResult?: {
    realtime?: boolean;
    afterVote?: boolean;
    afterEnd?: boolean;
  };
  options?: Array<{ id: string; title: string; description?: string; count: number }>;
}

interface VoteDisplay {
  template?: string;
  chartType?: ChartType;
  showPercentage?: boolean;
  showCount?: boolean;
  showVoterCount?: boolean;
  animation?: boolean;
  qrCode?: {
    show?: boolean;
    position?: QRPosition;
    size?: string;
    style?: string;
  };
  background?: BackgroundConfig;
}

export default function VoteSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [template, setTemplate] = useState<VoteTemplate>('simple');
  const [options, setOptions] = useState<VoteOption[]>([]);
  const [voteType, setVoteType] = useState<VoteType>('single');
  const [minSelect, setMinSelect] = useState(1);
  const [maxSelect, setMaxSelect] = useState(3);

  const [requirePhone, setRequirePhone] = useState(true);
  const [allowChange, setAllowChange] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  const [showRealtime, setShowRealtime] = useState(true);
  const [showAfterVote, setShowAfterVote] = useState(true);

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [qrPosition, setQrPosition] = useState<QRPosition>('bottom-right');
  const [background, setBackground] = useState<BackgroundConfig>({
    type: 'gradient',
    value: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 50%, #1b263b 100%)',
  });

  const templateConfig = useMemo(() => {
    return VOTE_TEMPLATES.find((t) => t.id === template) || VOTE_TEMPLATES[0];
  }, [template]);

  const fetchVote = useCallback(async () => {
    const res = await getVoteAction(resolvedParams.id);
    if (res.success && res.data) {
      const data = res.data;
      setTitle(data.title);
      setDescription(data.description || '');

      const config = (data.config || {}) as VoteConfig;
      setTemplate((config.template as VoteTemplate) || 'simple');
      setVoteType((config.voteType === 'multiple' ? 'multiple' : 'single') as VoteType);
      setMinSelect(config.minSelect ?? 1);
      setMaxSelect(config.maxSelect ?? 3);
      setRequirePhone(config.requirePhone ?? true);
      setAllowChange(config.allowChange ?? false);
      setAnonymous(config.anonymous ?? false);
      setShowRealtime(config.showResult?.realtime ?? true);
      setShowAfterVote(config.showResult?.afterVote ?? true);

      if (config.options && config.options.length > 0) {
        setOptions(config.options.map((o) => ({
          id: o.id,
          title: o.title,
          description: o.description,
          count: o.count ?? 0,
        })));
      }

      const display = (data.display || {}) as VoteDisplay;
      setChartType(display.chartType || 'bar');
      setQrPosition(display.qrCode?.position || 'bottom-right');
      if (display.background) {
        setBackground(display.background);
      }
    } else {
      toast.error('投票不存在');
      router.push('/votes');
    }
    setLoading(false);
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchVote();
  }, [fetchVote]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('请输入投票标题');
      return;
    }

    const validOptions = options.filter((o) => o.title.trim());
    if (validOptions.length < templateConfig.minOptions) {
      toast.error(`请至少填写${templateConfig.minOptions}个有效选项`);
      return;
    }

    setSaving(true);
    try {
      const config = {
        template,
        voteType,
        minSelect: voteType === 'multiple' ? minSelect : 1,
        maxSelect: voteType === 'multiple' ? maxSelect : 1,
        requirePhone,
        allowChange,
        anonymous,
        showResult: {
          realtime: showRealtime,
          afterVote: showAfterVote,
          afterEnd: true,
        },
      };

      const display = {
        template,
        chartType,
        showPercentage: true,
        showCount: true,
        showVoterCount: true,
        animation: true,
        qrCode: {
          show: true,
          position: qrPosition,
          size: 'md',
          style: 'default',
        },
        background,
      };

      const optionsData = validOptions.map((o) => ({
        title: o.title.trim(),
        description: o.description,
        imageUrl: o.image,
      }));

      const res = await updateVoteAction(resolvedParams.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        voteType: voteType === 'multiple' ? 'MULTIPLE' : 'SINGLE',
        maxChoices: voteType === 'multiple' ? maxSelect : 1,
        options: optionsData,
        config: JSON.parse(JSON.stringify(config)),
        display: JSON.parse(JSON.stringify(display)),
      });

      if (res.success) {
        toast.success('保存成功');
        router.push(`/votes/${resolvedParams.id}`);
      } else {
        toast.error(res.error || '保存失败');
      }
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [
    title, description, template, templateConfig, options, voteType,
    minSelect, maxSelect, requirePhone, allowChange, anonymous,
    showRealtime, showAfterVote, chartType, qrPosition, background,
    resolvedParams.id, router,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/votes/${resolvedParams.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">投票设置</h1>
          <p className="text-muted-foreground mt-1">
            修改投票配置和展示方式
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">投票标题 *</Label>
              <Input
                id="title"
                placeholder="如：最受欢迎的产品"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Input
                id="description"
                placeholder="投票活动的简单描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 投票模板 */}
        <Card>
          <CardHeader>
            <CardTitle>投票模板</CardTitle>
            <CardDescription>更换模板会影响大屏展示样式</CardDescription>
          </CardHeader>
          <CardContent>
            <VoteTemplateSelector
              value={template}
              onChange={setTemplate}
            />
          </CardContent>
        </Card>

        {/* 投票选项 */}
        <Card>
          <CardHeader>
            <CardTitle>
              {template === 'candidate' ? '参赛选手' : template === 'versus' ? 'PK选手' : '投票选项'}
            </CardTitle>
            <CardDescription>
              {template === 'candidate'
                ? '添加参与评选的选手信息'
                : template === 'versus'
                ? '设置两位对决选手'
                : template === 'image'
                ? '添加带图片的选项'
                : `添加至少${templateConfig.minOptions}个选项`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoteOptionEditor
              options={options}
              onChange={setOptions}
              template={template}
              minOptions={templateConfig.minOptions}
              maxOptions={templateConfig.maxOptions}
            />
          </CardContent>
        </Card>

        {/* 投票类型 */}
        {template !== 'versus' && templateConfig.supportMultiple && (
          <Card>
            <CardHeader>
              <CardTitle>投票类型</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                    voteType === 'single'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-secondary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="voteType"
                    value="single"
                    checked={voteType === 'single'}
                    onChange={() => setVoteType('single')}
                    className="sr-only"
                  />
                  <span className="font-medium">单选</span>
                  <span className="text-xs text-muted-foreground">只能选择一个选项</span>
                </label>
                <label
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                    voteType === 'multiple'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-secondary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="voteType"
                    value="multiple"
                    checked={voteType === 'multiple'}
                    onChange={() => setVoteType('multiple')}
                    className="sr-only"
                  />
                  <span className="font-medium">多选</span>
                  <span className="text-xs text-muted-foreground">可选择多个选项</span>
                </label>
              </div>

              {voteType === 'multiple' && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>最少选择</Label>
                    <Input
                      type="number"
                      min={1}
                      max={options.length}
                      value={minSelect}
                      onChange={(e) => setMinSelect(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>最多选择</Label>
                    <Input
                      type="number"
                      min={1}
                      max={options.length}
                      value={maxSelect}
                      onChange={(e) => setMaxSelect(parseInt(e.target.value) || 3)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 投票规则 */}
        <Card>
          <CardHeader>
            <CardTitle>投票规则</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-secondary/50">
              <input
                type="checkbox"
                checked={requirePhone}
                onChange={(e) => setRequirePhone(e.target.checked)}
                className="rounded"
              />
              <div>
                <span className="font-medium">需要手机号验证</span>
                <p className="text-xs text-muted-foreground">参与者需输入手机号</p>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-secondary/50">
              <input
                type="checkbox"
                checked={allowChange}
                onChange={(e) => setAllowChange(e.target.checked)}
                className="rounded"
              />
              <div>
                <span className="font-medium">允许修改投票</span>
                <p className="text-xs text-muted-foreground">用户可以修改已提交的投票</p>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-secondary/50">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="rounded"
              />
              <div>
                <span className="font-medium">匿名投票</span>
                <p className="text-xs text-muted-foreground">不显示投票者信息</p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* 结果展示 */}
        <Card>
          <CardHeader>
            <CardTitle>结果展示</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-secondary/50">
              <input
                type="checkbox"
                checked={showRealtime}
                onChange={(e) => setShowRealtime(e.target.checked)}
                className="rounded"
              />
              <div>
                <span className="font-medium">实时显示结果</span>
                <p className="text-xs text-muted-foreground">投票进行中显示实时结果</p>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-secondary/50">
              <input
                type="checkbox"
                checked={showAfterVote}
                onChange={(e) => setShowAfterVote(e.target.checked)}
                className="rounded"
              />
              <div>
                <span className="font-medium">投票后显示结果</span>
                <p className="text-xs text-muted-foreground">用户投票后可查看结果</p>
              </div>
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
              {/* 图表类型 */}
              <div className="space-y-4">
                <Label>大屏图表样式</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: 'bar', label: '柱状图', icon: '📊' },
                    { value: 'pie', label: '饼图', icon: '🥧' },
                    { value: 'progress', label: '进度条', icon: '📈' },
                    { value: 'versus', label: '对决', icon: '⚔️' },
                  ].map((chart) => (
                    <label
                      key={chart.value}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        chartType === chart.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-secondary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="chartType"
                        value={chart.value}
                        checked={chartType === chart.value}
                        onChange={() => setChartType(chart.value as ChartType)}
                        className="sr-only"
                      />
                      <span className="text-2xl">{chart.icon}</span>
                      <span className="text-sm">{chart.label}</span>
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
                      className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                        qrPosition === pos.value
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
          <Link href={`/votes/${resolvedParams.id}`}>
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
