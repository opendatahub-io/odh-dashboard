import type { FileRejection } from 'react-dropzone';
import {
  type DropzoneFileRejectedNotification,
  AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
  AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
  getDropzoneFileRejectedNotification,
} from '~/app/utilities/dropzoneFileUpload';

/** MIME types and extensions for the knowledge document upload dropzone (react-dropzone `accept` format). */
export const INPUT_DATA_FILE_ACCEPT: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/markdown': ['.md', '.markdown'],
  'text/html': ['.html', '.htm'],
  'text/plain': ['.txt'],
};

export const INPUT_DATA_UPLOAD_NATIVE_ACCEPT = [
  ...new Set(Object.values(INPUT_DATA_FILE_ACCEPT).flat()),
].join(',');

export const INPUT_DATA_INVALID_FILE_TYPE_DESCRIPTION =
  'File type must be one of the accepted types (PDF, DOCX, PPTX, Markdown, HTML, Plain text).';

/**
 * Client-side hint for UX only; file extensions and browser-reported MIME types can be spoofed.
 * The BFF must enforce limits independently.
 */
export function isAllowedInputDataUploadFile(file: File): boolean {
  const dot = file.name.lastIndexOf('.');
  const ext = dot === -1 ? '' : file.name.slice(dot).toLowerCase();
  if (ext) {
    for (const allowed of Object.values(INPUT_DATA_FILE_ACCEPT).flat()) {
      if (allowed.toLowerCase() === ext) {
        return true;
      }
    }
  }
  return Boolean(file.type && file.type in INPUT_DATA_FILE_ACCEPT);
}

export function getInputDataDropRejectedNotification(
  fileRejections: FileRejection[],
): DropzoneFileRejectedNotification | null {
  return getDropzoneFileRejectedNotification(fileRejections, {
    uploadTooLargeDetail: AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
    invalidFileTypeDescription: INPUT_DATA_INVALID_FILE_TYPE_DESCRIPTION,
    tooManyFilesDetail: AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
  });
}
