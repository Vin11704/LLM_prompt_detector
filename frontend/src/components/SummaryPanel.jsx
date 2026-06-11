import { downloadJson, escapeHtml } from '../utils/helpers';

/**
 * Summary panel: stat cards, vulnerability score, classification breakdown, and report download.
 * @param {{ summary: object, finalReport: object }} props
 */
export default function SummaryPanel({ summary, finalReport }) {
  if (!summary) return null;

  const cards = [
    { label: 'Total',    value: summary.total,    color: 'text-accent' },
    { label: 'Tested',   value: summary.tested,   color: 'text-text-muted' },
    { label: 'Complied', value: summary.complied, color: 'text-red' },
    { label: 'Refused',  value: summary.refused,  color: 'text-green' },
    { label: 'Partial',  value: summary.partial,  color: 'text-yellow' },
    { label: 'Errors',   value: summary.errors,   color: 'text-text-muted' },
  ];

  const score = summary.vulnerability_score_pct;
  const byClass = summary.by_classification || {};

  const handleDownload = () => {
    if (!finalReport) return;
    downloadJson(finalReport, `llm-security-report-${Date.now()}.json`);
  };

  return (
    <section
      id="summaryPanel"
      className="bg-surface border border-border rounded-lg p-6 mb-5 slide-up"
    >
      <h2 className="text-base font-semibold mb-4 text-text">Summary</h2>

      {/* Stat cards grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 mb-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-surface-hover border border-border rounded-md px-4 py-3.5 text-center hover:border-accent/30 transition-colors duration-200"
          >
            <span className={`block text-[28px] font-bold ${card.color}`}>
              {card.value}
            </span>
            <span className="text-[11px] text-text-muted uppercase tracking-widest">
              {card.label}
            </span>
          </div>
        ))}
      </div>

      {/* Vulnerability score */}
      <div className="flex items-baseline gap-2.5 bg-surface-hover border border-border rounded-md px-5 py-4 mb-6">
        <span className="text-[13px] text-text-muted">Vulnerability Score</span>
        <span className={`text-[40px] font-extrabold tabular-nums ${score <= 20 ? 'text-green' : 'text-red'}`}>
          {score}%
        </span>
        <span className="text-xs text-text-muted">% of prompts the target model complied with</span>
      </div>

      {/* Classification breakdown */}
      <h3 className="text-sm font-semibold mt-5 mb-3 text-text-muted uppercase tracking-widest">
        Breakdown by Classification
      </h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 mb-6">
        {Object.entries(byClass).map(([cat, counts]) => {
          const pct = counts.total > 0 ? Math.round((counts.complied / counts.total) * 100) : 0;
          return (
            <div
              key={cat}
              className="bg-surface-hover border border-border rounded-md px-4 py-3 hover:border-accent/30 transition-colors duration-200"
            >
              <div className="text-xs font-bold uppercase tracking-wide mb-2 text-text">{cat}</div>
              {[
                { label: 'Total', value: counts.total },
                { label: 'Refused', value: counts.refused },
                { label: 'Complied', value: counts.complied },
                { label: 'Partial', value: counts.partial },
                { label: 'Vuln rate', value: `${pct}%` },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-xs text-text-muted mb-0.5">
                  <span>{row.label}</span>
                  <span className="font-semibold text-text">{row.value}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Download button */}
      <button
        id="downloadBtn"
        onClick={handleDownload}
        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-accent text-bg text-[13px] font-semibold border-none cursor-pointer hover:bg-accent-hover transition-colors duration-150 shadow-lg shadow-accent/20"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Download Report (.json)
      </button>
    </section>
  );
}
