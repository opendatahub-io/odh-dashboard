import {
  AUTORAG_UPLOAD_MAX_BYTES,
  AUTORAG_UPLOAD_MAX_FILES,
} from '~/app/utilities/dropzoneFileUpload';

describe('dropzoneFileUpload policy constants', () => {
  it('keeps the unified explorer upload limits', () => {
    expect(AUTORAG_UPLOAD_MAX_BYTES).toBe(32 * 1024 * 1024);
    expect(AUTORAG_UPLOAD_MAX_FILES).toBe(1);
  });
});
