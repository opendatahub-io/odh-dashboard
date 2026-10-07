import type { StructuredFormat, UnstructuredFormat } from '~/app/types';

type FormatBadge = {
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'grey' | 'teal' | 'orangered' | 'yellow';
};

export type AssetType = 'table' | 'volume';

type FormatSelectOption<T extends string> = {
  key: T;
  label: string;
};

export const STRUCTURED_FORMAT_OPTIONS = [
  { key: 'iceberg', label: 'Apache Iceberg' },
  { key: 'parquet', label: 'Apache Parquet' },
  { key: 'csv', label: 'CSV' },
  { key: 'delta', label: 'Delta Lake' },
  { key: 'postgresql', label: 'PostgreSQL' },
  { key: 'milvus', label: 'Milvus' },
  { key: 'other', label: 'Other structured' },
] satisfies FormatSelectOption<StructuredFormat>[];

export const UNSTRUCTURED_FORMAT_OPTIONS = [
  { key: 'documents', label: 'Documents' },
  { key: 'images', label: 'Images' },
  { key: 'audio', label: 'Audio' },
  { key: 'video', label: 'Video' },
  { key: 'binary', label: 'Binary' },
  { key: 'other', label: 'Other unstructured' },
] satisfies FormatSelectOption<UnstructuredFormat>[];

export const STRUCTURED_FORMAT_VALUES: StructuredFormat[] = STRUCTURED_FORMAT_OPTIONS.map(
  ({ key }) => key,
);

export const UNSTRUCTURED_FORMAT_VALUES: UnstructuredFormat[] = UNSTRUCTURED_FORMAT_OPTIONS.map(
  ({ key }) => key,
);

const UNSTRUCTURED_FORMATS = [...UNSTRUCTURED_FORMAT_VALUES, 'application/pdf', 'pdf'];

const UNSTRUCTURED_FORMAT_LABELS: Record<string, string> = {
  documents: 'Documents',
  images: 'Images',
  audio: 'Audio',
  video: 'Video',
  binary: 'Binary',
  other: 'Other unstructured',
  'application/pdf': 'Documents',
  pdf: 'Documents',
};

const FORMAT_BADGES: Record<string, FormatBadge> = {
  iceberg: { color: 'yellow' },
  parquet: { color: 'teal' },
  csv: { color: 'grey' },
  postgresql: { color: 'grey' },
  milvus: { color: 'grey' },
  delta: { color: 'grey' },
  documents: { color: 'grey' },
  images: { color: 'grey' },
  audio: { color: 'grey' },
  video: { color: 'grey' },
  binary: { color: 'grey' },
};

export type FormatOption = {
  key: string;
  value: string;
  label: string;
  assetType: AssetType;
};

export const FORMAT_OPTIONS: FormatOption[] = [
  ...STRUCTURED_FORMAT_OPTIONS.map(({ key, label }) => ({
    key: key === 'other' ? 'other-structured' : key,
    value: key,
    label,
    assetType: 'table' as const,
  })),
  ...UNSTRUCTURED_FORMAT_OPTIONS.map(({ key, label }) => ({
    key: key === 'other' ? 'other-unstructured' : key,
    value: key,
    label,
    assetType: 'volume' as const,
  })),
];

export const DEFAULT_FORMATS: Record<string, string> = {
  unstructured: 'other',
  structured: 'iceberg',
};

export const isStructuredFormat = (format: string): format is StructuredFormat =>
  STRUCTURED_FORMAT_VALUES.some((value) => value === format);

export const isUnstructuredFormat = (format: string): format is UnstructuredFormat =>
  UNSTRUCTURED_FORMAT_VALUES.some((value) => value === format);

export const getFormatBadge = (format: string): FormatBadge =>
  FORMAT_BADGES[format.toLowerCase()] ?? { color: 'grey' };

export const normalizeUnstructuredFormat = (format?: string): string => {
  const normalizedFormat = format?.toLowerCase();
  if (!normalizedFormat) {
    return 'other';
  }
  if (normalizedFormat === 'application/pdf' || normalizedFormat === 'pdf') {
    return 'documents';
  }
  return UNSTRUCTURED_FORMATS.includes(normalizedFormat) ? normalizedFormat : 'other';
};

export const getRawUnstructuredFormat = (
  format: unknown,
  fallback?: unknown,
): string | undefined => {
  if (typeof format === 'string' && format) {
    return format;
  }
  return typeof fallback === 'string' ? fallback : undefined;
};

export const getUnstructuredFormatLabel = (format?: string): string =>
  UNSTRUCTURED_FORMAT_LABELS[normalizeUnstructuredFormat(format)] ?? 'Other unstructured';

export const isStructured = (format: string): boolean =>
  !UNSTRUCTURED_FORMATS.includes(format.toLowerCase());
