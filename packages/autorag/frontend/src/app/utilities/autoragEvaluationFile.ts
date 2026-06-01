import type { FileRejection } from 'react-dropzone';
import {
  type DropzoneFileRejectedNotification,
  AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
  AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
  getDropzoneFileRejectedNotification,
} from '~/app/utilities/dropzoneFileUpload';

/** MIME types and extensions for the evaluation dataset upload dropzone (react-dropzone `accept` format). */
export const EVALUATION_FILE_ACCEPT: Record<string, string[]> = {
  'application/json': ['.json'],
  'text/json': ['.json'],
};

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

export type EvaluationDropRejectedNotification = DropzoneFileRejectedNotification;

/**
 * Maps react-dropzone rejections to user-facing notification copy.
 * Unknown error codes fall back to joined dropzone messages or a filename-based detail.
 */
export function getEvaluationDropRejectedNotification(
  fileRejections: FileRejection[],
): EvaluationDropRejectedNotification | null {
  return getDropzoneFileRejectedNotification(fileRejections, {
    uploadTooLargeDetail: AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
    invalidFileTypeDescription: 'Evaluation dataset must be a JSON file (.json).',
    tooManyFilesDetail: AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
  });
}
