/**
 * 投票数据存储
 * 注意：当前使用内存存储，生产环境应使用 Redis 或数据库
 */

import {
  Vote,
  VoteRecord,
  CreateVoteRequest,
  UpdateVoteRequest,
  DEFAULT_VOTE_CONFIG,
  DEFAULT_VOTE_DISPLAY,
} from '@/types/vote';
import { ThemeConfig } from '@/types/common';
import { generateCode, generateId } from '@/lib/utils/code-generator';

// 默认主题
const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#3b82f6',
  backgroundColor: '#0a0a0a',
  backgroundGradient: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 50%, #1b263b 100%)',
};

// 使用 global 对象存储，避免热重载时数据丢失
type Subscriber = (event: string, data: unknown) => void;

const globalForStore = globalThis as unknown as {
  votes?: Map<string, Vote>;
  votesByCode?: Map<string, Vote>;
  voteRecords?: Map<string, VoteRecord[]>;
  voteSubscribers?: Map<string, Set<Subscriber>>;
};

// 内存存储（使用 global 缓存）
const votes = globalForStore.votes ?? new Map<string, Vote>();
const votesByCode = globalForStore.votesByCode ?? new Map<string, Vote>();
const voteRecords = globalForStore.voteRecords ?? new Map<string, VoteRecord[]>();

// SSE 订阅者
const subscribers = globalForStore.voteSubscribers ?? new Map<string, Set<Subscriber>>();

// 保存到 global
if (process.env.NODE_ENV !== 'production') {
  globalForStore.votes = votes;
  globalForStore.votesByCode = votesByCode;
  globalForStore.voteRecords = voteRecords;
  globalForStore.voteSubscribers = subscribers;
}

/**
 * 通知订阅者
 */
function notifySubscribers(voteId: string, event: string, data: unknown) {
  const subs = subscribers.get(voteId);
  if (subs) {
    subs.forEach((callback) => callback(event, data));
  }
}

/**
 * 订阅投票事件
 */
export function subscribeVote(voteId: string, callback: Subscriber): () => void {
  if (!subscribers.has(voteId)) {
    subscribers.set(voteId, new Set());
  }
  subscribers.get(voteId)!.add(callback);
  
  return () => {
    const subs = subscribers.get(voteId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(voteId);
      }
    }
  };
}

/**
 * 创建投票
 */
export function createVote(request: CreateVoteRequest): Vote {
  const id = generateId();
  const code = generateCode();
  const now = Date.now();
  
  // 确保选项有ID
  const options = (request.config?.options || []).map(opt => ({
    ...opt,
    id: opt.id || generateId(),
    count: 0,
  }));
  
  const vote: Vote = {
    id,
    code,
    type: 'vote',
    title: request.title,
    description: request.description,
    
    config: {
      ...DEFAULT_VOTE_CONFIG,
      ...request.config,
      options,
      showResult: {
        ...DEFAULT_VOTE_CONFIG.showResult,
        ...request.config?.showResult,
      },
    },
    
    display: {
      ...DEFAULT_VOTE_DISPLAY,
      ...request.display,
      qrCode: {
        ...DEFAULT_VOTE_DISPLAY.qrCode,
        ...request.display?.qrCode,
      },
      background: {
        ...DEFAULT_VOTE_DISPLAY.background,
        ...request.display?.background,
      },
    },
    
    theme: {
      ...DEFAULT_THEME,
      ...request.theme,
    },
    
    stats: {
      totalVotes: 0,
      participantCount: 0,
    },
    
    status: 'active',
    startTime: request.startTime,
    endTime: request.endTime,
    createdAt: now,
    updatedAt: now,
  };
  
  votes.set(id, vote);
  votesByCode.set(code, vote);
  voteRecords.set(id, []);
  
  return vote;
}

/**
 * 根据ID获取投票
 */
export function getVoteById(id: string): Vote | undefined {
  return votes.get(id);
}

/**
 * 根据短码获取投票
 */
export function getVoteByCode(code: string): Vote | undefined {
  return votesByCode.get(code);
}

/**
 * 获取所有投票列表
 */
export function getAllVotes(): Vote[] {
  return Array.from(votes.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 更新投票
 */
export function updateVote(id: string, request: UpdateVoteRequest): Vote | undefined {
  const vote = votes.get(id);
  if (!vote) return undefined;
  
  // 处理选项更新，保留原有计数
  let updatedOptions = vote.config.options;
  if (request.config?.options) {
    updatedOptions = request.config.options.map(opt => {
      const existing = vote.config.options.find(o => o.id === opt.id);
      return {
        ...opt,
        id: opt.id || generateId(),
        count: existing?.count || 0,
      };
    });
  }
  
  const updated: Vote = {
    ...vote,
    title: request.title ?? vote.title,
    description: request.description ?? vote.description,
    status: request.status ?? vote.status,
    startTime: request.startTime ?? vote.startTime,
    endTime: request.endTime ?? vote.endTime,
    updatedAt: Date.now(),
    
    config: request.config ? {
      ...vote.config,
      ...request.config,
      options: updatedOptions,
      showResult: {
        ...vote.config.showResult,
        ...request.config.showResult,
      },
    } : vote.config,
    
    display: request.display ? {
      ...vote.display,
      ...request.display,
      qrCode: {
        ...vote.display.qrCode,
        ...request.display.qrCode,
      },
      background: {
        ...vote.display.background,
        ...request.display.background,
      },
    } : vote.display,
    
    theme: request.theme ? {
      ...vote.theme,
      ...request.theme,
    } : vote.theme,
  };
  
  votes.set(id, updated);
  votesByCode.set(updated.code, updated);
  
  return updated;
}

/**
 * 删除投票
 */
export function deleteVote(id: string): boolean {
  const vote = votes.get(id);
  if (!vote) return false;
  
  votes.delete(id);
  votesByCode.delete(vote.code);
  voteRecords.delete(id);
  subscribers.delete(id);
  
  return true;
}

/**
 * 根据手机号或参与者ID查找投票记录
 */
export function findVoteRecord(voteId: string, identifier: string): VoteRecord | undefined {
  const records = voteRecords.get(voteId) || [];
  return records.find(r => r.phone === identifier || r.participantId === identifier);
}

/**
 * 提交投票
 */
export function submitVote(
  voteId: string,
  selectedOptions: string[],
  phone?: string,
  name?: string,
): { success: boolean; record?: VoteRecord; error?: string; isUpdate?: boolean } {
  const vote = votes.get(voteId);
  if (!vote) {
    return { success: false, error: '投票不存在' };
  }
  
  if (vote.status !== 'active') {
    return { success: false, error: '投票暂未开放' };
  }
  
  // 检查时间范围
  const now = Date.now();
  if (vote.startTime && now < vote.startTime) {
    return { success: false, error: '投票尚未开始' };
  }
  if (vote.endTime && now > vote.endTime) {
    return { success: false, error: '投票已结束' };
  }
  
  // 验证手机号
  if (vote.config.requirePhone && !phone) {
    return { success: false, error: '请输入手机号' };
  }
  
  // 验证选项
  if (selectedOptions.length === 0) {
    return { success: false, error: '请至少选择一个选项' };
  }
  
  // 验证选项数量
  if (vote.config.voteType === 'single' && selectedOptions.length > 1) {
    return { success: false, error: '单选投票只能选择一个选项' };
  }
  
  if (vote.config.voteType === 'multiple') {
    if (vote.config.minSelect && selectedOptions.length < vote.config.minSelect) {
      return { success: false, error: `请至少选择 ${vote.config.minSelect} 个选项` };
    }
    if (vote.config.maxSelect && selectedOptions.length > vote.config.maxSelect) {
      return { success: false, error: `最多只能选择 ${vote.config.maxSelect} 个选项` };
    }
  }
  
  // 验证选项是否存在
  const validOptionIds = new Set(vote.config.options.map(o => o.id));
  for (const optId of selectedOptions) {
    if (!validOptionIds.has(optId)) {
      return { success: false, error: '选项不存在' };
    }
  }
  
  // 查找已有记录
  const identifier = phone || generateId();
  const existingRecord = phone ? findVoteRecord(voteId, phone) : undefined;
  
  if (existingRecord) {
    if (!vote.config.allowChange) {
      return { success: false, error: '您已经投过票了' };
    }
    
    // 更新投票：先减去旧选项计数
    for (const optId of existingRecord.selectedOptions) {
      const opt = vote.config.options.find(o => o.id === optId);
      if (opt && opt.count > 0) {
        opt.count--;
        vote.stats.totalVotes--;
      }
    }
    
    // 更新选项计数
    for (const optId of selectedOptions) {
      const opt = vote.config.options.find(o => o.id === optId);
      if (opt) {
        opt.count++;
        vote.stats.totalVotes++;
      }
    }
    
    // 更新记录
    existingRecord.selectedOptions = selectedOptions;
    existingRecord.updatedAt = now;
    existingRecord.name = name || existingRecord.name;
    
    // 通知订阅者
    notifySubscribers(voteId, 'update', {
      record: existingRecord,
      options: vote.config.options,
      stats: vote.stats,
    });
    
    return { success: true, record: existingRecord, isUpdate: true };
  }
  
  // 新投票
  const record: VoteRecord = {
    id: generateId(),
    voteId,
    participantId: identifier,
    phone,
    name,
    selectedOptions,
    votedAt: now,
  };
  
  // 添加记录
  const records = voteRecords.get(voteId) || [];
  records.push(record);
  voteRecords.set(voteId, records);
  
  // 更新选项计数
  for (const optId of selectedOptions) {
    const opt = vote.config.options.find(o => o.id === optId);
    if (opt) {
      opt.count++;
    }
  }
  
  // 更新统计
  vote.stats.totalVotes += selectedOptions.length;
  vote.stats.participantCount++;
  
  // 通知订阅者
  notifySubscribers(voteId, 'new', {
    record,
    options: vote.config.options,
    stats: vote.stats,
  });
  
  return { success: true, record, isUpdate: false };
}

/**
 * 获取投票记录列表
 */
export function getVoteRecords(
  voteId: string,
  options?: { limit?: number; offset?: number }
): VoteRecord[] {
  const records = voteRecords.get(voteId) || [];
  const sorted = records.sort((a, b) => b.votedAt - a.votedAt);
  
  if (options?.limit) {
    const offset = options.offset || 0;
    return sorted.slice(offset, offset + options.limit);
  }
  
  return sorted;
}

/**
 * 获取投票记录数量
 */
export function getVoteRecordCount(voteId: string): number {
  return voteRecords.get(voteId)?.length || 0;
}

/**
 * 检查短码是否存在
 */
export function isVoteCodeExists(code: string): boolean {
  return votesByCode.has(code);
}

/**
 * 重置投票结果
 */
export function resetVoteResults(voteId: string): boolean {
  const vote = votes.get(voteId);
  if (!vote) return false;
  
  // 重置选项计数
  for (const opt of vote.config.options) {
    opt.count = 0;
  }
  
  // 重置统计
  vote.stats.totalVotes = 0;
  vote.stats.participantCount = 0;
  
  // 清空记录
  voteRecords.set(voteId, []);
  
  // 通知订阅者
  notifySubscribers(voteId, 'reset', {
    options: vote.config.options,
    stats: vote.stats,
  });
  
  return true;
}

