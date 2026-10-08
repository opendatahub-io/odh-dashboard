import {
  AUTOML_TRAINING_UPLOAD_MAX_BYTES,
  AUTOML_TRAINING_UPLOAD_MAX_FILES,
  isAllowedTrainingDataUploadFile,
  TRAINING_DATA_UPLOAD_NATIVE_ACCEPT,
} from '~/app/utilities/automlTrainingDataFile';

describe('automlTrainingDataFile', () => {
  it('provides the unified explorer CSV upload policy', () => {
    expect(AUTOML_TRAINING_UPLOAD_MAX_BYTES).toBe(32 * 1024 * 1024);
    expect(AUTOML_TRAINING_UPLOAD_MAX_FILES).toBe(1);
    expect(TRAINING_DATA_UPLOAD_NATIVE_ACCEPT).toBe('.csv');
  });

  describe('isAllowedTrainingDataUploadFile', () => {
    it('allows CSV by extension', () => {
      expect(isAllowedTrainingDataUploadFile(new File(['a,b'], 'data.csv'))).toBe(true);
    });

    it('allows text/csv MIME without a matching extension', () => {
      expect(
        isAllowedTrainingDataUploadFile(new File(['a,b'], 'dataset', { type: 'text/csv' })),
      ).toBe(true);
    });

    it('rejects non-CSV files', () => {
      expect(
        isAllowedTrainingDataUploadFile(new File(['x'], 'data.json', { type: 'application/json' })),
      ).toBe(false);
    });
  });
});
