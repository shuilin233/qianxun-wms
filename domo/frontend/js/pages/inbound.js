/**
 * 入库单页面 — 动态添加商品行、创建入库单、确认入库
 */
let inboundProductCache = []; // 商品下拉列表缓存

async function renderInbound(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- 创建入库单区域 -->
      <div class="bg-white rounded-xl shadow-sm">
        <div class="px-6 py-4 border-b">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <i class="fas fa-sign-in-alt text-blue-600"></i> 创建入库单
          </h2>
        </div>

        <div class="p-6 space-y-4">
          <!-- 供应商 -->
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">供应商（可选）</label>
            <input type="text" id="inbound-supplier" placeholder="例如：华东五金批发市场" class="w-full max-w-md">
          </div>

          <!-- 明细表 -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-slate-600">商品明细</label>
              <button id="inbound-add-row" class="btn bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm">
                <i class="fas fa-plus"></i> 添加商品
              </button>
            </div>
            <div class="overflow-x-auto border rounded-lg">
              <table>
                <thead>
                  <tr>
                    <th style="width:40%">商品</th>
                    <th style="width:30%">入库数量</th>
                    <th style="width:10%">操作</th>
                  </tr>
                </thead>
                <tbody id="inbound-detail-body">
                  <tr><td colspan="3"><div class="empty-state"><i class="fas fa-boxes"></i><p>请点击"添加商品"</p></div></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-3 pt-2">
            <button id="inbound-create-btn" class="btn bg-blue-600 text-white hover:bg-blue-700">
              <i class="fas fa-save"></i> 创建入库单
            </button>
            <button id="inbound-reset-btn" class="btn bg-slate-100 text-slate-600 hover:bg-slate-200">
              <i class="fas fa-redo"></i> 清空
            </button>
          </div>
        </div>
      </div>

      <!-- 入库单列表 -->
      <div class="bg-white rounded-xl shadow-sm">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-lg font-semibold"><i class="fas fa-list text-slate-500 mr-2"></i>入库单列表</h2>
          <button id="inbound-list-refresh" class="btn bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm">
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
            <tbody id="inbound-order-list"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // 预加载商品列表
  try {
    const res = await api.get('/products');
    inboundProductCache = res.data || [];
  } catch (e) {
    inboundProductCache = [];
  }

  // 添加默认第一行
  addInboundRow();

  document.getElementById('inbound-add-row').onclick = () => addInboundRow();
  document.getElementById('inbound-create-btn').onclick = () => createInboundOrder();
  document.getElementById('inbound-reset-btn').onclick = () => resetInboundForm();
  document.getElementById('inbound-list-refresh').onclick = () => loadInboundOrders();

  await loadInboundOrders();
}

function addInboundRow() {
  const tbody = document.getElementById('inbound-detail-body');
  // 移除空状态
  const empty = tbody.querySelector('.empty-state');
  if (empty) empty.closest('tr').remove();

  const row = document.createElement('tr');
  row.className = 'inbound-detail-row';
  const options = inboundProductCache.map(p =>
    `<option value="${p.id}">${esc(p.code)} - ${esc(p.name)} (${esc(p.unit) || '个'})</option>`
  ).join('');

  row.innerHTML = `
    <td>
      <select class="w-full inbound-product-select">${options}</select>
    </td>
    <td>
      <input type="number" class="w-full inbound-qty" value="1" min="1" placeholder="数量">
    </td>
    <td>
      <button class="text-red-500 hover:text-red-700" onclick="this.closest('tr').remove(); if(!document.querySelector('.inbound-detail-row')) { document.getElementById('inbound-detail-body').innerHTML='<tr><td colspan=\\'3\\'><div class=\\'empty-state\\'><i class=\\'fas fa-boxes\\'></i><p>请点击\\'添加商品\\'</p></div></td></tr>'; }">
        <i class="fas fa-times-circle"></i>
      </button>
    </td>
  `;
  tbody.appendChild(row);
}

function getInboundDetails() {
  const rows = document.querySelectorAll('.inbound-detail-row');
  const details = [];
  rows.forEach(row => {
    const productId = parseInt(row.querySelector('.inbound-product-select').value);
    const qty = parseInt(row.querySelector('.inbound-qty').value);
    if (productId && qty > 0) {
      details.push({ product_id: productId, quantity: qty });
    }
  });
  return details;
}

async function createInboundOrder() {
  const details = getInboundDetails();
  if (details.length === 0) {
    showToast('请至少添加一个商品明细', 'warning');
    return;
  }

  const btn = document.getElementById('inbound-create-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';

  try {
    // 创建入库单
    const supplier = document.getElementById('inbound-supplier').value.trim();
    const res1 = await api.post('/inbound/order', { details, supplier });

    // 确认入库
    const res2 = await api.post(`/inbound/confirm/${res1.data.id}`);
    showToast(`入库成功！单号: ${res2.data.order_no}`, 'success');
    resetInboundForm();
    await loadInboundOrders();
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> 创建入库单';
  }
}

function resetInboundForm() {
  const tbody = document.getElementById('inbound-detail-body');
  tbody.innerHTML = '';
  addInboundRow();
}

async function loadInboundOrders() {
  const tbody = document.getElementById('inbound-order-list');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-400">加载中...</td></tr>';

  try {
    const res = await api.get('/inbound/orders?size=50');
    const orders = res.data.list || [];

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><p>暂无入库记录</p></div></td></tr>';
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
              ? `<button class="text-blue-600 hover:text-blue-800 text-sm mr-2" onclick="confirmPendingInbound(${o.id})" title="确认入库"><i class="fas fa-check-circle"></i> 确认</button><button class="text-slate-500 hover:text-slate-700 text-sm" onclick="viewInboundDetail(${o.id})"><i class="fas fa-eye"></i> 详情</button>`
              : `<button class="text-slate-500 hover:text-slate-700 text-sm" onclick="viewInboundDetail(${o.id})"><i class="fas fa-eye"></i> 详情</button>`
            }
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">加载失败: ${esc(e.message)}</td></tr>`;
  }
}

async function confirmPendingInbound(orderId) {
  return new Promise(function(resolve) {
    showModal('确认入库', '<p class="text-gray-700">确认此入库单？确认后将增加库存。</p>', async function() {
      try {
        const res = await api.post('/inbound/confirm/' + orderId);
        showToast('入库成功！单号: ' + res.data.order_no, 'success');
        await loadInboundOrders();
        resolve();
      } catch (e) {
        showToast(e.message, 'error');
        resolve();
      }
    }, '确认入库');
  });
}

// handled in showModal callback above


async function viewInboundDetail(orderId) {
  try {
    const res = await api.get(`/inbound/order/${orderId}`);
    const o = res.data;
    const detailsHtml = (o.details || []).map(d =>
      `<tr><td>${esc(d.product_code)}</td><td>${esc(d.product_name)}</td><td>${d.quantity} ${esc(d.unit)}</td></tr>`
    ).join('');

    showModal(
      `入库单详情 - ${o.order_no}`,
      `<div class="space-y-3">
        <p><span class="text-slate-500">状态：</span>${o.status === 'confirmed' ? '<span class="badge badge-green">已确认</span>' : '<span class="badge badge-yellow">待确认</span>'}</p>
        <p><span class="text-slate-500">供应商：</span>${esc(o.supplier) || '-'}</p>
        <p><span class="text-slate-500">创建时间：</span>${formatDate(o.create_time)}</p>
        <table><thead><tr><th>编码</th><th>名称</th><th>数量</th></tr></thead><tbody>${detailsHtml || '<tr><td colspan="3" class="text-center text-slate-400 py-4">无明细</td></tr>'}</tbody></table>
      </div>`,
      () => {}, '关闭'
    );
  } catch (e) {
    showToast(e.message, 'error');
  }
}
