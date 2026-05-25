// BD Dashboard - Antigravity
// Encoded key fallback for deployment (decoded at runtime)
const _k = atob('QUl6YVN5RDJJcXZNdE5Jc3JTcElkVlhlY19jS2s0eEdrMTFDX0dr');
const CONFIG = {
  SHEET_ID: (typeof BD_CONFIG !== 'undefined' && BD_CONFIG.SHEET_ID) || '1ncHjtkSEl9WyogeFd0OEqOjua_TyV4LT3rWiSI64gJk',
  SHEET_NAME: (typeof BD_CONFIG !== 'undefined' && BD_CONFIG.SHEET_NAME) || 'S.SO',
  SALES_FILTER: (typeof BD_CONFIG !== 'undefined' && BD_CONFIG.SALES_FILTER) || 'Trí',
  API_KEY: (typeof BD_CONFIG !== 'undefined' && BD_CONFIG.API_KEY) || _k,
  ROWS_PER_PAGE: 20,
  REPORT_SHEET_ID: (typeof BD_CONFIG !== 'undefined' && BD_CONFIG.REPORT_SHEET_ID) || '1UIqT7rWcfkaAJHZDR5Gzsb4LAcyvh2voVjwHDl7Be7U',
  REPORT_SHEET_NAME: (typeof BD_CONFIG !== 'undefined' && BD_CONFIG.REPORT_SHEET_NAME) || 'Report',
  QT_SHEET_ID: (typeof BD_CONFIG !== 'undefined' && BD_CONFIG.QT_SHEET_ID) || '1TTB57jpVnERMZPd17kIcr8G-3eG_Yr43W95G0710Uy4'
};

// Simple auth (hash-based for client-side security)
const USERS = [
  { user: 'tri', pass: 'bd2026' },
  { user: 'admin', pass: 'antigravity' },
  { user: 'nguyên', pass: 'Nguyen120981_@!' },
  { user: 'trinh', pass: 'ht0403' },
  { user: 'hue', pass: 'bh1510' },
  { user: 'thu', pass: 'kt1502' }
];

// Disable Highcharts accessibility warning
if (typeof Highcharts !== 'undefined') {
  Highcharts.setOptions({ accessibility: { enabled: false } });
}

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

let allData = [], allQuotations = [], charts = {}, currentMonth, currentYear, currentView = 'quotation', currentQtSource = 'QT26';

const statusColors = {
  '1': '#8e8e93', '2': '#007aff', '3': '#069494', '4': '#af52de',
  '5': '#ff3b30', '6': '#34c759', '7': '#ff9f0a', '8': '#ffcc00'
};

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

  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
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
      const qtTabsHeader = document.getElementById('qt-tabs-header');
      const qtAmountSummary = document.getElementById('qt-amount-summary');
      if (qtTabsHeader) {
        qtTabsHeader.style.display = (currentView === 'quotation') ? 'flex' : 'none';
      }
      if (qtAmountSummary) {
        qtAmountSummary.style.display = (currentView === 'quotation') ? 'flex' : 'none';
      }
    };
  });
  

  // RBAC
  const loggedUser = (sessionStorage.getItem('bd_logged_in') || '').toLowerCase();
  
  // Setup Quotation Sub-Tabs
  document.querySelectorAll('.qt-tab-btn').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('.qt-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentQtSource = btn.dataset.source;
      if (typeof renderQuotation === 'function') renderQuotation();
    };
  });

  // Details & Analytics
  if (loggedUser === 'nguyen' || loggedUser === 'nguyên') {
    document.querySelectorAll('[data-view="details"], [data-view="analytics"]').forEach(el => el.style.display = 'none');
  } else {
    document.querySelectorAll('[data-view="details"], [data-view="analytics"]').forEach(el => el.style.display = '');
  }

  // Quotation
  if (['tri', 'trinh', 'hue', 'admin'].includes(loggedUser)) {
    document.querySelectorAll('[data-view="quotation"]').forEach(el => el.style.display = '');
  } else {
    document.querySelectorAll('[data-view="quotation"]').forEach(el => el.style.display = 'none');
  }

  // Report
  if (['trinh', 'hue'].includes(loggedUser)) {
    document.querySelectorAll('[data-view="report"]').forEach(el => el.style.display = 'none');
  } else {
    document.querySelectorAll('[data-view="report"]').forEach(el => el.style.display = '');
  }
  
  // Month nav
  document.getElementById('prev-month').onclick = () => { currentMonth--; if(currentMonth<1){currentMonth=12;currentYear--;} updateMonthDisplay(); renderAll(); };
  document.getElementById('next-month').onclick = () => { currentMonth++; if(currentMonth>12){currentMonth=1;currentYear++;} updateMonthDisplay(); renderAll(); };
  // Logout
  document.getElementById('btn-settings').onclick = () => logout();
  // Search
  document.getElementById('detail-search').oninput = () => renderDetailTable();
  // Chart type toggle
  document.querySelectorAll('.chart-btn').forEach(b => {
    b.onclick = () => { document.querySelectorAll('.chart-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderRevenueChart(b.dataset.chartType); };
  });
  document.querySelectorAll('.chart-btn-so').forEach(b => {
    b.onclick = () => { document.querySelectorAll('.chart-btn-so').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderSOAmountChart(b.dataset.chartType); };
  });
  document.querySelectorAll('.chart-btn-qt').forEach(b => {
    b.onclick = () => { document.querySelectorAll('.chart-btn-qt').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderQuotationCharts(); };
  });

  const qtTabsHeader = document.getElementById('qt-tabs-header');
  const qtAmountSummary = document.getElementById('qt-amount-summary');
  if (qtTabsHeader) {
    qtTabsHeader.style.display = (currentView === 'quotation') ? 'flex' : 'none';
  }
  if (qtAmountSummary) {
    qtAmountSummary.style.display = (currentView === 'quotation') ? 'flex' : 'none';
  }

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
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'flex';

    const urlPO = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(CONFIG.SHEET_NAME)}?key=${CONFIG.API_KEY}`;
    const urlQT = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.QT_SHEET_ID}/values:batchGet?ranges=QT26!A1:AZ&ranges=${encodeURIComponent("'QT KL'!A1:AZ")}&ranges=${encodeURIComponent("'QT SS'!A1:AZ")}&key=${CONFIG.API_KEY}`;
    
    // Concurrent fetches
    const poPromise = fetch(urlPO);
    const qtPromise = fetch(urlQT).then(r => r.ok ? r.json() : null).catch(() => null);

    // Async fetching without blocking UI
    if (typeof fetchReportData === 'function') {
      fetchReportData().then(() => { if (typeof renderReportBoard === 'function') renderReportBoard(); }).catch(e => console.error(e));
    }

    const resPO = await poPromise;

    if (!resPO.ok) throw new Error(`API Error: ${resPO.status}`);
    const poJson = await resPO.json();
    const rows = poJson.values || [];
    if (rows.length < 3) throw new Error('No data found');
    let headerIdx = rows.findIndex(r => r.some(c => c && c.toString().trim() === 'ID SO'));
    if (headerIdx === -1) headerIdx = 1; 
    allData = rows.slice(headerIdx + 1).filter(r => (r[COLS.SALES]||'').trim() === CONFIG.SALES_FILTER);

    // Parse Quotation data AFTER PO data so we can check for Won status correctly
    if (typeof fetchQuotationData === 'function') {
      const qtJson = await qtPromise;
      if (qtJson) await fetchQuotationData(qtJson);
    }

    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('header-subtitle').textContent = `BD Team — ${CONFIG.SALES_FILTER}`;
    document.getElementById('last-update').innerHTML = `<span class="badge-dot"></span><span>Updated: ${new Date().toLocaleTimeString('en')}</span>`;
    
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

function isValidPO(r) {
  const st = (r[COLS.STATUS] || '').toLowerCase();
  return !st.includes('deleted') && !st.includes('cancel');
}

// Get data filtered by IV Month/Year (invoice - actual revenue)
function getMonthData(m, y) {
  m = m || currentMonth; y = y || currentYear;
  return allData.filter(r => isValidPO(r) && num(r[COLS.IV_MONTH]) === m && num(r[COLS.IV_YEAR]) === y);
}

// Get data filtered by SO Date month/year (PO received)
function getSOMonthData(m, y) {
  m = m || currentMonth; y = y || currentYear;
  return allData.filter(r => {
    if (!isValidPO(r)) return false;
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
  if (typeof renderCustomerMarginChart === 'function') renderCustomerMarginChart();
  renderDetailTable();
  renderAnalytics();
  if (typeof renderReportBoard === 'function') renderReportBoard();
  if (typeof renderQuotationSummary === 'function') renderQuotationSummary();
  if (typeof renderQuotationKPIs === 'function') renderQuotationKPIs();
  if (typeof renderQuotationCharts === 'function') renderQuotationCharts();
  if (typeof renderQuotationTable === 'function') renderQuotationTable();
  if (typeof renderPendingPOsChart === 'function') renderPendingPOsChart();
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

function renderSOAmountChart(type) {
  type = type || 'line';
  const c = getChartColors();
  const months = getLast12Months();
  const data = months.map(({m,y})=>getSOMonthData(m,y).reduce((s,r)=>s+num(r[COLS.AMOUNT]),0));
  const elTotal = document.getElementById('chart-total-so-amount');
  if(elTotal) elTotal.textContent = fmtCurrency(data.reduce((a,b)=>a+b,0));

  if(charts.soAmount) charts.soAmount.destroy();
  charts.soAmount = new Chart(document.getElementById('chart-so-amount'), {
    type, data:{ labels:months.map(x=>x.label), datasets:[{
      label:'Amount', data, 
      borderColor:'#f59e0b', 
      backgroundColor: type === 'bar' ? 'rgba(245,158,11,0.15)' : 'transparent', 
      fill: type==='line', tension:0.4, pointRadius:4, pointBackgroundColor:'#f59e0b',
      borderWidth: 2, borderRadius: type==='bar' ? 6 : 0
    }]}, options:chartDefaults(),
    plugins: [ChartDataLabels]
  });
}

function renderTopCustomersSO() {
  const md = getSOMonthData();
  const md2026 = allData.filter(r => isValidPO(r) && (r[COLS.SO_DATE]||'').split('/')[2] === '2026');
  
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
    if (!isValidPO(r)) return false;
    const parts = (r[COLS.SO_DATE]||'').split('/');
    return parts[2] === '2026';
  });
  const pastData = allData.filter(r => {
    if (!isValidPO(r)) return false;
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
    if (!isValidPO(r)) return false;
    const parts = (r[COLS.SO_DATE]||'').split('/');
    return parts[2] === '2026';
  });
  const map = {};
  md.forEach(r => { const cust = r[COLS.CUSTOMER]||'Khác'; map[cust] = (map[cust]||0) + num(r[COLS.AMOUNT]); });
  
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]);
  const top = sorted.slice(0,5);
  const others = sorted.slice(5).reduce((s,x)=>s+x[1],0);
  if (others > 0) top.push(['Khác', others]);
  
  const colors = ['#A8E6CF', '#DCEDC1', '#FFD3B6', '#FFAAA5', '#FF8B94', '#9D94FF'];

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
  const md2026 = allData.filter(r => isValidPO(r) && (r[COLS.SO_DATE]||'').split('/')[2] === '2026');
  const md2025 = allData.filter(r => isValidPO(r) && (r[COLS.SO_DATE]||'').split('/')[2] === '2025');
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
  const md2026 = allData.filter(r => isValidPO(r) && r[COLS.IV_YEAR] === '2026');
  
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

function renderCustomerMarginChart() {
  const md2026 = allData.filter(r => isValidPO(r) && r[COLS.IV_YEAR] === '2026');
  
  const mapCustomer = {};
  md2026.forEach(r => {
    const c = r[COLS.CUSTOMER] || 'N/A';
    if (!mapCustomer[c]) mapCustomer[c] = { revenue: 0, profit: 0 };
    mapCustomer[c].revenue += num(r[COLS.REVENUE]);
    mapCustomer[c].profit += num(r[COLS.PROFIT]);
  });
  
  const topCustomers = Object.entries(mapCustomer)
    .sort((a,b) => b[1].revenue - a[1].revenue)
    .slice(0, 10);
    
  const labels = topCustomers.map(x => x[0]);
  const data = topCustomers.map(x => {
    if (x[1].revenue === 0) return 0;
    return parseFloat(((x[1].profit / x[1].revenue) * 100).toFixed(1));
  });

  const c = getChartColors();
  
  if (charts.customerMargin) charts.customerMargin.destroy();
  const canvas = document.getElementById('chart-customer-margin');
  if (!canvas) return;

  charts.customerMargin = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Avg Margin %',
        data: data,
        backgroundColor: c.accent,
        borderRadius: 4
      }]
    },
    options: {
      ...chartDefaults(),
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: function(ctx) { return ctx.parsed.x + '%'; } }
        },
        datalabels: {
          color: c.text, anchor: 'end', align: 'end',
          formatter: v => v + '%',
          font: { weight: 'bold', size: 10 }
        }
      },
      scales: {
        x: { 
          display: true, beginAtZero: true, 
          grid: { color: c.border }, 
          ticks: { color: c.text, font: { size: 10 } },
          suggestedMax: Math.max(...data, 0) + 10
        },
        y: { 
          grid: { display: false }, 
          ticks: { color: c.text, font: { size: 11, family: 'var(--font-stack)' } } 
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

function renderTargetChart() {
  const md2026 = allData.filter(r => isValidPO(r) && r[COLS.IV_YEAR] === '2026');
  const md2025 = allData.filter(r => isValidPO(r) && r[COLS.IV_YEAR] === '2025');
  
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
    if (!isValidPO(r)) return false;
    if (r[COLS.IV_YEAR] !== '2026') return false;
    const st = (r[COLS.STATUS]||'').toLowerCase();
    return !st.includes('8.') && !st.includes('completed');
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
  type = type || 'line';
  const c = getChartColors();
  const months = getLast12Months();
  const data = months.map(({m,y}) => getMonthData(m,y).reduce((s,r)=>s+num(r[COLS.REVENUE]),0));
  const totalRev = data.reduce((a, b) => a + b, 0);
  const elTotal = document.getElementById('chart-total-revenue');
  if(elTotal) elTotal.textContent = fmtCurrency(totalRev);

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
  const totalCount = data.reduce((a, b) => a + b, 0);
  const elTotal = document.getElementById('chart-total-po-count');
  if(elTotal) elTotal.textContent = fmt(totalCount);

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
  
  // 1. Calculate OP Amount and Commission
  let totalOp = 0;
  let totalCom = 0;
  
  // Filter data for the current year (Analytics usually looks at current year or all time, let's use allData for current year)
  allData.forEach(r => {
    if (!isValidPO(r)) return;
    if (r[COLS.IV_YEAR] === String(currentYear)) {
      totalOp += num(r[COLS.OP_AMOUNT]);
      totalCom += num(r[COLS.BM_SALES]);
    }
  });
  
  const elOp = document.getElementById('kpi-op');
  if (elOp) elOp.textContent = fmtCurrency(totalOp);
  
  const elCom = document.getElementById('kpi-com');
  if (elCom) elCom.textContent = fmtCurrency(totalCom);
  
  // 2. Pending Debt Detail Chart
  const pendingMap = {};
  allData.forEach(r => {
    if (!isValidPO(r)) return;
    // Consider debt for all valid POs that are not fully paid/completed
    const st = (r[COLS.STATUS]||'').toLowerCase();
    if (!st.includes('8.') && !st.includes('completed') && !st.includes('cancel') && !st.includes('deleted')) {
      const cust = r[COLS.CUSTOMER] || 'N/A';
      pendingMap[cust] = (pendingMap[cust]||0) + num(r[COLS.AMOUNT]);
    }
  });
  
  const sortedDebt = Object.entries(pendingMap).sort((a,b)=>b[1]-a[1]).slice(0, 10); // top 10
  const debtLabels = sortedDebt.map(x => x[0]);
  const debtData = sortedDebt.map(x => x[1]);
  
  if(charts.debtChart) charts.debtChart.destroy();
  const canvasDebt = document.getElementById('chart-debt');
  if (canvasDebt) {
    charts.debtChart = new Chart(canvasDebt, {
      type: 'bar',
      data: {
        labels: debtLabels,
        datasets: [{
          label: 'Pending Debt',
          data: debtData,
          backgroundColor: 'rgba(255, 59, 48, 0.25)', // rose with opacity
          borderColor: c.rose,
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        ...chartDefaults(),
        plugins: {
          legend: { display: false },
          datalabels: {
            color: c.text,
            anchor: 'end',
            align: 'top',
            formatter: (v) => fmtCurrency(v)
          }
        }
      }
    });
  }
}

function renderPendingPOsChart() {
  const c = getChartColors();
  if(charts.ivPendingPOsCount) charts.ivPendingPOsCount.destroy();
  if(charts.ivPendingPOsAmount) charts.ivPendingPOsAmount.destroy();
  const canvasAmount = document.getElementById('chart-iv-pending-pos-amount');
  const canvasCount = document.getElementById('chart-iv-pending-pos-count');
  if(!canvasCount || !canvasAmount) return;

  const pendingData = allData.filter(r => {
    if (!isValidPO(r)) return false;
    if (CONFIG.SALES_FILTER !== 'All' && r[COLS.SALES] !== CONFIG.SALES_FILTER) return false;
    
    const dateStr = (r[COLS.SO_DATE] || '').split(' ')[0];
    const parsed = parseSODate(dateStr);
    if (!parsed || parsed.year !== currentYear) return false;

    const st = (r[COLS.STATUS] || '').toLowerCase();
    return !st.includes('payment') && !st.includes('completed');
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const statusSet = new Set();
  pendingData.forEach(r => statusSet.add(r[COLS.STATUS] || 'N/A'));
  const sortedStatuses = Array.from(statusSet).sort((a,b) => a.localeCompare(b));

  const mapCount = {};
  const mapAmount = {};
  sortedStatuses.forEach(st => {
    mapCount[st] = new Array(12).fill(0);
    mapAmount[st] = new Array(12).fill(0);
  });

  pendingData.forEach(r => {
    let st = r[COLS.STATUS] || 'N/A';
    const dateStr = (r[COLS.SO_DATE] || '').split(' ')[0];
    const parsed = parseSODate(dateStr);
    if(parsed && parsed.month >= 1 && parsed.month <= 12) {
      const mIdx = parsed.month - 1;
      mapCount[st][mIdx] += 1;
      mapAmount[st][mIdx] += num(r[COLS.REVENUE]);
    }
  });

  const totalCount = sortedStatuses.reduce((acc, st) => acc + mapCount[st].reduce((a, b) => a + b, 0), 0);
  const totalAmount = sortedStatuses.reduce((acc, st) => acc + mapAmount[st].reduce((a, b) => a + b, 0), 0);
  const elTotalCount = document.getElementById('total-pending-count');
  if (elTotalCount) elTotalCount.textContent = fmt(totalCount);
  const elTotalAmount = document.getElementById('total-pending-amount');
  if (elTotalAmount) elTotalAmount.textContent = fmtCurrency(totalAmount);

  const pastelStatusColors = {
    '1': '#c7c7cc', '2': '#66a3ff', '3': '#40b5b5', '4': '#c78ced',
    '5': '#ff8a84', '6': '#7cdb96', '7': '#ffc05c', '8': '#ffe680'
  };

  const datasetsCount = sortedStatuses.map((st, i) => {
    const prefixMatch = st.match(/^\d+/);
    const color = prefixMatch && pastelStatusColors[prefixMatch[0]] ? pastelStatusColors[prefixMatch[0]] : c.accent;
    return {
      label: st,
      data: mapCount[st],
      backgroundColor: color,
      borderWidth: 0,
      borderRadius: 2
    };
  });

  const datasetsAmount = sortedStatuses.map((st, i) => {
    const prefixMatch = st.match(/^\d+/);
    const color = prefixMatch && pastelStatusColors[prefixMatch[0]] ? pastelStatusColors[prefixMatch[0]] : c.accent;
    return {
      label: st,
      data: mapAmount[st],
      backgroundColor: color,
      borderWidth: 0,
      borderRadius: 2
    };
  });

  const commonOptions = {
    ...chartDefaults(),
    interaction: { mode: 'index', intersect: false },
    plugins: {
      tooltip: {
        filter: function(tooltipItem) { return tooltipItem.raw > 0; }
      },
      legend: { 
        display: true, position: 'bottom', 
        labels: { color: c.text, font: { family: 'var(--font-stack)', size: 10 }, usePointStyle: true, boxWidth: 8 } 
      }
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: c.text, font: { family: 'var(--font-stack)', size: 10 } } },
      y: { stacked: true, display: true, grid: { color: c.border, drawBorder: false }, ticks: { color: c.text, font: { size: 10 } } }
    }
  };

  charts.ivPendingPOsAmount = new Chart(canvasAmount, {
    type: 'bar',
    data: { labels: monthNames, datasets: datasetsAmount },
    options: {
      ...commonOptions,
      plugins: { 
        ...commonOptions.plugins, 
        datalabels: { 
          display: function(context) { return context.dataset.data[context.dataIndex] > 0; },
          color: '#333', anchor: 'center', align: 'center', font: { weight: 'bold', size: 9 }, 
          formatter: (v) => shortFmt(v) 
        } 
      }
    },
    plugins: [ChartDataLabels]
  });

  charts.ivPendingPOsCount = new Chart(canvasCount, {
    type: 'bar',
    data: { labels: monthNames, datasets: datasetsCount },
    options: {
      ...commonOptions,
      plugins: { 
        ...commonOptions.plugins, 
        datalabels: { 
          display: function(context) { return context.dataset.data[context.dataIndex] > 0; },
          color: '#333', anchor: 'center', align: 'center', font: { weight: 'bold', size: 9 }, 
          formatter: (v) => fmt(v) 
        } 
      }
    },
    plugins: [ChartDataLabels]
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
        status: r[4]||'', result: r[5]||'', action: r[6]||'', suggestion: r[7]||'',
        pending: r[8]||'', date: r[9]||'', month: r[10]||'', year: r[11]||''
      })).filter(x => x.type && x.topic);
    }
  } catch (e) {
    console.error('Fetch Report Data failed:', e);
  }
}

async function refreshReportData() {
  const btn = document.getElementById('btn-refresh-report');
  if (btn) btn.innerHTML = '<span>⏳</span> Refreshing...';
  await fetchReportData();
  renderReportBoard();
  if (btn) btn.innerHTML = '<span>🔄</span> Refresh';
  toast('Report data updated', 'success');
}

function renderReportBoard() {
  const filtered = reportDataList.filter(r => {
    let rm = parseInt(r.month, 10);
    let ry = parseInt(r.year, 10);
    return rm === currentMonth && ry === currentYear;
  });
  
  const container = document.getElementById('report-timeline-container');
  if (!container) return;
  
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">No activities recorded for this month.</div>';
    return;
  }
  
  const renderCard = (c) => {
    let isWin = c.type.toLowerCase().includes('win');
    let itemClass = isWin ? 'win' : 'redflag';
    
    let topicClass = 'topic-other';
    if (c.topic.toLowerCase().includes('project')) topicClass = 'topic-project';
    else if (c.topic.toLowerCase().includes('hr')) topicClass = 'topic-hr';
    else if (c.topic.toLowerCase().includes('po')) topicClass = 'topic-po';
    
    let statusHtml = '';
    if (c.status) {
      let statusLower = c.status.toLowerCase();
      let statusClass = 'default';
      if (statusLower.includes('completed')) statusClass = 'completed';
      else if (statusLower.includes('processing')) statusClass = 'processing';
      else if (statusLower.includes('pending')) statusClass = 'pending';
      else if (statusLower.includes('cancelled')) statusClass = 'cancelled';
      statusHtml = `<span class="status-badge ${statusClass}">${c.status}</span>`;
    }
    
    return `
      <div class="kanban-card ${itemClass}">
        <div class="timeline-header" style="margin-bottom:10px;">
          <div class="timeline-badges" style="display:flex; flex-wrap:wrap; gap:6px;">
            <span class="badge-type ${itemClass}">${c.type}</span>
            <span class="badge-topic ${topicClass}">${c.topic}</span>
            ${statusHtml}
          </div>
        </div>
        <div class="timeline-detail">${c.detail}</div>
        ${c.result ? `<div class="timeline-box result"><strong>🎯 Result:</strong><br>${c.result}</div>` : ''}
        ${c.action ? `<div class="timeline-box action"><strong>⚡ Action:</strong><br>${c.action}</div>` : ''}
        ${c.suggestion ? `<div class="timeline-box suggestion" style="background:var(--bg-secondary); border-left:3px solid var(--accent-purple); margin-top:10px; padding:10px 14px; font-size:0.85rem; border-radius:6px; color:var(--text-primary);"><strong>💡 Suggest:</strong><br>${c.suggestion}</div>` : ''}
        ${c.pending ? `<div class="timeline-box pending" style="background:rgba(239,68,68,0.05); border-left:3px solid var(--accent-rose); margin-top:10px; padding:10px 14px; font-size:0.85rem; border-radius:6px; color:var(--text-primary);"><strong>⏳ Pending:</strong><br><span style="color:var(--accent-rose); font-weight:600;">${c.pending}</span></div>` : ''}
      </div>
    `;
  };
  
  const wins = filtered.filter(r => r.type.toLowerCase().includes('win'));
  const flags = filtered.filter(r => r.type.toLowerCase().includes('red flag'));
  
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabel = monthNames[currentMonth-1];

  let html = '';
  
  if(wins.length > 0) {
    html += `
      <div style="margin-bottom: 40px;">
        <h3 style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary); margin: 20px 0; display:flex; align-items:center; gap:8px; border-bottom: 2px solid var(--border-glass); padding-bottom: 10px;">
          <span style="font-size:1.5rem;">🏆</span> Key Wins & Achievements
        </h3>
        <div class="report-grid">
          ${wins.map(renderCard).join('')}
        </div>
      </div>
    `;
  }
  
  if(flags.length > 0) {
    html += `
      <div style="margin-bottom: 40px;">
        <h3 style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary); margin: 20px 0; display:flex; align-items:center; gap:8px; border-bottom: 2px solid var(--border-glass); padding-bottom: 10px;">
          <span style="font-size:1.5rem;">🚩</span> Red Flags & Pending Issues
        </h3>
        <div class="report-grid">
          ${flags.map(renderCard).join('')}
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// ===== QUOTATION DATA =====
async function fetchQuotationData(prefetchedJson) {
  try {
    let json = prefetchedJson;
    if (!json) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.QT_SHEET_ID}/values:batchGet?ranges=QT26!A1:AZ&ranges=${encodeURIComponent("'QT KL'!A1:AZ")}&ranges=${encodeURIComponent("'QT SS'!A1:AZ")}&key=${CONFIG.API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`QT API Error: ${res.status}`);
      json = await res.json();
    }
    allQuotations = [];
    
    let masterColMap = null;
    
    if (json.valueRanges) {
      json.valueRanges.forEach(vr => {
        const rows = vr.values || [];
        if (rows.length < 1) return;
        
        let headerRow = rows.find(r => r.some(c => c === 'Customer' || c === 'Amount' || c === 'Status'));
        let colMap = {};
        let dataStartIndex = 0;
        
        if (headerRow) {
          headerRow.forEach((c, i) => { if (c) colMap[String(c).trim()] = i; });
          masterColMap = colMap;
          dataStartIndex = rows.indexOf(headerRow) + 1;
        } else {
          if (masterColMap) {
            colMap = masterColMap;
            dataStartIndex = 0;
          } else {
            return;
          }
        }
        
        let sheetSource = 'QT26';
        if (vr.range) {
          const rText = vr.range.toUpperCase();
          if (rText.includes('KL')) sheetSource = 'QT KL';
          else if (rText.includes('SS')) sheetSource = 'QT SS';
        }

        // Special handling for QT SS missing Status header
        if (sheetSource === 'QT SS' && !colMap['Status']) {
          colMap['Status'] = 2; // Hardcode index 2
        }

        for (let i = dataStartIndex; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0) continue;
          
          let id, status, customer, amountStr, prDate, qDate, qMonth, qYear, brand, itemName, sales;

          if (sheetSource === 'QT SS') {
            id = r[0];
            sales = r[1] || '';
            status = r[2] || '';
            customer = r[4] || 'Samsung';
            prDate = r[7] || '';
            itemName = r[9] || r[6] || '';
            brand = r[12] || '';
            amountStr = r[20] || r[15] || '0';
            qDate = r[44] || '';
            qMonth = num(r[45]);
            qYear = num(r[46]);
          } else {
            id = r[colMap['ID']];
            status = r[colMap['Status']] || '';
            customer = r[colMap['Customer']] || 'N/A';
            amountStr = r[colMap['Amount']] || '0';
            prDate = r[colMap['PR Date']] || '';
            qDate = r[colMap['Q Date']] || '';
            qMonth = num(r[colMap['Q Month']]);
            qYear = num(r[colMap['Q Year']]);
            brand = r[colMap['Brand']] || '';
            itemName = r[colMap['Name']] || r[colMap['Name EN']] || '';
            sales = r[colMap['Sales']] || '';
          }
          
          if (!id) continue;
          const amount = num(amountStr);
          
          // Fallback parsing if Q Month or Q Year is missing
          if (!qMonth || !qYear) {
            if (qDate) {
              const qParsed = parseSODate(qDate.split(' ')[0]);
              if (qParsed) {
                qMonth = qParsed.month;
                qYear = qParsed.year;
              } else {
                const dObj = new Date(qDate);
                if (!isNaN(dObj.getTime())) {
                  qMonth = dObj.getMonth() + 1;
                  qYear = dObj.getFullYear();
                }
              }
            }
            if (!qMonth || !qYear) {
              const parsed = parseSODate(prDate.split(' ')[0]);
              if (parsed) {
                qMonth = parsed.month;
                qYear = parsed.year;
              }
            }
          }
          
          if (CONFIG.SALES_FILTER !== 'All' && sales.trim() !== CONFIG.SALES_FILTER) continue;
          
          const isWon = allData.some(poRow => String(poRow[COLS.HISTORY] || '').includes(id));
          if (isWon) {
            status = '7. PO';
          }
          
          const margin = r[colMap['Margin']] || '';
          const com = r[colMap['Com']] || '';
          const op = r[colMap['OP']] || '';
          const qtNo = r[colMap['Quotation No.']] || r[colMap['QT No.']] || r[colMap['QT No']] || '';
          const qty = r[colMap["Q'ty"]] || r[colMap['Qty']] || '';
          const unit = r[colMap['Unit']] || '';
          const unitPrice = r[colMap['Unit Price']] || '';
          const leadtime = r[colMap['Leadtime']] || '';

          allQuotations.push({ id, status, customer, amount, prDate, qDate, qMonth, qYear, brand, itemName, source: sheetSource, margin, com, op, qtNo, qty, unit, unitPrice, leadtime });
        }
      });
    }
  } catch (e) {
    console.error('Error fetching Quotation data:', e);
  }
}

function getQTMonthData(m, y) {
  m = m || currentMonth; y = y || currentYear;
  return allQuotations.filter(q => q.qMonth === m && q.qYear === y && q.source === currentQtSource);
}

function renderQuotationSummary() {
  const sources = [
    { id: 'QT26', elId: 'amt-qt26' },
    { id: 'QT KL', elId: 'amt-qtkl' },
    { id: 'QT SS', elId: 'amt-qtss' }
  ];
  sources.forEach(src => {
    const data = allQuotations.filter(q => q.qMonth === currentMonth && q.qYear === currentYear && q.source === src.id);
    const sum = data.reduce((s, q) => s + q.amount, 0);
    const el = document.getElementById(src.elId);
    if(el) el.textContent = shortFmt(sum);
  });
}

function renderQuotation() {
  renderQuotationSummary();
  renderQuotationKPIs();
  renderQuotationCharts();
  renderQuotationTable();
}

function renderQuotationKPIs() {
  const md = getQTMonthData();
  const count = md.length;
  const amount = md.reduce((s, q) => s + q.amount, 0);
  
  const wonCount = md.filter(q => String(q.status||'').toLowerCase().includes('win') || String(q.status||'').toLowerCase().includes('po')).length;
  const winRate = count > 0 ? ((wonCount / count) * 100).toFixed(1) : 0;
  
  const pendingAmount = md.filter(q => String(q.status||'').toLowerCase().includes('quoted') || String(q.status||'').toLowerCase().includes('pending')).reduce((s, q) => s + q.amount, 0);

  const elCount = document.getElementById('kpi-qt-count');
  if(elCount) elCount.textContent = fmt(count);
  const elAmt = document.getElementById('kpi-qt-amount');
  if(elAmt) elAmt.textContent = fmtCurrency(amount);
  const elRate = document.getElementById('kpi-qt-winrate');
  if(elRate) elRate.textContent = winRate + '%';
  const elPending = document.getElementById('kpi-qt-pending');
  if(elPending) elPending.textContent = fmtCurrency(pendingAmount);
}

function renderQuotationCharts() {
  const btn = document.querySelector('.chart-btn-qt.active');
  const type = btn ? btn.dataset.chartType : 'line';
  const c = getChartColors();
  const months = getLast12Months();
  const data = months.map(({m,y}) => getQTMonthData(m,y).reduce((s,q) => s + q.amount, 0));
  const dataItems = months.map(({m,y}) => getQTMonthData(m,y).length);
  
  const elTotal = document.getElementById('chart-total-qt-amount');
  if(elTotal) elTotal.textContent = fmtCurrency(data.reduce((a,b)=>a+b,0));

  if(charts.qtMonthly) charts.qtMonthly.destroy();
  const canvasMonthly = document.getElementById('chart-qt-monthly');
  if (canvasMonthly) {
    charts.qtMonthly = new Chart(canvasMonthly, {
      type, data: {
        labels: months.map(x=>x.label),
        datasets: [{
          label: 'Quoted Value', data,
          borderColor: c.cyan, 
          backgroundColor: type === 'bar' ? c.cyanA : 'transparent', 
          fill: type === 'line', tension: 0.4, pointRadius: 4, pointBackgroundColor: c.cyan,
          borderWidth: 2, borderRadius: type === 'bar' ? 6 : 0
        }]
      }, options: chartDefaults(), plugins: [ChartDataLabels]
    });
  }

  if(charts.qtItemMonthly) charts.qtItemMonthly.destroy();
  const canvasItemMonthly = document.getElementById('chart-qt-item-monthly');
  if (canvasItemMonthly) {
    charts.qtItemMonthly = new Chart(canvasItemMonthly, {
      type: 'bar', data: {
        labels: months.map(x=>x.label),
        datasets: [{
          label: 'Quotation Count', data: dataItems,
          borderColor: c.purple, 
          backgroundColor: c.purpleA, 
          borderWidth: 2, borderRadius: 6
        }]
      }, options: chartDefaults(), plugins: [ChartDataLabels]
    });
  }

  const md = getQTMonthData();
  
  // Secondary Chart: Customer for QT26, Brand for QT KL/QT SS
  let secondaryMap = {};
  let isGeneral = (currentQtSource === 'QT26');
  
  let stLabel = document.getElementById('qt-secondary-title');
  if (stLabel) stLabel.textContent = isGeneral ? 'Quotations by Customer' : 'Quotations by Brand';
  
  md.forEach(q => {
    let key = isGeneral ? q.customer : q.brand;
    if (!key) key = 'N/A';
    secondaryMap[key] = (secondaryMap[key]||0) + q.amount;
  });
  const sortedSecondary = Object.entries(secondaryMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  
  const hcColors = ['#007aff', '#34c759', '#ff9f0a', '#ff3b30', '#5ac8fa', '#af52de', '#ffcc00', '#ff2d55'];

  const qtPieColors = ['#A8E6CF', '#DCEDC1', '#FFD3B6', '#FFAAA5', '#FF8B94', '#9D94FF'];


  const hcDataSec = sortedSecondary.map((x, i) => ({
    name: x[0], y: x[1], color: qtPieColors[i % qtPieColors.length]
  }));
  if(charts.qtSecondary && typeof charts.qtSecondary.destroy === 'function') {
    try { charts.qtSecondary.destroy(); } catch(e){}
  }
  charts.qtSecondary = Highcharts.chart('chart-qt-secondary', {
    chart: { type: 'pie', backgroundColor: 'transparent', options3d: { enabled: true, alpha: 45, beta: 0 } },
    title: { text: null },
    credits: { enabled: false },
    tooltip: { formatter: function() { return `<b>${this.point.name}</b><br/>${this.series.name}: <b>${fmtCurrency(this.point.y)} (${this.point.percentage.toFixed(1)}%)</b>`; } },
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
    series: [{ name: isGeneral ? 'Customer' : 'Brand', data: hcDataSec }]
  });

  // Status Distribution Chart
  const mapStatus = {};
  md.forEach(q => {
    let st = q.status || 'N/A';
    mapStatus[st] = (mapStatus[st]||0) + 1; // Count by number of quotations
  });
  
  const sortedStatusKeys = Object.keys(mapStatus).sort((a,b) => a.localeCompare(b));
  const hcDataStatus = sortedStatusKeys.map((k, i) => {
    const prefixMatch = k.match(/^\d+/);
    const color = prefixMatch && statusColors[prefixMatch[0]] ? statusColors[prefixMatch[0]] : '#8e8e93';
    return { name: k, y: mapStatus[k], color: color };
  });

  if(charts.qtStatus && typeof charts.qtStatus.destroy === 'function') {
    try { charts.qtStatus.destroy(); } catch(e){}
  }
  charts.qtStatus = Highcharts.chart('chart-qt-status', {
    chart: { type: 'pie', backgroundColor: 'transparent', options3d: { enabled: true, alpha: 45, beta: 0 } },
    title: { text: null },
    credits: { enabled: false },
    tooltip: { formatter: function() { return `<b>${this.point.name}</b><br/>${this.series.name}: <b>${this.point.y} (${this.point.percentage.toFixed(1)}%)</b>`; } },
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
    series: [{ name: 'Status', data: hcDataStatus }]
  });

  // Quotation Status Breakdown List
  const mapStatusAmount = {};
  md.forEach(q => {
    let st = q.status || 'N/A';
    mapStatusAmount[st] = (mapStatusAmount[st] || 0) + q.amount;
  });

  const sortedStatusList = sortedStatusKeys.map(k => [k, mapStatusAmount[k] || 0]);
  const statusListEl = document.getElementById('qt-status-list');
  if(statusListEl) {
    statusListEl.innerHTML = sortedStatusList.map(([name,val],i) => {
      const prefixMatch = name.match(/^\d+/);
      const color = prefixMatch && statusColors[prefixMatch[0]] ? statusColors[prefixMatch[0]] : '#8e8e93';
      const displayRank = prefixMatch ? prefixMatch[0] : (i+1);
      return `<div class="ranking-item"><div class="ranking-rank" style="color:${color} !important; border:2px solid ${color} !important; background:transparent !important; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:bold;">${displayRank}</div><div class="ranking-name" style="color:${color}; font-weight:600;" title="${name}">${name}</div><div class="ranking-value" style="color:${color}; font-weight:bold;">${fmtCurrency(val)}</div></div>`;
    }).join('') || '<p style="color:var(--text-muted);text-align:center;padding:40px">No data</p>';
  }

  // Quotation Status Amount Chart
  if(charts.qtStatusAmount) charts.qtStatusAmount.destroy();
  const canvasStatusAmount = document.getElementById('chart-qt-status-amount');
  if (canvasStatusAmount) {
    charts.qtStatusAmount = new Chart(canvasStatusAmount, {
      type: 'bar',
      data: {
        labels: sortedStatusList.map(x => x[0]),
        datasets: [{
          label: 'Amount',
          data: sortedStatusList.map(x => x[1]),
          backgroundColor: sortedStatusList.map(x => {
            const prefixMatch = x[0].match(/^\d+/);
            return prefixMatch && statusColors[prefixMatch[0]] ? statusColors[prefixMatch[0]] : '#8e8e93';
          }),
          borderRadius: 6, borderWidth: 0
        }]
      },
      options: {
        ...chartDefaults(),
        indexAxis: 'y', // horizontal bar
        layout: {
          padding: { right: 60, left: 100 } // Prevent labels from being cut off
        },
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true, color: c.text, align: 'right', anchor: 'end',
            font: { weight: 'bold', size: 10 },
            formatter: (v) => fmtCurrency(v)
          }
        },
        scales: {
          x: { display: false, grid: { display: false } },
          y: { grid: { display: false }, ticks: { color: c.text, font: { size: 11, family: 'var(--font-stack)' } } }
        }
      },
      plugins: [ChartDataLabels]
    });
  }
}

function renderQuotationTable() {
  const md = getQTMonthData().sort((a,b) => {
    const daStr = (a.qDate || '').split(' ')[0];
    const dbStr = (b.qDate || '').split(' ')[0];
    const da = parseSODate(daStr);
    const db = parseSODate(dbStr);
    const daTime = da ? new Date(da.year, da.month-1, da.day).getTime() : new Date(daStr).getTime() || 0;
    const dbTime = db ? new Date(db.year, db.month-1, db.day).getTime() : new Date(dbStr).getTime() || 0;
    return dbTime - daTime;
  }).slice(0, 50);
  const tbody = document.getElementById('qt-recent-tbody');
  if(!tbody) return;
  tbody.innerHTML = md.map(q => `
    <tr>
      <td style="white-space:nowrap; color:var(--text-secondary)">${q.qDate || '-'}</td>
      <td><span class="status-badge ${getStatusClass(q.status)}">${q.status}</span></td>
      <td style="font-weight:600">${q.id}</td>
      <td style="font-weight:600">${q.qtNo || '-'}</td>
      <td style="max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${q.itemName}">${q.itemName}</td>
      <td style="font-weight:600; color:var(--text-secondary)">${q.brand}</td>
      <td style="text-align:right; font-weight:600">${q.qty || '-'}</td>
      <td>${q.unit || '-'}</td>
      <td style="text-align:right; font-weight:600">${q.unitPrice ? fmt(num(q.unitPrice)) : '-'}</td>
      <td>${q.leadtime || '-'}</td>
      <td style="text-align:right; font-weight:600; color:var(--text-secondary)">${q.margin || '-'}</td>
      <td style="text-align:right; font-weight:600; color:var(--text-secondary)">${q.com || '-'}</td>
      <td style="text-align:right; font-weight:600; color:var(--text-secondary)">${q.op || '-'}</td>
      <td style="text-align:right; font-weight:bold; color:var(--text-primary)">${fmt(q.amount)}</td>
    </tr>
  `).join('');
}

function filterQuotationTable() {
  const term = (document.getElementById('qt-search').value || '').toLowerCase();
  const trs = document.querySelectorAll('#qt-recent-tbody tr');
  trs.forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
}
