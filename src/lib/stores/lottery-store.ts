/**
 * 抽奖数据存储
 * 注意：当前使用内存存储，生产环境应使用 Redis 或数据库
 */

import {
  Lottery,
  WinRecord,
  CreateLotteryRequest,
  UpdateLotteryRequest,
  DEFAULT_LOTTERY_CONFIG,
  DEFAULT_LOTTERY_DISPLAY,
  drawPrize,
} from '@/types/lottery';
import { ThemeConfig } from '@/types/common';
import { generateCode, generateId } from '@/lib/utils/code-generator';

// 默认主题
const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#ff6b6b',
  backgroundColor: '#0a0a0a',
  backgroundGradient: 'linear-gradient(135deg, #ff6b6b 0%, #ffd93d 50%, #ff6b6b 100%)',
};

// 使用 global 对象存储，避免热重载时数据丢失
type Subscriber = (event: string, data: unknown) => void;

const globalForStore = globalThis as unknown as {
  lotteries?: Map<string, Lottery>;
  lotteriesByCode?: Map<string, Lottery>;
  winRecords?: Map<string, WinRecord[]>;
  userDrawCounts?: Map<string, Map<string, number>>;
  lotterySubscribers?: Map<string, Set<Subscriber>>;
};

// 内存存储（使用 global 缓存）
const lotteries = globalForStore.lotteries ?? new Map<string, Lottery>();
const lotteriesByCode = globalForStore.lotteriesByCode ?? new Map<string, Lottery>();
const winRecords = globalForStore.winRecords ?? new Map<string, WinRecord[]>();
const userDrawCounts = globalForStore.userDrawCounts ?? new Map<string, Map<string, number>>(); // lotteryId -> Map<phone, count>

// SSE 订阅者
const subscribers = globalForStore.lotterySubscribers ?? new Map<string, Set<Subscriber>>();

// 保存到 global
if (process.env.NODE_ENV !== 'production') {
  globalForStore.lotteries = lotteries;
  globalForStore.lotteriesByCode = lotteriesByCode;
  globalForStore.winRecords = winRecords;
  globalForStore.userDrawCounts = userDrawCounts;
  globalForStore.lotterySubscribers = subscribers;
}

/**
 * 通知订阅者
 */
function notifySubscribers(lotteryId: string, event: string, data: unknown) {
  const subs = subscribers.get(lotteryId);
  if (subs) {
    subs.forEach((callback) => callback(event, data));
  }
}

/**
 * 订阅抽奖事件
 */
export function subscribeLottery(lotteryId: string, callback: Subscriber): () => void {
  if (!subscribers.has(lotteryId)) {
    subscribers.set(lotteryId, new Set());
  }
  subscribers.get(lotteryId)!.add(callback);
  
  return () => {
    const subs = subscribers.get(lotteryId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(lotteryId);
      }
    }
  };
}

/**
 * 创建抽奖
 */
export function createLottery(request: CreateLotteryRequest): Lottery {
  const id = generateId();
  const code = generateCode();
  const now = Date.now();
  
  // 确保奖品有ID
  const prizes = (request.config?.prizes || []).map(prize => ({
    ...prize,
    id: prize.id || generateId(),
    remaining: prize.remaining ?? prize.count,
  }));
  
  const lottery: Lottery = {
    id,
    code,
    type: 'lottery',
    title: request.title,
    description: request.description,
    
    config: {
      ...DEFAULT_LOTTERY_CONFIG,
      ...request.config,
      prizes,
      animation: {
        ...DEFAULT_LOTTERY_CONFIG.animation,
        ...request.config?.animation,
      },
    },
    
    display: {
      ...DEFAULT_LOTTERY_DISPLAY,
      ...request.display,
      qrCode: {
        ...DEFAULT_LOTTERY_DISPLAY.qrCode,
        ...request.display?.qrCode,
      },
      background: {
        ...DEFAULT_LOTTERY_DISPLAY.background,
        ...request.display?.background,
      },
    },
    
    theme: {
      ...DEFAULT_THEME,
      ...request.theme,
    },
    
    stats: {
      totalDraws: 0,
      participantCount: 0,
      winnersCount: 0,
    },
    
    status: 'active',
    startTime: request.startTime,
    endTime: request.endTime,
    createdAt: now,
    updatedAt: now,
  };
  
  lotteries.set(id, lottery);
  lotteriesByCode.set(code, lottery);
  winRecords.set(id, []);
  userDrawCounts.set(id, new Map());
  
  return lottery;
}

/**
 * 根据ID获取抽奖
 */
export function getLotteryById(id: string): Lottery | undefined {
  return lotteries.get(id);
}

/**
 * 根据短码获取抽奖
 */
export function getLotteryByCode(code: string): Lottery | undefined {
  return lotteriesByCode.get(code);
}

/**
 * 获取所有抽奖列表
 */
export function getAllLotteries(): Lottery[] {
  return Array.from(lotteries.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 更新抽奖
 */
export function updateLottery(id: string, request: UpdateLotteryRequest): Lottery | undefined {
  const lottery = lotteries.get(id);
  if (!lottery) return undefined;
  
  // 处理奖品更新
  let updatedPrizes = lottery.config.prizes;
  if (request.config?.prizes) {
    updatedPrizes = request.config.prizes.map(prize => {
      const existing = lottery.config.prizes.find(p => p.id === prize.id);
      return {
        ...prize,
        id: prize.id || generateId(),
        remaining: prize.remaining ?? existing?.remaining ?? prize.count,
      };
    });
  }
  
  const updated: Lottery = {
    ...lottery,
    title: request.title ?? lottery.title,
    description: request.description ?? lottery.description,
    status: request.status ?? lottery.status,
    startTime: request.startTime ?? lottery.startTime,
    endTime: request.endTime ?? lottery.endTime,
    updatedAt: Date.now(),
    
    config: request.config ? {
      ...lottery.config,
      ...request.config,
      prizes: updatedPrizes,
      animation: {
        ...lottery.config.animation,
        ...request.config.animation,
      },
    } : lottery.config,
    
    display: request.display ? {
      ...lottery.display,
      ...request.display,
      qrCode: {
        ...lottery.display.qrCode,
        ...request.display.qrCode,
      },
      background: {
        ...lottery.display.background,
        ...request.display.background,
      },
    } : lottery.display,
    
    theme: request.theme ? {
      ...lottery.theme,
      ...request.theme,
    } : lottery.theme,
  };
  
  lotteries.set(id, updated);
  lotteriesByCode.set(updated.code, updated);
  
  return updated;
}

/**
 * 删除抽奖
 */
export function deleteLottery(id: string): boolean {
  const lottery = lotteries.get(id);
  if (!lottery) return false;
  
  lotteries.delete(id);
  lotteriesByCode.delete(lottery.code);
  winRecords.delete(id);
  userDrawCounts.delete(id);
  subscribers.delete(id);
  
  return true;
}

/**
 * 获取用户抽奖次数
 */
export function getUserDrawCount(lotteryId: string, phone: string): number {
  const counts = userDrawCounts.get(lotteryId);
  return counts?.get(phone) || 0;
}

/**
 * 执行抽奖
 */
export function executeDraw(
  lotteryId: string,
  phone?: string,
  name?: string,
): DrawResult {
  const lottery = lotteries.get(lotteryId);
  if (!lottery) {
    return { success: false, won: false, message: '抽奖活动不存在' };
  }
  
  if (lottery.status !== 'active') {
    return { success: false, won: false, message: '抽奖活动暂未开放' };
  }
  
  // 检查时间范围
  const now = Date.now();
  if (lottery.startTime && now < lottery.startTime) {
    return { success: false, won: false, message: '抽奖活动尚未开始' };
  }
  if (lottery.endTime && now > lottery.endTime) {
    return { success: false, won: false, message: '抽奖活动已结束' };
  }
  
  // 验证手机号
  if (lottery.config.requirePhone) {
    if (!phone) {
      return { success: false, won: false, message: '请输入手机号' };
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { success: false, won: false, message: '请输入正确的手机号' };
    }
  }
  
  // 检查抽奖次数
  if (phone) {
    const drawCount = getUserDrawCount(lotteryId, phone);
    if (drawCount >= lottery.config.maxDrawsPerUser) {
      return { 
        success: false, 
        won: false, 
        message: `您已抽奖${drawCount}次，已达上限`,
        remainingDraws: 0,
      };
    }
  }
  
  // 执行抽奖
  const prize = drawPrize(lottery.config.prizes);
  
  // 更新抽奖次数
  if (phone) {
    const counts = userDrawCounts.get(lotteryId) || new Map();
    const currentCount = counts.get(phone) || 0;
    counts.set(phone, currentCount + 1);
    userDrawCounts.set(lotteryId, counts);
    
    // 如果是新用户，增加参与人数
    if (currentCount === 0) {
      lottery.stats.participantCount++;
    }
  }
  
  // 更新统计
  lottery.stats.totalDraws++;
  
  if (!prize) {
    return { 
      success: true, 
      won: false, 
      message: '很遗憾，没有中奖',
      remainingDraws: phone 
        ? lottery.config.maxDrawsPerUser - getUserDrawCount(lotteryId, phone)
        : undefined,
    };
  }
  
  // 减少奖品数量
  const prizeInConfig = lottery.config.prizes.find(p => p.id === prize.id);
  if (prizeInConfig && prizeInConfig.remaining > 0) {
    prizeInConfig.remaining--;
  }
  
  // 创建中奖记录
  const record: WinRecord = {
    id: generateId(),
    lotteryId,
    participantId: phone || generateId(),
    phone,
    name,
    prizeId: prize.id,
    prizeName: prize.name,
    drawnAt: now,
  };
  
  // 添加记录
  const records = winRecords.get(lotteryId) || [];
  records.push(record);
  winRecords.set(lotteryId, records);
  
  // 更新中奖人数
  lottery.stats.winnersCount++;
  
  // 通知订阅者
  notifySubscribers(lotteryId, 'win', {
    record,
    prize,
    stats: lottery.stats,
    prizes: lottery.config.prizes,
  });
  
  return { 
    success: true, 
    won: true, 
    prize,
    record,
    message: `恭喜中奖：${prize.name}`,
    remainingDraws: phone 
      ? lottery.config.maxDrawsPerUser - getUserDrawCount(lotteryId, phone)
      : undefined,
  };
}

/**
 * 获取中奖记录列表
 */
export function getWinRecords(
  lotteryId: string,
  options?: { limit?: number; offset?: number }
): WinRecord[] {
  const records = winRecords.get(lotteryId) || [];
  const sorted = records.sort((a, b) => b.drawnAt - a.drawnAt);
  
  if (options?.limit) {
    const offset = options.offset || 0;
    return sorted.slice(offset, offset + options.limit);
  }
  
  return sorted;
}

/**
 * 获取中奖记录数量
 */
export function getWinRecordCount(lotteryId: string): number {
  return winRecords.get(lotteryId)?.length || 0;
}

/**
 * 重置抽奖
 */
export function resetLottery(lotteryId: string): boolean {
  const lottery = lotteries.get(lotteryId);
  if (!lottery) return false;
  
  // 重置奖品数量
  for (const prize of lottery.config.prizes) {
    prize.remaining = prize.count;
  }
  
  // 重置统计
  lottery.stats.totalDraws = 0;
  lottery.stats.participantCount = 0;
  lottery.stats.winnersCount = 0;
  
  // 清空记录
  winRecords.set(lotteryId, []);
  userDrawCounts.set(lotteryId, new Map());
  
  // 通知订阅者
  notifySubscribers(lotteryId, 'reset', {
    prizes: lottery.config.prizes,
    stats: lottery.stats,
  });
  
  return true;
}

/**
 * 检查短码是否存在
 */
export function isLotteryCodeExists(code: string): boolean {
  return lotteriesByCode.has(code);
}

