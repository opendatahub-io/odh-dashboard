import { AUTORAG_UPLOAD_MAX_BYTES } from '~/app/utilities/dropzoneFileUpload';
import {
  EVALUATION_FILE_ACCEPT,
  isAllowedEvaluationJsonFile,
} from '~/app/utilities/autoragEvaluationFile';

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

  describe('AUTORAG_UPLOAD_MAX_BYTES (evaluation upload limit)', () => {
    it('matches 32 MiB', () => {
      expect(AUTORAG_UPLOAD_MAX_BYTES).toBe(32 * 1024 * 1024);
    });
  });
});
