export type FeatureKey = 'len' | 'duration' | 'mean' | 'std' | 'var' | 'kurtosis' | 'skew' | 'n_peaks'
  | 'smooth10_n_peaks' | 'smooth20_n_peaks' | 'diff_peaks' | 'diff2_peaks' | 'diff_var' | 'diff2_var' | 'gaps_squared';

export type Outcome = 'correct' | 'false_alarm' | 'missed_anomaly';

export interface Report { text: string; number_flags: (0 | 1)[] }

export interface CompareArm extends Report {
  format_ok: boolean; em_dash: boolean; words: number; unsupported_numbers: string[];
}

export type ArmId = 'finetuned' | 'base_prompted' | 'teacher';

export interface Judge {
  vs: 'base_prompted' | 'teacher';
  winner: ArmId | 'tie';
  reason: string;
  unsupported_claims: Record<string, number | null>;
}

export interface Segment {
  segment: number;
  channel: string;
  features: Record<FeatureKey, number>;
  dataset_label: 0 | 1;
  detector: { pred: 0 | 1; proba: number; review: boolean };
  outcome: Outcome;
  reports: {
    detector_label: Report;
    dataset_label: Report | null;
  };
  report_source: 'finetuned_nf4_greedy' | 'teacher_placeholder';
  compare: null | {
    teacher: CompareArm;
    base_prompted: CompareArm;
    finetuned: Omit<CompareArm, 'text' | 'number_flags'>;
    judge: Judge[];
  };
}

export interface Meta {
  generated_at: string | null;
  n_segments: number;
  n_with_comparison?: number;
  n_judged?: number;
  outcomes?: Partial<Record<Outcome, number>>;
  review_band: { low: number; high: number };
  report_source: string;
  dev_fixture?: boolean;
}

export interface Rate { pct: number; lo: number; hi: number }

export interface ResultsArm {
  id: ArmId;
  label: string;
  format_ok: Rate;
  em_dash: Rate;
  markdown: Rate;
  dataset_language: Rate;
  truncated: Rate;
  mean_words: number;
  numbers_per_report: number;
  any_unsupported_number: Rate;
  verdict_anomaly_on_anomalies: Rate;
  verdict_nominal_on_nominals: Rate;
}

export interface JudgePair {
  pair: 'finetuned_vs_base_prompted' | 'finetuned_vs_teacher';
  n: number;
  wins: number;
  ties: number;
  losses: number;
  unsupported_claims_per_report: Record<string, number | null>;
}

export interface ReviewBandRow {
  band: [number, number];
  flagged_pct: number;
  errors_caught: number;
  errors_total: number;
}

export interface Results {
  eval_set: {
    n_segments: number;
    anomalies: number;
    nominal: number;
    detector_errors_included: number;
    note: string;
  };
  arms: ResultsArm[];
  arm_notes: string[];
  judge: {
    judge_model: string;
    method: string;
    bias_note: string;
    pairs: JudgePair[];
  };
  detector_errors: {
    n: number;
    false_alarms: number;
    missed_anomalies: number;
    report_follows_detector: { k: number; n: number };
    mean_detector_probability: { false_alarm: number | null; missed_anomaly: number | null };
    summary: string;
  };
  timing_lean: {
    definition: string;
    anomalies_compared: number;
    student_pct: number;
    teacher_pct: number;
    student_only: number;
    teacher_only: number;
    sign_test_p: number;
    by_group_test: {
      group: string;
      n: number;
      teacher_pct: number | null;
      finetuned_pct: number | null;
      base_prompted_pct: number | null;
    }[];
    training_reports_pct: Record<string, number | null>;
    summary: string;
  };
  review_band: {
    note: string;
    test_split: ReviewBandRow[];
    cross_validated: ReviewBandRow[] | null;
  };
  detector: {
    model: string;
    test_accuracy: number | null;
    test_precision: number | null;
    test_recall: number | null;
  };
  training: {
    base_model: string;
    method: string;
    epochs: number;
    effective_batch_size: number;
    learning_rate: string;
    final_train_loss: number | null;
    final_validation_loss: number | null;
    loss: string;
  };
}

export interface AppData {
  segments: Segment[];
  meta: Meta;
  results: Results;
  byId: Map<number, Segment>;
}
