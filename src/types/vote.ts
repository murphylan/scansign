import { 
  BaseEntity, 
  BaseDisplayConfig,
  Participant,
} from './common';

// 投票类型
export type VoteType = 'single' | 'multiple';

// 图表类型
export type ChartType = 'pie' | 'bar' | 'progress' | 'versus';

// 投票选项
export interface VoteOption {
  id: string;
  title: string;
  description?: string;
  image?: string;
  count: number;
}

// 结果展示配置
export interface ResultShowConfig {
  realtime: boolean;       // 投票中实时显示
  afterVote: boolean;      // 投票后显示
  afterEnd: boolean;       // 结束后显示
}

// 投票配置
export interface VoteConfig {
  // 选项
  options: VoteOption[];
  
  // 类型
  voteType: VoteType;
  minSelect?: number;       // 最少选择数(多选时)
  maxSelect?: number;       // 最多选择数(多选时)
  
  // 规则
  allowChange: boolean;     // 允许修改投票
  anonymous: boolean;       // 匿名投票
  requirePhone: boolean;    // 需要手机号验证
  
  // 结果展示
  showResult: ResultShowConfig;
}

// 投票大屏配置
export interface VoteDisplayConfig extends BaseDisplayConfig {
  chartType: ChartType;
  showPercentage: boolean;
  showCount: boolean;
  showVoterCount: boolean;
  animation: boolean;
  // 对决模式(versus)特有配置
  versusConfig?: {
    leftColor: string;
    rightColor: string;
  };
}

// 投票统计
export interface VoteStats {
  totalVotes: number;        // 总票数
  participantCount: number;  // 参与人数
}

// 投票实体
export interface Vote extends BaseEntity {
  type: 'vote';
  
  // 投票配置
  config: VoteConfig;
  
  // 大屏配置
  display: VoteDisplayConfig;
  
  // 统计
  stats: VoteStats;
}

// 投票记录
export interface VoteRecord {
  id: string;
  voteId: string;
  participantId: string;
  phone?: string;
  name?: string;
  selectedOptions: string[];  // 选择的选项ID列表
  votedAt: number;
  updatedAt?: number;
}

// 创建投票请求
export interface CreateVoteRequest {
  title: string;
  description?: string;
  config?: Partial<VoteConfig>;
  display?: Partial<VoteDisplayConfig>;
  theme?: Partial<Vote['theme']>;
  startTime?: number;
  endTime?: number;
}

// 更新投票请求
export interface UpdateVoteRequest {
  title?: string;
  description?: string;
  config?: Partial<VoteConfig>;
  display?: Partial<VoteDisplayConfig>;
  theme?: Partial<Vote['theme']>;
  status?: Vote['status'];
  startTime?: number;
  endTime?: number;
}

// 提交投票请求
export interface SubmitVoteRequest {
  phone?: string;
  name?: string;
  selectedOptions: string[];
}

// 提交投票响应
export interface SubmitVoteResponse {
  success: boolean;
  record: VoteRecord;
  message: string;
  isUpdate: boolean;
}

// 默认配置
export const DEFAULT_VOTE_CONFIG: VoteConfig = {
  options: [],
  voteType: 'single',
  minSelect: 1,
  maxSelect: 1,
  allowChange: false,
  anonymous: false,
  requirePhone: true,
  showResult: {
    realtime: true,
    afterVote: true,
    afterEnd: true,
  },
};

export const DEFAULT_VOTE_DISPLAY: VoteDisplayConfig = {
  template: 'default',
  qrCode: {
    show: true,
    position: 'bottom-right',
    size: 'md',
    style: 'default',
  },
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 50%, #1b263b 100%)',
  },
  chartType: 'bar',
  showPercentage: true,
  showCount: true,
  showVoterCount: true,
  animation: true,
};

// 计算选项百分比
export function calculatePercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

// 获取领先选项
export function getLeadingOption(options: VoteOption[]): VoteOption | null {
  if (options.length === 0) return null;
  return options.reduce((max, opt) => opt.count > max.count ? opt : max, options[0]);
}

