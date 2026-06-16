/**
 * 报表页 - 近7天出入库趋势 + 统计汇总
 */
async function renderReport(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- 汇总卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-sign-in-alt text-blue-600"></i>
            </div>
            <div>
              <div class="text-2xl font-bold" id="rp-total-in">-</div>
              <div class="text-xs text-slate-400">7日入库总量</div>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-sign-out-alt text-orange-600"></i>
            </div>
            <div>
              <div class="text-2xl font-bold" id="rp-total-out">-</div>
              <div class="text-xs text-slate-400">7日出库总量</div>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-exchange-alt text-emerald-600"></i>
            </div>
            <div>
              <div class="text-2xl font-bold" id="rp-net">-</div>
              <div class="text-xs text-slate-400">净增量</div>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-calendar-alt text-purple-600"></i>
            </div>
            <div>
              <div class="text-2xl font-bold" id="rp-days">-</div>
              <div class="text-xs text-slate-400">活跃天数</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 趋势图 -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h3 class="text-base font-semibold text-slate-700 mb-4">
          <i class="fas fa-chart-line text-blue-600 mr-2"></i>近7天出入库趋势
        </h3>
        <div id="report-chart" style="height:360px;"></div>
      </div>
    </div>
  `;

  await loadReportData();
}

async function loadReportData() {
  try {
    const res = await api.get('/report/daily_trend');
    const data = res.data || [];

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

    const totalIn = inboundData.reduce((a, b) => a + b, 0);
    const totalOut = outboundData.reduce((a, b) => a + b, 0);
    document.getElementById('rp-total-in').textContent = totalIn;
    document.getElementById('rp-total-out').textContent = totalOut;
    document.getElementById('rp-net').textContent = (totalIn - totalOut >= 0 ? '+' : '') + (totalIn - totalOut);
    document.getElementById('rp-days').textContent = dates.filter((_, i) => inboundData[i] + outboundData[i] > 0).length;

    const chartDom = document.getElementById('report-chart');
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
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          name: '入库', type: 'bar', data: inboundData,
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '出库', type: 'bar', data: outboundData,
          itemStyle: { color: '#f97316', borderRadius: [4, 4, 0, 0] },
        },
      ],
    });

    window.addEventListener('resize', () => myChart.resize());
  } catch (e) {
    console.error('报表加载失败:', e);
    document.getElementById('report-chart').innerHTML =
      '<div class="flex items-center justify-center h-full text-slate-400"><i class="fas fa-chart-bar mr-2"></i>报表数据加载失败</div>';
  }
}
