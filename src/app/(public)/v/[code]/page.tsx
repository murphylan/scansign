'use client';

import { useEffect, useState, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Vote as VoteIcon,
  Phone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Vote, VoteOption } from '@/types/vote';
import { cn } from '@/lib/utils';
import { BarChart } from '@/components/display/vote-charts';

export default function VoteMobilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vote, setVote] = useState<Vote | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 表单状态
  const [phone, setPhone] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  // 已投票状态
  const [hasVoted, setHasVoted] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  
  // 成功状态
  const [success, setSuccess] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultOptions, setResultOptions] = useState<VoteOption[]>([]);
  const [resultStats, setResultStats] = useState<{ totalVotes: number; participantCount: number } | null>(null);

  useEffect(() => {
    async function fetchVote() {
      try {
        const res = await fetch(`/api/votes/code/${resolvedParams.code}`);
        if (res.ok) {
          const data = await res.json();
          setVote(data.data);
        } else {
          setError('投票不存在或已结束');
        }
      } catch {
        setError('加载失败，请刷新重试');
      } finally {
        setLoading(false);
      }
    }
    fetchVote();
  }, [resolvedParams.code]);

  // 检查手机号是否已投票
  async function checkPhone() {
    if (!vote?.config.requirePhone) return;
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return;
    
    setCheckingPhone(true);
    try {
      const res = await fetch(`/api/votes/${vote.id}/submit?phone=${phone}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data?.hasVoted) {
          setHasVoted(true);
          if (data.data.selectedOptions) {
            setSelectedOptions(data.data.selectedOptions);
          }
        } else {
          setHasVoted(false);
          setSelectedOptions([]);
        }
      }
    } catch {
      // ignore
    } finally {
      setCheckingPhone(false);
    }
  }

  function handleOptionSelect(optionId: string) {
    if (vote?.config.voteType === 'single') {
      setSelectedOptions([optionId]);
    } else {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(selectedOptions.filter((id) => id !== optionId));
      } else {
        const maxSelect = vote?.config.maxSelect || vote?.config.options.length || 999;
        if (selectedOptions.length < maxSelect) {
          setSelectedOptions([...selectedOptions, optionId]);
        }
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vote) return;
    
    if (selectedOptions.length === 0) {
      setError('请选择至少一个选项');
      return;
    }
    
    // 验证多选数量
    if (vote.config.voteType === 'multiple') {
      if (vote.config.minSelect && selectedOptions.length < vote.config.minSelect) {
        setError(`请至少选择 ${vote.config.minSelect} 个选项`);
        return;
      }
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/votes/${vote.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: vote.config.requirePhone ? phone : undefined,
          selectedOptions,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        
        // 显示结果
        if (data.data?.options && vote.config.showResult.afterVote) {
          setShowResult(true);
          setResultOptions(data.data.options);
          setResultStats(data.data.stats);
        }
      } else {
        setError(data.error || '投票失败');
      }
    } catch {
      setError('投票失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !vote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">无法加载</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 p-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <Card className="animate-fade-in-up">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {hasVoted ? '投票已更新' : '投票成功'}
              </h2>
              <p className="text-muted-foreground">
                感谢您参与 {vote?.title}
              </p>
            </CardContent>
          </Card>

          {/* 显示结果 */}
          {showResult && resultOptions.length > 0 && (
            <Card className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle>投票结果</CardTitle>
                <CardDescription>
                  共 {resultStats?.participantCount || 0} 人参与
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  options={resultOptions}
                  totalVotes={resultStats?.totalVotes || 0}
                  showPercentage
                  showCount
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 p-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center animate-fade-in-up">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <VoteIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{vote?.title}</h1>
          {vote?.description && (
            <p className="text-muted-foreground mt-2">{vote.description}</p>
          )}
          <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
            <span>
              {vote?.config.voteType === 'single' ? '单选' : `多选（${vote?.config.minSelect || 1}-${vote?.config.maxSelect || vote?.config.options.length}项）`}
            </span>
            {vote?.config.showResult.realtime && (
              <span>· 实时结果</span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 手机号 */}
          {vote?.config.requirePhone && (
            <Card className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    手机号 *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={checkPhone}
                    maxLength={11}
                    required
                  />
                  {checkingPhone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      检查中...
                    </p>
                  )}
                  {hasVoted && !checkingPhone && (
                    <p className="text-xs text-blue-500">
                      {vote.config.allowChange 
                        ? '您已投票，可以修改选择' 
                        : '您已投票'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 选项 */}
          <Card className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle>请选择</CardTitle>
              {vote?.config.voteType === 'multiple' && (
                <CardDescription>
                  已选 {selectedOptions.length}/{vote.config.maxSelect || vote.config.options.length} 项
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {vote?.config.options.map((option) => {
                const isSelected = selectedOptions.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleOptionSelect(option.id)}
                    disabled={hasVoted && !vote.config.allowChange}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-secondary/50',
                      hasVoted && !vote.config.allowChange && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/50'
                      )}
                    >
                      {isSelected && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{option.title}</p>
                      {option.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {option.description}
                        </p>
                      )}
                    </div>
                    {/* 实时显示票数 */}
                    {vote.config.showResult.realtime && (
                      <span className="text-sm text-muted-foreground">
                        {option.count} 票
                      </span>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          {(!hasVoted || vote?.config.allowChange) && (
            <Button 
              type="submit" 
              className="w-full h-12 text-lg animate-fade-in-up"
              style={{ animationDelay: '0.3s' }}
              disabled={submitting || selectedOptions.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  提交中...
                </>
              ) : hasVoted ? (
                '更新投票'
              ) : (
                '提交投票'
              )}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

