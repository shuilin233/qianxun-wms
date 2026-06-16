/**
 * 库存查询页 — 表格、搜索、低库存高亮、预警筛选
 */
async function renderStock(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b">
        <div class="flex items-center gap-3">
          <input type="text" id="stock-search" placeholder="搜索编码或名称..." class="w-64">
          <button id="stock-search-btn" class="btn bg-blue-600 text-white hover:bg-blue-700">
            <i class="fas fa-search"></i> 搜索
          </button>
          <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" id="stock-low-only" class="w-4 h-4 accent-red-500">
            <span class="text-slate-600">仅显示低库存</span>
          </label>
        </div>
        <div class="flex items-center gap-3">
          <span id="stock-summary" class="text-sm text-slate-500"></span>
          <button id="stock-refresh-btn" class="btn bg-slate-100 text-slate-600 hover:bg-slate-200">
            <i class="fas fa-sync-alt"></i> 刷新
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>商品编码</th>
              <th>商品名称</th>
              <th>分类</th>
              <th>单位</th>
              <th>当前库存</th>
              <th>安全库存</th>
              <th>状态</th>
              <th>最后更新</th>
            </tr>
          </thead>
          <tbody id="stock-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('stock-search-btn').onclick = () => loadStock();
  document.getElementById('stock-refresh-btn').onclick = () => loadStock();
  document.getElementById('stock-low-only').onchange = () => loadStock();
  document.getElementById('stock-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadStock();
  });

  await loadStock();
}

async function loadStock() {
  const tbody = document.getElementById('stock-table-body');
  const keyword = document.getElementById('stock-search').value.trim();
  const lowOnly = document.getElementById('stock-low-only').checked;

  tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-400">加载中...</td></tr>';

  try {
    let url = `/stock?keyword=${encodeURIComponent(keyword)}`;
    if (lowOnly) url += '&low_stock=1';

    const res = await api.get(url);
    const stockList = res.data || [];

    // 统计
    const total = stockList.length;
    const lowCount = stockList.filter(s => s.is_low_stock).length;
    document.getElementById('stock-summary').textContent = `共 ${total} 条，低库存 ${lowCount} 条`;

    if (stockList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-warehouse"></i><p>暂无库存数据</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = stockList.map(s => {
      const statusBadge = s.is_low_stock
        ? '<span class="badge badge-red"><i class="fas fa-exclamation-triangle"></i> 库存不足</span>'
        : '<span class="badge badge-green">正常</span>';

      const percent = s.warn_stock > 0 ? Math.round(s.quantity / s.warn_stock * 100) : 100;

      return `
        <tr class="${s.is_low_stock ? 'row-warning' : ''}">
          <td class="font-mono text-sm">${esc(s.product_code)}</td>
          <td class="font-medium">${esc(s.product_name)}</td>
          <td>${esc(s.category) || '-'}</td>
          <td>${esc(s.unit) || '个'}</td>
          <td>
            <div class="flex items-center gap-2">
              <span class="font-semibold ${s.is_low_stock ? 'text-red-600' : 'text-slate-700'}">${s.quantity}</span>
              ${s.warn_stock > 0 ? `
                <div class="w-20 bg-gray-200 rounded-full h-2">
                  <div class="h-2 rounded-full ${s.is_low_stock ? 'bg-red-500' : percent > 200 ? 'bg-green-500' : 'bg-blue-500'}" style="width:${Math.min(percent, 100)}%"></div>
                </div>
              ` : ''}
            </div>
          </td>
          <td class="text-sm">${s.warn_stock || '-'}</td>
          <td>${statusBadge}</td>
          <td class="text-sm text-slate-500">${formatDate(s.update_time)}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-red-500">加载失败: ${esc(e.message)}</td></tr>`;
  }
}
