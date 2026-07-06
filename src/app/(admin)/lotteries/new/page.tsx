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
import { cn } from '@/lib/utils';

interface PrizeConfig {
  id: string;
  name: string;
  count: number;  // 中奖人数
  level: number;  // 奖项等级（1=一等奖，2=二等奖...）
}

const LOTTERY_MODE_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  icon: string;
  disabled?: boolean;
}> = [
  { value: "wheel", label: "转盘", icon: "🎡" },
  { value: "slot", label: "老虎机", icon: "🎰" },
  { value: "card", label: "翻牌", icon: "🃏" },
  { value: "grid", label: "九宫格", icon: "⬜" },
];

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/lotteries">
          <Button variant="ghost" size="icon" className="-ml-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
          <Gift className="h-5 w-5 text-amber-600" strokeWidth={1.9} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">创建抽奖</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">设置奖品，大屏抽奖</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 基本信息 */}
        <div className="rounded-2xl bg-cell p-5 shadow-sm">
          <h2 className="mb-4 text-[15px] font-semibold text-foreground">基本信息</h2>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">
                抽奖标题 <span className="text-primary">*</span>
              </Label>
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
          </div>
        </div>

        {/* 抽奖动画 */}
        <div className="rounded-2xl bg-cell p-5 shadow-sm">
          <h2 className="mb-1 text-[15px] font-semibold text-foreground">抽奖动画</h2>
          <p className="mb-4 text-sm text-muted-foreground">选择大屏抽奖时的动画效果</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {LOTTERY_MODE_OPTIONS.map((m) => (
              <label
                key={m.value}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition-colors',
                  mode === m.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border active:bg-muted',
                  m.disabled ? 'cursor-not-allowed opacity-50' : ''
                )}
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
                <span className="text-sm font-semibold">{m.label}</span>
                {m.disabled && (
                  <span className="text-xs text-muted-foreground">即将推出</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* 奖项设置 */}
        <div className="rounded-2xl bg-cell p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <Trophy className="h-4 w-4 text-amber-600" strokeWidth={1.9} />
              </div>
              <h2 className="text-[15px] font-semibold text-foreground">奖项设置</h2>
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              共 {totalWinners} 个中奖名额
            </span>
          </div>
          <div className="space-y-3">
            {prizes.map((prize, index) => (
              <div key={prize.id} className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 shrink-0 cursor-move text-muted-foreground" />
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <Input
                  placeholder="奖项名称（如：一等奖）"
                  value={prize.name}
                  onChange={(e) => updatePrize(prize.id, { name: e.target.value })}
                  className="flex-1"
                />
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    placeholder="人数"
                    value={prize.count}
                    onChange={(e) => updatePrize(prize.id, { count: parseInt(e.target.value) || 1 })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">人</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePrize(prize.id)}
                  disabled={prizes.length <= 1}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addPrize}
            className="mt-4 w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            添加奖项
          </Button>
        </div>

        {/* 参与方式 */}
        <div className="rounded-2xl bg-cell p-5 shadow-sm">
          <h2 className="mb-1 text-[15px] font-semibold text-foreground">参与方式</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            用户扫码签到后，等待主持人在大屏上开奖
          </p>
          <div className="rounded-xl bg-muted p-4">
            <h4 className="mb-2 text-sm font-semibold text-foreground">抽奖流程</h4>
            <ol className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="shrink-0 font-medium text-foreground">1.</span>用户扫码进入抽奖页面</li>
              <li className="flex gap-2"><span className="shrink-0 font-medium text-foreground">2.</span>输入手机号/姓名完成签到</li>
              <li className="flex gap-2"><span className="shrink-0 font-medium text-foreground">3.</span>大屏实时显示已签到用户</li>
              <li className="flex gap-2"><span className="shrink-0 font-medium text-foreground">4.</span>主持人点击「开始抽奖」按钮</li>
              <li className="flex gap-2"><span className="shrink-0 font-medium text-foreground">5.</span>系统从签到用户中随机抽取中奖者</li>
            </ol>
          </div>
          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={requirePhone}
                onChange={(e) => setRequirePhone(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">需要手机号</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={requireName}
                onChange={(e) => setRequireName(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">需要姓名</span>
            </label>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center gap-3 pt-1">
          <Link href="/lotteries" className="flex-1">
            <Button type="button" variant="outline" className="h-12 w-full">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="h-12 flex-1 text-base font-medium">
            {loading ? '创建中...' : '创建抽奖'}
          </Button>
        </div>
      </form>
    </div>
  );
}
