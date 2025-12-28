// 短码类型前缀
export type CodePrefix = 'c' | 'v' | 'l' | 'f' | 'p';

// 模块类型
export type ModuleType = 'checkin' | 'vote' | 'lottery' | 'form' | 'project';

// 实体状态
export type EntityStatus = 'draft' | 'active' | 'paused' | 'ended' | 'archived';

// 二维码位置
export type QRPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'hidden';

// 主题配置
export interface ThemeConfig {
  primaryColor: string;
  backgroundColor: string;
  backgroundImage?: string;
  backgroundGradient?: string;
  logo?: string;
  fontFamily?: string;
}

// 背景配置
export interface BackgroundConfig {
  type: 'color' | 'gradient' | 'image' | 'video';
  value: string;
}

// 二维码配置
export interface QRCodeConfig {
  show: boolean;
  position: QRPosition;
  size: 'sm' | 'md' | 'lg';
  style: 'default' | 'rounded' | 'dot';
}

// 大屏基础配置
export interface BaseDisplayConfig {
  template: string;
  qrCode: QRCodeConfig;
  background: BackgroundConfig;
}

// 基础实体接口
export interface BaseEntity {
  id: string;
  code: string;              // 6位短码
  title: string;
  description?: string;
  coverImage?: string;
  
  // 创建者
  creatorId?: string;
  
  // 时间范围
  startTime?: number;
  endTime?: number;
  
  // 主题配置
  theme: ThemeConfig;
  
  // 状态
  status: EntityStatus;
  
  createdAt: number;
  updatedAt: number;
}

// 参与者身份
export interface Participant {
  id: string;
  phone?: string;
  name?: string;
  avatar?: string;
  
  // 关联的签到记录
  checkinId?: string;
  
  createdAt: number;
}

// 自定义字段
export interface CustomField {
  id: string;
  type: 'text' | 'number' | 'select' | 'radio' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: Array<{ value: string; label: string }>;
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

