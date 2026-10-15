/** MIME types and extensions for the evaluation dataset upload policy. */
export const EVALUATION_FILE_ACCEPT: Record<string, string[]> = {
  'application/json': ['.json'],
  'text/json': ['.json'],
};

export const EVALUATION_FILE_NATIVE_ACCEPT = '.json,application/json,text/json';

/**
 * Client-side hint for UX only; file extensions and browser-reported MIME types can be spoofed.
 * The BFF must enforce limits and validate evaluation payloads independently (see upload/storage handlers).
 */
export function isAllowedEvaluationJsonFile(file: File): boolean {
  const dot = file.name.lastIndexOf('.');
  const ext = dot === -1 ? '' : file.name.slice(dot).toLowerCase();
  if (ext) {
    for (const allowed of Object.values(EVALUATION_FILE_ACCEPT).flat()) {
      if (allowed.toLowerCase() === ext) {
        return true;
      }
    }
  }
  return Boolean(file.type && file.type in EVALUATION_FILE_ACCEPT);
}
