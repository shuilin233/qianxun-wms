/**
 * API 封装 — 统一 baseURL、JWT 注入、错误处理
 */
const API_BASE = '/api';

const request = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  } catch (e) {
    // 网络错误：服务器未启动 / 无法连接
    console.error('网络请求失败:', e);
    throw new Error('无法连接到服务器，请确认后端已启动（http://localhost:5000）');
  }

  // 401 跳转登录
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.hash = '#login';
    throw new Error('登录已过期，请重新登录');
  }

  // 尝试解析 JSON，失败时给出明确提示
  let data;
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (e) {
      throw new Error('服务器返回了无效的 JSON 数据');
    }
  } else {
    // 非 JSON 响应（例如纯文本错误页）
    const text = await response.text();
    throw new Error(`服务器异常响应 (${response.status}): ${text.slice(0, 200)}`);
  }

  // 检查业务状态码
  if (data.code !== 200) {
    throw new Error(data.message || '请求失败');
  }

  return data;
};

// ============ 对外暴露的快捷方法 ============
const api = {
  get: (url, params) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(url + query, { method: 'GET' });
  },
  post: (url, body) => request(url, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  put: (url, body) => request(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  del: (url) => request(url, { method: 'DELETE' }),
};
