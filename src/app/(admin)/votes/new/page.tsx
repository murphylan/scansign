'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Vote,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';
import { VoteType, ChartType, VoteOption, VoteTemplate, VOTE_TEMPLATES } from '@/types/vote';
import { QRPosition } from '@/types/common';
import { generateId } from '@/lib/utils/code-generator';
import { createVoteAction } from '@/server/actions/voteAction';
import { VoteTemplateSelector } from '@/components/shared/vote-template-selector';
import { VoteOptionEditor } from '@/components/shared/vote-option-editor';

type Step = 'template' | 'form';

const CHART_LABELS: Record<string, string> = {
  bar: '柱状图',
  pie: '饼图',
  versus: '对决图',
  progress: '进度条',
};

export default function NewVotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [step, setStep] = useState<Step>('template');

  // 模板选择
  const [template, setTemplate] = useState<VoteTemplate>('simple');

  // 基本信息
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // 获取当前模板配置
  const templateConfig = useMemo(() => {
    return VOTE_TEMPLATES.find((t) => t.id === template) || VOTE_TEMPLATES[0];
  }, [template]);

  // 选项 - 根据模板初始化
  const [options, setOptions] = useState<VoteOption[]>(() => [
    { id: generateId(), title: '', count: 0 },
    { id: generateId(), title: '', count: 0 },
  ]);

  // 投票类型
  const [voteType, setVoteType] = useState<VoteType>('single');
  const [minSelect, setMinSelect] = useState(1);
  const [maxSelect, setMaxSelect] = useState(3);

  // 规则
  const [requirePhone, setRequirePhone] = useState(true);
  const [allowChange, setAllowChange] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  // 结果展示
  const [showRealtime, setShowRealtime] = useState(true);
  const [showAfterVote, setShowAfterVote] = useState(true);

  // 大屏配置
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [qrPosition, setQrPosition] = useState<QRPosition>('bottom-right');

  // 切换模板时重置部分状态
  function handleTemplateChange(newTemplate: VoteTemplate) {
    setTemplate(newTemplate);
    const config = VOTE_TEMPLATES.find((t) => t.id === newTemplate);
    if (config) {
      setVoteType(config.defaultVoteType);
      setChartType(config.defaultChartType);
      // 重置选项
      const optionCount = newTemplate === 'versus' ? 2 : 2;
      setOptions(
        Array.from({ length: optionCount }, () => ({
          id: generateId(),
          title: '',
          count: 0,
        }))
      );
    }
  }

  // 进入下一步
  function handleNext() {
    setStep('form');
  }

  // 返回模板选择
  function handleBack() {
    setStep('template');
  }

  async function handleSubmit(e: React.FormEvent) {
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

    setLoading(true);
    try {
      // 选项数据
      const optionsData = validOptions.map((o) => ({
        title: o.title.trim(),
        description: o.description,
        imageUrl: o.image,
      }));

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
      };

      const res = await createVoteAction({
        title: title.trim(),
        description: description.trim() || undefined,
        voteType: voteType === 'multiple' ? 'MULTIPLE' : 'SINGLE',
        maxChoices: voteType === 'multiple' ? maxSelect : 1,
        options: optionsData,
        config: JSON.parse(JSON.stringify(config)),
        display: JSON.parse(JSON.stringify(display)),
      });

      if (res.success) {
        toast.success('创建成功');
        router.push(`/votes/${res.data?.id}`);
      } else {
        toast.error(res.error || '创建失败');
      }
    } catch {
      toast.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  // 步骤1：模板选择
  if (step === 'template') {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/votes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">新建投票</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">选择模板开始创建</p>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              1
            </div>
            <span className="text-sm font-medium text-foreground">选择模板</span>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground">
              2
            </div>
            <span className="text-sm text-muted-foreground">配置投票</span>
          </div>
        </div>

        {/* 模板选择器 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-foreground">投票模板</h2>
          <VoteTemplateSelector value={template} onChange={handleTemplateChange} />
        </div>

        {/* 模板预览 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
              {templateConfig.icon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground">{templateConfig.name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{templateConfig.description}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>
                  <span className="text-muted-foreground">选项数量：</span>
                  <span className="font-medium">{templateConfig.minOptions}–{templateConfig.maxOptions}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">图表样式：</span>
                  <span className="font-medium">{CHART_LABELS[templateConfig.defaultChartType] ?? templateConfig.defaultChartType}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">支持图片：</span>
                  <span className="font-medium">{templateConfig.hasImage ? '是' : '否'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 下一步 */}
        <Button onClick={handleNext} className="h-12 w-full text-base font-medium">
          下一步：配置投票
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // 步骤2：表单配置
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">
            创建{templateConfig.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">配置投票选项和规则</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleBack}>
          更换模板
        </Button>
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground">
            1
          </div>
          <span className="text-sm text-muted-foreground">选择模板</span>
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            2
          </div>
          <span className="text-sm font-medium text-foreground">配置投票</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 基本信息 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
              <Vote className="h-4 w-4 text-blue-600" strokeWidth={1.9} />
            </div>
            基本信息
          </h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">投票标题 *</Label>
              <Input
                id="title"
                placeholder={
                  template === 'candidate'
                    ? '如：年度最佳员工评选'
                    : template === 'versus'
                    ? '如：红队 vs 蓝队'
                    : '如：最受欢迎的产品'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">描述（可选）</Label>
              <Input
                id="description"
                placeholder="投票活动的简单描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 投票选项 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm sm:p-5">
          <h2 className="mb-1 text-[15px] font-semibold text-foreground">
            {template === 'candidate' ? '参赛选手' : template === 'versus' ? 'PK选手' : '投票选项'}
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            {template === 'candidate'
              ? '添加参与评选的选手信息'
              : template === 'versus'
              ? '设置两位对决选手'
              : template === 'image'
              ? '添加带图片的选项'
              : `添加至少${templateConfig.minOptions}个选项`}
          </p>
          <VoteOptionEditor
            options={options}
            onChange={setOptions}
            template={template}
            minOptions={templateConfig.minOptions}
            maxOptions={templateConfig.maxOptions}
          />
        </div>

        {/* 投票类型 - 非对决模式显示 */}
        {template !== 'versus' && templateConfig.supportMultiple && (
          <div className="rounded-2xl bg-cell p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-foreground">投票类型</h2>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                  voteType === 'single'
                    ? 'border-primary bg-primary/5'
                    : 'border-border active:bg-muted'
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
                <span className="text-2xl">☝️</span>
                <span className="text-sm font-medium">单选</span>
                <span className="text-xs text-muted-foreground">只能选择一个选项</span>
              </label>
              <label
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                  voteType === 'multiple'
                    ? 'border-primary bg-primary/5'
                    : 'border-border active:bg-muted'
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
                <span className="text-2xl">✌️</span>
                <span className="text-sm font-medium">多选</span>
                <span className="text-xs text-muted-foreground">可选择多个选项</span>
              </label>
            </div>

            {voteType === 'multiple' && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>最少选择</Label>
                  <Input
                    type="number"
                    min={1}
                    max={options.length}
                    value={minSelect}
                    onChange={(e) => setMinSelect(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1.5">
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
          </div>
        )}

        {/* 投票规则 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-[15px] font-semibold text-foreground">投票规则</h2>
          <div className="space-y-1">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors active:bg-muted">
              <input
                type="checkbox"
                checked={requirePhone}
                onChange={(e) => setRequirePhone(e.target.checked)}
                className="rounded"
              />
              <div>
                <p className="text-sm font-medium">需要手机号验证</p>
                <p className="text-xs text-muted-foreground">参与者需输入手机号</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors active:bg-muted">
              <input
                type="checkbox"
                checked={allowChange}
                onChange={(e) => setAllowChange(e.target.checked)}
                className="rounded"
              />
              <div>
                <p className="text-sm font-medium">允许修改投票</p>
                <p className="text-xs text-muted-foreground">用户可以修改已提交的投票</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors active:bg-muted">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="rounded"
              />
              <div>
                <p className="text-sm font-medium">匿名投票</p>
                <p className="text-xs text-muted-foreground">不显示投票者信息</p>
              </div>
            </label>
          </div>
        </div>

        {/* 结果展示 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-[15px] font-semibold text-foreground">结果展示</h2>
          <div className="space-y-1">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors active:bg-muted">
              <input
                type="checkbox"
                checked={showRealtime}
                onChange={(e) => setShowRealtime(e.target.checked)}
                className="rounded"
              />
              <div>
                <p className="text-sm font-medium">实时显示结果</p>
                <p className="text-xs text-muted-foreground">投票进行中显示实时结果</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors active:bg-muted">
              <input
                type="checkbox"
                checked={showAfterVote}
                onChange={(e) => setShowAfterVote(e.target.checked)}
                className="rounded"
              />
              <div>
                <p className="text-sm font-medium">投票后显示结果</p>
                <p className="text-xs text-muted-foreground">用户投票后可查看结果</p>
              </div>
            </label>
          </div>
        </div>

        {/* 高级设置 */}
        <div className="overflow-hidden rounded-2xl bg-cell shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-4 transition-colors active:bg-muted"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span className="text-[15px] font-semibold text-foreground">高级设置</span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showAdvanced && (
            <div className="space-y-5 border-t border-border px-4 pb-5 pt-4">
              {/* 图表类型 */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">大屏图表样式</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: 'bar', label: '柱状图', icon: '📊' },
                    { value: 'pie', label: '饼图', icon: '🥧' },
                    { value: 'progress', label: '进度条', icon: '📈' },
                    { value: 'versus', label: '对决', icon: '⚔️' },
                  ].map((chart) => (
                    <label
                      key={chart.value}
                      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors ${
                        chartType === chart.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border active:bg-muted'
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
                      <span className="text-xl">{chart.icon}</span>
                      <span className="text-sm">{chart.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 二维码位置 */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">大屏二维码位置</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
                      className={`flex cursor-pointer items-center justify-center rounded-xl border p-2 text-sm transition-colors ${
                        qrPosition === pos.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border active:bg-muted'
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
            </div>
          )}
        </div>

        {/* 提交按钮 */}
        <div className="space-y-2 pb-2">
          <Button type="submit" disabled={loading} className="h-12 w-full text-base font-medium">
            {loading ? '创建中...' : '创建投票'}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleBack}>
              返回
            </Button>
            <Link href="/votes" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                取消
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
