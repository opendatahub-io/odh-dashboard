/** Matches the unified explorer upload limit (32 MiB). */
export const AUTOML_TRAINING_UPLOAD_MAX_BYTES = 32 * 1024 * 1024;

/** Matches the unified explorer upload count limit. */
export const AUTOML_TRAINING_UPLOAD_MAX_FILES = 1;

/** MIME types and extensions for the training CSV upload policy. */
export const TRAINING_DATA_FILE_ACCEPT: Record<string, string[]> = {
  'text/csv': ['.csv'],
};

export const TRAINING_DATA_UPLOAD_NATIVE_ACCEPT = [
  ...new Set(Object.values(TRAINING_DATA_FILE_ACCEPT).flat()),
].join(',');

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
