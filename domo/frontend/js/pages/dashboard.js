/**
 * 首页仪表板 — 低库存预警、ECharts趋势图、快捷操作
 */
async function renderDashboard(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- 快捷操作卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition cursor-pointer" onclick="window.location.hash='#inbound'">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <i class="fas fa-sign-in-alt text-blue-600 text-xl"></i>
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-700" id="dash-inbound-count">-</p>
              <p class="text-sm text-slate-500">今日入库</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition cursor-pointer" onclick="window.location.hash='#outbound'">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <i class="fas fa-sign-out-alt text-orange-600 text-xl"></i>
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-700" id="dash-outbound-count">-</p>
              <p class="text-sm text-slate-500">今日出库</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition cursor-pointer" onclick="window.location.hash='#stock'">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-700" id="dash-low-count">-</p>
              <p class="text-sm text-slate-500">低库存预警</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition cursor-pointer" onclick="window.location.hash='#products'">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <i class="fas fa-boxes text-emerald-600 text-xl"></i>
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-700" id="dash-product-count">-</p>
              <p class="text-sm text-slate-500">商品总数</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 趋势图 + 低库存列表 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- ECharts 趋势图 -->
        <div class="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-base font-semibold text-slate-700 mb-4">
            <i class="fas fa-chart-line text-blue-600 mr-2"></i>近7天出入库趋势
          </h3>
          <div id="dashboard-chart" style="height:320px;"></div>
        </div>

        <!-- 低库存预警列表 -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-base font-semibold text-slate-700 mb-4">
            <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>低库存预警
          </h3>
          <div id="dash-low-stock-list" class="space-y-3 max-h-80 overflow-y-auto"></div>
        </div>
      </div>
    </div>
  `;

  // 加载全部数据
  await Promise.all([
    loadDashStats(),
    loadDashLowStock(),
    loadDashChart(),
  ]);
}

async function loadDashStats() {
  try {
    const [stockRes, productRes] = await Promise.all([
      api.get('/stock'),
      api.get('/products'),
    ]);

    const stocks = stockRes.data || [];
    const lowCount = stocks.filter(s => s.is_low_stock).length;
    document.getElementById('dash-low-count').textContent = lowCount;
    document.getElementById('dash-product-count').textContent = (productRes.data || []).length;

    // 今日出入库分别统计
    const today = new Date().toISOString().slice(0, 10);
    const [inRes, outRes] = await Promise.all([
      api.get(`/stock/records?start_date=${today}&end_date=${today}&change_type=inbound&size=1`),
      api.get(`/stock/records?start_date=${today}&end_date=${today}&change_type=outbound&size=1`),
    ]);
    document.getElementById('dash-inbound-count').textContent = inRes.data?.total ?? 0;
    document.getElementById('dash-outbound-count').textContent = outRes.data?.total ?? 0;
  } catch {
    document.getElementById('dash-low-count').textContent = '-';
    document.getElementById('dash-product-count').textContent = '-';
    document.getElementById('dash-inbound-count').textContent = '-';
    document.getElementById('dash-outbound-count').textContent = '-';
  }
}

async function loadDashLowStock() {
  const container = document.getElementById('dash-low-stock-list');
  try {
    const res = await api.get('/stock?low_stock=1');
    const items = res.data || [];

    if (items.length === 0) {
      container.innerHTML = '<div class="text-center py-6 text-slate-400"><i class="fas fa-check-circle text-green-400 text-2xl mb-2"></i><p class="text-sm">所有商品库存充足</p></div>';
      return;
    }

    container.innerHTML = items.slice(0, 10).map(s => `
      <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
        <div>
          <p class="font-medium text-sm text-slate-700">${esc(s.product_name)}</p>
          <p class="text-xs text-slate-500">${esc(s.product_code)} · 安全库存: ${s.warn_stock}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold text-red-600">${s.quantity}</p>
          <p class="text-xs text-red-400">${s.quantity <= 0 ? '缺货' : '不足'}</p>
        </div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<div class="text-center py-6 text-slate-400">加载失败</div>';
  }
}

async function loadDashChart() {
  try {
    const res = await api.get('/report/daily_trend');
    const data = res.data || [];

    // 填充近7天无数据的日期
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const inboundData = dates.map(d => {
      const found = data.find(item => item.date === d);
      return found ? found.inbound : 0;
    });
    const outboundData = dates.map(d => {
      const found = data.find(item => item.date === d);
      return found ? found.outbound : 0;
    });

    const chartDom = document.getElementById('dashboard-chart');
    const myChart = echarts.init(chartDom);
    myChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['入库', '出库'], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dates.map(d => d.slice(5)),
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
      },
      series: [
        {
          name: '入库',
          type: 'bar',
          data: inboundData,
          itemStyle: { color: '#3b82f6', borderRadius: [4,4,0,0] },
        },
        {
          name: '出库',
          type: 'bar',
          data: outboundData,
          itemStyle: { color: '#f97316', borderRadius: [4,4,0,0] },
        },
      ],
    });

    // 响应式
    window.addEventListener('resize', () => myChart.resize());
  } catch (e) {
    console.error('图表加载失败:', e);
    document.getElementById('dashboard-chart').innerHTML =
      '<div class="flex items-center justify-center h-full text-slate-400"><i class="fas fa-chart-bar mr-2"></i>图表数据加载失败</div>';
  }
}
