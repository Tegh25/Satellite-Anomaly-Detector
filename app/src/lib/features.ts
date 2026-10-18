import type { FeatureKey } from '../data/types';

export interface FeatureInfo { key: FeatureKey; label: string; help: string }

const AMPLITUDE = 'Basic amplitude statistics of the signal.';

export const FEATURES: FeatureInfo[] = [
  { key: 'len', label: 'Samples', help: 'Number of samples in the segment.' },
  { key: 'duration', label: 'Duration', help: 'Time span the segment covers, in time units.' },
  { key: 'mean', label: 'Mean', help: AMPLITUDE },
  { key: 'std', label: 'Std dev', help: AMPLITUDE },
  { key: 'var', label: 'Variance', help: AMPLITUDE },
  { key: 'kurtosis', label: 'Kurtosis', help: 'How heavy-tailed or spiky the distribution is. Negative means flat.' },
  { key: 'skew', label: 'Skew', help: 'How lopsided the distribution is.' },
  { key: 'n_peaks', label: 'Peaks (raw)', help: 'Peaks in the raw signal.' },
  { key: 'smooth10_n_peaks', label: 'Peaks (smoothed, 10)', help: 'Peaks after smoothing with a 10-sample window.' },
  { key: 'smooth20_n_peaks', label: 'Peaks (smoothed, 20)', help: 'Peaks after smoothing with a 20-sample window.' },
  { key: 'diff_peaks', label: 'Peaks in 1st difference', help: 'Peaks in the sample-to-sample change.' },
  { key: 'diff2_peaks', label: 'Peaks in 2nd difference', help: 'Peaks in the change of the sample-to-sample change.' },
  { key: 'diff_var', label: 'Variance of 1st difference', help: 'How jumpy the signal is.' },
  { key: 'diff2_var', label: 'Variance of 2nd difference', help: 'How jumpy the signal is, measured on the change of the change.' },
  {
    key: 'gaps_squared',
    label: 'Sampling gap irregularity',
    help: "How uneven the sample timing is (the dataset's gaps_squared column).",
  },
];
