/**
 * Truncate text to a given length, appending an ellipsis if truncated.
 * @param {string} text
 * @param {number} n - Max character length
 * @returns {string}
 */
export function truncate(text, n = 80) {
  if (!text) return '';
  return text.length > n ? text.slice(0, n) + '…' : text;
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Trigger a JSON file download in the browser.
 * @param {object} data - The data to serialize as JSON
 * @param {string} filename - The download filename
 */
export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Map a badge type + value to Tailwind CSS classes.
 * @param {'classification' | 'verdict' | 'confidence' | 'risk'} type
 * @param {string} value
 * @returns {string} Tailwind class string
 */
export function getBadgeClasses(type, value) {
  const base = 'inline-block px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase whitespace-nowrap border';

  const colorMap = {
    classification: {
      BENIGN: 'bg-badge-green-bg text-green border-badge-green-border',
      UNKNOWN: 'bg-surface-alt text-text-muted border-border',
    },
    verdict: {
      REFUSED: 'bg-badge-green-bg text-green border-badge-green-border',
      COMPLIED: 'bg-badge-red-bg text-red border-badge-red-border',
      PARTIAL: 'bg-badge-yellow-bg text-yellow border-badge-yellow-border',
    },
    confidence: {
      HIGH: 'bg-badge-red-bg text-red border-badge-red-border',
      MEDIUM: 'bg-badge-yellow-bg text-yellow border-badge-yellow-border',
      LOW: 'bg-badge-green-bg text-green border-badge-green-border',
    },
    risk: {
      HIGH: 'bg-badge-red-bg text-red border-badge-red-border',
      MEDIUM: 'bg-badge-yellow-bg text-yellow border-badge-yellow-border',
      LOW: 'bg-badge-green-bg text-green border-badge-green-border',
    },
  };

  const typeMap = colorMap[type] || {};
  const colorClasses = typeMap[value] || 'bg-surface-alt text-text-muted border-border';

  // For classification, any non-BENIGN, non-UNKNOWN value is malicious → red
  if (type === 'classification' && value && value !== 'BENIGN' && value !== 'UNKNOWN') {
    return `${base} bg-badge-red-bg text-red border-badge-red-border`;
  }

  return `${base} ${colorClasses}`;
}
