import type { FileRejection } from 'react-dropzone';
import {
  AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL,
  AUTOML_TRAINING_UPLOAD_TOO_MANY_FILES_DETAIL,
  getTrainingDataDropRejectedNotification,
  isAllowedTrainingDataUploadFile,
  resolveSingleFileDropOutcome,
} from '~/app/utilities/automlTrainingDataFile';

function rejection(file: File, errors: Array<{ code: string; message: string }>): FileRejection {
  return { file, errors };
}

describe('automlTrainingDataFile', () => {
  describe('resolveSingleFileDropOutcome', () => {
    it('rejects the whole drop when one valid and one invalid file are dropped', () => {
      const valid = new File(['a,b'], 'data.csv', { type: 'text/csv' });
      const invalid = new File(['x'], 'run.exe', { type: 'application/octet-stream' });
      const outcome = resolveSingleFileDropOutcome(
        [valid],
        [{ file: invalid, errors: [{ code: 'file-invalid-type', message: 'bad' }] }],
      );
      expect(outcome.kind).toBe('reject');
    });
  });

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

    it('maps too-many-files', () => {
      const file = new File(['a,b'], 'a.csv', { type: 'text/csv' });
      expect(
        getTrainingDataDropRejectedNotification([
          rejection(file, [{ code: 'too-many-files', message: 'too many' }]),
        ]),
      ).toEqual({
        title: 'Too many files',
        description: AUTOML_TRAINING_UPLOAD_TOO_MANY_FILES_DETAIL,
      });
    });

    it('combines descriptions when one file has multiple known rejection codes', () => {
      const file = new File(['x'], 'big.exe', { type: 'application/octet-stream' });
      expect(
        getTrainingDataDropRejectedNotification([
          rejection(file, [
            { code: 'file-too-large', message: 'too big' },
            { code: 'file-invalid-type', message: 'bad type' },
          ]),
        ]),
      ).toEqual({
        title: 'File not accepted',
        description: `${AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL} File type must be CSV.`,
      });
    });

    it('aggregates known codes across multiple rejected files', () => {
      const first = new File(['x'], 'a.sh', { type: 'application/octet-stream' });
      const second = new File(['x'], 'b.sh', { type: 'application/octet-stream' });
      expect(
        getTrainingDataDropRejectedNotification([
          rejection(first, [{ code: 'file-invalid-type', message: 'bad type' }]),
          rejection(second, [{ code: 'too-many-files', message: 'too many' }]),
        ]),
      ).toEqual({
        title: 'File not accepted',
        description: `${AUTOML_TRAINING_UPLOAD_TOO_MANY_FILES_DETAIL} File type must be CSV.`,
      });
    });

    it('includes one-file limit when multiple files are rejected with only invalid type', () => {
      const first = new File(['x'], 'a.sh', { type: 'application/octet-stream' });
      const second = new File(['x'], 'b.sh', { type: 'application/octet-stream' });
      expect(
        getTrainingDataDropRejectedNotification([
          rejection(first, [{ code: 'file-invalid-type', message: 'bad type' }]),
          rejection(second, [{ code: 'file-invalid-type', message: 'bad type' }]),
        ]),
      ).toEqual({
        title: 'File not accepted',
        description: `${AUTOML_TRAINING_UPLOAD_TOO_MANY_FILES_DETAIL} File type must be CSV.`,
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
