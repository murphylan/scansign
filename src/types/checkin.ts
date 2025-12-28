import { 
  BaseEntity, 
  BaseDisplayConfig, 
  CustomField, 
  Participant,
  QRPosition 
} from './common';

// 签到后行为类型
export type AfterCheckinType = 'message' | 'redirect' | 'none';

// 签到墙样式
export type WallStyle = 'danmaku' | 'grid' | 'list' | 'bubble';

// 部门信息
export interface Department {
  id: string;
  name: string;
}

// 签到字段配置
export interface CheckinFieldsConfig {
  phone: boolean;           // 手机号(默认必填)
  name: boolean;            // 姓名
  department: boolean;      // 部门
  custom: CustomField[];    // 自定义字段
}

// 签到后行为配置
export interface AfterCheckinConfig {
  type: AfterCheckinType;
  message?: string;
  redirectUrl?: string;
  showVerifyCode?: boolean;
  redirectDelay?: number;   // 跳转延迟(秒)
}

// 签到配置
export interface CheckinConfig {
  // 需要收集的信息
  fields: CheckinFieldsConfig;
  
  // 签到后行为
  afterCheckin: AfterCheckinConfig;
  
  // 是否允许重复签到
  allowRepeat: boolean;
  
  // 部门列表
  departments: Department[];
}

// 签到大屏配置
export interface CheckinDisplayConfig extends BaseDisplayConfig {
  // 签到墙样式
  wallStyle: WallStyle;
  
  // 显示统计
  showStats: boolean;
  
  // 显示最近签到列表
  showRecentList: boolean;
  
  // 显示部门
  showDepartment: boolean;
  
  // 欢迎语模板
  welcomeTemplate: string;
}

// 签到统计
export interface CheckinStats {
  total: number;
  today: number;
  byDepartment?: Record<string, number>;
}

// 签到实体
export interface Checkin extends BaseEntity {
  type: 'checkin';
  
  // 签到配置
  config: CheckinConfig;
  
  // 大屏配置
  display: CheckinDisplayConfig;
  
  // 统计
  stats: CheckinStats;
}

// 签到记录
export interface CheckinRecord {
  id: string;
  checkinId: string;
  participant: Participant;
  departmentId?: string;
  departmentName?: string;
  customData?: Record<string, unknown>;
  verifyCode: string;
  checkedInAt: number;
  isNewUser: boolean;
}

// 创建签到请求
export interface CreateCheckinRequest {
  title: string;
  description?: string;
  config?: Partial<CheckinConfig>;
  display?: Partial<CheckinDisplayConfig>;
  theme?: Partial<Checkin['theme']>;
  startTime?: number;
  endTime?: number;
}

// 更新签到请求
export interface UpdateCheckinRequest {
  title?: string;
  description?: string;
  config?: Partial<CheckinConfig>;
  display?: Partial<CheckinDisplayConfig>;
  theme?: Partial<Checkin['theme']>;
  status?: Checkin['status'];
  startTime?: number;
  endTime?: number;
}

// 执行签到请求
export interface DoCheckinRequest {
  phone: string;
  name?: string;
  departmentId?: string;
  customData?: Record<string, unknown>;
  verifyCode?: string;  // 老用户修改信息时需要
}

// 签到响应
export interface DoCheckinResponse {
  success: boolean;
  record: CheckinRecord;
  message: string;
  isUpdate: boolean;
}

// 默认配置
export const DEFAULT_CHECKIN_CONFIG: CheckinConfig = {
  fields: {
    phone: true,
    name: true,
    department: false,
    custom: [],
  },
  afterCheckin: {
    type: 'message',
    message: '签到成功！',
    showVerifyCode: true,
  },
  allowRepeat: false,
  departments: [],
};

export const DEFAULT_CHECKIN_DISPLAY: CheckinDisplayConfig = {
  template: 'default',
  qrCode: {
    show: true,
    position: 'bottom-right',
    size: 'md',
    style: 'default',
  },
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  wallStyle: 'danmaku',
  showStats: true,
  showRecentList: true,
  showDepartment: true,
  welcomeTemplate: '🎉 欢迎 {{name}} 加入！',
};

