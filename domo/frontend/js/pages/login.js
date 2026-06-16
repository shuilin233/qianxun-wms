/**
 * 登录页
 */
function renderLogin(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl p-8">
      <div class="text-center mb-8">
        <i class="fas fa-warehouse text-5xl text-blue-600 mb-4"></i>
        <h2 class="text-2xl font-bold text-slate-800">千寻仓库管理系统</h2>
        <p class="text-slate-500 mt-1">请登录以继续</p>
      </div>

      <form id="login-form" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-1">用户名</label>
          <input type="text" id="login-username" placeholder="请输入用户名" class="w-full" autocomplete="username">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-1">密码</label>
          <input type="password" id="login-password" placeholder="请输入密码" class="w-full" autocomplete="current-password">
        </div>
        <button type="submit" id="login-btn" class="btn w-full justify-center bg-blue-600 text-white hover:bg-blue-700 py-2.5 font-medium">
          <i class="fas fa-sign-in-alt"></i> 登录
        </button>
      </form>

      <div class="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      document.getElementById('current-user-name').textContent = res.data.user.username;
      showToast('登录成功', 'success');
      window.location.hash = '#dashboard';
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登录';
    }
  });
}
