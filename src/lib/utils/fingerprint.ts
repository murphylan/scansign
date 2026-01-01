/**
 * 设备指纹工具 - 客户端使用
 * 用于生成和存储设备唯一标识
 */

// 生成简单的设备指纹（基于浏览器特征）
export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return '';
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    // Canvas 指纹
    getCanvasFingerprint(),
  ];
  
  return hashCode(components.join('|'));
}

// Canvas 指纹
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    canvas.width = 200;
    canvas.height = 50;
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 100, 50);
    ctx.fillStyle = '#069';
    ctx.fillText('Hello, World!', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Hello, World!', 4, 17);
    
    return canvas.toDataURL().slice(-50);
  } catch {
    return '';
  }
}

// 简单的哈希函数
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // 转换为正数的 16 进制字符串
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// 存储签到记录到本地（防止清除 cookie 后重复签到）
export function getLocalCheckinRecords(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  
  try {
    const data = localStorage.getItem('murphy_checkin_records');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveLocalCheckinRecord(checkinCode: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const records = getLocalCheckinRecords();
    records[checkinCode] = Date.now();
    localStorage.setItem('murphy_checkin_records', JSON.stringify(records));
  } catch {
    // ignore
  }
}

export function hasLocalCheckinRecord(checkinCode: string): boolean {
  const records = getLocalCheckinRecords();
  return !!records[checkinCode];
}

// 生成设备 ID（持久化存储）
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  const key = 'murphy_device_id';
  let deviceId = localStorage.getItem(key);
  
  if (!deviceId) {
    deviceId = generateDeviceFingerprint() + '_' + Date.now().toString(36);
    localStorage.setItem(key, deviceId);
  }
  
  return deviceId;
}
