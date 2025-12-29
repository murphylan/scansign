/**
 * 签到数据存储
 * 注意：当前使用内存存储，生产环境应使用 Redis 或数据库
 */

import {
  Checkin,
  CheckinRecord,
  CreateCheckinRequest,
  UpdateCheckinRequest,
  DEFAULT_CHECKIN_CONFIG,
  DEFAULT_CHECKIN_DISPLAY,
} from '@/types/checkin';
import { ThemeConfig } from '@/types/common';
import { generateCode, generateId, generateVerifyCode } from '@/lib/utils/code-generator';

// 默认主题
const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#22c55e',
  backgroundColor: '#0a0a0a',
  backgroundGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
};

// 使用 global 对象存储，避免热重载时数据丢失
const globalForStore = globalThis as unknown as {
  checkins?: Map<string, Checkin>;
  checkinsByCode?: Map<string, Checkin>;
  checkinRecords?: Map<string, CheckinRecord[]>;
  checkinSubscribers?: Map<string, Set<Subscriber>>;
};

// 内存存储（使用 global 缓存）
const checkins = globalForStore.checkins ?? new Map<string, Checkin>();
const checkinsByCode = globalForStore.checkinsByCode ?? new Map<string, Checkin>();
const checkinRecords = globalForStore.checkinRecords ?? new Map<string, CheckinRecord[]>();

// SSE 订阅者
type Subscriber = (event: string, data: unknown) => void;
const subscribers = globalForStore.checkinSubscribers ?? new Map<string, Set<Subscriber>>();

// 保存到 global
if (process.env.NODE_ENV !== 'production') {
  globalForStore.checkins = checkins;
  globalForStore.checkinsByCode = checkinsByCode;
  globalForStore.checkinRecords = checkinRecords;
  globalForStore.checkinSubscribers = subscribers;
}

/**
 * 通知订阅者
 */
function notifySubscribers(checkinId: string, event: string, data: unknown) {
  const subs = subscribers.get(checkinId);
  if (subs) {
    subs.forEach((callback) => callback(event, data));
  }
}

/**
 * 订阅签到事件
 */
export function subscribeCheckin(checkinId: string, callback: Subscriber): () => void {
  if (!subscribers.has(checkinId)) {
    subscribers.set(checkinId, new Set());
  }
  subscribers.get(checkinId)!.add(callback);
  
  // 返回取消订阅函数
  return () => {
    const subs = subscribers.get(checkinId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(checkinId);
      }
    }
  };
}

/**
 * 创建签到
 */
export function createCheckin(request: CreateCheckinRequest): Checkin {
  const id = generateId();
  const code = generateCode();
  const now = Date.now();
  
  const checkin: Checkin = {
    id,
    code,
    type: 'checkin',
    title: request.title,
    description: request.description,
    
    config: {
      ...DEFAULT_CHECKIN_CONFIG,
      ...request.config,
      fields: {
        ...DEFAULT_CHECKIN_CONFIG.fields,
        ...request.config?.fields,
      },
      afterCheckin: {
        ...DEFAULT_CHECKIN_CONFIG.afterCheckin,
        ...request.config?.afterCheckin,
      },
    },
    
    display: {
      ...DEFAULT_CHECKIN_DISPLAY,
      ...request.display,
      qrCode: {
        ...DEFAULT_CHECKIN_DISPLAY.qrCode,
        ...request.display?.qrCode,
      },
      background: {
        ...DEFAULT_CHECKIN_DISPLAY.background,
        ...request.display?.background,
      },
    },
    
    theme: {
      ...DEFAULT_THEME,
      ...request.theme,
    },
    
    stats: {
      total: 0,
      today: 0,
    },
    
    status: 'active',
    startTime: request.startTime,
    endTime: request.endTime,
    createdAt: now,
    updatedAt: now,
  };
  
  checkins.set(id, checkin);
  checkinsByCode.set(code, checkin);
  checkinRecords.set(id, []);
  
  return checkin;
}

/**
 * 根据ID获取签到
 */
export function getCheckinById(id: string): Checkin | undefined {
  return checkins.get(id);
}

/**
 * 根据短码获取签到
 */
export function getCheckinByCode(code: string): Checkin | undefined {
  return checkinsByCode.get(code);
}

/**
 * 获取所有签到列表
 */
export function getAllCheckins(): Checkin[] {
  return Array.from(checkins.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 更新签到
 */
export function updateCheckin(id: string, request: UpdateCheckinRequest): Checkin | undefined {
  const checkin = checkins.get(id);
  if (!checkin) return undefined;
  
  const updated: Checkin = {
    ...checkin,
    title: request.title ?? checkin.title,
    description: request.description ?? checkin.description,
    status: request.status ?? checkin.status,
    startTime: request.startTime ?? checkin.startTime,
    endTime: request.endTime ?? checkin.endTime,
    updatedAt: Date.now(),
    
    config: request.config ? {
      ...checkin.config,
      ...request.config,
      fields: {
        ...checkin.config.fields,
        ...request.config.fields,
      },
      afterCheckin: {
        ...checkin.config.afterCheckin,
        ...request.config.afterCheckin,
      },
    } : checkin.config,
    
    display: request.display ? {
      ...checkin.display,
      ...request.display,
      qrCode: {
        ...checkin.display.qrCode,
        ...request.display.qrCode,
      },
      background: {
        ...checkin.display.background,
        ...request.display.background,
      },
    } : checkin.display,
    
    theme: request.theme ? {
      ...checkin.theme,
      ...request.theme,
    } : checkin.theme,
  };
  
  checkins.set(id, updated);
  checkinsByCode.set(updated.code, updated);
  
  return updated;
}

/**
 * 删除签到
 */
export function deleteCheckin(id: string): boolean {
  const checkin = checkins.get(id);
  if (!checkin) return false;
  
  checkins.delete(id);
  checkinsByCode.delete(checkin.code);
  checkinRecords.delete(id);
  subscribers.delete(id);
  
  return true;
}

/**
 * 根据手机号查找签到记录
 */
export function findRecordByPhone(checkinId: string, phone: string): CheckinRecord | undefined {
  const records = checkinRecords.get(checkinId) || [];
  return records.find(r => r.participant.phone === phone);
}

/**
 * 执行签到
 */
export function doCheckin(
  checkinId: string,
  phone: string,
  name?: string,
  departmentId?: string,
  customData?: Record<string, unknown>,
  verifyCode?: string
): { success: boolean; record?: CheckinRecord; error?: string; isUpdate?: boolean } {
  const checkin = checkins.get(checkinId);
  if (!checkin) {
    return { success: false, error: '签到不存在' };
  }
  
  if (checkin.status !== 'active') {
    return { success: false, error: '签到暂未开放' };
  }
  
  // 检查时间范围
  const now = Date.now();
  if (checkin.startTime && now < checkin.startTime) {
    return { success: false, error: '签到尚未开始' };
  }
  if (checkin.endTime && now > checkin.endTime) {
    return { success: false, error: '签到已结束' };
  }
  
  // 查找已有记录
  const existingRecord = findRecordByPhone(checkinId, phone);
  
  if (existingRecord) {
    // 老用户
    if (!checkin.config.allowRepeat) {
      // 需要验证码才能修改
      if (verifyCode !== existingRecord.verifyCode) {
        return { 
          success: false, 
          error: verifyCode ? '验证码错误' : '请输入验证码',
        };
      }
    }
    
    // 更新记录
    const departmentName = departmentId 
      ? checkin.config.departments.find(d => d.id === departmentId)?.name 
      : existingRecord.departmentName;
    
    const updatedRecord: CheckinRecord = {
      ...existingRecord,
      participant: {
        ...existingRecord.participant,
        name: name || existingRecord.participant.name,
      },
      departmentId: departmentId || existingRecord.departmentId,
      departmentName: departmentName || existingRecord.departmentName,
      customData: customData || existingRecord.customData,
      checkedInAt: now,
      isNewUser: false,
    };
    
    // 更新记录列表
    const records = checkinRecords.get(checkinId) || [];
    const index = records.findIndex(r => r.id === existingRecord.id);
    if (index !== -1) {
      records[index] = updatedRecord;
    }
    
    // 通知订阅者
    notifySubscribers(checkinId, 'update', updatedRecord);
    
    return { success: true, record: updatedRecord, isUpdate: true };
  }
  
  // 新用户
  const departmentName = departmentId 
    ? checkin.config.departments.find(d => d.id === departmentId)?.name 
    : undefined;
  
  const record: CheckinRecord = {
    id: generateId(),
    checkinId,
    participant: {
      id: generateId(),
      phone,
      name,
      createdAt: now,
    },
    departmentId,
    departmentName,
    customData,
    verifyCode: generateVerifyCode(),
    checkedInAt: now,
    isNewUser: true,
  };
  
  // 添加记录
  const records = checkinRecords.get(checkinId) || [];
  records.push(record);
  checkinRecords.set(checkinId, records);
  
  // 更新统计
  checkin.stats.total++;
  checkin.stats.today++;
  
  // 按部门统计
  if (departmentId) {
    if (!checkin.stats.byDepartment) {
      checkin.stats.byDepartment = {};
    }
    checkin.stats.byDepartment[departmentId] = 
      (checkin.stats.byDepartment[departmentId] || 0) + 1;
  }
  
  // 通知订阅者
  notifySubscribers(checkinId, 'new', record);
  
  return { success: true, record, isUpdate: false };
}

/**
 * 获取签到记录列表
 */
export function getCheckinRecords(
  checkinId: string,
  options?: { limit?: number; offset?: number }
): CheckinRecord[] {
  const records = checkinRecords.get(checkinId) || [];
  const sorted = records.sort((a, b) => b.checkedInAt - a.checkedInAt);
  
  if (options?.limit) {
    const offset = options.offset || 0;
    return sorted.slice(offset, offset + options.limit);
  }
  
  return sorted;
}

/**
 * 获取签到记录数量
 */
export function getCheckinRecordCount(checkinId: string): number {
  return checkinRecords.get(checkinId)?.length || 0;
}

/**
 * 检查短码是否存在
 */
export function isCodeExists(code: string): boolean {
  return checkinsByCode.has(code);
}

