/**
 * 应用入口 — 路由初始化、全局事件、登录状态管理
 */

// ============ 路由表 ============
const routes = {
  login:     { render: renderLogin,     guest: true },
  dashboard: { render: renderDashboard, guest: false },
  products:  { render: renderProducts,  guest: false },
  inbound:   { render: renderInbound,   guest: false },
  outbound:  { render: renderOutbound,  guest: false },
  stock:     { render: renderStock,     guest: false },
  records:   { render: renderRecords,   guest: false },
  report:    { render: renderReport,    guest: false },
};

// ============ 导航菜单配置 ============
const navItems = [
  { hash: 'dashboard', icon: 'fa-tachometer-alt', label: '首页' },
  { hash: 'products',  icon: 'fa-box',            label: '商品管理' },
  { hash: 'inbound',   icon: 'fa-sign-in-alt',     label: '入库' },
  { hash: 'outbound',  icon: 'fa-sign-out-alt',    label: '出库' },
  { hash: 'stock',     icon: 'fa-warehouse',       label: '库存查询' },
  { hash: 'records',   icon: 'fa-list-alt',        label: '库存流水' },
  { hash: 'report',    icon: 'fa-chart-bar',       label: '报表' },
];

// ============ 路由初始化 ============
function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  // 初始加载
  if (!window.location.hash) {
    window.location.hash = isLoggedIn() ? '#dashboard' : '#login';
  }
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  const route = routes[hash];

  // 未登录只允许访问 login
  if (!route || (route.guest === false && !isLoggedIn())) {
    window.location.hash = '#login';
    return;
  }
  if (route.guest === true && isLoggedIn()) {
    window.location.hash = '#dashboard';
    return;
  }

  // 根据页面类型选择正确的容器ID
  const containerId = (hash === 'login') ? 'login-page-content' : 'main-page-content';
  const container = document.getElementById(containerId);

  // 渲染页面
  showLoading(containerId);
  try {
    route.render(container);
  } catch (e) {
    console.error('路由渲染错误:', e);
    container.innerHTML = '<div class="text-center py-12 text-red-500">页面加载失败: ' + e.message + '</div>';
  }


  // 更新页面标题
  const titles = {
    dashboard: '首页',
    products: '商品管理',
    inbound: '入库管理',
    outbound: '出库管理',
    stock: '库存查询',
    records: '库存流水',
    report: '数据报表',
    login: '登录',
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[hash] || '千寻仓库管理系统';

  // 更新导航高亮
  updateNavActive(hash);

  // 登录页隐藏侧边栏和顶部栏
  const appShell = document.getElementById('app-shell');
  const loginShell = document.getElementById('login-shell');
  if (hash === 'login') {
    appShell.classList.add('hidden');
    loginShell.classList.remove('hidden');
  } else {
    appShell.classList.remove('hidden');
    loginShell.classList.add('hidden');
  }
}

function updateNavActive(hash) {
  document.querySelectorAll('.nav-item').forEach(item => {
    const isActive = item.dataset.hash === hash;
    item.classList.toggle('bg-blue-700', isActive);
    item.classList.toggle('text-white', isActive);
    item.classList.toggle('bg-opacity-30', isActive);
  });
}

// ============ 登录状态 ============
function isLoggedIn() {
  return !!localStorage.getItem('token');
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch { return {}; }
}

// ============ 退出登录 ============
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.hash = '#login';
}

// ============ 页面加载 ============
document.addEventListener('DOMContentLoaded', () => {
  initRouter();

  // 顶部栏用户信息
  const user = getCurrentUser();
  const userNameEl = document.getElementById('current-user-name');
  if (userNameEl) {
    userNameEl.textContent = user.username || '用户';
  }
});
