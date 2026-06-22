import type { FileRejection } from 'react-dropzone';
import { AUTORAG_UPLOAD_TOO_LARGE_DETAIL } from '~/app/utilities/dropzoneFileUpload';
import {
  getInputDataDropRejectedNotification,
  INPUT_DATA_INVALID_FILE_TYPE_DESCRIPTION,
  isAllowedInputDataUploadFile,
} from '~/app/utilities/autoragInputDataFile';

function rejection(file: File, errors: Array<{ code: string; message: string }>): FileRejection {
  return { file, errors };
}

describe('autoragInputDataFile', () => {
  describe('isAllowedInputDataUploadFile', () => {
    it('allows PDF by extension even when MIME is generic', () => {
      expect(
        isAllowedInputDataUploadFile(
          new File(['%PDF'], 'doc.pdf', { type: 'application/octet-stream' }),
        ),
      ).toBe(true);
    });

    it('allows matching MIME when extension is missing', () => {
      expect(
        isAllowedInputDataUploadFile(new File(['hello'], 'notes', { type: 'text/plain' })),
      ).toBe(true);
    });

    it('rejects unknown extension and MIME', () => {
      expect(
        isAllowedInputDataUploadFile(
          new File(['x'], 'run.exe', { type: 'application/octet-stream' }),
        ),
      ).toBe(false);
    });
  });

  describe('getInputDataDropRejectedNotification', () => {
    it('uses knowledge-document invalid type copy', () => {
      const file = new File(['x'], 'a.exe', { type: 'application/octet-stream' });
      expect(
        getInputDataDropRejectedNotification([
          rejection(file, [{ code: 'file-invalid-type', message: 'bad' }]),
        ]),
      ).toEqual({
        title: 'Invalid file type',
        description: INPUT_DATA_INVALID_FILE_TYPE_DESCRIPTION,
      });
    });

    it('uses shared too-large detail', () => {
      const file = new File(['x'], 'big.pdf', { type: 'application/pdf' });
      expect(
        getInputDataDropRejectedNotification([
          rejection(file, [{ code: 'file-too-large', message: 'too big' }]),
        ]),
      ).toEqual({
        title: 'File too large',
        description: AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
      });
    });
  });
});
