/**
 * 出库单页面 — 动态添加商品行、创建出库单、确认出库、库存不足提示
 */
let outboundProductCache = [];

async function renderOutbound(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- 创建出库单区域 -->
      <div class="bg-white rounded-xl shadow-sm">
        <div class="px-6 py-4 border-b">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <i class="fas fa-sign-out-alt text-orange-600"></i> 创建出库单
          </h2>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">客户（可选）</label>
            <input type="text" id="outbound-customer" placeholder="例如：张三便利店" class="w-full max-w-md">
          </div>
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-slate-600">商品明细</label>
              <button id="outbound-add-row" class="btn bg-orange-100 text-orange-700 hover:bg-orange-200 text-sm">
                <i class="fas fa-plus"></i> 添加商品
              </button>
            </div>
            <div class="overflow-x-auto border rounded-lg">
              <table>
                <thead>
                  <tr>
                    <th style="width:35%">商品</th>
                    <th style="width:20%">出库数量</th>
                    <th style="width:20%">当前库存</th>
                    <th style="width:10%">操作</th>
                  </tr>
                </thead>
                <tbody id="outbound-detail-body">
                  <tr><td colspan="4"><div class="empty-state"><i class="fas fa-boxes"></i><p>请点击"添加商品"</p></div></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button id="outbound-create-btn" class="btn bg-orange-600 text-white hover:bg-orange-700">
              <i class="fas fa-save"></i> 创建出库单
            </button>
            <button id="outbound-reset-btn" class="btn bg-slate-100 text-slate-600 hover:bg-slate-200">
              <i class="fas fa-redo"></i> 清空
            </button>
          </div>
        </div>
      </div>

      <!-- 出库单列表 -->
      <div class="bg-white rounded-xl shadow-sm">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-lg font-semibold"><i class="fas fa-list text-slate-500 mr-2"></i>出库单列表</h2>
          <button id="outbound-list-refresh" class="btn bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm">
            <i class="fas fa-sync-alt"></i> 刷新
          </button>
        </div>
        <div class="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>单号</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>确认时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="outbound-order-list"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // 预加载商品 + 库存
  try {
    const res = await api.get('/products');
    outboundProductCache = res.data || [];
  } catch {
    outboundProductCache = [];
  }

  await loadStockMap();
  addOutboundRow();

  document.getElementById('outbound-add-row').onclick = () => addOutboundRow();
  document.getElementById('outbound-create-btn').onclick = () => createOutboundOrder();
  document.getElementById('outbound-reset-btn').onclick = () => resetOutboundForm();
  document.getElementById('outbound-list-refresh').onclick = () => loadOutboundOrders();

  await loadOutboundOrders();
}

let stockMap = {}; // product_id -> stock quantity

async function loadStockMap() {
  try {
    const res = await api.get('/stock');
    stockMap = {};
    (res.data || []).forEach(s => {
      stockMap[s.product_id] = s.quantity;
    });
  } catch {
    stockMap = {};
  }
}

function addOutboundRow() {
  const tbody = document.getElementById('outbound-detail-body');
  const empty = tbody.querySelector('.empty-state');
  if (empty) empty.closest('tr').remove();

  const row = document.createElement('tr');
  row.className = 'outbound-detail-row';
  const options = outboundProductCache.map(p =>
    `<option value="${p.id}" data-name="${esc(p.name)}">${esc(p.code)} - ${esc(p.name)} (${esc(p.unit) || '个'})</option>`
  ).join('');

  row.innerHTML = `
    <td>
      <select class="w-full outbound-product-select" onchange="updateOutboundStock(this.closest('tr'))">${options}</select>
    </td>
    <td>
      <input type="number" class="w-full outbound-qty" value="1" min="1" placeholder="数量" onchange="updateOutboundStock(this.closest('tr'))">
    </td>
    <td class="outbound-stock-cell text-center text-sm text-slate-500">-</td>
    <td>
      <button class="text-red-500 hover:text-red-700" onclick="removeOutboundRow(this)">
        <i class="fas fa-times-circle"></i>
      </button>
    </td>
  `;
  tbody.appendChild(row);
  // 立即显示当前库存
  updateOutboundStock(row);
}

function updateOutboundStock(row) {
  const productId = parseInt(row.querySelector('.outbound-product-select').value);
  const qty = parseInt(row.querySelector('.outbound-qty').value) || 0;
  const stock = stockMap[productId] ?? '?';
  const cell = row.querySelector('.outbound-stock-cell');

  if (stock !== '?' && qty > 0 && stock < qty) {
    cell.innerHTML = `<span class="text-red-500 font-medium">${stock} ⚠️不足</span>`;
  } else if (stock !== '?') {
    cell.innerHTML = `<span class="text-green-600">${stock}</span>`;
  } else {
    cell.textContent = '未知';
  }
}

function removeOutboundRow(btn) {
  btn.closest('tr').remove();
  const tbody = document.getElementById('outbound-detail-body');
  if (!tbody.querySelector('.outbound-detail-row')) {
    tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><i class="fas fa-boxes"></i><p>请点击"添加商品"</p></div></td></tr>';
  }
}

function getOutboundDetails() {
  const rows = document.querySelectorAll('.outbound-detail-row');
  const details = [];
  rows.forEach(row => {
    const productId = parseInt(row.querySelector('.outbound-product-select').value);
    const qty = parseInt(row.querySelector('.outbound-qty').value);
    if (productId && qty > 0) {
      details.push({ product_id: productId, quantity: qty });
    }
  });
  return details;
}

async function createOutboundOrder() {
  const details = getOutboundDetails();
  if (details.length === 0) {
    showToast('请至少添加一个商品明细', 'warning');
    return;
  }

  // 前端初步校验库存
  for (const d of details) {
    const stock = stockMap[d.product_id] ?? 0;
    if (stock < d.quantity) {
      const product = outboundProductCache.find(p => p.id === d.product_id);
      showToast(`商品「${product?.name || d.product_id}」库存不足 (当前: ${stock}，需要: ${d.quantity})`, 'warning');
      return;
    }
  }

  const btn = document.getElementById('outbound-create-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';

  try {
    const customer = document.getElementById('outbound-customer').value.trim();
    const res1 = await api.post('/outbound/order', { details, customer });
    // 确认出库
    const res2 = await api.post(`/outbound/confirm/${res1.data.id}`);
    showToast(`出库成功！单号: ${res2.data.order_no}`, 'success');
    resetOutboundForm();
    await loadStockMap();
    await loadOutboundOrders();
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> 创建出库单';
  }
}

function resetOutboundForm() {
  const tbody = document.getElementById('outbound-detail-body');
  tbody.innerHTML = '';
  addOutboundRow();
}

async function loadOutboundOrders() {
  const tbody = document.getElementById('outbound-order-list');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-400">加载中...</td></tr>';

  try {
    const res = await api.get('/outbound/orders?size=50');
    const orders = res.data.list || [];

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><p>暂无出库记录</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const statusBadge = o.status === 'confirmed'
        ? '<span class="badge badge-green">已确认</span>'
        : o.status === 'pending'
          ? '<span class="badge badge-yellow">待确认</span>'
          : '<span class="badge badge-red">已取消</span>';
      return `
        <tr>
          <td class="font-mono text-sm">${esc(o.order_no)}</td>
          <td>${statusBadge}</td>
          <td class="text-sm text-slate-500">${formatDate(o.create_time)}</td>
          <td class="text-sm text-slate-500">${formatDate(o.confirm_time)}</td>
          <td>
            ${o.status === 'pending'
              ? `<button class="text-orange-600 hover:text-orange-800 text-sm mr-2" onclick="confirmPendingOutbound(${o.id})"><i class="fas fa-check-circle"></i> 确认</button><button class="text-slate-500 hover:text-slate-700 text-sm" onclick="viewOutboundDetail(${o.id})"><i class="fas fa-eye"></i> 详情</button>`
              : `<button class="text-slate-500 hover:text-slate-700 text-sm" onclick="viewOutboundDetail(${o.id})"><i class="fas fa-eye"></i> 详情</button>`
            }
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">加载失败: ${esc(e.message)}</td></tr>`;
  }
}

async function confirmPendingOutbound(orderId) {
  await loadStockMap();
  return new Promise(function(resolve) {
    showModal('确认出库', '<p class="text-gray-700">确认此出库单？确认后将扣减库存。</p>', async function() {
      try {
        const r = await api.post('/outbound/confirm/' + orderId);
        showToast('出库成功！单号: ' + r.data.order_no, 'success');
        await loadStockMap();
        await loadOutboundOrders();
        resolve();
      } catch (e) {
        showToast(e.message, 'error');
        resolve();
      }
    }, '确认出库');
  });
}

// handled in showModal callback above


async function viewOutboundDetail(orderId) {
  try {
    const res = await api.get(`/outbound/order/${orderId}`);
    const o = res.data;
    const detailsHtml = (o.details || []).map(d =>
      `<tr><td>${esc(d.product_code)}</td><td>${esc(d.product_name)}</td><td>${d.quantity} ${esc(d.unit)}</td></tr>`
    ).join('');

    showModal(
      `出库单详情 - ${o.order_no}`,
      `<div class="space-y-3">
        <p><span class="text-slate-500">状态：</span>${o.status === 'confirmed' ? '<span class="badge badge-green">已确认</span>' : '<span class="badge badge-yellow">待确认</span>'}</p>
        <p><span class="text-slate-500">客户：</span>${esc(o.customer) || '-'}</p>
        <p><span class="text-slate-500">创建时间：</span>${formatDate(o.create_time)}</p>
        <table><thead><tr><th>编码</th><th>名称</th><th>数量</th></tr></thead><tbody>${detailsHtml || '<tr><td colspan="3" class="text-center text-slate-400 py-4">无明细</td></tr>'}</tbody></table>
      </div>`,
      () => {}, '关闭'
    );
  } catch (e) {
    showToast(e.message, 'error');
  }
}
