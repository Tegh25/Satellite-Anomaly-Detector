import { formatProba } from '../lib/format';

interface Props { proba: number; low: number; high: number }

/** Horizontal 0 to 1 gauge with the review band shaded and a tick at 0.5. */
export function ProbabilityGauge({ proba, low, high }: Props) {
  const W = 300;
  const x = (v: number) => 8 + v * (W - 16);
  const label = `Detector probability of anomaly ${formatProba(proba)} on a scale from 0 to 1. Review band ${low} to ${high}.`;
  return (
    <svg className="gauge" viewBox={`0 0 ${W} 54`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <rect x={x(0)} y={14} width={x(1) - x(0)} height={12} rx={6} className="gauge__track" />
      <rect x={x(low)} y={14} width={x(high) - x(low)} height={12} className="gauge__band" />
      <line x1={x(0.5)} x2={x(0.5)} y1={10} y2={30} className="gauge__tick" />
      <path d={`M${x(proba)} 12 l-6 -9 h12 z`} className="gauge__marker" />
      <line x1={x(proba)} x2={x(proba)} y1={12} y2={28} className="gauge__needle" />
      <text x={x(0)} y={46} className="gauge__label">0</text>
      <text x={x(low)} y={46} textAnchor="middle" className="gauge__label">{low}</text>
      <text x={x(0.5)} y={46} textAnchor="middle" className="gauge__label">0.5</text>
      <text x={x(high)} y={46} textAnchor="middle" className="gauge__label">{high}</text>
      <text x={x(1)} y={46} textAnchor="end" className="gauge__label">1</text>
    </svg>
  );
}

/** Compact bar for table cells. Decorative; the number is printed beside it. */
export function ProbabilityBar({ proba }: { proba: number }) {
  return (
    <span className="pbar" aria-hidden="true">
      <span className="pbar__fill" style={{ width: `${Math.round(proba * 100)}%` }} />
    </span>
  );
}
