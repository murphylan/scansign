'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Gift,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { Prize, LotteryMode } from '@/types/lottery';
import { generateId } from '@/lib/utils/code-generator';

export default function NewLotteryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 基本信息
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // 奖品
  const [prizes, setPrizes] = useState<Prize[]>([
    { id: generateId(), name: '一等奖', count: 1, remaining: 1, probability: 5 },
    { id: generateId(), name: '二等奖', count: 3, remaining: 3, probability: 10 },
    { id: generateId(), name: '三等奖', count: 10, remaining: 10, probability: 20 },
    { id: generateId(), name: '谢谢参与', count: 100, remaining: 100, probability: 65, isDefault: true },
  ]);

  // 模式
  const [mode, setMode] = useState<LotteryMode>('wheel');

  // 规则
  const [maxDrawsPerUser, setMaxDrawsPerUser] = useState(1);
  const [requirePhone, setRequirePhone] = useState(true);

  function addPrize() {
    setPrizes([
      ...prizes,
      { id: generateId(), name: '', count: 1, remaining: 1, probability: 0 },
    ]);
  }

  function removePrize(id: string) {
    if (prizes.length <= 2) {
      alert('至少需要2个奖品');
      return;
    }
    setPrizes(prizes.filter((p) => p.id !== id));
  }

  function updatePrize(id: string, updates: Partial<Prize>) {
    setPrizes(prizes.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('请输入抽奖标题');
      return;
    }

    const validPrizes = prizes.filter((p) => p.name.trim());
    if (validPrizes.length < 2) {
      alert('请至少填写2个有效奖品');
      return;
    }

    // 验证概率总和
    const totalProb = validPrizes.reduce((sum, p) => sum + p.probability, 0);
    if (Math.abs(totalProb - 100) > 0.01) {
      alert(`概率总和必须为100%，当前为${totalProb}%`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/lotteries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          config: {
            prizes: validPrizes.map((p) => ({
              ...p,
              remaining: p.count,
            })),
            mode,
            maxDrawsPerUser,
            requirePhone,
            animation: {
              duration: mode === 'wheel' ? 5000 : 3000,
              sound: true,
            },
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/lotteries/${data.data.id}`);
      } else {
        const error = await res.json();
        alert(error.error || '创建失败');
      }
    } catch {
      alert('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  const totalProb = prizes.reduce((sum, p) => sum + p.probability, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/lotteries">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">创建抽奖</h1>
          <p className="text-muted-foreground mt-1">
            设置奖品和抽奖规则
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">抽奖标题 *</Label>
              <Input
                id="title"
                placeholder="如：年会抽奖"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Input
                id="description"
                placeholder="抽奖活动的简单描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 抽奖模式 */}
        <Card>
          <CardHeader>
            <CardTitle>抽奖模式</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'wheel', label: '转盘', icon: '🎡' },
                { value: 'slot', label: '老虎机', icon: '🎰' },
                { value: 'card', label: '翻牌', icon: '🃏', disabled: true },
                { value: 'grid', label: '九宫格', icon: '⬜', disabled: true },
              ].map((m) => (
                <label
                  key={m.value}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                    mode === m.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-secondary/50'
                  } ${m.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={m.value}
                    checked={mode === m.value}
                    onChange={() => !m.disabled && setMode(m.value as LotteryMode)}
                    disabled={m.disabled}
                    className="sr-only"
                  />
                  <span className="text-3xl">{m.icon}</span>
                  <span className="font-medium">{m.label}</span>
                  {m.disabled && (
                    <span className="text-xs text-muted-foreground">即将推出</span>
                  )}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 奖品设置 */}
        <Card>
          <CardHeader>
            <CardTitle>奖品设置</CardTitle>
            <CardDescription>
              概率总和: {totalProb}%
              {Math.abs(totalProb - 100) > 0.01 && (
                <span className="text-destructive ml-2">
                  (应为100%)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prizes.map((prize, index) => (
              <div key={prize.id} className="flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="w-6 text-muted-foreground text-sm shrink-0">
                  {index + 1}.
                </span>
                <Input
                  placeholder="奖品名称"
                  value={prize.name}
                  onChange={(e) => updatePrize(prize.id, { name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="数量"
                  value={prize.count}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 1;
                    updatePrize(prize.id, { count, remaining: count });
                  }}
                  className="w-20"
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="概率"
                    value={prize.probability}
                    onChange={(e) => updatePrize(prize.id, { probability: parseFloat(e.target.value) || 0 })}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <input
                    type="checkbox"
                    checked={prize.isDefault || false}
                    onChange={(e) => updatePrize(prize.id, { isDefault: e.target.checked })}
                    className="rounded"
                  />
                  保底
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePrize(prize.id)}
                  disabled={prizes.length <= 2}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addPrize}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加奖品
            </Button>
          </CardContent>
        </Card>

        {/* 抽奖规则 */}
        <Card>
          <CardHeader>
            <CardTitle>抽奖规则</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>每人抽奖次数</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={maxDrawsPerUser}
                onChange={(e) => setMaxDrawsPerUser(parseInt(e.target.value) || 1)}
                className="w-32"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requirePhone}
                onChange={(e) => setRequirePhone(e.target.checked)}
                className="rounded"
              />
              <span>需要手机号验证</span>
            </label>
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-3">
          <Link href="/lotteries">
            <Button type="button" variant="outline">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? '创建中...' : '创建抽奖'}
          </Button>
        </div>
      </form>
    </div>
  );
}

