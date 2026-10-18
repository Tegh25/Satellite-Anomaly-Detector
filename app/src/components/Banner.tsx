import type { ReactNode } from 'react';
import { copy } from '../copy';
import type { Segment } from '../data/types';
import { formatProba } from '../lib/format';
import { IconDiamond, IconEyeOff, IconBell } from './Icons';

function Banner({ tone, icon, title, body }: { tone: string; icon: ReactNode; title: string; body: string }) {
  return (
    <aside className={`banner banner--${tone}`} aria-label={title}>
      <span className="banner__icon">{icon}</span>
      <div>
        <p className="banner__title">{title}</p>
        <p className="banner__body">{body}</p>
      </div>
    </aside>
  );
}

export function SegmentBanners({ segment, band }: { segment: Segment; band: { low: number; high: number } }) {
  const b = copy.banners;
  return (
    <>
      {segment.outcome === 'missed_anomaly' && (
        <Banner tone="error" icon={<IconEyeOff />} title={b.missed.title} body={b.missed.body} />
      )}
      {segment.outcome === 'false_alarm' && (
        <Banner tone="error" icon={<IconBell />} title={b.falseAlarm.title} body={b.falseAlarm.body} />
      )}
      {segment.detector.review && (
        <Banner
          tone="review"
          icon={<IconDiamond />}
          title={b.lowConfidence.title}
          body={b.lowConfidence.body(formatProba(segment.detector.proba), String(band.low), String(band.high))}
        />
      )}
    </>
  );
}
