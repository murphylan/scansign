import { 
  BaseEntity, 
  BaseDisplayConfig,
} from './common';

// 抽奖模式
export type LotteryMode = 
  | 'wheel'      // 转盘
  | 'slot'       // 老虎机
  | 'card'       // 翻牌
  | 'grid';      // 九宫格

// 奖品
export interface Prize {
  id: string;
  name: string;
  image?: string;
  count: number;        // 总数量
  remaining: number;    // 剩余数量
  probability: number;  // 中奖概率 (0-100)
  isDefault?: boolean;  // 是否为保底奖（未中奖时的默认奖品）
}

// 抽奖配置
export interface LotteryConfig {
  prizes: Prize[];
  mode: LotteryMode;
  
  // 规则
  maxDrawsPerUser: number;   // 每人最多抽奖次数
  requirePhone: boolean;     // 需要手机号
  
  // 动画配置
  animation: {
    duration: number;        // 动画时长(ms)
    sound: boolean;          // 音效
  };
}

// 抽奖大屏配置
export interface LotteryDisplayConfig extends BaseDisplayConfig {
  showPrizeList: boolean;
  showWinners: boolean;
  showRemainingCount: boolean;
}

// 抽奖统计
export interface LotteryStats {
  totalDraws: number;         // 总抽奖次数
  participantCount: number;   // 参与人数
  winnersCount: number;       // 中奖人数
}

// 抽奖实体
export interface Lottery extends BaseEntity {
  type: 'lottery';
  config: LotteryConfig;
  display: LotteryDisplayConfig;
  stats: LotteryStats;
}

// 中奖记录
export interface WinRecord {
  id: string;
  lotteryId: string;
  participantId: string;
  phone?: string;
  name?: string;
  prizeId: string;
  prizeName: string;
  drawnAt: number;
}

// 创建抽奖请求
export interface CreateLotteryRequest {
  title: string;
  description?: string;
  config?: Partial<LotteryConfig>;
  display?: Partial<LotteryDisplayConfig>;
  theme?: Partial<Lottery['theme']>;
  startTime?: number;
  endTime?: number;
}

// 更新抽奖请求
export interface UpdateLotteryRequest {
  title?: string;
  description?: string;
  config?: Partial<LotteryConfig>;
  display?: Partial<LotteryDisplayConfig>;
  theme?: Partial<Lottery['theme']>;
  status?: Lottery['status'];
  startTime?: number;
  endTime?: number;
}

// 抽奖请求
export interface DrawRequest {
  phone?: string;
  name?: string;
}

// 抽奖结果
export interface DrawResult {
  success: boolean;
  won: boolean;
  prize?: Prize;
  record?: WinRecord;
  message: string;
  remainingDraws?: number;
}

// 默认配置
export const DEFAULT_LOTTERY_CONFIG: LotteryConfig = {
  prizes: [],
  mode: 'wheel',
  maxDrawsPerUser: 1,
  requirePhone: true,
  animation: {
    duration: 5000,
    sound: true,
  },
};

export const DEFAULT_LOTTERY_DISPLAY: LotteryDisplayConfig = {
  template: 'default',
  qrCode: {
    show: true,
    position: 'bottom-right',
    size: 'md',
    style: 'default',
  },
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, #ff6b6b 0%, #ffd93d 50%, #ff6b6b 100%)',
  },
  showPrizeList: true,
  showWinners: true,
  showRemainingCount: true,
};

// 转盘颜色
export const WHEEL_COLORS = [
  '#FF6B6B',
  '#FFD93D',
  '#6BCB77',
  '#4D96FF',
  '#C490E4',
  '#FF922E',
  '#00D4AA',
  '#5271FF',
];

// 根据概率抽奖
export function drawPrize(prizes: Prize[]): Prize | null {
  // 过滤有剩余的奖品
  const availablePrizes = prizes.filter(p => p.remaining > 0 && !p.isDefault);
  const defaultPrize = prizes.find(p => p.isDefault && p.remaining > 0);
  
  if (availablePrizes.length === 0) {
    return defaultPrize || null;
  }
  
  // 计算总概率
  const totalProb = availablePrizes.reduce((sum, p) => sum + p.probability, 0);
  
  // 随机数
  const rand = Math.random() * 100;
  
  let cumulative = 0;
  for (const prize of availablePrizes) {
    cumulative += prize.probability;
    if (rand <= cumulative) {
      return prize;
    }
  }
  
  // 如果没有中奖，返回保底奖
  return defaultPrize || null;
}

