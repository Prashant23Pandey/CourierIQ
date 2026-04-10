const fs = require('fs');

function fixFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Fix mojibake
  content = content.replace(/â”€/g, '─');
  content = content.replace(/â†’/g, '→');
  content = content.replace(/ðŸšš/g, '🚚');
  content = content.replace(/âœˆï¸ /g, '✈️');
  content = content.replace(/ðŸ›µ/g, '🛵');
  content = content.replace(/ðŸ“¦/g, '📦');
  content = content.replace(/âš ï¸ /g, '⚠️');
  content = content.replace(/â‚¹/g, '₹');
  content = content.replace(/â­/g, '⭐');
  content = content.replace(/ðŸ‘‘/g, '👑');
  content = content.replace(/ðŸ ¢/g, '🏢');
  content = content.replace(/ðŸš€/g, '🚀');
  content = content.replace(/ðŸ†“/g, '🆓');
  content = content.replace(/â€”/g, '—');
  content = content.replace(/âœ“/g, '✓');
  content = content.replace(/âˆ’/g, '−'); // minus sign
  
  // Also change ShipSmart to CourierIQ
  content = content.replace(/ShipSmart/g, 'CourierIQ');
  
  fs.writeFileSync(path, content, 'utf8');
}

fixFile('src/app/page.tsx');
fixFile('src/app/layout.tsx');
console.log('Fixed!');
