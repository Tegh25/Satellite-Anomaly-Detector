// Every user-facing string from SPEC section 8, verbatim, plus short UI labels.
export const copy = {
  title: 'Satellite Anomaly Reporter',
  subtitle:
    'A small language model, fine-tuned to explain flagged spacecraft telemetry the way a mission-ops engineer would.',
  pill: 'Precomputed on held-out test data. No live model in this version.',
  pipeline: [
    {
      title: '15 statistics.',
      body: 'Each telemetry segment is summarised by 15 engineered features. The model never sees the raw signal.',
    },
    {
      title: 'Detector.',
      body: 'A Random Forest flags the segment ANOMALY or NOMINAL and gives a probability.',
    },
    {
      title: 'Reporter.',
      body: 'A fine-tuned Qwen3-4B writes a short mission-ops assessment of that flag.',
    },
  ],
  buttons: { random: 'Random segment', failure: 'Show me a failure' },
  banners: {
    missed: {
      title: 'The detector missed this anomaly.',
      body:
        "The dataset labels this segment ANOMALY, but the detector said NOMINAL. The report below explains the detector's flag, so it describes a normal-looking segment and recommends no action. This is the model's main limitation: it explains whatever flag it is given.",
    },
    falseAlarm: {
      title: 'The detector raised a false alarm.',
      body:
        "The dataset labels this segment NOMINAL, but the detector said ANOMALY. The report below explains the detector's flag, so it may offer a physical story that the features do not establish.",
    },
    lowConfidence: {
      title: 'Low-confidence detection.',
      body: (p: string, low: string, high: string) =>
        `The detector's probability (${p}) is in the uncertain range (${low} to ${high}). Treat the report as an explanation of the flag, not a confirmation of it.`,
    },
  },
  reportNote:
    'Plausible narrative, not a verified diagnosis. The dataset has no ground-truth causes, so the stated cause cannot be checked.',
  numberLegend: {
    supported: 'Underlined: the number appears in the model\'s input.',
    unsupported: 'Dotted outline: not found in the input (it may be a derived value such as a ratio).',
  },
  numberTips: {
    supported: "Appears in the model's input",
    unsupported: "Not found in the model's input. It may be a derived value, such as a ratio.",
  },
  reportSource: 'Precomputed with the fine-tuned model, greedy decoding, held-out test data',
  placeholderSource: 'DEV PLACEHOLDER: this text is a teacher report standing in for model output during development.',
  reportModes: {
    detector: "Given the detector's flag (what the pipeline does)",
    dataset: 'Given the dataset label (counterfactual)',
  },
  evidenceNote: 'These 15 statistics are everything the model sees.',
  compareLink: 'Compare this segment across models',
  trickyIntro:
    'The detector is wrong on a small share of segments. In every one of those cases the model explained the detector\'s flag rather than questioning it. These are the cases to read closely.',
  about: {
    whatThisIs:
      'A portfolio project that fine-tunes a 4-billion-parameter open model to turn flagged spacecraft telemetry into short mission-ops reports. It is not an operational tool.',
    howBuilt:
      'A Random Forest detector flags segments. A larger model (Claude Sonnet 5) wrote one report per training segment. The small model was fine-tuned on those reports with QLoRA, learning only to write the report, not to reproduce the input numbers.',
    evidence:
      'On held-out segments the fine-tuned model matches its teacher on format and number faithfulness, is rated at parity with the teacher by a blind judge, and clearly beats the same base model prompted by hand. See Results.',
    limitations: [
      'It trusts the label it is given and follows the detector even when the detector is wrong.',
      'Its stated causes are plausible narratives; the dataset has no ground-truth causes.',
      'It recommends a timing-focused next step more often than its teacher does.',
      "It inherits its teacher's flaws.",
      'One dataset, features instead of raw signals, English only, a small evaluation sample.',
      "The judge is the same model family as the teacher, so it likely favours the teacher's style.",
    ],
  },
  credits: {
    baseModel: 'Base model: Qwen3-4B-Instruct-2507 (Apache 2.0).',
    teacher: 'Teacher reports: Claude Sonnet 5.',
  },
  footerBuiltBy: (name: string) => `Built by ${name}.`,
  pending: 'Pending',
  nav: [
    { href: '#/', label: 'Explore' },
    { href: '#/tricky', label: 'Tricky cases' },
    { href: '#/compare', label: 'Compare' },
    { href: '#/results', label: 'Results' },
    { href: '#/about', label: 'About' },
  ],
  arms: {
    finetuned: 'This model',
    base_prompted: 'Prompted base',
    teacher: 'Teacher',
  },
  blind: {
    question: 'Which would you rather hand to an ops team?',
  },
} as const;
