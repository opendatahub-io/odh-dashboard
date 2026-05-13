import type { FileRejection } from 'react-dropzone';
import {
  AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
  getDropzoneFileRejectedNotification,
} from '~/app/utilities/dropzoneFileUpload';

function rejection(file: File, errors: Array<{ code: string; message: string }>): FileRejection {
  return { file, errors };
}

const TEST_COPY = {
  uploadTooLargeDetail: AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
  invalidFileTypeDescription: 'Invalid for test.',
};

describe('dropzoneFileUpload', () => {
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
        description: 'Only one file can be uploaded at a time.',
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
