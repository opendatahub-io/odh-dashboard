/* eslint-disable camelcase */
import { DeploymentMode, asEnumMember } from 'mod-arch-core';

const STYLE_THEME = process.env.STYLE_THEME || 'patternfly-theme';
const DEPLOYMENT_MODE =
  asEnumMember(process.env.DEPLOYMENT_MODE, DeploymentMode) || DeploymentMode.Federated;
const DEV_MODE = process.env.APP_ENV === 'development';
const POLL_INTERVAL = process.env.POLL_INTERVAL ? parseInt(process.env.POLL_INTERVAL) : 30000;
const KUBEFLOW_USERNAME = process.env.KUBEFLOW_USERNAME || 'user@example.com';
const IMAGE_DIR = process.env.IMAGE_DIR || 'images';
const LOGO_LIGHT = process.env.LOGO || 'logo-light-theme.svg';
const MANDATORY_NAMESPACE = process.env.MANDATORY_NAMESPACE || undefined;
const URL_PREFIX = '/autorag';
const BFF_API_VERSION = 'v1';
const COMPANY_URI = process.env.COMPANY_URI || 'oci://odh.io';

export {
  STYLE_THEME,
  POLL_INTERVAL,
  DEV_MODE,
  KUBEFLOW_USERNAME,
  IMAGE_DIR,
  LOGO_LIGHT,
  URL_PREFIX,
  DEPLOYMENT_MODE,
  BFF_API_VERSION,
  MANDATORY_NAMESPACE,
  COMPANY_URI,
};

export const FindAdministratorOptions = [
  'The person who gave you your username, or who helped you to log in for the first time',
  'Someone in your IT department or help desk',
  'A project manager or developer',
];

export const MAX_DISPLAY_NAME_LENGTH = 250;
export const MAX_DESCRIPTION_LENGTH = 255;
export const MIN_RAG_PATTERNS = 4;
export const MAX_RAG_PATTERNS = 10;

// Presets
export const PRESET_FASTER = 'speed';
export const PRESET_BETTER_QUALITY = 'balanced';
export const PRESETS = [PRESET_FASTER, PRESET_BETTER_QUALITY] as const;

export const PRESET_LABELS: Record<string, string> = {
  [PRESET_FASTER]: 'Faster',
  [PRESET_BETTER_QUALITY]: 'Better quality',
};

// Optimization metrics
export const RAG_METRIC_UNITXT_FAITHFULNESS = 'unitxt:faithfulness';
export const RAG_METRIC_UNITXT_ANSWER_CORRECTNESS = 'unitxt:answer_correctness';
export const RAG_METRIC_CUSTOM_OVERALL_SCORE = 'custom:overall_score';
export const RAG_METRIC_RAGAS_FAITHFULNESS = 'ragas:faithfulness';
export const RAG_METRIC_RAGAS_ANSWER_RELEVANCY = 'ragas:answer_relevancy';
export const RAG_METRIC_RAGAS_CONTEXT_PRECISION = 'ragas:context_precision';
export const RAG_METRIC_RAGAS_CONTEXT_RECALL = 'ragas:context_recall';

// Historical result/runtime values. These are not valid new form inputs.
export const RAG_METRIC_FAITHFULNESS = 'faithfulness';
export const RAG_METRIC_ANSWER_CORRECTNESS = 'answer_correctness';
export const RAG_METRIC_CONTEXT_CORRECTNESS = 'context_correctness';
export const RAG_METRIC_OVERALL_SCORE = 'overall_score';
export const RAG_METRIC_ANSWER_RELEVANCE = 'answer_relevance';

export const DEFAULT_OPTIMIZATION_METRIC = RAG_METRIC_CUSTOM_OVERALL_SCORE;

/** Shared labels for the two qualified faithfulness metrics. */
export const QUALIFIED_METRIC_LABELS = {
  [RAG_METRIC_UNITXT_FAITHFULNESS]: {
    configuration: 'Faithfulness (Unitxt)',
    results: 'Faithfulness (Unitxt)',
  },
  [RAG_METRIC_RAGAS_FAITHFULNESS]: {
    configuration: 'Faithfulness (RAGAS)',
    results: 'Faithfulness (RAGAS)',
  },
} as const;

export const OPTIMIZATION_METRICS_BY_PRESET = {
  [PRESET_FASTER]: [
    RAG_METRIC_UNITXT_FAITHFULNESS,
    RAG_METRIC_UNITXT_ANSWER_CORRECTNESS,
    RAG_METRIC_CUSTOM_OVERALL_SCORE,
  ],
  [PRESET_BETTER_QUALITY]: [
    RAG_METRIC_UNITXT_FAITHFULNESS,
    RAG_METRIC_UNITXT_ANSWER_CORRECTNESS,
    RAG_METRIC_CUSTOM_OVERALL_SCORE,
    RAG_METRIC_RAGAS_FAITHFULNESS,
    RAG_METRIC_RAGAS_ANSWER_RELEVANCY,
    RAG_METRIC_RAGAS_CONTEXT_PRECISION,
    RAG_METRIC_RAGAS_CONTEXT_RECALL,
  ],
} as const;

export const OPTIMIZATION_METRICS = [
  RAG_METRIC_UNITXT_FAITHFULNESS,
  RAG_METRIC_UNITXT_ANSWER_CORRECTNESS,
  RAG_METRIC_CUSTOM_OVERALL_SCORE,
  RAG_METRIC_RAGAS_FAITHFULNESS,
  RAG_METRIC_RAGAS_ANSWER_RELEVANCY,
  RAG_METRIC_RAGAS_CONTEXT_PRECISION,
  RAG_METRIC_RAGAS_CONTEXT_RECALL,
] as const;

type OptimizationMetric = (typeof OPTIMIZATION_METRICS)[number];

export const getOptimizationMetricsForPreset = (preset: string): readonly OptimizationMetric[] =>
  preset === PRESET_BETTER_QUALITY
    ? OPTIMIZATION_METRICS_BY_PRESET[PRESET_BETTER_QUALITY]
    : OPTIMIZATION_METRICS_BY_PRESET[PRESET_FASTER];

export const normalizeRestoredOptimizationMetric = (
  metric: unknown,
  preset: string,
): (typeof OPTIMIZATION_METRICS)[number] => {
  const normalized = getRestoredOptimizationMetric(metric, preset);
  const allowedMetrics = getOptimizationMetricsForPreset(preset);
  return normalized && allowedMetrics.includes(normalized)
    ? normalized
    : DEFAULT_OPTIMIZATION_METRIC;
};

const getRestoredOptimizationMetric = (
  metric: unknown,
  preset: string,
): OptimizationMetric | undefined => {
  // Bare values are historical runtime values accepted only while restoring a run. New create
  // requests continue to use the qualified schema enum.
  const legacyMetricMap: Record<string, OptimizationMetric> = {
    faithfulness:
      preset === PRESET_BETTER_QUALITY
        ? RAG_METRIC_RAGAS_FAITHFULNESS
        : RAG_METRIC_UNITXT_FAITHFULNESS,
    answer_correctness: RAG_METRIC_UNITXT_ANSWER_CORRECTNESS,
    overall_score: RAG_METRIC_CUSTOM_OVERALL_SCORE,
  };
  const normalized =
    typeof metric === 'string'
      ? (legacyMetricMap[metric] ?? OPTIMIZATION_METRICS.find((value) => value === metric))
      : undefined;
  return normalized;
};

/** Whether a persisted metric can be restored without falling back to the default. */
export const isRestoredOptimizationMetricSupported = (metric: unknown, preset: string): boolean => {
  const normalized = getRestoredOptimizationMetric(metric, preset);
  return normalized !== undefined && getOptimizationMetricsForPreset(preset).includes(normalized);
};

/** Human-readable labels for optimization metric values. */
export const OPTIMIZATION_METRIC_LABELS: Record<string, string> = {
  [RAG_METRIC_UNITXT_FAITHFULNESS]:
    QUALIFIED_METRIC_LABELS[RAG_METRIC_UNITXT_FAITHFULNESS].configuration,
  [RAG_METRIC_UNITXT_ANSWER_CORRECTNESS]: 'Answer correctness (Unitxt)',
  [RAG_METRIC_CUSTOM_OVERALL_SCORE]: 'Overall score',
  [RAG_METRIC_RAGAS_FAITHFULNESS]:
    QUALIFIED_METRIC_LABELS[RAG_METRIC_RAGAS_FAITHFULNESS].configuration,
  [RAG_METRIC_RAGAS_ANSWER_RELEVANCY]: 'Answer relevancy (RAGAS)',
  [RAG_METRIC_RAGAS_CONTEXT_PRECISION]: 'Context precision (RAGAS)',
  [RAG_METRIC_RAGAS_CONTEXT_RECALL]: 'Context recall (RAGAS)',
  [RAG_METRIC_FAITHFULNESS]: 'Answer faithfulness',
  [RAG_METRIC_ANSWER_CORRECTNESS]: 'Answer correctness',
  [RAG_METRIC_CONTEXT_CORRECTNESS]: 'Context correctness',
  [RAG_METRIC_OVERALL_SCORE]: 'Overall score',
};

/** Descriptions for each optimization metric — shared by the results table and CI scores chart. */
export const METRIC_DESCRIPTIONS: Record<string, string> = {
  [RAG_METRIC_UNITXT_ANSWER_CORRECTNESS]:
    'Measures whether the generated answer matches the expected ground-truth answers in your test data. A high answer correctness score means the RAG system produces answers that align with your provided correct answers.',
  [RAG_METRIC_UNITXT_FAITHFULNESS]:
    'Measures whether the generated answer uses information from the retrieved context rather than hallucinated content. A high faithfulness score means the answer uses information from the retrieved documents, not from the model’s training data.',
  [RAG_METRIC_CUSTOM_OVERALL_SCORE]:
    'A composite score that combines the other metrics to provide an overall assessment of the RAG system’s performance. A high overall score indicates that the system is performing well across all evaluated aspects.',
  [RAG_METRIC_RAGAS_ANSWER_RELEVANCY]:
    'Measures how relevant the generated answer is to the user’s question. A high answer relevance score means the answer directly addresses the question and provides useful information.',
  [RAG_METRIC_RAGAS_CONTEXT_PRECISION]:
    'Measures the precision of the retrieved context for the question.',
  [RAG_METRIC_RAGAS_CONTEXT_RECALL]:
    'Measures how much of the relevant context was successfully retrieved.',
  [RAG_METRIC_RAGAS_FAITHFULNESS]:
    'Measures whether the generated answer is supported by the retrieved context.',
  [RAG_METRIC_ANSWER_CORRECTNESS]:
    'Measures whether the generated answer matches the expected ground-truth answers in your test data. A high answer correctness score means the RAG system produces answers that align with your provided correct answers.',
  [RAG_METRIC_FAITHFULNESS]:
    'Measures whether the generated answer uses information from the retrieved context rather than hallucinated content. A high faithfulness score means the answer uses information from the retrieved documents, not from the model’s training data.',
  [RAG_METRIC_CONTEXT_CORRECTNESS]:
    'Measures whether the retrieved documents are relevant to the question. A high context correctness score means the retrieval step retrieves the relevant documents before the generation model produces an answer.',
  [RAG_METRIC_OVERALL_SCORE]:
    'A composite score that combines the other metrics to provide an overall assessment of the RAG system’s performance. A high overall score indicates that the system is performing well across all evaluated aspects.',
  [RAG_METRIC_ANSWER_RELEVANCE]:
    'Measures how relevant the generated answer is to the user’s question. A high answer relevance score means the answer directly addresses the question and provides useful information.',
};

export const REQUIRED_CONNECTION_SECRET_KEYS: Readonly<Partial<Record<string, readonly string[]>>> =
  {
    s3: ['AWS_S3_BUCKET', 'AWS_DEFAULT_REGION'],
  };
