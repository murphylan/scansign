'use client';

import { useEffect, useState, useRef } from 'react';
import { Prize, WHEEL_COLORS } from '@/types/lottery';
import { cn } from '@/lib/utils';
import { Gift, Sparkles } from 'lucide-react';

interface LotteryCardProps {
  prizes: Prize[];
  spinning: boolean;
  targetPrizeId?: string;
  duration?: number;
  onSpinEnd?: () => void;
  cardCount?: number; // 卡片数量
}

export function LotteryCard({
  prizes,
  spinning,
  targetPrizeId,
  duration = 3000,
  onSpinEnd,
  cardCount = 9,
}: LotteryCardProps) {
  const [cards, setCards] = useState<Array<{id: string; prize: Prize | null; flipped: boolean; revealed: boolean}>>([]);
  const [winningCardIndex, setWinningCardIndex] = useState<number | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const prevSpinning = useRef(false);

  // 初始化卡片
  useEffect(() => {
    if (prizes.length === 0) return;
    
    const newCards = Array.from({ length: cardCount }, (_, i) => ({
      id: `card-${i}`,
      prize: null as Prize | null,
      flipped: false,
      revealed: false,
    }));
    setCards(newCards);
    setWinningCardIndex(null);
  }, [prizes, cardCount]);

  // 开始翻牌动画
  useEffect(() => {
    if (spinning && !prevSpinning.current && prizes.length > 0) {
      // 找到目标奖品
      let targetPrize = prizes[0];
      if (targetPrizeId) {
        const found = prizes.find(p => p.id === targetPrizeId);
        if (found) targetPrize = found;
      }

      // 随机选择一张卡片作为中奖卡
      const winIndex = Math.floor(Math.random() * cardCount);
      setWinningCardIndex(winIndex);

      // 洗牌动画
      setShuffling(true);
      
      // 为每张卡片分配奖品（只有中奖卡是真正的奖品）
      setTimeout(() => {
        setShuffling(false);
        
        setCards(prev => prev.map((card, i) => ({
          ...card,
          prize: i === winIndex ? targetPrize : prizes[Math.floor(Math.random() * prizes.length)],
          flipped: false,
          revealed: false,
        })));

        // 依次翻开所有卡片，最后翻开中奖卡
        const otherIndices = Array.from({ length: cardCount }, (_, i) => i).filter(i => i !== winIndex);
        const shuffledOthers = otherIndices.sort(() => Math.random() - 0.5);
        const flipOrder = [...shuffledOthers, winIndex];

        flipOrder.forEach((cardIndex, order) => {
          setTimeout(() => {
            setCards(prev => prev.map((card, i) => 
              i === cardIndex ? { ...card, flipped: true } : card
            ));

            // 如果是最后一张（中奖卡），添加揭示动画
            if (order === flipOrder.length - 1) {
              setTimeout(() => {
                setCards(prev => prev.map((card, i) => 
                  i === cardIndex ? { ...card, revealed: true } : card
                ));
                onSpinEnd?.();
              }, 300);
            }
          }, duration / cardCount * order + 500);
        });
      }, 800);
    }
    prevSpinning.current = spinning;
  }, [spinning, targetPrizeId, prizes, duration, onSpinEnd, cardCount]);

  if (prizes.length === 0) {
    return (
      <div className="text-center text-white/60 py-12">
        请添加奖品
      </div>
    );
  }

  const gridCols = cardCount <= 4 ? 2 : cardCount <= 6 ? 3 : 3;

  return (
    <div 
      className={cn(
        "grid gap-3",
        gridCols === 2 && "grid-cols-2",
        gridCols === 3 && "grid-cols-3",
      )}
      style={{ perspective: '1000px' }}
    >
      {cards.map((card, index) => (
        <div
          key={card.id}
          className={cn(
            "relative w-24 h-32 cursor-pointer transition-transform duration-300",
            shuffling && "animate-bounce",
            card.revealed && winningCardIndex === index && "scale-110 z-10",
          )}
          style={{
            transformStyle: 'preserve-3d',
            transform: card.flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            animationDelay: shuffling ? `${index * 50}ms` : '0ms',
          }}
        >
          {/* 卡片正面（背面） */}
          <div 
            className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 border-4 border-yellow-400/50 flex items-center justify-center backface-hidden shadow-lg"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-center">
              <Gift className="h-10 w-10 text-yellow-300 mx-auto mb-1" />
              <span className="text-yellow-200 text-xs font-bold">?</span>
            </div>
            {/* 装饰图案 */}
            <div className="absolute inset-2 border-2 border-yellow-400/30 rounded-lg" />
            <Sparkles className="absolute top-2 left-2 h-3 w-3 text-yellow-300/50" />
            <Sparkles className="absolute bottom-2 right-2 h-3 w-3 text-yellow-300/50" />
          </div>

          {/* 卡片反面（正面） */}
          <div 
            className={cn(
              "absolute inset-0 rounded-xl border-4 flex items-center justify-center backface-hidden shadow-lg",
              card.revealed && winningCardIndex === index
                ? "border-yellow-400 animate-pulse"
                : "border-white/30"
            )}
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              backgroundColor: card.prize 
                ? WHEEL_COLORS[prizes.findIndex(p => p.id === card.prize?.id) % WHEEL_COLORS.length]
                : '#333',
            }}
          >
            <div className="text-center p-2">
              {winningCardIndex === index && card.revealed && (
                <div className="text-2xl mb-1">🎉</div>
              )}
              <span className="text-white font-bold text-sm leading-tight block">
                {card.prize?.name || '?'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
