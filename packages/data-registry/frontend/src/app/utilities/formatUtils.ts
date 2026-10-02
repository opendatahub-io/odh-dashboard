type FormatBadge = {
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'grey' | 'teal' | 'orangered' | 'yellow';
};

export type AssetType = 'table' | 'volume';

const UNSTRUCTURED_FORMATS = [
  'documents',
  'images',
  'audio',
  'video',
  'binary',
  'other',
  'application/pdf',
  'pdf',
];

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
  { key: 'iceberg', value: 'iceberg', label: 'Apache Iceberg', assetType: 'table' },
  { key: 'parquet', value: 'parquet', label: 'Apache Parquet', assetType: 'table' },
  { key: 'csv', value: 'csv', label: 'CSV', assetType: 'table' },
  { key: 'delta', value: 'delta', label: 'Delta Lake', assetType: 'table' },
  { key: 'postgresql', value: 'postgresql', label: 'PostgreSQL', assetType: 'table' },
  { key: 'milvus', value: 'milvus', label: 'Milvus', assetType: 'table' },
  { key: 'other-structured', value: 'other', label: 'Other structured', assetType: 'table' },
  { key: 'documents', value: 'documents', label: 'Documents', assetType: 'volume' },
  { key: 'images', value: 'images', label: 'Images', assetType: 'volume' },
  { key: 'audio', value: 'audio', label: 'Audio', assetType: 'volume' },
  { key: 'video', value: 'video', label: 'Video', assetType: 'volume' },
  { key: 'binary', value: 'binary', label: 'Binary', assetType: 'volume' },
  { key: 'other-unstructured', value: 'other', label: 'Other unstructured', assetType: 'volume' },
];

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
