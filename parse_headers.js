const fs = require('fs');
const content = fs.readFileSync('C:/Users/TRI PC/.gemini/antigravity/brain/09e5bb08-a712-4468-970e-facc1f939665/.system_generated/steps/1531/content.md', 'utf8');
const jsonStr = content.split('---')[1].trim();
const data = JSON.parse(jsonStr);

data.valueRanges.forEach((vr, idx) => {
  const rows = vr.values || [];
  let headerRow = rows.find(r => r.some(c => c === 'Customer' || c === 'Amount' || c === 'Status'));
  if (!headerRow) headerRow = rows[0] || rows[1] || [];
  
  console.log(`\n=== SHEET ${idx} ===`);
  console.log('Range:', vr.range);
  console.log('Header Row:', headerRow);
  
  // Find a data row
  const dataStart = rows.indexOf(headerRow) + 1;
  console.log('First Data Row:', rows[dataStart]);
});
