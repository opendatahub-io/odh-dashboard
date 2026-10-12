export const PLAYGROUND_DOCUMENT_EVENTS = {
  ATTACHED: 'Playground Document Attached',
  CONTENT_VIEWED: 'Playground Document Content Viewed',
  PROCESSING_FAILED: 'Playground Document Processing Failed',
} as const;

export type DocumentTrackingError =
  | 'unsupportedType'
  | 'fileTooLarge'
  | 'uploadFailed'
  | 'extractionFailed'
  | 'scannedFile'
  | 'timeout'
  | 'serviceUnavailable';

export type DocumentTrackingStage = 'clientValidation' | 'upload' | 'extraction';

const DOCUMENT_FILE_TYPES = new Set(['pdf', 'docx', 'pptx', 'txt', 'csv', 'md']);

// Only emit supported extensions. An arbitrary extension could contain user-entered text.
export const getDocumentTrackingFileType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  return DOCUMENT_FILE_TYPES.has(extension) ? extension : 'unknown';
};

export const classifyDocumentProcessingError = (
  error: unknown,
): { error: DocumentTrackingError; stage: DocumentTrackingStage } => {
  const structuredError =
    error && typeof error === 'object' && 'error' in error ? error.error : undefined;
  const code =
    structuredError &&
    typeof structuredError === 'object' &&
    'code' in structuredError &&
    typeof structuredError.code === 'string'
      ? structuredError.code.toLowerCase()
      : '';
  const message =
    structuredError &&
    typeof structuredError === 'object' &&
    'message' in structuredError &&
    typeof structuredError.message === 'string'
      ? structuredError.message.toLowerCase()
      : error instanceof Error
        ? error.message.toLowerCase()
        : '';
  const detail = `${code} ${message}`;

  if (detail.includes('scanned image')) {
    return { error: 'scannedFile', stage: 'extraction' };
  }
  if (detail.includes('unsupported') || detail.includes('invalid document content type')) {
    return { error: 'unsupportedType', stage: 'upload' };
  }
  if (detail.includes('too large') || detail.includes('request_entity_too_large')) {
    return { error: 'fileTooLarge', stage: 'upload' };
  }
  if (detail.includes('timeout') || detail.includes('timed out')) {
    return { error: 'timeout', stage: 'extraction' };
  }
  if (detail.includes('unavailable')) {
    return { error: 'serviceUnavailable', stage: 'extraction' };
  }
  if (
    detail.includes('extract') ||
    detail.includes('processing') ||
    detail.includes('readable text')
  ) {
    return { error: 'extractionFailed', stage: 'extraction' };
  }
  return { error: 'uploadFailed', stage: 'upload' };
};
