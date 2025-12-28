import { 
  BaseEntity, 
  BaseDisplayConfig,
} from './common';

// 字段类型
export type FieldType = 
  | 'text'       // 单行文本
  | 'textarea'   // 多行文本
  | 'number'     // 数字
  | 'phone'      // 手机号
  | 'email'      // 邮箱
  | 'radio'      // 单选
  | 'checkbox'   // 多选
  | 'select'     // 下拉选择
  | 'date'       // 日期
  | 'time'       // 时间
  | 'rating'     // 评分
  | 'image';     // 图片上传

// 字段验证规则
export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

// 选项（用于 radio/checkbox/select）
export interface FieldOption {
  value: string;
  label: string;
}

// 表单字段
export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FieldOption[];
  validation?: FieldValidation;
  // 评分特有配置
  ratingConfig?: {
    max: number;
    icon: 'star' | 'heart' | 'thumb';
  };
}

// 提交配置
export interface SubmitConfig {
  buttonText: string;
  showPreview: boolean;
  successMessage: string;
  redirectUrl?: string;
  redirectDelay?: number;
}

// 表单规则
export interface FormRules {
  limitOne: boolean;          // 每人限提交一次
  requirePhone: boolean;      // 需要手机号
  maxResponses?: number;      // 最大提交数
}

// 表单配置
export interface FormConfig {
  fields: FormField[];
  submit: SubmitConfig;
  rules: FormRules;
}

// 表单大屏配置
export interface FormDisplayConfig extends BaseDisplayConfig {
  showStats: boolean;
  showRecentResponses: boolean;
  statsType: 'count' | 'chart';
}

// 表单统计
export interface FormStats {
  responseCount: number;
  todayCount: number;
}

// 表单实体
export interface Form extends BaseEntity {
  type: 'form';
  config: FormConfig;
  display: FormDisplayConfig;
  stats: FormStats;
}

// 表单响应/提交
export interface FormResponse {
  id: string;
  formId: string;
  participantId: string;
  phone?: string;
  data: Record<string, unknown>;
  submittedAt: number;
  updatedAt?: number;
}

// 创建表单请求
export interface CreateFormRequest {
  title: string;
  description?: string;
  config?: Partial<FormConfig>;
  display?: Partial<FormDisplayConfig>;
  theme?: Partial<Form['theme']>;
  startTime?: number;
  endTime?: number;
}

// 更新表单请求
export interface UpdateFormRequest {
  title?: string;
  description?: string;
  config?: Partial<FormConfig>;
  display?: Partial<FormDisplayConfig>;
  theme?: Partial<Form['theme']>;
  status?: Form['status'];
  startTime?: number;
  endTime?: number;
}

// 提交表单请求
export interface SubmitFormRequest {
  phone?: string;
  data: Record<string, unknown>;
}

// 默认配置
export const DEFAULT_FORM_CONFIG: FormConfig = {
  fields: [],
  submit: {
    buttonText: '提交',
    showPreview: true,
    successMessage: '提交成功！感谢您的参与。',
  },
  rules: {
    limitOne: true,
    requirePhone: true,
  },
};

export const DEFAULT_FORM_DISPLAY: FormDisplayConfig = {
  template: 'default',
  qrCode: {
    show: true,
    position: 'bottom-right',
    size: 'md',
    style: 'default',
  },
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, #4a1d6a 0%, #22073a 50%, #0f0326 100%)',
  },
  showStats: true,
  showRecentResponses: true,
  statsType: 'count',
};

// 字段类型配置
export const FIELD_TYPE_CONFIG: Record<FieldType, { label: string; icon: string }> = {
  text: { label: '单行文本', icon: '📝' },
  textarea: { label: '多行文本', icon: '📄' },
  number: { label: '数字', icon: '🔢' },
  phone: { label: '手机号', icon: '📱' },
  email: { label: '邮箱', icon: '📧' },
  radio: { label: '单选', icon: '⭕' },
  checkbox: { label: '多选', icon: '☑️' },
  select: { label: '下拉选择', icon: '📋' },
  date: { label: '日期', icon: '📅' },
  time: { label: '时间', icon: '⏰' },
  rating: { label: '评分', icon: '⭐' },
  image: { label: '图片', icon: '🖼️' },
};

// 验证字段值
export function validateField(field: FormField, value: unknown): string | null {
  // 必填验证
  if (field.required) {
    if (value === undefined || value === null || value === '') {
      return `${field.label}不能为空`;
    }
    if (Array.isArray(value) && value.length === 0) {
      return `请选择${field.label}`;
    }
  }
  
  if (!value && !field.required) {
    return null;
  }
  
  const strValue = String(value);
  const validation = field.validation;
  
  // 长度验证
  if (validation?.minLength && strValue.length < validation.minLength) {
    return validation.message || `${field.label}至少${validation.minLength}个字符`;
  }
  if (validation?.maxLength && strValue.length > validation.maxLength) {
    return validation.message || `${field.label}最多${validation.maxLength}个字符`;
  }
  
  // 数值验证
  if (field.type === 'number') {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return `${field.label}必须是数字`;
    }
    if (validation?.min !== undefined && numValue < validation.min) {
      return validation.message || `${field.label}不能小于${validation.min}`;
    }
    if (validation?.max !== undefined && numValue > validation.max) {
      return validation.message || `${field.label}不能大于${validation.max}`;
    }
  }
  
  // 手机号验证
  if (field.type === 'phone') {
    if (!/^1[3-9]\d{9}$/.test(strValue)) {
      return '请输入正确的手机号';
    }
  }
  
  // 邮箱验证
  if (field.type === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
      return '请输入正确的邮箱地址';
    }
  }
  
  // 正则验证
  if (validation?.pattern) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(strValue)) {
      return validation.message || `${field.label}格式不正确`;
    }
  }
  
  return null;
}

