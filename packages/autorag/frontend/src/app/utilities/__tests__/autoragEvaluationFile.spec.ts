import type { FileRejection } from 'react-dropzone';
import {
  AUTORAG_UPLOAD_MAX_BYTES,
  AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
  AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
} from '~/app/utilities/dropzoneFileUpload';
import {
  EVALUATION_FILE_ACCEPT,
  getEvaluationDropRejectedNotification,
  isAllowedEvaluationJsonFile,
} from '~/app/utilities/autoragEvaluationFile';

function rejection(file: File, errors: Array<{ code: string; message: string }>): FileRejection {
  return { file, errors };
}

describe('autoragEvaluationFile', () => {
  it('EVALUATION_FILE_ACCEPT includes application/json and text/json', () => {
    expect(EVALUATION_FILE_ACCEPT).toEqual({
      'application/json': ['.json'],
      'text/json': ['.json'],
    });
  });

  describe('isAllowedEvaluationJsonFile', () => {
    it('allows .json regardless of MIME type', () => {
      expect(
        isAllowedEvaluationJsonFile(
          new File(['{}'], 'data.json', { type: 'application/octet-stream' }),
        ),
      ).toBe(true);
    });

    it('allows extensionless file when type is application/json', () => {
      expect(
        isAllowedEvaluationJsonFile(new File(['{}'], 'eval-dataset', { type: 'application/json' })),
      ).toBe(true);
    });

    it('allows extensionless file when type is text/json', () => {
      expect(
        isAllowedEvaluationJsonFile(new File(['{}'], 'eval-dataset', { type: 'text/json' })),
      ).toBe(true);
    });

    it('rejects extensionless file with non-JSON MIME', () => {
      expect(
        isAllowedEvaluationJsonFile(
          new File(['{}'], 'eval-dataset', { type: 'application/octet-stream' }),
        ),
      ).toBe(false);
    });

    it('allows non-.json extension when MIME is application/json', () => {
      expect(
        isAllowedEvaluationJsonFile(new File(['{}'], 'readme.txt', { type: 'application/json' })),
      ).toBe(true);
    });

    it('rejects wrong extension and MIME', () => {
      expect(
        isAllowedEvaluationJsonFile(
          new File(['x'], 'run.exe', { type: 'application/octet-stream' }),
        ),
      ).toBe(false);
    });
  });

  describe('getEvaluationDropRejectedNotification', () => {
    it('returns null for empty rejections', () => {
      expect(getEvaluationDropRejectedNotification([])).toBeNull();
    });

    it('maps file-too-large', () => {
      const file = new File(['x'], 'big.json', { type: 'application/json' });
      expect(
        getEvaluationDropRejectedNotification([
          rejection(file, [{ code: 'file-too-large', message: 'too big' }]),
        ]),
      ).toEqual({
        title: 'File too large',
        description: AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
      });
    });

    it('maps too-many-files', () => {
      const file = new File(['{}'], 'a.json', { type: 'application/json' });
      expect(
        getEvaluationDropRejectedNotification([
          rejection(file, [{ code: 'too-many-files', message: 'nope' }]),
        ]),
      ).toEqual({
        title: 'Too many files',
        description: AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
      });
    });

    it('maps file-invalid-type', () => {
      const file = new File(['x'], 'a.exe', { type: 'application/octet-stream' });
      expect(
        getEvaluationDropRejectedNotification([
          rejection(file, [{ code: 'file-invalid-type', message: 'bad type' }]),
        ]),
      ).toEqual({
        title: 'Invalid file type',
        description: 'Evaluation dataset must be a JSON file (.json).',
      });
    });

    it('uses joined messages for unknown rejection codes', () => {
      const file = new File(['x'], 'x.json', { type: 'application/json' });
      expect(
        getEvaluationDropRejectedNotification([
          rejection(file, [
            { code: 'something-new', message: 'Custom msg' },
            { code: 'other', message: 'Second' },
          ]),
        ]),
      ).toEqual({
        title: 'File not accepted',
        description: 'Custom msg Second',
      });
    });

    it('falls back to filename detail when unknown code has empty messages', () => {
      const file = new File(['x'], 'weird-name', { type: 'application/json' });
      expect(
        getEvaluationDropRejectedNotification([
          rejection(file, [{ code: 'something-new', message: '' }]),
        ]),
      ).toEqual({
        title: 'File not accepted',
        description: '“weird-name” could not be added.',
      });
    });
  });

  describe('AUTORAG_UPLOAD_MAX_BYTES (evaluation upload limit)', () => {
    it('matches 32 MiB', () => {
      expect(AUTORAG_UPLOAD_MAX_BYTES).toBe(32 * 1024 * 1024);
    });
  });
});
