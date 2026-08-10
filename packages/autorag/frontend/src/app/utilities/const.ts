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
export const MAX_RAG_PATTERNS = 20;

// Input
export const RAG_SUPPORTED_INPUT_FORMAT = {
  pdf: {
    extension: 'pdf',
    mimeType: 'application/pdf',
    name: 'PDF',
  },
  docx: {
    extension: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    name: 'DOCX',
  },
  pptx: {
    extension: 'pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    name: 'PPTX',
  },
  md: {
    extension: 'md',
    mimeType: 'text/markdown',
    name: 'Markdown',
  },
  markdown: {
    extension: 'markdown',
    mimeType: 'text/markdown',
    name: 'Markdown',
  },
  html: {
    extension: 'html',
    mimeType: 'text/html',
    name: 'HTML',
  },
  htm: {
    extension: 'htm',
    mimeType: 'text/html',
    name: 'HTML',
  },
  txt: {
    extension: 'txt',
    mimeType: 'text/plain',
    name: 'Plain text',
  },
};
export const RAG_SUPPORTED_INPUT_FORMAT_EXTENSIONS = Object.values(RAG_SUPPORTED_INPUT_FORMAT).map(
  (f) => f.extension,
);
export const RAG_SUPPORTED_INPUT_FORMAT_NAMES = [
  ...new Set(Object.values(RAG_SUPPORTED_INPUT_FORMAT).map((f) => f.name)),
];
export const RAG_SUPPORTED_INPUT_FORMAT_NAMES_STRING_SIMPLE =
  RAG_SUPPORTED_INPUT_FORMAT_NAMES.join(', ');
export const RAG_SUPPORTED_INPUT_FORMAT_NAMES_STRING_OR =
  RAG_SUPPORTED_INPUT_FORMAT_NAMES.length > 1
    ? `${RAG_SUPPORTED_INPUT_FORMAT_NAMES.slice(0, -1).join(', ')}, or ${RAG_SUPPORTED_INPUT_FORMAT_NAMES.at(-1)}`
    : RAG_SUPPORTED_INPUT_FORMAT_NAMES.join('');
export const RAG_SUPPORTED_INPUT_FORMATS_MIME_TYPE_TO_EXTENSION: Record<string, string[]> =
  Object.fromEntries(
    Object.values(RAG_SUPPORTED_INPUT_FORMAT).reduce<Map<string, string[]>>(
      (map, { mimeType, extension }) => {
        const exts = map.get(mimeType) ?? [];
        exts.push(`.${extension}`);
        map.set(mimeType, exts);
        return map;
      },
      new Map(),
    ),
  );
export const RAG_SUPPORTED_INPUT_FORMAT_HINT = `You can only select ${RAG_SUPPORTED_INPUT_FORMAT_NAMES_STRING_OR} files`;

// Presets
export const PRESET_FASTER = 'speed';
export const PRESET_BETTER_QUALITY = 'balanced';
export const PRESETS = [PRESET_FASTER, PRESET_BETTER_QUALITY] as const;

export const PRESET_LABELS: Record<string, string> = {
  [PRESET_FASTER]: 'Faster',
  [PRESET_BETTER_QUALITY]: 'Better quality',
};

// Optimization metrics
export const RAG_METRIC_FAITHFULNESS = 'faithfulness';
export const RAG_METRIC_ANSWER_CORRECTNESS = 'answer_correctness';
export const RAG_METRIC_CONTEXT_CORRECTNESS = 'context_correctness';
export const RAG_METRIC_OVERALL_SCORE = 'overall_score';
export const RAG_METRIC_ANSWER_RELEVANCE = 'answer_relevance';

export const DEFAULT_OPTIMIZATION_METRIC = RAG_METRIC_OVERALL_SCORE;

/** Human-readable labels for optimization metric values. */
export const OPTIMIZATION_METRIC_LABELS: Record<string, string> = {
  [RAG_METRIC_FAITHFULNESS]: 'Answer faithfulness',
  [RAG_METRIC_ANSWER_CORRECTNESS]: 'Answer correctness',
  [RAG_METRIC_CONTEXT_CORRECTNESS]: 'Context correctness',
  [RAG_METRIC_OVERALL_SCORE]: 'Overall score',
};

/** Descriptions for each optimization metric — shared by the results table and CI scores chart. */
export const METRIC_DESCRIPTIONS: Record<string, string> = {
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
    ogx: [],
  };
