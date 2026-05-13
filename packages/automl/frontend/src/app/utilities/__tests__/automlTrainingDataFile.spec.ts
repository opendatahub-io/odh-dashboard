import type { FileRejection } from 'react-dropzone';
import {
  AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL,
  getTrainingDataDropRejectedNotification,
  isAllowedTrainingDataUploadFile,
} from '~/app/utilities/automlTrainingDataFile';

function rejection(file: File, errors: Array<{ code: string; message: string }>): FileRejection {
  return { file, errors };
}

describe('automlTrainingDataFile', () => {
  describe('isAllowedTrainingDataUploadFile', () => {
    it('allows CSV by extension', () => {
      expect(
        isAllowedTrainingDataUploadFile(new File(['a,b'], 'data.csv', { type: 'text/csv' })),
      ).toBe(true);
    });

    it('allows text/csv MIME without matching extension in name', () => {
      expect(
        isAllowedTrainingDataUploadFile(new File(['a,b'], 'dataset', { type: 'text/csv' })),
      ).toBe(true);
    });

    it('rejects non-CSV', () => {
      expect(
        isAllowedTrainingDataUploadFile(new File(['x'], 'data.json', { type: 'application/json' })),
      ).toBe(false);
    });
  });

  describe('getTrainingDataDropRejectedNotification', () => {
    it('uses CSV invalid type copy', () => {
      const file = new File(['x'], 'a.txt', { type: 'text/plain' });
      expect(
        getTrainingDataDropRejectedNotification([
          rejection(file, [{ code: 'file-invalid-type', message: 'bad' }]),
        ]),
      ).toEqual({
        title: 'Invalid file type',
        description: 'File type must be CSV.',
      });
    });

    it('uses training too-large detail', () => {
      const file = new File(['x'], 'big.csv', { type: 'text/csv' });
      expect(
        getTrainingDataDropRejectedNotification([
          rejection(file, [{ code: 'file-too-large', message: 'too big' }]),
        ]),
      ).toEqual({
        title: 'File too large',
        description: AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL,
      });
    });

    it('falls back for unknown codes', () => {
      const file = new File(['x'], 'x.csv', { type: 'text/csv' });
      expect(
        getTrainingDataDropRejectedNotification([
          rejection(file, [{ code: 'custom', message: 'Nope' }]),
        ]),
      ).toEqual({
        title: 'File not accepted',
        description: 'Nope',
      });
    });
  });
});
