// Modules -------------------------------------------------------------------->

import type { FileRejection } from 'react-dropzone';
import {
  type DropzoneFileRejectedNotification,
  AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
  AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
  getDropzoneFileRejectedNotification,
} from '~/app/utilities/dropzoneFileUpload';

// Types ---------------------------------------------------------------------->

// Globals -------------------------------------------------------------------->

export const SUPPORTED_FORMAT = {
  pdf: {
    extension: 'pdf',
    mimeType: 'application/pdf',
    name: 'PDF',
  },
  docx: {
    extension: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    name: 'DOCX',
  },
  pptx: {
    extension: 'pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    name: 'PPTX',
  },
  md: {
    extension: 'md',
    mimeType: 'text/markdown',
    name: 'Markdown',
  },
  markdown: {
    extension: 'markdown',
    mimeType: 'text/markdown',
    name: 'Markdown',
  },
  html: {
    extension: 'html',
    mimeType: 'text/html',
    name: 'HTML',
  },
  htm: {
    extension: 'htm',
    mimeType: 'text/html',
    name: 'HTML',
  },
  txt: {
    extension: 'txt',
    mimeType: 'text/plain',
    name: 'Plain text',
  },
};
const SUPPORTED_FORMAT_LIST = Object.values(SUPPORTED_FORMAT);

export const SUPPORTED_FORMAT_EXTENSIONS = SUPPORTED_FORMAT_LIST.map((f) => f.extension);
export const SUPPORTED_FORMAT_NAMES = [...new Set(SUPPORTED_FORMAT_LIST.map((f) => f.name))];
export const SUPPORTED_FORMAT_NAMES_STRING_SIMPLE = SUPPORTED_FORMAT_NAMES.join(', ');
export const SUPPORTED_FORMAT_NAMES_STRING_OR = `${SUPPORTED_FORMAT_NAMES.slice(0, -1).join(', ')}, or ${SUPPORTED_FORMAT_NAMES.at(-1)}`;
export const SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION: Record<string, string[]> =
  Object.fromEntries(
    SUPPORTED_FORMAT_LIST.reduce<Map<string, string[]>>((map, { mimeType, extension }) => {
      const exts = map.get(mimeType) ?? [];
      exts.push(`.${extension}`);
      map.set(mimeType, exts);
      return map;
    }, new Map()),
  );
export const SUPPORTED_FORMAT_HINT = `You can only select ${SUPPORTED_FORMAT_NAMES_STRING_OR} files`;

/** MIME types and extensions for the knowledge document upload dropzone (react-dropzone `accept` format). */
export const INPUT_DATA_FILE_ACCEPT: Record<string, string[]> =
  SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION;

export const INPUT_DATA_UPLOAD_NATIVE_ACCEPT = [
  ...new Set(Object.values(INPUT_DATA_FILE_ACCEPT).flat()),
].join(',');

export const INPUT_DATA_INVALID_FILE_TYPE_DESCRIPTION = `File type must be one of the accepted types (${SUPPORTED_FORMAT_NAMES_STRING_SIMPLE}).`;

// Functions ------------------------------------------------------------------>

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
