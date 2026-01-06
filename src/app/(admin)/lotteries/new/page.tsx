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
  Gift,
  Plus,
  Trash2,
  GripVertical,
  Users,
  Trophy,
} from 'lucide-react';
import { LotteryMode } from '@/types/lottery';
import { generateId } from '@/lib/utils/code-generator';
import { createLotteryAction } from '@/server/actions/lotteryAction';

interface PrizeConfig {
  id: string;
  name: string;
  count: number;  // 中奖人数
  level: number;  // 奖项等级（1=一等奖，2=二等奖...）
}

export default function NewLotteryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 基本信息
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // 奖品配置（简化：只需名称和中奖人数）
  const [prizes, setPrizes] = useState<PrizeConfig[]>([
    { id: generateId(), name: '一等奖', count: 1, level: 1 },
    { id: generateId(), name: '二等奖', count: 3, level: 2 },
    { id: generateId(), name: '三等奖', count: 5, level: 3 },
  ]);

  // 模式
  const [mode, setMode] = useState<LotteryMode>('wheel');

  // 规则
  const [requirePhone, setRequirePhone] = useState(true);
  const [requireName, setRequireName] = useState(true);

  function addPrize() {
    const nextLevel = prizes.length + 1;
    const levelNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    const levelName = nextLevel <= 10 ? `${levelNames[nextLevel - 1]}等奖` : `${nextLevel}等奖`;
    
    setPrizes([
      ...prizes,
      { id: generateId(), name: levelName, count: 1, level: nextLevel },
    ]);
  }

  function removePrize(id: string) {
    if (prizes.length <= 1) {
      toast.error('至少需要1个奖项');
      return;
    }
    setPrizes(prizes.filter((p) => p.id !== id));
  }

  function updatePrize(id: string, updates: Partial<PrizeConfig>) {
    setPrizes(prizes.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('请输入抽奖标题');
      return;
    }

    const validPrizes = prizes.filter((p) => p.name.trim() && p.count > 0);
    if (validPrizes.length < 1) {
      toast.error('请至少设置1个有效奖项');
      return;
    }

    setLoading(true);
    try {
      const config = {
        mode,
        requirePhone,
        requireName,
        // 新的抽奖模式：主持人从签到用户池中抽取
        drawMode: 'host',  // 'host' = 主持人抽奖, 'self' = 自助抽奖
        animation: {
          duration: mode === 'wheel' ? 5000 : 3000,
          sound: true,
        },
      };

      const res = await createLotteryAction({
        title: title.trim(),
        description: description.trim() || undefined,
        prizes: validPrizes.map((p, index) => ({
          name: p.name,
          quantity: p.count,
          probability: 0, // 不再使用概率，改用随机抽取
        })),
        config: JSON.parse(JSON.stringify(config)),
      });

      if (res.success) {
        toast.success('创建成功');
        router.push(`/lotteries/${res.data?.id}`);
      } else {
        toast.error(res.error || '创建失败');
      }
    } catch {
      toast.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  const totalWinners = prizes.reduce((sum, p) => sum + p.count, 0);

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
            设置奖品，大屏抽奖
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
                placeholder="如：年会幸运大抽奖"
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
            <CardTitle>抽奖动画</CardTitle>
            <CardDescription>选择大屏抽奖时的动画效果</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'wheel', label: '转盘', icon: '🎡' },
                { value: 'slot', label: '老虎机', icon: '🎰' },
                { value: 'card', label: '翻牌', icon: '🃏' },
                { value: 'grid', label: '九宫格', icon: '⬜' },
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
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              奖项设置
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              共 {totalWinners} 个中奖名额
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prizes.map((prize, index) => (
              <div key={prize.id} className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground shrink-0 cursor-move" />
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                  {index + 1}
                </div>
                <Input
                  placeholder="奖项名称（如：一等奖）"
                  value={prize.name}
                  onChange={(e) => updatePrize(prize.id, { name: e.target.value })}
                  className="flex-1"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    placeholder="人数"
                    value={prize.count}
                    onChange={(e) => updatePrize(prize.id, { count: parseInt(e.target.value) || 1 })}
                    className="w-20"
                  />
                  <span className="text-muted-foreground text-sm">人</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePrize(prize.id)}
                  disabled={prizes.length <= 1}
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
              添加奖项
            </Button>
          </CardContent>
        </Card>

        {/* 签到规则 */}
        <Card>
          <CardHeader>
            <CardTitle>参与方式</CardTitle>
            <CardDescription>
              用户扫码签到后，等待主持人在大屏上开奖
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
              <h4 className="font-medium">抽奖流程：</h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>用户扫码进入抽奖页面</li>
                <li>输入手机号/姓名完成签到</li>
                <li>大屏实时显示已签到用户</li>
                <li>主持人点击"开始抽奖"按钮</li>
                <li>系统从签到用户中随机抽取中奖者</li>
              </ol>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirePhone}
                  onChange={(e) => setRequirePhone(e.target.checked)}
                  className="rounded"
                />
                <span>需要手机号</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireName}
                  onChange={(e) => setRequireName(e.target.checked)}
                  className="rounded"
                />
                <span>需要姓名</span>
              </label>
            </div>
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
