import type { FileRejection } from 'react-dropzone';

/** Matches BFF upload limit and knowledge-document / evaluation dropzones (`32 MiB`). */
export const AUTORAG_UPLOAD_MAX_BYTES = 32 * 1024 * 1024;

export const AUTORAG_UPLOAD_MAX_SIZE_MIB = AUTORAG_UPLOAD_MAX_BYTES / (1024 * 1024);

export const AUTORAG_UPLOAD_TOO_LARGE_DETAIL = `File size must be ${AUTORAG_UPLOAD_MAX_SIZE_MIB} MiB or less.`;

/** Matches `maxFiles` on knowledge-document and evaluation upload dropzones. */
export const AUTORAG_UPLOAD_MAX_FILES = 1;

export function formatDropzoneTooManyFilesDetail(maxFiles: number): string {
  if (maxFiles === 1) {
    return 'Only one file can be uploaded at a time.';
  }
  return `Only ${maxFiles} files can be uploaded at a time.`;
}

export const AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL =
  formatDropzoneTooManyFilesDetail(AUTORAG_UPLOAD_MAX_FILES);

export type DropzoneFileRejectedCopy = {
  uploadTooLargeDetail: string;
  invalidFileTypeDescription: string;
  tooManyFilesDetail: string;
};

export type DropzoneFileRejectedNotification = {
  title: string;
  description: string;
};

export type SingleFileDropOutcome =
  | { kind: 'noop' }
  | { kind: 'upload'; file: File }
  | { kind: 'reject'; fileRejections: FileRejection[] };

const TOO_MANY_FILES_REJECTION_ERROR = {
  code: 'too-many-files',
  message: 'Too many files',
} as const;

/** Builds rejection entries for accepted files when a multi-file drop must be blocked entirely. */
export function combineAcceptedFilesAsRejections(acceptedFiles: File[]): FileRejection[] {
  return acceptedFiles.map((file) => ({
    file,
    errors: [TOO_MANY_FILES_REJECTION_ERROR],
  }));
}

/**
 * Decides whether a single-file dropzone (`maxFiles: 1`) should upload, reject, or ignore a drop.
 * Rejects the whole drop when more than one file was provided, including a mix of valid and invalid
 * files (react-dropzone otherwise accepts the valid file and only rejects the rest).
 */
export function resolveSingleFileDropOutcome(
  acceptedFiles: File[],
  fileRejections: FileRejection[],
): SingleFileDropOutcome {
  const totalDropped = acceptedFiles.length + fileRejections.length;
  if (totalDropped === 0) {
    return { kind: 'noop' };
  }
  if (totalDropped > 1) {
    return {
      kind: 'reject',
      fileRejections: [...fileRejections, ...combineAcceptedFilesAsRejections(acceptedFiles)],
    };
  }
  if (fileRejections.length > 0) {
    return { kind: 'reject', fileRejections };
  }
  return { kind: 'upload', file: acceptedFiles[0] };
}

const KNOWN_REJECTIONS: Array<{
  code: string;
  title: string;
  getDescription: (copy: DropzoneFileRejectedCopy) => string;
}> = [
  {
    code: 'file-too-large',
    title: 'File too large',
    getDescription: (c) => c.uploadTooLargeDetail,
  },
  {
    code: 'too-many-files',
    title: 'Too many files',
    getDescription: (c) => c.tooManyFilesDetail,
  },
  {
    code: 'file-invalid-type',
    title: 'Invalid file type',
    getDescription: (c) => c.invalidFileTypeDescription,
  },
];

function notificationForKnownRejectionCodes(
  codes: Set<string>,
  copy: DropzoneFileRejectedCopy,
): DropzoneFileRejectedNotification | null {
  const matched = KNOWN_REJECTIONS.filter((entry) => codes.has(entry.code));
  if (matched.length === 0) {
    return null;
  }
  const descriptions = matched.map((entry) => entry.getDescription(copy));
  if (matched.length === 1) {
    return { title: matched[0].title, description: descriptions[0] };
  }
  return {
    title: 'File not accepted',
    description: descriptions.join(' '),
  };
}

function collectRejectionCodes(fileRejections: FileRejection[]): Set<string> {
  const codes = new Set<string>();
  for (const { errors } of fileRejections) {
    for (const error of errors) {
      codes.add(error.code);
    }
  }
  return codes;
}

/**
 * react-dropzone only emits `too-many-files` when multiple files would be accepted. If every file
 * fails validation (e.g. two `.sh` files on a single-file zone), each rejection is only
 * `file-invalid-type` — surface the one-file limit anyway when multiple files were dropped.
 */
function includeMultiFileDropLimit(
  codes: Set<string>,
  fileRejections: FileRejection[],
): Set<string> {
  if (fileRejections.length <= 1) {
    return codes;
  }
  const withLimit = new Set(codes);
  withLimit.add('too-many-files');
  return withLimit;
}

/**
 * Maps react-dropzone rejections to user-facing notification copy.
 * Aggregates known rejection codes across every rejected file. When more than one file is
 * rejected on a single-file dropzone, includes the one-file limit even if react-dropzone did not
 * emit `too-many-files` (common when all dropped files fail type validation).
 * Unknown error codes fall back to the first rejected file's messages or a filename-based detail.
 */
export function getDropzoneFileRejectedNotification(
  fileRejections: FileRejection[],
  copy: DropzoneFileRejectedCopy,
): DropzoneFileRejectedNotification | null {
  if (fileRejections.length === 0) {
    return null;
  }
  const codes = includeMultiFileDropLimit(collectRejectionCodes(fileRejections), fileRejections);
  const known = notificationForKnownRejectionCodes(codes, copy);
  if (known) {
    return known;
  }
  const { file, errors } = fileRejections[0];
  return {
    title: 'File not accepted',
    description: errors.map((e) => e.message).join(' ') || `“${file.name}” could not be added.`,
  };
}
