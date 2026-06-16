/**
 * 工具函数 — 日期格式化、模态框控制、Toast提示
 */

// ============ 日期工具 ============
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ============ Toast 消息 ============
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const colors = {
    success: 'bg-green-500',
    error:   'bg-red-500',
    warning: 'bg-yellow-500',
    info:    'bg-blue-500',
  };
  const toast = document.createElement('div');
  toast.className = `${colors[type] || colors.info} text-white px-6 py-3 rounded-lg shadow-lg mb-2 transition-all duration-300 opacity-100 max-w-sm`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============ 模态框 ============
function showModal(title, contentHtml, onConfirm, confirmText = '确定') {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  const titleEl = document.getElementById('modal-title');
  const footer = document.getElementById('modal-footer');

  titleEl.textContent = title;
  content.innerHTML = contentHtml;
  footer.innerHTML = `
    <button id="modal-cancel" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">取消</button>
    <button id="modal-confirm" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition ml-2">${confirmText}</button>
  `;

  document.getElementById('modal-cancel').onclick = closeModal;
  document.getElementById('modal-confirm').onclick = async () => {
    const btn = document.getElementById('modal-confirm');
    btn.disabled = true;
    btn.textContent = '处理中...';
    try {
      await onConfirm();
      closeModal();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = confirmText;
    }
  };

  overlay.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// 关闭模态框 — 点击背景关闭
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }
});

// ============ 确认对话框 ============
function showConfirm(message, onConfirm) {
  showModal('确认操作', `<p class="text-gray-700">${message}</p>`, onConfirm, '确认删除');
}

// ============ 加载状态 ============
function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '<div class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><span class="ml-3 text-gray-500">加载中...</span></div>';
}

function showEmpty(containerId, message = '暂无数据') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="text-center py-12 text-gray-400"><i class="fas fa-inbox text-4xl mb-3"></i><p>${message}</p></div>`;
}

// ============ 表单验证 ============
function validateRequired(formData, fields) {
  const missing = fields.filter(f => {
    const val = formData[f];
    if (val === null || val === undefined) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    return false;
  });
  if (missing.length > 0) {
    throw new Error(`请填写: ${missing.join('、')}`);
  }
}

function validatePositiveInt(value, fieldName) {
  const num = parseInt(value, 10);
  if (isNaN(num) || num <= 0) {
    throw new Error(`${fieldName} 必须为正整数`);
  }
  return num;
}

// ============ HTML转义 ============
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
