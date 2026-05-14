// BD Dashboard - Antigravity
const CONFIG = {
  SHEET_ID: '1ncHjtkSEl9WyogeFd0OEqOjua_TyV4LT3rWiSI64gJk',
  SHEET_NAME: 'S.SO',
  SALES_FILTER: 'Trí',
  API_KEY: 'AIzaSyDsAkUse-vT1TVCJY3STO7u_SxE6L4_pG4',
  ROWS_PER_PAGE: 20
};

// Simple auth (hash-based for client-side security)
const USERS = [
  { user: 'tri', pass: 'bd2026' },
  { user: 'admin', pass: 'antigravity' }
];

const COLS = {
  ID_SO:0, BUTTON:1, STATUS:2, SO_DATE:3, TYPE:4, CUSTOMER:5, ENTITY:6,
  SALES:7, IV_STATUS:8, PO_NO:9, PR_NO:10, NAME:11, MODEL:12, BRAND:13,
  QTY:14, UNIT:15, UNIT_PRICE:16, AMOUNT:17, REF_SUPPLIER:18, REF_PRICE:19,
  PURCHASER:20, END_USER:21, R_DATE:22, PUR_NOTE:23, RECEIVER:24, WH_NOTE:25,
  IV_NOTE:26, URGENT:27, COMMENT:28, BALANCE:29, VN_COST:30, IP_COST:31,
  WH_COST:32, LABOUR_COST:33, COM_COST:34, TOTAL_COST:35, TOTAL_COM:36,
  MARKUP:37, PROFIT:38, MARGIN:39, SALES_PRICE:40, SALES_AMOUNT:41,
  OP_AMOUNT:42, REVENUE:43, APPROVE:44, SALES_SITUATION:45, IV_MONTH:46,
  IV_YEAR:47, BM_SALES:48, BM_ADMIN:49, REFRESH:50, HISTORY:51, COUNT:52, ETD:53
};

const DISPLAY_COLS = ['ID_SO','STATUS','SO_DATE','CUSTOMER','PO_NO','NAME','QTY','AMOUNT','REVENUE','PROFIT','MARGIN','IV_MONTH','IV_YEAR','SALES_SITUATION'];

let allData = [], charts = {}, currentMonth, currentYear, currentView = 'overview';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  currentMonth = new Date().getMonth() + 1;
  currentYear = new Date().getFullYear();
  // Check if already logged in this session
  if (sessionStorage.getItem('bd_logged_in')) {
    startDashboard();
  } else {
    showLogin();
  }
});

function showLogin() {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('login-modal').style.display = 'flex';
  const loginBtn = document.getElementById('login-btn');
  const pwdInput = document.getElementById('login-password');
  const doLogin = () => {
    const user = document.getElementById('login-username').value.trim().toLowerCase();
    const pass = document.getElementById('login-password').value;
    const valid = USERS.some(u => u.user === user && u.pass === pass);
    if (!valid) {
      document.getElementById('login-error').style.display = 'block';
      return;
    }
    document.getElementById('login-error').style.display = 'none';
    sessionStorage.setItem('bd_logged_in', user);
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('loading-screen').style.display = 'flex';
    startDashboard();
  };
  loginBtn.onclick = doLogin;
  pwdInput.onkeydown = e => { if(e.key==='Enter') doLogin(); };
}

function startDashboard() {
  setupUI();
  fetchData();
}

function logout() {
  sessionStorage.removeItem('bd_logged_in');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  showLogin();
}

function setupUI() {
  // Sidebar toggle
  document.getElementById('sidebar-toggle').onclick = () => document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('mobile-menu-btn').onclick = () => document.getElementById('sidebar').classList.toggle('mobile-open');
  // Nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = e => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      currentView = el.dataset.view;
      document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
      document.getElementById('view-' + currentView).classList.add('active');
      document.getElementById('page-title').textContent = el.querySelector('.nav-label').textContent;
      document.getElementById('sidebar').classList.remove('mobile-open');
    };
  });
  // Month nav
  document.getElementById('prev-month').onclick = () => { currentMonth--; if(currentMonth<1){currentMonth=12;currentYear--;} updateMonthDisplay(); renderAll(); };
  document.getElementById('next-month').onclick = () => { currentMonth++; if(currentMonth>12){currentMonth=1;currentYear++;} updateMonthDisplay(); renderAll(); };
  // Logout & Refresh
  document.getElementById('btn-settings').onclick = () => logout();
  document.getElementById('btn-refresh').onclick = () => fetchData();
  // Exports
  document.getElementById('btn-export-csv').onclick = () => exportCSV(getMonthData());
  document.getElementById('btn-export-all-csv').onclick = () => exportCSV(allData);
  document.getElementById('btn-export-pdf').onclick = () => exportPDF();
  // Search
  document.getElementById('monthly-search').oninput = () => renderMonthlyTable();
  document.getElementById('detail-search').oninput = () => renderDetailTable();
  // Chart type toggle
  document.querySelectorAll('.chart-btn').forEach(b => {
    b.onclick = () => { document.querySelectorAll('.chart-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderRevenueChart(b.dataset.chartType); };
  });
  updateMonthDisplay();
}

function updateMonthDisplay() {
  document.getElementById('current-month').textContent = `Tháng ${currentMonth}, ${currentYear}`;
  document.getElementById('report-month-label').textContent = `${currentMonth}/${currentYear}`;
}

// ===== DATA FETCH =====
async function fetchData() {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(CONFIG.SHEET_NAME)}?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const json = await res.json();
    const rows = json.values || [];
    if (rows.length < 3) throw new Error('Không có dữ liệu');
    // Find header row (skip empty rows at top)
    let headerIdx = rows.findIndex(r => r.some(c => c && c.toString().trim() === 'ID SO'));
    if (headerIdx === -1) headerIdx = 1; // fallback: row 2
    // Filter by Sales = Trí (data starts after header)
    allData = rows.slice(headerIdx + 1).filter(r => (r[COLS.SALES]||'').trim() === CONFIG.SALES_FILTER);
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('header-subtitle').textContent = `Team BD - ${CONFIG.SALES_FILTER}`;
    document.getElementById('last-update').innerHTML = `<span class="badge-dot"></span><span>Cập nhật: ${new Date().toLocaleTimeString('vi')}</span>`;
    toast(`Đã tải ${allData.length} PO thành công`, 'success');
    renderAll();
  } catch(e) {
    console.error(e);
    document.getElementById('loading-screen').style.display = 'none';
    toast('Lỗi: ' + e.message, 'error');
    document.getElementById('app').style.display = 'none';
    logout();
  }
}

// ===== HELPERS =====
function num(v) { if(!v) return 0; return parseFloat(String(v).replace(/,/g,'')) || 0; }
function fmt(n) { return n.toLocaleString('vi-VN'); }
function fmtCurrency(n) { return n >= 1e9 ? (n/1e9).toFixed(2)+'B' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : fmt(n); }
function pct(a,b) { if(!b) return '—'; return ((a-b)/Math.abs(b)*100).toFixed(1)+'%'; }

function getMonthData(m,y) {
  m = m || currentMonth; y = y || currentYear;
  return allData.filter(r => num(r[COLS.IV_MONTH])===m && num(r[COLS.IV_YEAR])===y);
}

function getStatusClass(s) {
  if(!s) return 'default';
  const sl = s.toLowerCase();
  if(sl.includes('done')||sl.includes('complete')||sl.includes('xong')) return 'completed';
  if(sl.includes('pending')||sl.includes('chờ')||sl.includes('wait')) return 'pending';
  if(sl.includes('cancel')||sl.includes('hủy')) return 'cancelled';
  if(sl.includes('process')||sl.includes('đang')) return 'processing';
  return 'default';
}

function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type||'');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ===== RENDER ALL =====
function renderAll() {
  renderKPIs();
  renderRevenueChart();
  renderStatusChart();
  renderPOCountChart();
  renderTopCustomers();
  renderMonthlyView();
  renderDetailTable();
  renderAnalytics();
}

// ===== KPIs =====
function renderKPIs() {
  const md = getMonthData();
  const prevMd = getMonthData(currentMonth===1?12:currentMonth-1, currentMonth===1?currentYear-1:currentYear);
  const totalPO = md.length;
  const totalRev = md.reduce((s,r) => s + num(r[COLS.REVENUE]), 0);
  const customers = new Set(md.map(r => r[COLS.CUSTOMER]).filter(Boolean)).size;
  const avg = totalPO ? totalRev / totalPO : 0;

  document.getElementById('kpi-total-po').textContent = fmt(totalPO);
  document.getElementById('kpi-total-revenue').textContent = fmtCurrency(totalRev);
  document.getElementById('kpi-customers').textContent = fmt(customers);
  document.getElementById('kpi-avg-order').textContent = fmtCurrency(avg);

  // Trends
  const prevPO = prevMd.length;
  const prevRev = prevMd.reduce((s,r) => s + num(r[COLS.REVENUE]), 0);
  const prevCust = new Set(prevMd.map(r=>r[COLS.CUSTOMER]).filter(Boolean)).size;
  setTrend('kpi-total-trend', totalPO, prevPO);
  setTrend('kpi-revenue-trend', totalRev, prevRev);
  setTrend('kpi-customers-trend', customers, prevCust);
}

function setTrend(id, cur, prev) {
  const el = document.getElementById(id);
  if(!prev) { el.textContent = ''; return; }
  const diff = ((cur-prev)/Math.abs(prev)*100).toFixed(1);
  el.textContent = (diff >= 0 ? '↑ +' : '↓ ') + diff + '% vs tháng trước';
  el.className = 'kpi-trend ' + (diff >= 0 ? 'up' : 'down');
}

// ===== CHARTS =====
function getChartColors() {
  return {
    primary: '#6366f1', cyan: '#06b6d4', green: '#10b981',
    amber: '#f59e0b', rose: '#f43f5e',
    primaryA: 'rgba(99,102,241,0.2)', cyanA: 'rgba(6,182,212,0.2)',
    greenA: 'rgba(16,185,129,0.2)', grid: 'rgba(255,255,255,0.06)',
    text: '#94a3b8'
  };
}

function chartDefaults() {
  const c = getChartColors();
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 11 } } },
      y: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 11 }, callback: v => fmtCurrency(v) } }
    }
  };
}

function renderRevenueChart(type) {
  type = type || 'bar';
  const c = getChartColors();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    let m = currentMonth - i, y = currentYear;
    while(m<1){m+=12;y--;}
    months.push({m,y,label:`T${m}`});
  }
  const data = months.map(({m,y}) => getMonthData(m,y).reduce((s,r)=>s+num(r[COLS.REVENUE]),0));
  if(charts.revenue) charts.revenue.destroy();
  charts.revenue = new Chart(document.getElementById('chart-revenue-monthly'), {
    type, data: {
      labels: months.map(x=>x.label),
      datasets: [{
        label: 'Doanh thu', data,
        backgroundColor: type==='bar' ? c.primaryA : 'transparent',
        borderColor: c.primary, borderWidth: 2,
        borderRadius: type==='bar' ? 6 : 0,
        fill: type==='line', tension: 0.4,
        pointBackgroundColor: c.primary
      }]
    }, options: chartDefaults()
  });
}

function renderStatusChart() {
  const c = getChartColors();
  const md = getMonthData();
  const statusMap = {};
  md.forEach(r => { const s = r[COLS.STATUS]||'Không rõ'; statusMap[s]=(statusMap[s]||0)+1; });
  const labels = Object.keys(statusMap);
  const colors = [c.primary, c.green, c.amber, c.rose, c.cyan, '#8b5cf6','#ec4899'];
  if(charts.status) charts.status.destroy();
  charts.status = new Chart(document.getElementById('chart-po-status'), {
    type: 'doughnut', data: {
      labels, datasets: [{ data: Object.values(statusMap), backgroundColor: colors.slice(0,labels.length), borderWidth: 0 }]
    }, options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { color: c.text, padding: 12, font: { size: 11 } } } }
    }
  });
}

function renderPOCountChart() {
  const c = getChartColors();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    let m = currentMonth - i, y = currentYear;
    while(m<1){m+=12;y--;}
    months.push({m,y,label:`T${m}`});
  }
  const data = months.map(({m,y}) => getMonthData(m,y).length);
  if(charts.poCount) charts.poCount.destroy();
  charts.poCount = new Chart(document.getElementById('chart-po-count'), {
    type: 'bar', data: {
      labels: months.map(x=>x.label),
      datasets: [{
        label: 'Số PO', data,
        backgroundColor: 'rgba(6,182,212,0.25)', borderColor: c.cyan,
        borderWidth: 2, borderRadius: 6
      }]
    }, options: {...chartDefaults(), scales: {
      ...chartDefaults().scales,
      y: { ...chartDefaults().scales.y, ticks: { ...chartDefaults().scales.y.ticks, callback: v => v } }
    }}
  });
}

function renderTopCustomers() {
  const md = getMonthData();
  const map = {};
  md.forEach(r => { const c = r[COLS.CUSTOMER]||'N/A'; map[c] = (map[c]||0) + num(r[COLS.REVENUE]); });
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const el = document.getElementById('top-customers-list');
  el.innerHTML = sorted.map(([name,val],i) =>
    `<div class="ranking-item"><div class="ranking-rank">${i+1}</div><div class="ranking-name" title="${name}">${name}</div><div class="ranking-value">${fmtCurrency(val)}</div></div>`
  ).join('') || '<p style="color:var(--text-muted);text-align:center;padding:40px">Không có dữ liệu</p>';
}

// ===== MONTHLY VIEW =====
function renderMonthlyView() {
  const md = getMonthData();
  const pm = currentMonth===1?12:currentMonth-1;
  const py = currentMonth===1?currentYear-1:currentYear;
  const prevMd = getMonthData(pm, py);

  const rev = md.reduce((s,r)=>s+num(r[COLS.REVENUE]),0);
  const prevRev = prevMd.reduce((s,r)=>s+num(r[COLS.REVENUE]),0);
  const avg = md.length ? rev/md.length : 0;
  const prevAvg = prevMd.length ? prevRev/prevMd.length : 0;

  document.getElementById('mkpi-po-count').textContent = md.length;
  document.getElementById('mkpi-revenue').textContent = fmtCurrency(rev);
  document.getElementById('mkpi-new-customers').textContent = new Set(md.map(r=>r[COLS.CUSTOMER]).filter(Boolean)).size;
  document.getElementById('mkpi-avg').textContent = fmtCurrency(avg);

  setCompare('mkpi-po-compare', md.length, prevMd.length);
  setCompare('mkpi-revenue-compare', rev, prevRev);
  setCompare('mkpi-avg-compare', avg, prevAvg);

  renderMonthlyTable();
}

function setCompare(id, cur, prev) {
  const el = document.getElementById(id);
  if(!prev) { el.textContent = '—'; el.className = 'mkpi-compare'; return; }
  const d = ((cur-prev)/Math.abs(prev)*100).toFixed(1);
  el.textContent = (d>=0?'↑ +':'↓ ') + d + '%';
  el.className = 'mkpi-compare ' + (d>=0?'up':'down');
}

// ===== TABLES =====
function renderMonthlyTable(page) {
  page = page || 1;
  const search = (document.getElementById('monthly-search').value||'').toLowerCase();
  let data = getMonthData().filter(r => !search || DISPLAY_COLS.some(c => (r[COLS[c]]||'').toLowerCase().includes(search)));
  renderTable('monthly', data, page);
}

function renderDetailTable(page) {
  page = page || 1;
  const search = (document.getElementById('detail-search').value||'').toLowerCase();
  let data = allData.filter(r => !search || DISPLAY_COLS.some(c => (r[COLS[c]]||'').toLowerCase().includes(search)));
  renderTable('detail', data, page);
}

function renderTable(prefix, data, page) {
  const head = document.getElementById(prefix+'-table-head');
  const body = document.getElementById(prefix+'-table-body');
  const info = document.getElementById(prefix+'-table-info');
  const pag = document.getElementById(prefix+'-pagination');

  const colLabels = {ID_SO:'Mã SO',STATUS:'Trạng thái',SO_DATE:'Ngày',CUSTOMER:'Khách hàng',PO_NO:'PO No',NAME:'Sản phẩm',QTY:'SL',AMOUNT:'Giá trị',REVENUE:'Doanh thu',PROFIT:'Lợi nhuận',MARGIN:'Margin',IV_MONTH:'Tháng',IV_YEAR:'Năm',SALES_SITUATION:'Tình trạng'};

  head.innerHTML = DISPLAY_COLS.map(c => `<th>${colLabels[c]||c}</th>`).join('');

  const total = data.length;
  const totalPages = Math.ceil(total / CONFIG.ROWS_PER_PAGE) || 1;
  page = Math.min(page, totalPages);
  const start = (page-1) * CONFIG.ROWS_PER_PAGE;
  const pageData = data.slice(start, start + CONFIG.ROWS_PER_PAGE);

  body.innerHTML = pageData.map(r => '<tr>' + DISPLAY_COLS.map(c => {
    const v = r[COLS[c]] || '';
    if(c==='STATUS') return `<td><span class="status-badge ${getStatusClass(v)}">${v||'—'}</span></td>`;
    if(['AMOUNT','REVENUE','PROFIT'].includes(c)) return `<td style="text-align:right;font-weight:600">${fmt(num(v))}</td>`;
    if(c==='MARGIN') return `<td style="text-align:right">${v}</td>`;
    return `<td>${v}</td>`;
  }).join('') + '</tr>').join('') || '<tr><td colspan="'+DISPLAY_COLS.length+'" style="text-align:center;padding:40px;color:var(--text-muted)">Không có dữ liệu</td></tr>';

  info.textContent = `Hiển thị ${pageData.length} / ${total} dòng`;

  let pagHTML = '';
  for(let i=1;i<=Math.min(totalPages,7);i++) {
    pagHTML += `<button class="${i===page?'active':''}" onclick="render${prefix==='monthly'?'Monthly':'Detail'}Table(${i})">${i}</button>`;
  }
  pag.innerHTML = pagHTML;
}

// ===== ANALYTICS =====
function renderAnalytics() {
  const c = getChartColors();
  // Revenue trend 12 months
  const months = [];
  for(let i=11;i>=0;i--) { let m=currentMonth-i,y=currentYear; while(m<1){m+=12;y--;} months.push({m,y,label:`T${m}/${y}`}); }

  const revData = months.map(({m,y})=>getMonthData(m,y).reduce((s,r)=>s+num(r[COLS.REVENUE]),0));
  if(charts.trend) charts.trend.destroy();
  charts.trend = new Chart(document.getElementById('chart-revenue-trend'), {
    type:'line', data: {
      labels: months.map(x=>x.label),
      datasets: [{ label:'Doanh thu', data:revData, borderColor:c.primary, backgroundColor:c.primaryA, fill:true, tension:0.4, pointRadius:4, pointBackgroundColor:c.primary }]
    }, options: chartDefaults()
  });

  // Customer distribution (current month)
  const md = getMonthData();
  const custMap = {};
  md.forEach(r => { const cu=r[COLS.CUSTOMER]||'N/A'; custMap[cu]=(custMap[cu]||0)+num(r[COLS.REVENUE]); });
  const custSorted = Object.entries(custMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const dColors = [c.primary,c.cyan,c.green,c.amber,c.rose,'#8b5cf6'];
  if(charts.custDist) charts.custDist.destroy();
  charts.custDist = new Chart(document.getElementById('chart-customer-dist'), {
    type:'pie', data: {
      labels:custSorted.map(x=>x[0]), datasets:[{data:custSorted.map(x=>x[1]), backgroundColor:dColors, borderWidth:0}]
    }, options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom',labels:{color:c.text,font:{size:10},padding:8}}} }
  });

  // Comparison this vs last month
  const pm=currentMonth===1?12:currentMonth-1, py=currentMonth===1?currentYear-1:currentYear;
  const prevMd = getMonthData(pm,py);
  const metrics = ['PO','Doanh thu','KH','TB/Đơn'];
  const curVals = [md.length, md.reduce((s,r)=>s+num(r[COLS.REVENUE]),0), new Set(md.map(r=>r[COLS.CUSTOMER]).filter(Boolean)).size, 0];
  curVals[3] = curVals[0] ? curVals[1]/curVals[0] : 0;
  const prevVals = [prevMd.length, prevMd.reduce((s,r)=>s+num(r[COLS.REVENUE]),0), new Set(prevMd.map(r=>r[COLS.CUSTOMER]).filter(Boolean)).size, 0];
  prevVals[3] = prevVals[0] ? prevVals[1]/prevVals[0] : 0;
  // Normalize for chart
  const maxV = Math.max(...curVals, ...prevVals, 1);
  if(charts.compare) charts.compare.destroy();
  charts.compare = new Chart(document.getElementById('chart-comparison'), {
    type:'bar', data: {
      labels:metrics,
      datasets: [
        {label:`T${currentMonth}`, data:curVals, backgroundColor:c.primaryA, borderColor:c.primary, borderWidth:2, borderRadius:6},
        {label:`T${pm}`, data:prevVals, backgroundColor:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.2)', borderWidth:2, borderRadius:6}
      ]
    }, options: {
      ...chartDefaults(),
      plugins:{legend:{display:true,labels:{color:c.text,font:{size:11}}}},
      scales:{...chartDefaults().scales, y:{...chartDefaults().scales.y, ticks:{...chartDefaults().scales.y.ticks, callback:v=>fmtCurrency(v)}}}
    }
  });

  // Cumulative
  let cum = 0;
  const cumData = revData.map(v => { cum+=v; return cum; });
  if(charts.cumulative) charts.cumulative.destroy();
  charts.cumulative = new Chart(document.getElementById('chart-cumulative'), {
    type:'line', data: {
      labels:months.map(x=>x.label),
      datasets:[{label:'Tích lũy',data:cumData,borderColor:c.green,backgroundColor:c.greenA,fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:c.green}]
    }, options: chartDefaults()
  });
}

// ===== EXPORT =====
function exportCSV(data) {
  const colLabels = {ID_SO:'Mã SO',STATUS:'Trạng thái',SO_DATE:'Ngày',CUSTOMER:'Khách hàng',PO_NO:'PO No',NAME:'Sản phẩm',QTY:'SL',AMOUNT:'Giá trị',REVENUE:'Doanh thu',PROFIT:'Lợi nhuận',MARGIN:'Margin',IV_MONTH:'Tháng',IV_YEAR:'Năm',SALES_SITUATION:'Tình trạng'};
  const header = DISPLAY_COLS.map(c=>colLabels[c]||c).join(',');
  const rows = data.map(r => DISPLAY_COLS.map(c => `"${(r[COLS[c]]||'').replace(/"/g,'""')}"`).join(','));
  const csv = '\uFEFF' + header + '\n' + rows.join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `BD_Report_T${currentMonth}_${currentYear}.csv`;
  a.click();
  toast('Đã xuất CSV thành công','success');
}

async function exportPDF() {
  toast('Đang tạo PDF...','');
  try {
    const el = document.getElementById('view-monthly');
    const canvas = await html2canvas(el, {backgroundColor:'#0a0e1a',scale:2});
    const {jsPDF} = window.jspdf;
    const pdf = new jsPDF('l','mm','a4');
    const w = pdf.internal.pageSize.getWidth();
    const h = canvas.height * w / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,w,h);
    pdf.save(`BD_Report_T${currentMonth}_${currentYear}.pdf`);
    toast('Đã xuất PDF thành công','success');
  } catch(e) { toast('Lỗi xuất PDF: '+e.message,'error'); }
}
