import type { FileRejection } from 'react-dropzone';

/** Matches MultipleFileUpload dropzone `maxSize` (32 MiB). */
export const AUTOML_TRAINING_UPLOAD_MAX_BYTES = 32 * 1024 * 1024;

export const AUTOML_TRAINING_UPLOAD_MAX_SIZE_MIB = AUTOML_TRAINING_UPLOAD_MAX_BYTES / (1024 * 1024);

export const AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL = `File size must be ${AUTOML_TRAINING_UPLOAD_MAX_SIZE_MIB} MiB or less.`;

/** Matches `maxFiles` on the training data upload dropzone. */
export const AUTOML_TRAINING_UPLOAD_MAX_FILES = 1;

export function formatTrainingDataTooManyFilesDetail(maxFiles: number): string {
  if (maxFiles === 1) {
    return 'Only one file can be uploaded at a time.';
  }
  return `Only ${maxFiles} files can be uploaded at a time.`;
}

export const AUTOML_TRAINING_UPLOAD_TOO_MANY_FILES_DETAIL = formatTrainingDataTooManyFilesDetail(
  AUTOML_TRAINING_UPLOAD_MAX_FILES,
);

/** MIME types and extensions for the training CSV upload dropzone (react-dropzone `accept` format). */
export const TRAINING_DATA_FILE_ACCEPT: Record<string, string[]> = {
  'text/csv': ['.csv'],
};

export const TRAINING_DATA_UPLOAD_NATIVE_ACCEPT = [
  ...new Set(Object.values(TRAINING_DATA_FILE_ACCEPT).flat()),
].join(',');

const TRAINING_DATA_INVALID_FILE_TYPE_DESCRIPTION = 'File type must be CSV.';

export type SingleFileDropOutcome =
  | { kind: 'noop' }
  | { kind: 'upload'; file: File }
  | { kind: 'reject'; fileRejections: FileRejection[] };

const TOO_MANY_FILES_REJECTION_ERROR = {
  code: 'too-many-files',
  message: 'Too many files',
} as const;

function combineAcceptedFilesAsRejections(acceptedFiles: File[]): FileRejection[] {
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

const KNOWN_TRAINING_REJECTIONS: Array<{
  code: string;
  title: string;
  description: string;
}> = [
  {
    code: 'file-too-large',
    title: 'File too large',
    description: AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL,
  },
  {
    code: 'too-many-files',
    title: 'Too many files',
    description: AUTOML_TRAINING_UPLOAD_TOO_MANY_FILES_DETAIL,
  },
  {
    code: 'file-invalid-type',
    title: 'Invalid file type',
    description: TRAINING_DATA_INVALID_FILE_TYPE_DESCRIPTION,
  },
];

function notificationForKnownTrainingRejectionCodes(
  codes: Set<string>,
): TrainingRejectedNotification {
  const matched = KNOWN_TRAINING_REJECTIONS.filter((entry) => codes.has(entry.code));
  if (matched.length === 0) {
    return null;
  }
  if (matched.length === 1) {
    return { title: matched[0].title, description: matched[0].description };
  }
  return {
    title: 'File not accepted',
    description: matched.map((entry) => entry.description).join(' '),
  };
}

function collectTrainingRejectionCodes(fileRejections: FileRejection[]): Set<string> {
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
 * Maps react-dropzone rejections to user-facing notification copy (same rules as AutoRAG uploads).
 * Aggregates known rejection codes across every rejected file.
 */
export function getTrainingDataDropRejectedNotification(
  fileRejections: FileRejection[],
): TrainingRejectedNotification {
  if (fileRejections.length === 0) {
    return null;
  }
  const codes = includeMultiFileDropLimit(
    collectTrainingRejectionCodes(fileRejections),
    fileRejections,
  );
  const known = notificationForKnownTrainingRejectionCodes(codes);
  if (known) {
    return known;
  }
  const { file, errors } = fileRejections[0];
  return {
    title: 'File not accepted',
    description: errors.map((e) => e.message).join(' ') || `“${file.name}” could not be added.`,
  };
}
