type FormatBadge = {
  text: string;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'grey' | 'teal' | 'orangered' | 'yellow';
};

const FORMAT_LABELS: Record<string, FormatBadge> = {
  iceberg: { text: 'Structured', color: 'yellow' },
  parquet: { text: 'Structured', color: 'teal' },
  csv: { text: 'Structured', color: 'grey' },
  postgresql: { text: 'Structured', color: 'grey' },
  mysql: { text: 'Structured', color: 'grey' },
  milvus: { text: 'Structured', color: 'grey' },
  delta: { text: 'Structured', color: 'grey' },
  'application/pdf': { text: 'Unstructured', color: 'grey' },
  pdf: { text: 'Unstructured', color: 'grey' },
  documents: { text: 'Unstructured', color: 'grey' },
  images: { text: 'Unstructured', color: 'grey' },
  audio: { text: 'Unstructured', color: 'grey' },
  video: { text: 'Unstructured', color: 'grey' },
  binary: { text: 'Unstructured', color: 'grey' },
};

const UNSTRUCTURED_FORMATS = [
  'documents',
  'images',
  'audio',
  'video',
  'binary',
  'application/pdf',
  'pdf',
];

const UNSTRUCTURED_FORMAT_LABELS: Record<string, string> = {
  documents: 'Documents',
  images: 'Images',
  audio: 'Audio',
  video: 'Video',
  binary: 'Binary',
  other: 'Other',
  'application/pdf': 'Documents',
  pdf: 'Documents',
};

export const FORMAT_OPTIONS: { key: string; label: string }[] = [
  { key: 'iceberg', label: 'Apache Iceberg' },
  { key: 'parquet', label: 'Apache Parquet' },
  { key: 'csv', label: 'CSV' },
  { key: 'delta', label: 'Delta Lake' },
  { key: 'postgresql', label: 'PostgreSQL' },
  { key: 'milvus', label: 'Milvus' },
  { key: 'documents', label: 'Documents' },
  { key: 'images', label: 'Images' },
  { key: 'audio', label: 'Audio' },
  { key: 'video', label: 'Video' },
  { key: 'binary', label: 'Binary' },
  { key: 'other', label: 'Other' },
];

export const getFormatBadge = (format: string): FormatBadge =>
  FORMAT_LABELS[format.toLowerCase()] ?? { text: 'Unknown', color: 'grey' };

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
  UNSTRUCTURED_FORMAT_LABELS[normalizeUnstructuredFormat(format)] ?? 'Other';

export const isStructured = (format: string): boolean =>
  !UNSTRUCTURED_FORMATS.includes(format.toLowerCase());
