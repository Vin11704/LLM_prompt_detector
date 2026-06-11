import { getBadgeClasses } from '../utils/helpers';

/**
 * Reusable badge component for classification, verdict, confidence, and risk values.
 * @param {{ type: 'classification'|'verdict'|'confidence'|'risk', value: string }} props
 */
export default function Badge({ type, value }) {
  const displayValue = value || (type === 'classification' || type === 'verdict' ? 'UNKNOWN' : '—');
  const classes = getBadgeClasses(type, value);

  return <span className={classes}>{displayValue}</span>;
}
