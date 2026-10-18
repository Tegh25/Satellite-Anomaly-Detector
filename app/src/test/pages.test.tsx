import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import devSegments from '../../public/data/segments.dev.json';
import devMeta from '../../public/data/meta.dev.json';
import realSegments from '../../public/data/segments.json';
import realMeta from '../../public/data/meta.json';
import resultsJson from '../../public/data/results.json';
import { AppView } from '../App';
import { copy } from '../copy';
import { buildAppData } from '../data/load';
import type { Meta, Results, Segment } from '../data/types';
import { parseHash } from '../router';

const results = resultsJson as unknown as Results;
const dev = () => structuredClone(devSegments) as unknown as Segment[];

function renderAt(hash: string, segments: Segment[] = dev(), r: Results = results, meta: Meta = devMeta as Meta) {
  return render(<AppView data={buildAppData(segments, meta, r)} route={parseHash(hash)} />);
}

describe('Explorer', () => {
  it('shows the summary line computed from data', () => {
    renderAt('#/');
    expect(screen.getByText('17 segments, 4 detector errors, 35% flagged for review.')).toBeInTheDocument();
  });

  it('renders the real data without code changes', () => {
    renderAt('#/', realSegments as unknown as Segment[], results, realMeta as Meta);
    expect(screen.getByText('529 segments, 19 detector errors, 20% flagged for review.')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 22')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('link')).toHaveLength(25);
  });

  it('applies filters from the hash and shows an empty state', () => {
    renderAt('#/?outcome=false_alarm');
    const links = within(screen.getByRole('table')).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['1522', '1734']);
    renderAt('#/?outcome=false_alarm&channel=CADC0872');
    expect(screen.getByText('No segments match these filters.')).toBeInTheDocument();
  });

  it('makes rows keyboard reachable links to the segment page', () => {
    renderAt('#/');
    const link = screen.getByRole('link', { name: '1522' });
    expect(link).toHaveAttribute('href', '#/segment/1522');
  });
});

describe('Segment page', () => {
  it('correct, confident segment: no banners', () => {
    renderAt('#/segment/5');
    expect(screen.queryByText(copy.banners.missed.title)).not.toBeInTheDocument();
    expect(screen.queryByText(copy.banners.falseAlarm.title)).not.toBeInTheDocument();
    expect(screen.queryByText(copy.banners.lowConfidence.title)).not.toBeInTheDocument();
    expect(screen.getByText(copy.reportSource)).toBeInTheDocument();
    expect(screen.getByText(copy.compareLink)).toHaveAttribute('href', '#/compare/5');
  });

  it('missed anomaly in the review band shows both banners', () => {
    renderAt('#/segment/927');
    expect(screen.getByText(copy.banners.missed.title)).toBeInTheDocument();
    expect(screen.getByText(copy.banners.lowConfidence.title)).toBeInTheDocument();
    expect(screen.getByText(copy.banners.lowConfidence.body('0.11', '0.1', '0.9'))).toBeInTheDocument();
  });

  it('false alarm shows the false alarm banner and the probability text', () => {
    renderAt('#/segment/1522');
    expect(screen.getByText(copy.banners.falseAlarm.title)).toBeInTheDocument();
    expect(screen.getByText(/Detector probability of anomaly:/).textContent).toContain('0.62');
    expect(screen.getByRole('img', { name: /Detector probability of anomaly 0.62/ })).toBeInTheDocument();
  });

  it('review band without an error shows only the low-confidence banner', () => {
    renderAt('#/segment/20');
    expect(screen.getByText(copy.banners.lowConfidence.title)).toBeInTheDocument();
    expect(screen.queryByText(copy.banners.missed.title)).not.toBeInTheDocument();
  });

  it('placeholder rows show the DEV PLACEHOLDER ribbon', () => {
    renderAt('#/segment/235');
    expect(screen.getByText('DEV PLACEHOLDER')).toBeInTheDocument();
    expect(screen.queryByText(copy.reportSource)).not.toBeInTheDocument();
  });

  it('lists all 15 features with raw values', () => {
    renderAt('#/segment/5');
    expect(screen.getByText(copy.evidenceNote)).toBeInTheDocument();
    expect(screen.getByText('Sampling gap irregularity')).toBeInTheDocument();
    expect(screen.getByText('5.27902e-10')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^About / })).toHaveLength(15);
  });

  it('highlights numbers by default, and can show plain text', async () => {
    const user = userEvent.setup();
    const { container } = renderAt('#/segment/5');
    expect(container.querySelectorAll('.report-text .num')).toHaveLength(8);
    await user.click(screen.getByLabelText('Highlight numbers'));
    expect(container.querySelectorAll('.report-text .num')).toHaveLength(0);
  });

  it('falls back to plain text when flags and numbers disagree', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const segs = dev();
    segs.find((s) => s.segment === 5)!.reports.detector_label.number_flags = [1];
    const { container } = renderAt('#/segment/5', segs);
    expect(container.querySelectorAll('.report-text .num')).toHaveLength(0);
    expect(container.querySelector('.report-text')!.textContent).toBe(
      segs.find((s) => s.segment === 5)!.reports.detector_label.text,
    );
    warn.mockRestore();
  });

  it('switches to the counterfactual report when one exists', async () => {
    const user = userEvent.setup();
    const segs = dev();
    const s = segs.find((x) => x.segment === 1522)!;
    s.reports.dataset_label = { text: 'Counterfactual report with 2 numbers 3.', number_flags: [0, 0] };
    renderAt('#/segment/1522', segs);
    const detectorBtn = screen.getByRole('button', { name: copy.reportModes.detector });
    expect(detectorBtn).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: copy.reportModes.dataset }));
    expect(screen.getByText(/Counterfactual report with/)).toBeInTheDocument();
  });

  it('copies only the plain report text', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderAt('#/segment/5');
    await user.click(screen.getByRole('button', { name: 'Copy report' }));
    expect(writeText).toHaveBeenCalledWith(dev().find((s) => s.segment === 5)!.reports.detector_label.text);
  });

  it('shows a not-found state for unknown segments', () => {
    renderAt('#/segment/999999');
    expect(screen.getByText('Segment 999999 was not found')).toBeInTheDocument();
  });

  it('offers previous and next within the current filter', () => {
    renderAt('#/segment/1522?outcome=false_alarm');
    expect(screen.getByRole('link', { name: 'Next: 1734' })).toHaveAttribute('href', '#/segment/1734?outcome=false_alarm');
  });
});

describe('Tricky cases', () => {
  it('groups every detector error', () => {
    renderAt('#/tricky');
    expect(screen.getByRole('heading', { name: /Missed anomalies/ })).toHaveTextContent('(2)');
    expect(screen.getByRole('heading', { name: /False alarms/ })).toHaveTextContent('(2)');
    expect(screen.getByText(copy.trickyIntro)).toBeInTheDocument();
  });
});

describe('Results', () => {
  it('renders values from results.json', () => {
    renderAt('#/results');
    expect(screen.getByText('53\u20132\u20135')).toBeInTheDocument();
    expect(screen.getByText('21\u201321\u201318')).toBeInTheDocument();
    expect(screen.getAllByText('41% [33 to 48]').length).toBeGreaterThan(0);
    expect(screen.getByText(results.judge.bias_note)).toBeInTheDocument();
    expect(screen.getByText(/The report followed the detector/).textContent).toBe(
      "The report followed the detector's flag in 18 of 18 cases.",
    );
  });

  it('shows Pending for every null value', () => {
    const r = structuredClone(results);
    r.detector.test_accuracy = null;
    r.detector.test_precision = null;
    r.detector.test_recall = null;
    r.review_band.cross_validated = null;
    r.training.final_train_loss = null;
    renderAt('#/results', dev(), r);
    expect(screen.getAllByText('Pending')).toHaveLength(5);
  });
});

describe('Compare', () => {
  it('shows three columns and the judge verdicts', () => {
    renderAt('#/compare/13');
    for (const name of ['This model', 'Prompted base', 'Teacher']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.getAllByText(/Judge preferred: This model\.|Judge result: Tie\./).length).toBeGreaterThan(0);
  });

  it('handles a comparison without judge entries', () => {
    const segs = dev();
    segs.find((s) => s.segment === 13)!.compare!.judge = [];
    renderAt('#/compare/13', segs);
    expect(screen.getByText('This segment was not in the judged sample.')).toBeInTheDocument();
  });

  it('runs a blind round and reveals the labels', async () => {
    const user = userEvent.setup();
    renderAt('#/compare/blind');
    expect(screen.getByRole('heading', { name: copy.blind.question })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pick A' }));
    expect(screen.getByRole('heading', { name: 'Reveal' })).toBeInTheDocument();
    expect(screen.getByText(/you preferred this model/)).toBeInTheDocument();
  });
});

describe('About', () => {
  it('lists every limitation', () => {
    renderAt('#/about');
    for (const l of copy.about.limitations) expect(screen.getByText(l)).toBeInTheDocument();
  });
});
