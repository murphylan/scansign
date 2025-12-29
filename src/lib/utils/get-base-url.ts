/**
 * 从请求头获取基础 URL
 * 优先级：环境变量 > x-forwarded-host > host 请求头 > request.url > fallback
 */
export function getBaseUrlFromRequest(request: Request): string {
  // 1. 优先使用环境变量
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  try {
    // 2. 从请求头获取实际访问的主机名
    const headers = request.headers;
    
    // 获取协议 (http/https)
    const forwardedProto = headers.get('x-forwarded-proto');
    const protocol = forwardedProto || 'http';
    
    // 获取主机名 - 优先使用 x-forwarded-host (代理场景)
    const forwardedHost = headers.get('x-forwarded-host');
    const host = headers.get('host');
    const actualHost = forwardedHost || host;
    
    if (actualHost) {
      return `${protocol}://${actualHost}`;
    }
    
    // 3. 从 request.url 获取 (备用)
    const url = new URL(request.url);
    return url.origin;
  } catch {
    // fallback
  }
  
  return 'http://localhost:3000';
}

/**
 * 客户端获取基础 URL
 */
export function getClientBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
