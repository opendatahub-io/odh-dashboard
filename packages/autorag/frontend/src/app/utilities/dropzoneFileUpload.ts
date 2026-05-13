import type { FileRejection } from 'react-dropzone';

/** Matches BFF upload limit and knowledge-document / evaluation dropzones (`32 MiB`). */
export const AUTORAG_UPLOAD_MAX_BYTES = 32 * 1024 * 1024;

export const AUTORAG_UPLOAD_MAX_SIZE_MIB = AUTORAG_UPLOAD_MAX_BYTES / (1024 * 1024);

export const AUTORAG_UPLOAD_TOO_LARGE_DETAIL = `File size must be ${AUTORAG_UPLOAD_MAX_SIZE_MIB} MiB or less.`;

export type DropzoneFileRejectedCopy = {
  uploadTooLargeDetail: string;
  invalidFileTypeDescription: string;
};

export type DropzoneFileRejectedNotification = {
  title: string;
  description: string;
};

/**
 * Maps react-dropzone rejections to user-facing notification copy.
 * Unknown error codes fall back to joined dropzone messages or a filename-based detail.
 */
export function getDropzoneFileRejectedNotification(
  fileRejections: FileRejection[],
  copy: DropzoneFileRejectedCopy,
): DropzoneFileRejectedNotification | null {
  if (fileRejections.length === 0) {
    return null;
  }
  const { file, errors } = fileRejections[0];
  const codes = new Set(errors.map((e) => e.code));
  if (codes.has('file-too-large')) {
    return { title: 'File too large', description: copy.uploadTooLargeDetail };
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
      description: copy.invalidFileTypeDescription,
    };
  }
  return {
    title: 'File not accepted',
    description: errors.map((e) => e.message).join(' ') || `“${file.name}” could not be added.`,
  };
}
