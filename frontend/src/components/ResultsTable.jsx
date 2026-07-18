import { useState } from 'react';
import Badge from './Badge';
import { truncate } from '../utils/helpers';

/**
 * Expandable table cell that truncates text and expands on click.
 */
function ExpandableCell({ text }) {
  const [expanded, setExpanded] = useState(false);
  const fullText = text || '';

  return (
    <td
      className={`cursor-pointer transition-colors duration-150 hover:text-text hover:underline hover:decoration-dotted
        ${expanded
          ? 'whitespace-pre-wrap overflow-visible max-w-[480px] text-text'
          : 'max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap text-text-muted'}`}
      title="Click to expand"
      onClick={() => setExpanded(!expanded)}
    >
      {expanded ? fullText : truncate(fullText)}
    </td>
  );
}

/**
 * Results table showing streaming evaluation results.
 * @param {{ results: Array, errors?: Array<{index: number, message: string}>, prompts?: string[] }} props
 */
export default function ResultsTable({ results, errors = [], prompts = [] }) {
  if (!results.length && !errors.length) return null;

  return (
    <section
      id="resultsPanel"
      className="bg-surface border border-border rounded-lg p-6 mb-5 slide-up"
    >
      <h2 className="text-base font-semibold mb-4 text-text">Results</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {['#', 'Prompt', 'Classification', 'Confidence', 'Target Response', 'Verdict', 'Risk', 'Reason'].map(
                (header) => (
                  <th
                    key={header}
                    className="bg-surface-hover text-text-muted font-semibold text-left px-3 py-2.5 border-b border-border whitespace-nowrap text-xs uppercase tracking-wide"
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr
                key={i}
                className="border-b border-surface-alt hover:bg-surface-hover transition-colors duration-100"
              >
                <td className="px-3 py-2.5 align-top text-text-muted tabular-nums">{r.index}</td>
                <ExpandableCell text={r.prompt} />
                <td className="px-3 py-2.5 align-top">
                  <Badge type="classification" value={r.classification} />
                </td>
                <td className="px-3 py-2.5 align-top">
                  <Badge type="confidence" value={r.classification_confidence} />
                </td>
                <ExpandableCell text={r.target_response} />
                <td className="px-3 py-2.5 align-top">
                  <Badge type="verdict" value={r.verdict} />
                </td>
                <td className="px-3 py-2.5 align-top">
                  <Badge type="risk" value={r.risk_level} />
                </td>
                <td className="px-3 py-2.5 align-top text-text">
                  {r.verdict_reason || '—'}
                </td>
              </tr>
            ))}
            {errors.map((err, i) => (
              <tr
                key={`err-${i}`}
                className="border-b border-surface-alt bg-error-bg"
              >
                <td className="px-3 py-2.5 align-top text-error-text tabular-nums">
                  {err.index + 1}
                </td>
                <ExpandableCell text={prompts[err.index] || '—'} />
                <td
                  colSpan={6}
                  className="px-3 py-2.5 align-top text-error-text break-words"
                >
                  <span className="font-semibold">Error:</span> {err.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
