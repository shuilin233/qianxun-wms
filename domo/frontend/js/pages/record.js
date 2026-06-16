/**
 * 库存流水页 — 表格、商品/类型筛选、分页
 */
async function renderRecords(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b">
        <div class="flex items-center gap-3 flex-wrap">
          <select id="record-product" class="w-48">
            <option value="">全部商品</option>
          </select>
          <select id="record-type" class="w-36">
            <option value="">全部类型</option>
            <option value="inbound">入库</option>
            <option value="outbound">出库</option>
          </select>
          <button id="record-search-btn" class="btn bg-blue-600 text-white hover:bg-blue-700">
            <i class="fas fa-search"></i> 筛选
          </button>
          <button id="record-refresh-btn" class="btn bg-slate-100 text-slate-600 hover:bg-slate-200">
            <i class="fas fa-sync-alt"></i> 刷新
          </button>
        </div>
        <span id="record-total" class="text-sm text-slate-500"></span>
      </div>

      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>商品编码</th>
              <th>商品名称</th>
              <th>变更类型</th>
              <th>变更数量</th>
              <th>变更前</th>
              <th>变更后</th>
              <th>单据号</th>
            </tr>
          </thead>
          <tbody id="record-table-body"></tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div id="record-pagination" class="flex items-center justify-between px-6 py-4 border-t"></div>
    </div>
  `;

  // 加载商品下拉
  try {
    const res = await api.get('/products');
    const products = res.data || [];
    const select = document.getElementById('record-product');
    products.forEach(p => {
      select.innerHTML += `<option value="${p.id}">${esc(p.code)} - ${esc(p.name)}</option>`;
    });
  } catch { /* ignore */ }

  document.getElementById('record-search-btn').onclick = () => loadRecords(1);
  document.getElementById('record-refresh-btn').onclick = () => loadRecords(1);

  await loadRecords(1);
}

let recordPage = 1;
let recordSize = 20;

async function loadRecords(page = 1) {
  recordPage = page;
  const tbody = document.getElementById('record-table-body');
  const productId = document.getElementById('record-product').value;
  const changeType = document.getElementById('record-type').value;

  tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-400">加载中...</td></tr>';

  try {
    let url = `/stock/records?page=${page}&size=${recordSize}`;
    if (productId) url += `&product_id=${productId}`;
    if (changeType) url += `&change_type=${changeType}`;

    const res = await api.get(url);
    const { list, total } = res.data;
    document.getElementById('record-total').textContent = `共 ${total} 条记录`;

    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-history"></i><p>暂无流水记录</p></div></td></tr>';
      renderPagination(0, page);
      return;
    }

    tbody.innerHTML = list.map(r => {
      const typeBadge = r.change_type === 'inbound'
        ? '<span class="badge badge-blue"><i class="fas fa-arrow-down mr-1"></i>入库</span>'
        : '<span class="badge badge-yellow"><i class="fas fa-arrow-up mr-1"></i>出库</span>';
      return `
        <tr>
          <td class="text-sm text-slate-500 whitespace-nowrap">${formatDate(r.create_time)}</td>
          <td class="font-mono text-sm">${esc(r.product_code)}</td>
          <td>${esc(r.product_name)}</td>
          <td>${typeBadge}</td>
          <td class="font-semibold ${r.change_type === 'inbound' ? 'text-green-600' : 'text-red-600'}">
            ${r.change_type === 'inbound' ? '+' : '-'}${r.change_qty}
          </td>
          <td class="text-sm">${r.before_qty}</td>
          <td class="text-sm">${r.after_qty}</td>
          <td class="font-mono text-sm">${esc(r.biz_no)}</td>
        </tr>
      `;
    }).join('');

    renderPagination(total, page);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-red-500">加载失败: ${esc(e.message)}</td></tr>`;
  }
}

function renderPagination(total, page) {
  const container = document.getElementById('record-pagination');
  const totalPages = Math.ceil(total / recordSize);
  if (totalPages <= 1) {
    container.innerHTML = '<span class="text-sm text-slate-400"></span>';
    return;
  }

  // Show at most 7 page buttons with ellipsis
  var pages = [];
  var maxShow = 7;
  if (totalPages <= maxShow) {
    for (var i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    var start = Math.max(2, page - 2);
    var end = Math.min(totalPages - 1, page + 2);
    if (start > 2) pages.push('...');
    for (var i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  var pagesHtml = pages.map(function(p) {
    if (p === '...') return '<span class="px-2 text-slate-400">...</span>';
    if (p === page) return '<span class="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">' + p + '</span>';
    return '<button class="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm" onclick="loadRecords(' + p + ')">' + p + '</button>';
  }).join('');

  container.innerHTML =
    '<span class="text-sm text-slate-500">第 ' + page + '/' + totalPages + ' 页</span>'
    + '<div class="flex items-center gap-1">' + pagesHtml + '</div>';
}
