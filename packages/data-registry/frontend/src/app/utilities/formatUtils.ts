type FormatBadge = {
  text: string;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'grey';
};

const FORMAT_LABELS: Record<string, FormatBadge> = {
  iceberg: { text: 'Structured', color: 'blue' },
  parquet: { text: 'Structured', color: 'blue' },
  csv: { text: 'Structured', color: 'blue' },
  postgresql: { text: 'Structured', color: 'blue' },
  mysql: { text: 'Structured', color: 'blue' },
  milvus: { text: 'Structured', color: 'blue' },
  delta: { text: 'Structured', color: 'blue' },
  'application/pdf': { text: 'Unstructured', color: 'orange' },
  pdf: { text: 'Unstructured', color: 'orange' },
  documents: { text: 'Unstructured', color: 'orange' },
  images: { text: 'Unstructured', color: 'orange' },
  audio: { text: 'Unstructured', color: 'orange' },
  video: { text: 'Unstructured', color: 'orange' },
  binary: { text: 'Unstructured', color: 'orange' },
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
