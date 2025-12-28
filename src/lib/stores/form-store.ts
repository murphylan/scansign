/**
 * 表单数据存储
 * 注意：当前使用内存存储，生产环境应使用 Redis 或数据库
 */

import {
  Form,
  FormResponse,
  FormField,
  CreateFormRequest,
  UpdateFormRequest,
  DEFAULT_FORM_CONFIG,
  DEFAULT_FORM_DISPLAY,
  validateField,
} from '@/types/form';
import { ThemeConfig } from '@/types/common';
import { generateCode, generateId } from '@/lib/utils/code-generator';

// 默认主题
const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#a855f7',
  backgroundColor: '#0a0a0a',
  backgroundGradient: 'linear-gradient(135deg, #4a1d6a 0%, #22073a 50%, #0f0326 100%)',
};

// 内存存储
const forms = new Map<string, Form>();
const formsByCode = new Map<string, Form>();
const formResponses = new Map<string, FormResponse[]>();

// SSE 订阅者
type Subscriber = (event: string, data: unknown) => void;
const subscribers = new Map<string, Set<Subscriber>>();

/**
 * 通知订阅者
 */
function notifySubscribers(formId: string, event: string, data: unknown) {
  const subs = subscribers.get(formId);
  if (subs) {
    subs.forEach((callback) => callback(event, data));
  }
}

/**
 * 订阅表单事件
 */
export function subscribeForm(formId: string, callback: Subscriber): () => void {
  if (!subscribers.has(formId)) {
    subscribers.set(formId, new Set());
  }
  subscribers.get(formId)!.add(callback);
  
  return () => {
    const subs = subscribers.get(formId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(formId);
      }
    }
  };
}

/**
 * 创建表单
 */
export function createForm(request: CreateFormRequest): Form {
  const id = generateId();
  const code = generateCode();
  const now = Date.now();
  
  // 确保字段有ID
  const fields = (request.config?.fields || []).map(field => ({
    ...field,
    id: field.id || generateId(),
  }));
  
  const form: Form = {
    id,
    code,
    type: 'form',
    title: request.title,
    description: request.description,
    
    config: {
      ...DEFAULT_FORM_CONFIG,
      ...request.config,
      fields,
      submit: {
        ...DEFAULT_FORM_CONFIG.submit,
        ...request.config?.submit,
      },
      rules: {
        ...DEFAULT_FORM_CONFIG.rules,
        ...request.config?.rules,
      },
    },
    
    display: {
      ...DEFAULT_FORM_DISPLAY,
      ...request.display,
      qrCode: {
        ...DEFAULT_FORM_DISPLAY.qrCode,
        ...request.display?.qrCode,
      },
      background: {
        ...DEFAULT_FORM_DISPLAY.background,
        ...request.display?.background,
      },
    },
    
    theme: {
      ...DEFAULT_THEME,
      ...request.theme,
    },
    
    stats: {
      responseCount: 0,
      todayCount: 0,
    },
    
    status: 'active',
    startTime: request.startTime,
    endTime: request.endTime,
    createdAt: now,
    updatedAt: now,
  };
  
  forms.set(id, form);
  formsByCode.set(code, form);
  formResponses.set(id, []);
  
  return form;
}

/**
 * 根据ID获取表单
 */
export function getFormById(id: string): Form | undefined {
  return forms.get(id);
}

/**
 * 根据短码获取表单
 */
export function getFormByCode(code: string): Form | undefined {
  return formsByCode.get(code);
}

/**
 * 获取所有表单列表
 */
export function getAllForms(): Form[] {
  return Array.from(forms.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 更新表单
 */
export function updateForm(id: string, request: UpdateFormRequest): Form | undefined {
  const form = forms.get(id);
  if (!form) return undefined;
  
  // 处理字段更新
  let updatedFields = form.config.fields;
  if (request.config?.fields) {
    updatedFields = request.config.fields.map(field => ({
      ...field,
      id: field.id || generateId(),
    }));
  }
  
  const updated: Form = {
    ...form,
    title: request.title ?? form.title,
    description: request.description ?? form.description,
    status: request.status ?? form.status,
    startTime: request.startTime ?? form.startTime,
    endTime: request.endTime ?? form.endTime,
    updatedAt: Date.now(),
    
    config: request.config ? {
      ...form.config,
      ...request.config,
      fields: updatedFields,
      submit: {
        ...form.config.submit,
        ...request.config.submit,
      },
      rules: {
        ...form.config.rules,
        ...request.config.rules,
      },
    } : form.config,
    
    display: request.display ? {
      ...form.display,
      ...request.display,
      qrCode: {
        ...form.display.qrCode,
        ...request.display.qrCode,
      },
      background: {
        ...form.display.background,
        ...request.display.background,
      },
    } : form.display,
    
    theme: request.theme ? {
      ...form.theme,
      ...request.theme,
    } : form.theme,
  };
  
  forms.set(id, updated);
  formsByCode.set(updated.code, updated);
  
  return updated;
}

/**
 * 删除表单
 */
export function deleteForm(id: string): boolean {
  const form = forms.get(id);
  if (!form) return false;
  
  forms.delete(id);
  formsByCode.delete(form.code);
  formResponses.delete(id);
  subscribers.delete(id);
  
  return true;
}

/**
 * 根据手机号查找表单响应
 */
export function findResponseByPhone(formId: string, phone: string): FormResponse | undefined {
  const responses = formResponses.get(formId) || [];
  return responses.find(r => r.phone === phone);
}

/**
 * 提交表单
 */
export function submitForm(
  formId: string,
  data: Record<string, unknown>,
  phone?: string,
): { success: boolean; response?: FormResponse; error?: string; isUpdate?: boolean } {
  const form = forms.get(formId);
  if (!form) {
    return { success: false, error: '表单不存在' };
  }
  
  if (form.status !== 'active') {
    return { success: false, error: '表单暂未开放' };
  }
  
  // 检查时间范围
  const now = Date.now();
  if (form.startTime && now < form.startTime) {
    return { success: false, error: '表单尚未开始' };
  }
  if (form.endTime && now > form.endTime) {
    return { success: false, error: '表单已结束' };
  }
  
  // 验证手机号
  if (form.config.rules.requirePhone) {
    if (!phone) {
      return { success: false, error: '请输入手机号' };
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { success: false, error: '请输入正确的手机号' };
    }
  }
  
  // 验证字段
  for (const field of form.config.fields) {
    const value = data[field.id];
    const error = validateField(field, value);
    if (error) {
      return { success: false, error };
    }
  }
  
  // 检查是否已提交
  const existingResponse = phone ? findResponseByPhone(formId, phone) : undefined;
  
  if (existingResponse && form.config.rules.limitOne) {
    return { success: false, error: '您已经提交过了' };
  }
  
  // 检查最大提交数
  const responses = formResponses.get(formId) || [];
  if (form.config.rules.maxResponses && responses.length >= form.config.rules.maxResponses) {
    return { success: false, error: '提交数量已达上限' };
  }
  
  // 创建响应
  const response: FormResponse = {
    id: generateId(),
    formId,
    participantId: phone || generateId(),
    phone,
    data,
    submittedAt: now,
  };
  
  // 添加响应
  responses.push(response);
  formResponses.set(formId, responses);
  
  // 更新统计
  form.stats.responseCount++;
  form.stats.todayCount++;
  
  // 通知订阅者
  notifySubscribers(formId, 'new', {
    response,
    stats: form.stats,
  });
  
  return { success: true, response, isUpdate: false };
}

/**
 * 获取表单响应列表
 */
export function getFormResponses(
  formId: string,
  options?: { limit?: number; offset?: number }
): FormResponse[] {
  const responses = formResponses.get(formId) || [];
  const sorted = responses.sort((a, b) => b.submittedAt - a.submittedAt);
  
  if (options?.limit) {
    const offset = options.offset || 0;
    return sorted.slice(offset, offset + options.limit);
  }
  
  return sorted;
}

/**
 * 获取表单响应数量
 */
export function getFormResponseCount(formId: string): number {
  return formResponses.get(formId)?.length || 0;
}

/**
 * 获取字段统计
 */
export function getFieldStats(formId: string, fieldId: string): Record<string, number> {
  const responses = formResponses.get(formId) || [];
  const stats: Record<string, number> = {};
  
  for (const response of responses) {
    const value = response.data[fieldId];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // 多选
        for (const v of value) {
          const key = String(v);
          stats[key] = (stats[key] || 0) + 1;
        }
      } else {
        // 单选或其他
        const key = String(value);
        stats[key] = (stats[key] || 0) + 1;
      }
    }
  }
  
  return stats;
}

/**
 * 检查短码是否存在
 */
export function isFormCodeExists(code: string): boolean {
  return formsByCode.has(code);
}

/**
 * 导出表单数据为 CSV 格式
 */
export function exportFormDataCSV(formId: string): string {
  const form = forms.get(formId);
  const responses = formResponses.get(formId) || [];
  
  if (!form || responses.length === 0) {
    return '';
  }
  
  // 表头
  const headers = ['提交时间', '手机号', ...form.config.fields.map(f => f.label)];
  
  // 数据行
  const rows = responses.map(response => {
    const row = [
      new Date(response.submittedAt).toLocaleString(),
      response.phone || '-',
      ...form.config.fields.map(field => {
        const value = response.data[field.id];
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value !== undefined ? String(value) : '-';
      }),
    ];
    return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

