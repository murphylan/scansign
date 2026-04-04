'use client';

import { useState, useMemo } from 'react';
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
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { VoteType, ChartType, VoteOption, VoteTemplate, VOTE_TEMPLATES } from '@/types/vote';
import { QRPosition } from '@/types/common';
import { generateId } from '@/lib/utils/code-generator';
import { createVoteAction } from '@/server/actions/voteAction';
import { VoteTemplateSelector } from '@/components/shared/vote-template-selector';
import { VoteOptionEditor } from '@/components/shared/vote-option-editor';

type Step = 'template' | 'form';

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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/votes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              选择投票模板
            </h1>
            <p className="text-muted-foreground mt-1">
              选择一个适合您需求的模板开始创建
            </p>
          </div>
        </div>

        {/* 模板选择器 */}
        <Card>
          <CardHeader>
            <CardTitle>投票模板</CardTitle>
            <CardDescription>
              不同的模板适用于不同的投票场景，选择后可以自定义详细配置
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoteTemplateSelector
              value={template}
              onChange={handleTemplateChange}
            />
          </CardContent>
        </Card>

        {/* 模板预览说明 */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="text-5xl">{templateConfig.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{templateConfig.name}</h3>
                <p className="text-muted-foreground mt-1">
                  {templateConfig.description}
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">选项数量：</span>
                    <span className="font-medium">
                      {templateConfig.minOptions} - {templateConfig.maxOptions}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">图表样式：</span>
                    <span className="font-medium">
                      {templateConfig.defaultChartType === 'bar' && '柱状图'}
                      {templateConfig.defaultChartType === 'pie' && '饼图'}
                      {templateConfig.defaultChartType === 'versus' && '对决图'}
                      {templateConfig.defaultChartType === 'progress' && '进度条'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">支持图片：</span>
                    <span className="font-medium">
                      {templateConfig.hasImage ? '是' : '否'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 下一步按钮 */}
        <div className="flex justify-end">
          <Button onClick={handleNext} size="lg" className="gap-2">
            下一步：配置投票
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // 步骤2：表单配置
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-2xl">{templateConfig.icon}</span>
            创建{templateConfig.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            配置投票选项和规则
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleBack}>
          更换模板
        </Button>
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

        {/* 投票类型 - 非对决模式显示 */}
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
                  <span className="text-2xl">☝️</span>
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
                  <span className="text-2xl">✌️</span>
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
            </CardContent>
          )}
        </Card>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleBack}>
            返回
          </Button>
          <Link href="/votes">
            <Button type="button" variant="outline">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? '创建中...' : '创建投票'}
          </Button>
        </div>
      </form>
    </div>
  );
}
