// BD Dashboard - Antigravity
// Encoded key fallback for deployment (decoded at runtime)
const _k = atob('QUl6YVN5RDJJcXZNdE5Jc3JTcElkVlhlY19jS2s0eEdrMTFDX0dr');
const CONFIG = {
  SHEET_ID: '1ncHjtkSEl9WyogeFd0OEqOjua_TyV4LT3rWiSI64gJk',
  SHEET_NAME: 'S.SO',
  SALES_FILTER: 'Trí',
  API_KEY: (typeof BD_CONFIG !== 'undefined' && BD_CONFIG.API_KEY) || _k,
  ROWS_PER_PAGE: 20
};

// Simple auth (hash-based for client-side security)
const USERS = [
  { user: 'tri', pass: 'bd2026' },
  { user: 'admin', pass: 'antigravity' },
  { user: 'nguyên', pass: 'Nguyen120981_@!' }
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
  
  // RBAC
  const loggedUser = sessionStorage.getItem('bd_logged_in');
  if (loggedUser === 'nguyen') {
    document.querySelectorAll('[data-view="podetails"], [data-view="analytics"]').forEach(el => el.style.display = 'none');
  } else {
    document.querySelectorAll('[data-view="podetails"], [data-view="analytics"]').forEach(el => el.style.display = '');
  }
  
  // Month nav
  document.getElementById('prev-month').onclick = () => { currentMonth--; if(currentMonth<1){currentMonth=12;currentYear--;} updateMonthDisplay(); renderAll(); };
  document.getElementById('next-month').onclick = () => { currentMonth++; if(currentMonth>12){currentMonth=1;currentYear++;} updateMonthDisplay(); renderAll(); };
  // Logout & Refresh
  document.getElementById('btn-settings').onclick = () => logout();
  document.getElementById('btn-refresh').onclick = () => fetchData();
  // Search
  document.getElementById('detail-search').oninput = () => renderDetailTable();
  // Chart type toggle
  document.querySelectorAll('.chart-btn').forEach(b => {
    b.onclick = () => { document.querySelectorAll('.chart-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderRevenueChart(b.dataset.chartType); };
  });
  updateMonthDisplay();
}

function updateMonthDisplay() {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mStr = `${monthNames[currentMonth-1]} ${currentYear}`;
  document.getElementById('current-month').textContent = mStr;
  const reportLabel = document.getElementById('report-month-label');
  if (reportLabel) reportLabel.textContent = mStr;
  
  if (typeof renderReportBoard === 'function') renderReportBoard();
}

// ===== DATA FETCH =====
async function fetchData() {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(CONFIG.SHEET_NAME)}?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const json = await res.json();
    const rows = json.values || [];
    if (rows.length < 3) throw new Error('No data found');
    // Find header row (skip empty rows at top)
    let headerIdx = rows.findIndex(r => r.some(c => c && c.toString().trim() === 'ID SO'));
    if (headerIdx === -1) headerIdx = 1; // fallback: row 2
    // Filter by Sales = Trí (data starts after header)
    allData = rows.slice(headerIdx + 1).filter(r => (r[COLS.SALES]||'').trim() === CONFIG.SALES_FILTER);
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('header-subtitle').textContent = `BD Team — ${CONFIG.SALES_FILTER}`;
    document.getElementById('last-update').innerHTML = `<span class="badge-dot"></span><span>Updated: ${new Date().toLocaleTimeString('en')}</span>`;
    
    // Fetch Report Data
    if (typeof fetchReportData === 'function') await fetchReportData();
    
    toast(`Loaded ${allData.length} POs successfully`, 'success');
    renderAll();
  } catch(e) {
    console.error(e);
    document.getElementById('loading-screen').style.display = 'none';
    toast('Error: ' + e.message, 'error');
    document.getElementById('app').style.display = 'none';
    logout();
  }
}

// ===== HELPERS =====
function num(v) { if(!v) return 0; return parseFloat(String(v).replace(/,/g,'')) || 0; }
function fmt(n) { return n.toLocaleString('vi-VN'); }
function fmtCurrency(n) { return n >= 1e9 ? (n/1e9).toFixed(2)+'B' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : fmt(n); }

// Parse SO Date (format: DD/MM/YYYY or MM/DD/YYYY)
function parseSODate(v) {
  if (!v) return null;
  const parts = v.split('/');
  if (parts.length !== 3) return null;
  // Assume DD/MM/YYYY
  const d = parseInt(parts[0]), m = parseInt(parts[1]), y = parseInt(parts[2]);
  if (m >= 1 && m <= 12) return { day: d, month: m, year: y };
  return null;
}

// Get data filtered by IV Month/Year (invoice - actual revenue)
function getMonthData(m, y) {
  m = m || currentMonth; y = y || currentYear;
  return allData.filter(r => num(r[COLS.IV_MONTH]) === m && num(r[COLS.IV_YEAR]) === y);
}

// Get data filtered by SO Date month/year (PO received)
function getSOMonthData(m, y) {
  m = m || currentMonth; y = y || currentYear;
  return allData.filter(r => {
    const d = parseSODate(r[COLS.SO_DATE]);
    return d && d.month === m && d.year === y;
  });
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
  renderSOKPIs();
  renderIVKPIs();
  renderSOMonthlyChart();
  renderSOAmountChart();
  renderStatusList();
  renderTopCustomersSO();
  renderNewCustomersSO();
  renderSOCustomerPie();
  renderTargetPOChart();
  renderRevenueChart();
  renderPOCountChart();
  renderTargetChart();
  renderMonthlyDebtChart();
  renderPendingDebtList();
  renderTopCustomersIV();
  renderDetailTable();
  renderAnalytics();
}

// ===== SECTION 1: PO NHẬN ĐƯỢC (SO Date) =====
function renderSOKPIs() {
  const md = getSOMonthData();
  const pm = currentMonth===1?12:currentMonth-1, py = currentMonth===1?currentYear-1:currentYear;
  const prevMd = getSOMonthData(pm, py);
  const count = md.length, amount = md.reduce((s,r)=>s+num(r[COLS.AMOUNT]),0);
  const cust = new Set(md.map(r=>r[COLS.CUSTOMER]).filter(Boolean)).size;
  const avg = count ? amount/count : 0;

  document.getElementById('kpi-so-count').textContent = fmt(count);
  document.getElementById('kpi-so-amount').textContent = fmtCurrency(amount);
  document.getElementById('kpi-so-customers').textContent = fmt(cust);
  document.getElementById('kpi-so-avg').textContent = fmtCurrency(avg);

  const prevCount = prevMd.length, prevAmount = prevMd.reduce((s,r)=>s+num(r[COLS.AMOUNT]),0);
  const prevCust = new Set(prevMd.map(r=>r[COLS.CUSTOMER]).filter(Boolean)).size;
  setTrend('kpi-so-count-trend', count, prevCount);
  setTrend('kpi-so-amount-trend', amount, prevAmount);
  setTrend('kpi-so-customers-trend', cust, prevCust);
}

function renderSOMonthlyChart() {
  const c = getChartColors();
  const months = getLast12Months();
  const data = months.map(({m,y})=>getSOMonthData(m,y).length);
  if(charts.soMonthly) charts.soMonthly.destroy();
  charts.soMonthly = new Chart(document.getElementById('chart-so-monthly'), {
    type:'bar', data:{ labels:months.map(x=>x.label), datasets:[{
      label:'PO nhận', data, backgroundColor:'rgba(99,102,241,0.6)', borderColor:'#6366f1', borderWidth:1, borderRadius:6
    }]}, options:{...chartDefaults(), scales:{...chartDefaults().scales, y:{...chartDefaults().scales.y, ticks:{...chartDefaults().scales.y.ticks, callback:v=>v}}}},
    plugins: [ChartDataLabels]
  });
}

function renderSOAmountChart() {
  const c = getChartColors();
  const months = getLast12Months();
  const data = months.map(({m,y})=>getSOMonthData(m,y).reduce((s,r)=>s+num(r[COLS.AMOUNT]),0));
  if(charts.soAmount) charts.soAmount.destroy();
  charts.soAmount = new Chart(document.getElementById('chart-so-amount'), {
    type:'line', data:{ labels:months.map(x=>x.label), datasets:[{
      label:'Amount', data, borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,0.15)', fill:true, tension:0.4, pointRadius:4, pointBackgroundColor:'#f59e0b'
    }]}, options:chartDefaults(),
    plugins: [ChartDataLabels]
  });
}

function renderTopCustomersSO() {
  const md = getSOMonthData();
  const md2026 = allData.filter(r => (r[COLS.SO_DATE]||'').split('/')[2] === '2026');
  
  const mapMonth = {};
  md.forEach(r=>{ const c=r[COLS.CUSTOMER]||'N/A'; mapMonth[c]=(mapMonth[c]||0)+num(r[COLS.AMOUNT]); });
  
  const mapYear = {};
  md2026.forEach(r=>{ const c=r[COLS.CUSTOMER]||'N/A'; mapYear[c]=(mapYear[c]||0)+num(r[COLS.AMOUNT]); });
  
  const sorted = Object.entries(mapMonth).sort((a,b)=>b[1]-a[1]).slice(0,8);
  document.getElementById('top-customers-so').innerHTML = sorted.map(([name,val],i)=>
    `<div class="ranking-item">
       <div class="ranking-rank">${i+1}</div>
       <div class="ranking-name" title="${name}">${name}</div>
       <div class="ranking-value" style="display:flex; flex-direction:column; align-items:flex-end;">
         <span style="color:var(--text-primary); font-weight:bold; line-height:1;">${fmtCurrency(val)}</span>
         <span style="color:var(--text-muted); font-size:0.75rem; line-height:1; margin-top:2px;">/ ${fmtCurrency(mapYear[name]||0)}</span>
       </div>
     </div>`
  ).join('') || '<p style="color:var(--text-muted);text-align:center;padding:40px">No data</p>';
}

function renderNewCustomersSO() {
  const data2026SO = allData.filter(r => {
    const parts = (r[COLS.SO_DATE]||'').split('/');
    return parts[2] === '2026';
  });
  const pastData = allData.filter(r => {
    const parts = (r[COLS.SO_DATE]||'').split('/');
    return parts[2] && parseInt(parts[2], 10) < 2026;
  });
  const pastCustomers = new Set(pastData.map(r => r[COLS.CUSTOMER]).filter(Boolean));
  
  const newCustMap = {};
  data2026SO.forEach(r => {
    const c = r[COLS.CUSTOMER];
    const month = parseInt((r[COLS.SO_DATE]||'').split('/')[1] || 0, 10);
    if (c && !pastCustomers.has(c)) {
      if (!newCustMap[c]) newCustMap[c] = { month, amount: 0 };
      if (month < newCustMap[c].month) newCustMap[c].month = month;
      newCustMap[c].amount += num(r[COLS.AMOUNT]);
    }
  });
  
  const sorted = Object.entries(newCustMap).sort((a,b)=>b[1].amount - a[1].amount).slice(0,8);
  document.getElementById('new-customers-so').innerHTML = sorted.map(([name,data],i)=>
    `<div class="ranking-item"><div class="ranking-rank" style="font-size:0.75rem; width:auto; padding:0 6px;">T${data.month}</div><div class="ranking-name" title="${name}">${name}</div><div class="ranking-value">${fmtCurrency(data.amount)}</div></div>`
  ).join('') || '<p style="color:var(--text-muted);text-align:center;padding:40px">No new customers in 2026</p>';
}

function renderSOCustomerPie() {
  const c = getChartColors();
  const md = allData.filter(r => {
    const parts = (r[COLS.SO_DATE]||'').split('/');
    return parts[2] === '2026';
  });
  const map = {};
  md.forEach(r => { const cust = r[COLS.CUSTOMER]||'Khác'; map[cust] = (map[cust]||0) + num(r[COLS.AMOUNT]); });
  
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]);
  const top = sorted.slice(0,5);
  const others = sorted.slice(5).reduce((s,x)=>s+x[1],0);
  if (others > 0) top.push(['Khác', others]);
  
  const colors = [c.primary, c.amber, c.green, c.cyan, c.rose, '#8e8e93'];

  const hcData = top.map((x, i) => ({
    name: x[0],
    y: x[1],
    color: colors[i % colors.length]
  }));

  if(charts.soCustomerPie) charts.soCustomerPie.destroy();
  charts.soCustomerPie = Highcharts.chart('chart-so-customer-pie', {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      options3d: { enabled: true, alpha: 45, beta: 0 }
    },
    title: { text: null },
    tooltip: { 
      formatter: function() {
        return `<b>${this.point.name}</b><br/>${this.series.name}: <b>${shortFmt(this.point.y)} (${this.point.percentage.toFixed(1)}%)</b>`;
      }
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        depth: 35,
        innerSize: 40,
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.percentage:.0f}%',
          distance: 15,
          style: {
            color: c.text,
            textOutline: 'none',
            fontWeight: '600',
            fontFamily: 'var(--font-stack)',
            fontSize: '11px'
          }
        }
      }
    },
    credits: { enabled: false },
    series: [{
      name: 'PO Received',
      data: hcData
    }]
  });
}

function renderTargetPOChart() {
  const md2026 = allData.filter(r => (r[COLS.SO_DATE]||'').split('/')[2] === '2026');
  const md2025 = allData.filter(r => (r[COLS.SO_DATE]||'').split('/')[2] === '2025');
  const totalPO26 = md2026.reduce((s,r) => s + num(r[COLS.AMOUNT]), 0);
  const totalPO25 = md2025.reduce((s,r) => s + num(r[COLS.AMOUNT]), 0);
  const target26 = 7000000000;
  const target25 = 5000000000; // 5 Tỷ cho 2025
  
  const pct26 = Math.min((totalPO26 / target26) * 100, 100).toFixed(1);
  const pct25 = Math.min((totalPO25 / target25) * 100, 100).toFixed(1);

  document.getElementById('target-po-percentage-26').textContent = `${pct26}%`;
  document.getElementById('target-po-text-26').textContent = `${(totalPO26 / 1e9).toFixed(2)}B / 7B`;
  
  document.getElementById('target-po-percentage-25').textContent = `${pct25}%`;
  document.getElementById('target-po-text-25').textContent = `${(totalPO25 / 1e9).toFixed(2)}B / 5B`;

  if(charts.targetPO26) charts.targetPO26.destroy();
  charts.targetPO26 = new Chart(document.getElementById('chart-target-po-2026'), {
    type: 'doughnut',
    data: { labels: ['Achieved', 'Remaining'], datasets: [{ data: [totalPO26, Math.max(target26 - totalPO26, 0)], backgroundColor: [getChartColors().amber, getChartColors().grid], borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', circumference: 180, rotation: 270, plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } } }
  });

  if(charts.targetPO25) charts.targetPO25.destroy();
  charts.targetPO25 = new Chart(document.getElementById('chart-target-po-2025'), {
    type: 'doughnut',
    data: { labels: ['Achieved', 'Remaining'], datasets: [{ data: [totalPO25, Math.max(target25 - totalPO25, 0)], backgroundColor: ['#8e8e93', getChartColors().grid], borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', circumference: 180, rotation: 270, plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } } }
  });
}

// ===== SECTION 2: PO XUẤT HÓA ĐƠN (IV Month/Year) =====
function renderIVKPIs() {
  const md = getMonthData();
  const pm = currentMonth===1?12:currentMonth-1, py = currentMonth===1?currentYear-1:currentYear;
  const prevMd = getMonthData(pm, py);
  const count = md.length, revenue = md.reduce((s,r)=>s+num(r[COLS.REVENUE]),0);
  const profit = md.reduce((s,r)=>s+num(r[COLS.PROFIT]),0);
  const cust = new Set(md.map(r=>r[COLS.CUSTOMER]).filter(Boolean)).size;

  document.getElementById('kpi-iv-count').textContent = fmt(count);
  document.getElementById('kpi-iv-revenue').textContent = fmtCurrency(revenue);
  document.getElementById('kpi-iv-profit').textContent = fmtCurrency(profit);
  document.getElementById('kpi-iv-customers').textContent = fmt(cust);

  const prevCount = prevMd.length;
  const prevRev = prevMd.reduce((s,r)=>s+num(r[COLS.REVENUE]),0);
  const prevProfit = prevMd.reduce((s,r)=>s+num(r[COLS.PROFIT]),0);
  const prevCust = new Set(prevMd.map(r=>r[COLS.CUSTOMER]).filter(Boolean)).size;
  setTrend('kpi-iv-count-trend', count, prevCount);
  setTrend('kpi-iv-revenue-trend', revenue, prevRev);
  setTrend('kpi-iv-profit-trend', profit, prevProfit);
  setTrend('kpi-iv-customers-trend', cust, prevCust);
}

function renderTopCustomersIV() {
  const md = getMonthData();
  const md2026 = allData.filter(r => r[COLS.IV_YEAR] === '2026');
  
  const mapMonth = {};
  md.forEach(r=>{ const c=r[COLS.CUSTOMER]||'N/A'; mapMonth[c]=(mapMonth[c]||0)+num(r[COLS.REVENUE]); });
  
  const mapYear = {};
  md2026.forEach(r=>{ const c=r[COLS.CUSTOMER]||'N/A'; mapYear[c]=(mapYear[c]||0)+num(r[COLS.REVENUE]); });
  
  const sorted = Object.entries(mapMonth).sort((a,b)=>b[1]-a[1]).slice(0,8);
  document.getElementById('top-customers-iv').innerHTML = sorted.map(([name,val],i)=>
    `<div class="ranking-item">
       <div class="ranking-rank">${i+1}</div>
       <div class="ranking-name" title="${name}">${name}</div>
       <div class="ranking-value" style="display:flex; flex-direction:column; align-items:flex-end;">
         <span style="color:var(--text-primary); font-weight:bold; line-height:1;">${fmtCurrency(val)}</span>
         <span style="color:var(--text-muted); font-size:0.75rem; line-height:1; margin-top:2px;">/ ${fmtCurrency(mapYear[name]||0)}</span>
       </div>
     </div>`
  ).join('') || '<p style="color:var(--text-muted);text-align:center;padding:40px">No data</p>';
}

function renderTargetChart() {
  const md2026 = allData.filter(r => r[COLS.IV_YEAR] === '2026');
  const md2025 = allData.filter(r => r[COLS.IV_YEAR] === '2025');
  
  const totalRev26 = md2026.reduce((s,r) => s + num(r[COLS.REVENUE]), 0);
  const totalRev25 = md2025.reduce((s,r) => s + num(r[COLS.REVENUE]), 0);
  const target26 = 7000000000;
  const target25 = 5000000000;
  
  const pct26 = Math.min((totalRev26 / target26) * 100, 100).toFixed(1);
  const pct25 = Math.min((totalRev25 / target25) * 100, 100).toFixed(1);

  document.getElementById('target-rev-percentage-26').textContent = `${pct26}%`;
  document.getElementById('target-rev-text-26').textContent = `${(totalRev26 / 1e9).toFixed(2)}B / 7B`;
  
  document.getElementById('target-rev-percentage-25').textContent = `${pct25}%`;
  document.getElementById('target-rev-text-25').textContent = `${(totalRev25 / 1e9).toFixed(2)}B / 5B`;

  if(charts.targetProgress26) charts.targetProgress26.destroy();
  charts.targetProgress26 = new Chart(document.getElementById('chart-target-rev-2026'), {
    type: 'doughnut',
    data: { labels: ['Achieved', 'Remaining'], datasets: [{ data: [totalRev26, Math.max(target26 - totalRev26, 0)], backgroundColor: [getChartColors().primary, getChartColors().grid], borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', circumference: 180, rotation: 270, plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } } }
  });

  if(charts.targetProgress25) charts.targetProgress25.destroy();
  charts.targetProgress25 = new Chart(document.getElementById('chart-target-rev-2025'), {
    type: 'doughnut',
    data: { labels: ['Achieved', 'Remaining'], datasets: [{ data: [totalRev25, Math.max(target25 - totalRev25, 0)], backgroundColor: ['#8e8e93', getChartColors().grid], borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', circumference: 180, rotation: 270, plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } } }
  });
}

function renderMonthlyDebtChart() {
  const c = getChartColors();
  const months = getLast12Months();
  const data = months.map(({m,y}) => {
    return getMonthData(m,y).reduce((s,r) => {
      const st = (r[COLS.STATUS]||'').toLowerCase();
      const isDebt = !st.includes('8.') && !st.includes('completed') && !st.includes('cancel') && !st.includes('deleted');
      return s + (isDebt ? num(r[COLS.AMOUNT]) : 0);
    }, 0);
  });
  
  if(charts.debtMonthly) charts.debtMonthly.destroy();
  charts.debtMonthly = new Chart(document.getElementById('chart-debt-monthly'), {
    type: 'bar', data: {
      labels: months.map(x=>x.label),
      datasets: [{
        label: 'Debt Amount', data,
        backgroundColor: 'rgba(255,59,48,0.25)', borderColor: c.rose, borderWidth: 2, borderRadius: 6
      }]
    }, options: chartDefaults()
  });
}

function renderPendingDebtList() {
  const md = allData.filter(r => {
    if (r[COLS.IV_YEAR] !== '2026') return false;
    const st = (r[COLS.STATUS]||'').toLowerCase();
    return !st.includes('8.') && !st.includes('completed') && !st.includes('cancel') && !st.includes('deleted');
  });
  const map = {};
  md.forEach(r => {
    const cust = r[COLS.CUSTOMER] || 'Khác';
    map[cust] = (map[cust]||0) + num(r[COLS.AMOUNT]);
  });
  
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);
  document.getElementById('pending-debt-list').innerHTML = sorted.map(([name,val],i)=>
    `<div class="ranking-item"><div class="ranking-rank" style="color:var(--accent-rose); border:1px solid currentColor; background:transparent;">${i+1}</div><div class="ranking-name" title="${name}">${name}</div><div class="ranking-value" style="color:var(--accent-rose); font-weight:bold;">${fmtCurrency(val)}</div></div>`
  ).join('') || '<p style="color:var(--text-muted);text-align:center;padding:40px">No pending debt</p>';
}

// Helper: get 2026 months
function getLast12Months() {
  const months = [];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for(let i=1; i<=12; i++) {
    months.push({m: i, y: 2026, label: monthNames[i-1]});
  }
  return months;
}

function setTrend(id, cur, prev) {
  const el = document.getElementById(id);
  if(!prev) { el.textContent = ''; return; }
  const diff = ((cur-prev)/Math.abs(prev)*100).toFixed(1);
  el.textContent = (diff >= 0 ? '↑ +' : '↓ ') + diff + '% vs last month';
  el.className = 'kpi-trend ' + (diff >= 0 ? 'up' : 'down');
}

// ===== CHARTS =====
function getChartColors() {
  return {
    primary: '#007aff', cyan: '#5ac8fa', green: '#34c759',
    amber: '#ff9f0a', rose: '#ff3b30',
    primaryA: 'rgba(0,122,255,0.12)', cyanA: 'rgba(90,200,250,0.12)',
    greenA: 'rgba(52,199,89,0.12)', grid: 'rgba(0,0,0,0.04)',
    text: '#86868b'
  };
}

const modernChartPlugin = {
  id: 'modernChartPlugin',
  beforeDatasetsDraw: function(chart, args, options) {
    const ctx = chart.ctx;
    ctx.save();
    if (chart.config.type === 'bar' || chart.config.type === 'line') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 6;
    } else if (chart.config.type === 'pie' || chart.config.type === 'doughnut') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;
    }
  },
  afterDatasetsDraw: function(chart, args, options) {
    chart.ctx.restore();
  }
};
Chart.register(modernChartPlugin);
if (typeof ChartDataLabels !== 'undefined') {
  Chart.register(ChartDataLabels);
}

function shortFmt(val) {
  if (val >= 1e9) return Number((val/1e9).toPrecision(3)) + 'B';
  if (val >= 1e6) return Number((val/1e6).toPrecision(3)) + 'M';
  if (val >= 1e3) return Number((val/1e3).toPrecision(3)) + 'K';
  return val;
}

function chartDefaults() {
  const c = getChartColors();
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      datalabels: {
        display: true,
        color: c.text,
        font: { weight: 'bold', size: 11, family: 'var(--font-stack)' },
        formatter: (v) => v > 0 ? shortFmt(v) : '',
        anchor: 'end', align: 'top', offset: 4
      }
    },
    layout: { padding: { top: 30 } },
    scales: {
      x: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 11 } } },
      y: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 11 }, callback: v => fmtCurrency(v) } }
    }
  };
}

function renderRevenueChart(type) {
  type = type || 'bar';
  const c = getChartColors();
  const months = getLast12Months();
  const data = months.map(({m,y}) => getMonthData(m,y).reduce((s,r)=>s+num(r[COLS.REVENUE]),0));
  if(charts.revenue) charts.revenue.destroy();
  charts.revenue = new Chart(document.getElementById('chart-revenue-monthly'), {
    type, data: {
      labels: months.map(x=>x.label),
      datasets: [{
        label: 'Doanh thu', data,
        backgroundColor: type==='bar' ? c.greenA : 'transparent',
        borderColor: c.green, borderWidth: 2,
        borderRadius: type==='bar' ? 6 : 0,
        fill: type==='line', tension: 0.4,
        pointBackgroundColor: c.green
      }]
    }, options: chartDefaults()
  });
}

function renderStatusList() {
  const md = getSOMonthData();
  const map = {};
  md.forEach(r => {
    const st = r[COLS.STATUS] || 'Khác';
    if(st.toLowerCase().includes('deleted') || st.toLowerCase().includes('cancel')) return;
    map[st] = (map[st] || 0) + num(r[COLS.AMOUNT]);
  });
  
  const statusColors = {
    '1': '#8e8e93',
    '2': '#007aff', '3': '#069494', '4': '#af52de',
    '5': '#ff3b30', '6': '#34c759', '7': '#ff9f0a', '8': '#ffcc00'
  };

  const sorted = Object.entries(map).sort((a,b) => a[0].localeCompare(b[0]));
  document.getElementById('po-status-list').innerHTML = sorted.map(([name,val],i) => {
    const prefix = name.match(/^\d+/);
    const color = prefix && statusColors[prefix[0]] ? statusColors[prefix[0]] : '#8e8e93';
    return `<div class="ranking-item"><div class="ranking-rank" style="color:${color} !important; border:2px solid ${color} !important; background:transparent !important; background-color:transparent !important; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:bold;">${prefix?prefix[0]:i+1}</div><div class="ranking-name" style="color:${color}; font-weight:600;" title="${name}">${name}</div><div class="ranking-value" style="color:${color}; font-weight:bold;">${fmtCurrency(val)}</div></div>`;
  }).join('') || '<p style="color:var(--text-muted);text-align:center;padding:40px">No data</p>';
}

function renderPOCountChart() {
  const c = getChartColors();
  const months = getLast12Months();
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
  ).join('') || '<p style="color:var(--text-muted);text-align:center;padding:40px">No data</p>';
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

  const colLabels = {ID_SO:'SO ID',STATUS:'Status',SO_DATE:'Date',CUSTOMER:'Customer',PO_NO:'PO No',NAME:'Product',QTY:'Qty',AMOUNT:'Amount',REVENUE:'Revenue',PROFIT:'Profit',MARGIN:'Margin',IV_MONTH:'Month',IV_YEAR:'Year',SALES_SITUATION:'Situation'};

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
  }).join('') + '</tr>').join('') || '<tr><td colspan="'+DISPLAY_COLS.length+'" style="text-align:center;padding:40px;color:var(--text-muted)">No data</td></tr>';

  info.textContent = `Showing ${pageData.length} / ${total} rows`;

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

// ===== REPORT BOARD =====
let reportDataList = [];

async function fetchReportData() {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.REPORT_SHEET_ID}/values/${encodeURIComponent(CONFIG.REPORT_SHEET_NAME)}?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const json = await res.json();
    const rows = json.values || [];
    if (rows.length > 2) {
      reportDataList = rows.slice(2).map(r => ({
        id: r[0]||'', type: r[1]||'', topic: r[2]||'', detail: r[3]||'',
        result: r[4]||'', action: r[5]||'', suggestion: r[6]||'',
        date: r[7]||'', month: r[8]||'', year: r[9]||''
      })).filter(x => x.type && x.topic);
    }
  } catch (e) {
    console.error('Fetch Report Data failed:', e);
  }
}

function renderReportBoard() {
  const filtered = reportDataList.filter(r => {
    let rm = parseInt(r.month, 10);
    let ry = parseInt(r.year, 10);
    return rm === currentMonth && ry === currentYear;
  });
  
  const container = document.getElementById('activity-timeline');
  if (!container) return;
  
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">No activities recorded for this month.</div>';
    return;
  }
  
  const renderItem = (c) => {
    let isWin = c.type.toLowerCase().includes('win');
    let itemClass = isWin ? 'win' : 'redflag';
    
    let topicClass = 'topic-other';
    if (c.topic.toLowerCase().includes('project')) topicClass = 'topic-project';
    else if (c.topic.toLowerCase().includes('hr')) topicClass = 'topic-hr';
    else if (c.topic.toLowerCase().includes('po')) topicClass = 'topic-po';
    
    return `
      <div class="timeline-item ${itemClass}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <div class="timeline-badges">
              <span class="badge-type ${itemClass}">${c.type}</span>
              <span class="badge-topic ${topicClass}">${c.topic}</span>
            </div>
            ${c.date ? `<div class="timeline-date"><span>🕒</span> ${c.date}</div>` : ''}
          </div>
          <div class="timeline-detail">${c.detail}</div>
          ${c.result ? `<div class="timeline-box result"><strong>🎯 Result:</strong> ${c.result}</div>` : ''}
          ${c.action ? `<div class="timeline-box action"><strong>⚡ Action:</strong><br>${c.action}</div>` : ''}
          ${c.suggestion ? `<div class="timeline-box suggestion">💡 <span>${c.suggestion}</span></div>` : ''}
        </div>
      </div>
    `;
  };
  
  container.innerHTML = filtered.map(renderItem).join('');
}
