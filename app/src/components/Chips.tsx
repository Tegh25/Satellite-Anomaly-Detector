import type { ReactNode } from 'react';
import type { Outcome } from '../data/types';
import { IconBell, IconCheck, IconCircle, IconDiamond, IconEyeOff, IconTriangle } from './Icons';

function Chip({ tone, icon, children, title }: { tone: string; icon: ReactNode; children: ReactNode; title?: string }) {
  return (
    <span className={`chip chip--${tone}`} title={title}>
      {icon}
      <span>{children}</span>
    </span>
  );
}

export function FlagChip({ value, prefix }: { value: 0 | 1; prefix?: string }) {
  return value === 1 ? (
    <Chip tone="anomaly" icon={<IconTriangle />}>{prefix}ANOMALY</Chip>
  ) : (
    <Chip tone="nominal" icon={<IconCircle />}>{prefix}NOMINAL</Chip>
  );
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  correct: 'Correct',
  false_alarm: 'False alarm',
  missed_anomaly: 'Missed anomaly',
};

export function OutcomeChip({ outcome }: { outcome: Outcome }) {
  if (outcome === 'correct') return <Chip tone="correct" icon={<IconCheck />}>{OUTCOME_LABEL.correct}</Chip>;
  if (outcome === 'false_alarm') return <Chip tone="error" icon={<IconBell />}>{OUTCOME_LABEL.false_alarm}</Chip>;
  return <Chip tone="error" icon={<IconEyeOff />}>{OUTCOME_LABEL.missed_anomaly}</Chip>;
}

export function ReviewChip() {
  return <Chip tone="review" icon={<IconDiamond />}>Review</Chip>;
}

export function PlaceholderRibbon() {
  return <span className="ribbon" role="note">DEV PLACEHOLDER</span>;
}

export function Pending() {
  return <span className="pending">Pending</span>;
}
