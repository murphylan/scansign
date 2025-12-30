'use client';

import { useState } from 'react';
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
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import { VoteType, ChartType, VoteOption } from '@/types/vote';
import { QRPosition } from '@/types/common';
import { generateId } from '@/lib/utils/code-generator';
import { createVoteAction } from '@/server/actions/voteAction';

export default function NewVotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 基本信息
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // 选项
  const [options, setOptions] = useState<VoteOption[]>([
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

  function addOption() {
    setOptions([...options, { id: generateId(), title: '', count: 0 }]);
  }

  function removeOption(id: string) {
    if (options.length <= 2) {
      alert('至少需要2个选项');
      return;
    }
    setOptions(options.filter((o) => o.id !== id));
  }

  function updateOption(id: string, title: string) {
    setOptions(options.map((o) => (o.id === id ? { ...o, title } : o)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('请输入投票标题');
      return;
    }

    const validOptions = options.filter((o) => o.title.trim());
    if (validOptions.length < 2) {
      toast.error('请至少填写2个有效选项');
      return;
    }

    setLoading(true);
    try {
      const config = {
        options: validOptions.map((o) => ({
          id: o.id,
          title: o.title.trim(),
          count: 0,
        })),
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/votes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">创建投票</h1>
          <p className="text-muted-foreground mt-1">
            配置投票选项和规则
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

        {/* 投票选项 */}
        <Card>
          <CardHeader>
            <CardTitle>投票选项</CardTitle>
            <CardDescription>添加至少2个选项</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <div className="text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                <span className="w-6 text-muted-foreground text-sm">
                  {index + 1}.
                </span>
                <Input
                  placeholder={`选项 ${index + 1}`}
                  value={option.title}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(option.id)}
                  disabled={options.length <= 2}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addOption}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加选项
            </Button>
          </CardContent>
        </Card>

        {/* 投票类型 */}
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
                <div className="grid grid-cols-4 gap-3">
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
                <div className="grid grid-cols-4 gap-2">
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

