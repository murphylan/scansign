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
  Gift,
  Plus,
  Trash2,
  GripVertical,
  Save,
  ChevronDown,
  ChevronUp,
  Trophy,
} from 'lucide-react';
import { QRPosition } from '@/types/common';
import { getLotteryAction, updateLotteryAction } from '@/server/actions/lotteryAction';
import { BackgroundPicker, BackgroundConfig } from '@/components/shared/background-picker';
import { generateId } from '@/lib/utils/code-generator';

interface PrizeConfig {
  id: string;
  name: string;
  count: number;
  remaining: number;
}

interface LotteryConfig {
  mode?: string;
  requirePhone?: boolean;
  requireName?: boolean;
  prizes?: PrizeConfig[];
}

interface LotteryDisplay {
  showWinners?: boolean;
  qrCode?: {
    show?: boolean;
    position?: QRPosition;
    size?: string;
  };
  background?: BackgroundConfig;
}

const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: 'gradient',
  value: 'linear-gradient(135deg, #c75a2d 0%, #a83232 50%, #9b2d5e 100%)',
};

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

export default function LotterySettingsPage({
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

  // 奖品配置
  const [prizes, setPrizes] = useState<PrizeConfig[]>([]);

  // 抽奖模式
  const [mode, setMode] = useState<string>('wheel');

  // 规则配置
  const [requirePhone, setRequirePhone] = useState(true);
  const [requireName, setRequireName] = useState(true);

  // 大屏配置
  const [showWinners, setShowWinners] = useState(true);
  const [qrShow, setQrShow] = useState(true);
  const [qrPosition, setQrPosition] = useState<QRPosition>('bottom-right');
  const [qrSize, setQrSize] = useState<string>('md');
  const [background, setBackground] = useState<BackgroundConfig>(DEFAULT_BACKGROUND);

  const fetchLottery = useCallback(async () => {
    const res = await getLotteryAction(resolvedParams.id);
    if (res.success && res.data) {
      const data = res.data;
      setTitle(data.title);
      setDescription(data.description || '');

      // 解析 config
      const config = (data.config || {}) as LotteryConfig;
      setMode(config.mode || 'wheel');
      setRequirePhone(config.requirePhone ?? true);
      setRequireName(config.requireName ?? true);
      
      // 解析奖品
      if (config.prizes && config.prizes.length > 0) {
        setPrizes(config.prizes.map(p => ({
          id: p.id,
          name: p.name,
          count: p.count,
          remaining: p.remaining,
        })));
      } else {
        setPrizes([
          { id: generateId(), name: '一等奖', count: 1, remaining: 1 },
          { id: generateId(), name: '二等奖', count: 3, remaining: 3 },
          { id: generateId(), name: '三等奖', count: 5, remaining: 5 },
        ]);
      }

      // 解析 display
      const display = (data.display || {}) as LotteryDisplay;
      setShowWinners(display.showWinners ?? true);
      setQrShow(display.qrCode?.show ?? true);
      setQrPosition(display.qrCode?.position || 'bottom-right');
      setQrSize(display.qrCode?.size || 'md');
      if (display.background) {
        setBackground(display.background);
      }
    } else {
      toast.error('抽奖不存在');
      router.push('/lotteries');
    }
    setLoading(false);
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchLottery();
  }, [fetchLottery]);

  function addPrize() {
    const nextLevel = prizes.length + 1;
    const levelNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    const levelName = nextLevel <= 10 ? `${levelNames[nextLevel - 1]}等奖` : `${nextLevel}等奖`;
    
    setPrizes([
      ...prizes,
      { id: generateId(), name: levelName, count: 1, remaining: 1 },
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

    setSaving(true);
    try {
      const config = {
        mode,
        requirePhone,
        requireName,
        drawMode: 'host',
        animation: {
          duration: mode === 'wheel' ? 5000 : 3000,
          sound: true,
        },
      };

      const display = {
        showWinners,
        showPrizeList: true,
        qrCode: {
          show: qrShow,
          position: qrPosition,
          size: qrSize,
        },
        background,
      };

      const res = await updateLotteryAction(resolvedParams.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        prizes: validPrizes.map((p) => ({
          name: p.name,
          quantity: p.count,
          probability: 0,
        })),
        config: JSON.parse(JSON.stringify(config)),
        display: JSON.parse(JSON.stringify(display)),
      });

      if (res.success) {
        toast.success('保存成功');
        router.push(`/lotteries/${resolvedParams.id}`);
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

  const totalWinners = prizes.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/lotteries/${resolvedParams.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">抽奖设置</h1>
          <p className="text-muted-foreground mt-1">
            修改抽奖配置和大屏展示方式
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

        {/* 奖项设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              奖项设置
            </CardTitle>
            <CardDescription>
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
                  placeholder="奖项名称"
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
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 1;
                      updatePrize(prize.id, { count, remaining: count });
                    }}
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

        {/* 抽奖模式 */}
        <Card>
          <CardHeader>
            <CardTitle>抽奖动画</CardTitle>
            <CardDescription>选择大屏抽奖时的动画效果</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {LOTTERY_MODE_OPTIONS.map((m) => (
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
                    onChange={() => !m.disabled && setMode(m.value)}
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

        {/* 签到配置 */}
        <Card>
          <CardHeader>
            <CardTitle>参与方式</CardTitle>
            <CardDescription>
              用户扫码签到后，等待主持人在大屏上开奖
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
                <input
                  type="checkbox"
                  checked={requirePhone}
                  onChange={(e) => setRequirePhone(e.target.checked)}
                  className="rounded"
                />
                <span>需要手机号</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
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

        {/* 高级设置 */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <CardTitle className="flex items-center justify-between">
              大屏展示设置
              {showAdvanced ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CardTitle>
          </CardHeader>
          {showAdvanced && (
            <CardContent className="space-y-6">
              {/* 显示选项 */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWinners}
                    onChange={(e) => setShowWinners(e.target.checked)}
                    className="rounded"
                  />
                  <span>显示中奖名单</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qrShow}
                    onChange={(e) => setQrShow(e.target.checked)}
                    className="rounded"
                  />
                  <span>显示二维码</span>
                </label>
              </div>

              {/* 二维码位置 */}
              {qrShow && (
                <div className="space-y-4">
                  <Label>二维码位置</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 'top-left', label: '左上' },
                      { value: 'top-right', label: '右上' },
                      { value: 'bottom-left', label: '左下' },
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

                  <Label>二维码大小</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'sm', label: '小' },
                      { value: 'md', label: '中' },
                      { value: 'lg', label: '大' },
                    ].map((size) => (
                      <label
                        key={size.value}
                        className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                          qrSize === size.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-secondary/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="qrSize"
                          value={size.value}
                          checked={qrSize === size.value}
                          onChange={() => setQrSize(size.value)}
                          className="sr-only"
                        />
                        <span>{size.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
          <Link href={`/lotteries/${resolvedParams.id}`}>
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
