/**
 * 商品管理页 — 表格、搜索、新增/编辑模态框、删除
 */
async function renderProducts(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm">
      <!-- 顶部操作区 -->
      <div class="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b">
        <div class="flex items-center gap-3">
          <input type="text" id="product-search" placeholder="搜索编码或名称..." class="w-64">
          <button id="product-search-btn" class="btn bg-blue-600 text-white hover:bg-blue-700">
            <i class="fas fa-search"></i> 搜索
          </button>
          <button id="product-refresh-btn" class="btn bg-slate-100 text-slate-600 hover:bg-slate-200">
            <i class="fas fa-sync-alt"></i> 刷新
          </button>
        </div>
        <button id="product-add-btn" class="btn bg-emerald-600 text-white hover:bg-emerald-700">
          <i class="fas fa-plus"></i> 新增商品
        </button>
      </div>

      <!-- 表格容器 -->
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>编码</th>
              <th>名称</th>
              <th>分类</th>
              <th>单位</th>
              <th>安全库存</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="product-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  // 事件绑定
  document.getElementById('product-search-btn').onclick = () => loadProducts();
  document.getElementById('product-refresh-btn').onclick = () => loadProducts();
  document.getElementById('product-add-btn').onclick = () => openProductForm();
  document.getElementById('product-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadProducts();
  });

  await loadProducts();
}

async function loadProducts() {
  const tbody = document.getElementById('product-table-body');
  const keyword = document.getElementById('product-search').value.trim();
  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400">加载中...</td></tr>';

  try {
    const res = await api.get(`/products?keyword=${encodeURIComponent(keyword)}`);
    const products = res.data;

    if (!products || products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-box-open"></i><p>暂无商品数据</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td class="font-mono text-sm">${esc(p.code)}</td>
        <td class="font-medium">${esc(p.name)}</td>
        <td>${esc(p.category) || '-'}</td>
        <td>${esc(p.unit) || '个'}</td>
        <td>${p.warn_stock}</td>
        <td class="text-sm text-slate-500">${formatDate(p.create_time)}</td>
        <td>
          <button class="text-blue-600 hover:text-blue-800 mr-3" onclick="editProduct(${p.id})" title="编辑">
            <i class="fas fa-edit"></i>
          </button>
          <button class="text-red-500 hover:text-red-700" onclick="deleteProduct(${p.id}, '${esc(p.name)}')" title="删除">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500">加载失败: ${esc(e.message)}</td></tr>`;
  }
}

function openProductForm(product = null) {
  const isEdit = !!product;
  const title = isEdit ? '编辑商品' : '新增商品';

  // 先显示加载中（占位模态框）
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').innerHTML = '<div class="text-center py-8 text-gray-400">加载中...</div>';
  document.getElementById('modal-footer').innerHTML = '';
  overlay.classList.remove('hidden');

  // 动态获取分类列表
  api.get('/categories').then(res => {
    const categories = res.data || [];
    const categoryOptions = categories.map(c =>
      `<option value="${c.name}" ${product?.category === c.name ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    const html = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-1">商品编码 <span class="text-red-500">*</span></label>
          <input type="text" id="prod-code" value="${esc(product?.code || '')}" ${isEdit ? 'readonly class="w-full bg-gray-100"' : 'class="w-full"'}>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-1">商品名称 <span class="text-red-500">*</span></label>
          <input type="text" id="prod-name" value="${esc(product?.name || '')}" class="w-full">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">分类 <span class="text-red-500">*</span></label>
            <select id="prod-category" class="w-full">
              <option value="">请选择</option>
              ${categoryOptions}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">单位</label>
            <select id="prod-unit" class="w-full">
              ${['个','块','台','套','根','件','组','米','千克','升'].map(u =>
                `<option value="${u}" ${product?.unit === u ? 'selected' : ''}>${u}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-1">安全库存量</label>
          <input type="number" id="prod-warn" value="${product?.warn_stock ?? 0}" min="0" class="w-full">
        </div>
      </div>
    `;

    // 更新模态框内容
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-footer').innerHTML = `
      <button onclick="closeModal()" class="btn bg-slate-100 text-slate-600 hover:bg-slate-200">取消</button>
      <button id="modal-confirm-btn" class="btn bg-blue-600 text-white hover:bg-blue-700">${isEdit ? '保存' : '创建'}</button>
    `;
    document.getElementById('modal-confirm-btn').onclick = async () => {
      const btn = document.getElementById('modal-confirm-btn');
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '处理中...';
      try {
        const data = {
          code: document.getElementById('prod-code').value.trim(),
          name: document.getElementById('prod-name').value.trim(),
          category: document.getElementById('prod-category').value,
          unit: document.getElementById('prod-unit').value,
          warn_stock: (() => {
            const raw = document.getElementById('prod-warn').value.trim();
            if (raw === '' || raw === '0') return 0;
            const num = Number(raw);
            if (!Number.isInteger(num) || num < 0) {
              throw new Error('安全库存必须为非负整数');
            }
            return num;
          })(),
        };

        validateRequired(data, ['code', 'name', 'category']);

        if (isEdit) {
          await api.put(`/products/${product.id}`, data);
          showToast('商品更新成功', 'success');
        } else {
          await api.post('/products', data);
          showToast('商品创建成功', 'success');
        }
        closeModal();
        await loadProducts();
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    };
  }).catch(e => {
    document.getElementById('modal-content').innerHTML = `<div class="text-center py-8 text-red-500">加载分类失败: ${esc(e.message)}</div>`;
    document.getElementById('modal-footer').innerHTML = `<button onclick="closeModal()" class="btn bg-slate-100 text-slate-600 hover:bg-slate-200">关闭</button>`;
  });
}

function editProduct(id) {
  showToast('加载商品信息...', 'info');
  api.get(`/products/${id}`).then(res => {
    openProductForm(res.data);
  }).catch(e => showToast(e.message, 'error'));
}

function deleteProduct(id, name) {
  showConfirm(`确定要删除商品「${name}」吗？此操作不可恢复。`, async () => {
    await api.del(`/products/${id}`);
    showToast('商品已删除', 'success');
    await loadProducts();
  });
}

// esc() moved to utils.js
