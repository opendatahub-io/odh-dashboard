import type { FileRejection } from 'react-dropzone';

/** Matches MultipleFileUpload dropzone `maxSize` (32 MiB). */
export const AUTOML_TRAINING_UPLOAD_MAX_BYTES = 32 * 1024 * 1024;

export const AUTOML_TRAINING_UPLOAD_MAX_SIZE_MIB = AUTOML_TRAINING_UPLOAD_MAX_BYTES / (1024 * 1024);

export const AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL = `File size must be ${AUTOML_TRAINING_UPLOAD_MAX_SIZE_MIB} MiB or less.`;

/** MIME types and extensions for the training CSV upload dropzone (react-dropzone `accept` format). */
export const TRAINING_DATA_FILE_ACCEPT: Record<string, string[]> = {
  'text/csv': ['.csv'],
};

export const TRAINING_DATA_UPLOAD_NATIVE_ACCEPT = [
  ...new Set(Object.values(TRAINING_DATA_FILE_ACCEPT).flat()),
].join(',');

const TRAINING_DATA_INVALID_FILE_TYPE_DESCRIPTION = 'File type must be CSV.';

/**
 * Client-side hint for UX only; file extensions and browser-reported MIME types can be spoofed.
 * The BFF must enforce limits independently.
 */
export function isAllowedTrainingDataUploadFile(file: File): boolean {
  const dot = file.name.lastIndexOf('.');
  const ext = dot === -1 ? '' : file.name.slice(dot).toLowerCase();
  if (ext) {
    for (const allowed of Object.values(TRAINING_DATA_FILE_ACCEPT).flat()) {
      if (allowed.toLowerCase() === ext) {
        return true;
      }
    }
  }
  return Boolean(file.type && file.type in TRAINING_DATA_FILE_ACCEPT);
}

type TrainingRejectedNotification = { title: string; description: string } | null;

/**
 * Maps react-dropzone rejections to user-facing notification copy (same rules as AutoRAG uploads).
 */
export function getTrainingDataDropRejectedNotification(
  fileRejections: FileRejection[],
): TrainingRejectedNotification {
  if (fileRejections.length === 0) {
    return null;
  }
  const { file, errors } = fileRejections[0];
  const codes = new Set(errors.map((e) => e.code));
  if (codes.has('file-too-large')) {
    return { title: 'File too large', description: AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL };
  }
  if (codes.has('too-many-files')) {
    return {
      title: 'Too many files',
      description: 'Only one file can be uploaded at a time.',
    };
  }
  if (codes.has('file-invalid-type')) {
    return {
      title: 'Invalid file type',
      description: TRAINING_DATA_INVALID_FILE_TYPE_DESCRIPTION,
    };
  }
  return {
    title: 'File not accepted',
    description: errors.map((e) => e.message).join(' ') || `“${file.name}” could not be added.`,
  };
}
