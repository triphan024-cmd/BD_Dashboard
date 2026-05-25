const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Mapping emojis to lucide icons
const emojiMap = {
  '📄': 'file-text',
  '📦': 'package',
  '💰': 'circle-dollar-sign',
  '📋': 'list-collapse',
  '📈': 'trending-up',
  '📊': 'bar-chart-3',
  '💵': 'banknote',
  '🧾': 'receipt',
  '🏢': 'building-2',
  '🎯': 'target',
  '⏳': 'hourglass',
  '🏆': 'trophy',
  '💸': 'coins',
  '🚪': 'log-out',
  '☰': 'menu',
  '🔍': 'search'
};

html = html.replace(/<span class="nav-icon">([^<]+)<\/span>/g, (match, emoji) => {
  const icon = emojiMap[emoji.trim()] || 'circle';
  return `<i data-lucide="${icon}" class="nav-icon"></i>`;
});

html = html.replace(/<span class="kpi-icon">([^<]+)<\/span>/g, (match, emoji) => {
  const icon = emojiMap[emoji.trim()] || 'circle';
  return `<i data-lucide="${icon}" class="kpi-icon"></i>`;
});

html = html.replace(/<span>🚪<\/span>/g, '<i data-lucide="log-out" class="nav-icon"></i>');
html = html.replace(/<button class="mobile-menu-btn" id="mobile-menu-btn">☰<\/button>/g, '<button class="mobile-menu-btn" id="mobile-menu-btn"><i data-lucide="menu"></i></button>');
html = html.replace(/<span class="search-icon">🔍<\/span>/g, '<i data-lucide="search" class="search-icon" style="width: 16px; height: 16px; margin-right: 8px;"></i>');

fs.writeFileSync('index.html', html);
console.log('Replaced emojis with Lucide icons.');
