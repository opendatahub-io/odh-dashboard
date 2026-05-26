import type { FileRejection } from 'react-dropzone';
import {
  AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
  AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
  formatDropzoneTooManyFilesDetail,
  getDropzoneFileRejectedNotification,
  resolveSingleFileDropOutcome,
} from '~/app/utilities/dropzoneFileUpload';

function rejection(file: File, errors: Array<{ code: string; message: string }>): FileRejection {
  return { file, errors };
}

const TEST_COPY = {
  uploadTooLargeDetail: AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
  invalidFileTypeDescription: 'Invalid for test.',
  tooManyFilesDetail: AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
};

describe('dropzoneFileUpload', () => {
  describe('formatDropzoneTooManyFilesDetail', () => {
    it('uses singular copy when maxFiles is 1', () => {
      expect(formatDropzoneTooManyFilesDetail(1)).toBe(AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL);
    });

    it('uses plural copy when maxFiles is greater than 1', () => {
      expect(formatDropzoneTooManyFilesDetail(3)).toBe('Only 3 files can be uploaded at a time.');
    });
  });

  describe('resolveSingleFileDropOutcome', () => {
    it('uploads when a single file is accepted', () => {
      const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
      expect(resolveSingleFileDropOutcome([file], [])).toEqual({ kind: 'upload', file });
    });

    it('rejects the whole drop when one valid and one invalid file are dropped', () => {
      const valid = new File(['x'], 'notes.txt', { type: 'text/plain' });
      const invalid = new File(['x'], 'run.exe', { type: 'application/octet-stream' });
      const outcome = resolveSingleFileDropOutcome(
        [valid],
        [{ file: invalid, errors: [{ code: 'file-invalid-type', message: 'bad' }] }],
      );
      expect(outcome.kind).toBe('reject');
      if (outcome.kind === 'reject') {
        expect(outcome.fileRejections).toHaveLength(2);
        expect(outcome.fileRejections.map((r) => r.file)).toEqual([invalid, valid]);
      }
    });
  });

  describe('getDropzoneFileRejectedNotification', () => {
    it('returns null for empty rejections', () => {
      expect(getDropzoneFileRejectedNotification([], TEST_COPY)).toBeNull();
    });

    it('maps file-too-large using copy.uploadTooLargeDetail', () => {
      const file = new File(['x'], 'big.bin', { type: 'application/octet-stream' });
      expect(
        getDropzoneFileRejectedNotification(
          [rejection(file, [{ code: 'file-too-large', message: 'too big' }])],
          TEST_COPY,
        ),
      ).toEqual({
        title: 'File too large',
        description: AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
      });
    });

    it('maps too-many-files', () => {
      const file = new File(['x'], 'a', { type: 'application/octet-stream' });
      expect(
        getDropzoneFileRejectedNotification(
          [rejection(file, [{ code: 'too-many-files', message: 'nope' }])],
          TEST_COPY,
        ),
      ).toEqual({
        title: 'Too many files',
        description: AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
      });
    });

    it('maps file-invalid-type using copy.invalidFileTypeDescription', () => {
      const file = new File(['x'], 'a.exe', { type: 'application/octet-stream' });
      expect(
        getDropzoneFileRejectedNotification(
          [rejection(file, [{ code: 'file-invalid-type', message: 'bad' }])],
          TEST_COPY,
        ),
      ).toEqual({
        title: 'Invalid file type',
        description: 'Invalid for test.',
      });
    });

    it('combines descriptions when one file has multiple known rejection codes', () => {
      const file = new File(['x'], 'big.exe', { type: 'application/octet-stream' });
      expect(
        getDropzoneFileRejectedNotification(
          [
            rejection(file, [
              { code: 'file-too-large', message: 'too big' },
              { code: 'file-invalid-type', message: 'bad type' },
            ]),
          ],
          TEST_COPY,
        ),
      ).toEqual({
        title: 'File not accepted',
        description: `${AUTORAG_UPLOAD_TOO_LARGE_DETAIL} Invalid for test.`,
      });
    });

    it('aggregates known codes across multiple rejected files', () => {
      const first = new File(['x'], 'a.sh', { type: 'application/octet-stream' });
      const second = new File(['x'], 'b.sh', { type: 'application/octet-stream' });
      expect(
        getDropzoneFileRejectedNotification(
          [
            rejection(first, [{ code: 'file-invalid-type', message: 'bad type' }]),
            rejection(second, [{ code: 'too-many-files', message: 'too many' }]),
          ],
          TEST_COPY,
        ),
      ).toEqual({
        title: 'File not accepted',
        description: `${AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL} Invalid for test.`,
      });
    });

    it('includes one-file limit when multiple files are rejected with only invalid type', () => {
      const first = new File(['x'], 'a.sh', { type: 'application/octet-stream' });
      const second = new File(['x'], 'b.sh', { type: 'application/octet-stream' });
      expect(
        getDropzoneFileRejectedNotification(
          [
            rejection(first, [{ code: 'file-invalid-type', message: 'bad type' }]),
            rejection(second, [{ code: 'file-invalid-type', message: 'bad type' }]),
          ],
          TEST_COPY,
        ),
      ).toEqual({
        title: 'File not accepted',
        description: `${AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL} Invalid for test.`,
      });
    });

    it('uses joined messages for unknown rejection codes', () => {
      const file = new File(['x'], 'x', { type: 'application/octet-stream' });
      expect(
        getDropzoneFileRejectedNotification(
          [
            rejection(file, [
              { code: 'something-new', message: 'Custom msg' },
              { code: 'other', message: 'Second' },
            ]),
          ],
          TEST_COPY,
        ),
      ).toEqual({
        title: 'File not accepted',
        description: 'Custom msg Second',
      });
    });

    it('falls back to filename detail when unknown code has empty messages', () => {
      const file = new File(['x'], 'weird-name', { type: 'application/octet-stream' });
      expect(
        getDropzoneFileRejectedNotification(
          [rejection(file, [{ code: 'something-new', message: '' }])],
          TEST_COPY,
        ),
      ).toEqual({
        title: 'File not accepted',
        description: '“weird-name” could not be added.',
      });
    });
  });
});
