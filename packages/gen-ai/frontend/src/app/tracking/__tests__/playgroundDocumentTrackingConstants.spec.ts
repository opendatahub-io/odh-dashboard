import {
  classifyDocumentProcessingError,
  getDocumentTrackingFileType,
} from '~/app/tracking/playgroundDocumentTrackingConstants';

describe('document tracking properties', () => {
  it('only exposes supported file types', () => {
    expect(getDocumentTrackingFileType('quarterly.results.PDF')).toBe('pdf');
    expect(getDocumentTrackingFileType('private-description')).toBe('unknown');
    expect(getDocumentTrackingFileType('notes.secret')).toBe('unknown');
  });

  it('classifies structured extraction errors without sending their message', () => {
    expect(
      classifyDocumentProcessingError({
        error: { code: 'invalid_document', message: 'This PDF contains scanned images of Ada' },
      }),
    ).toEqual({ error: 'scannedFile', stage: 'extraction' });
    expect(classifyDocumentProcessingError(new Error('request timed out'))).toEqual({
      error: 'timeout',
      stage: 'extraction',
    });
    expect(classifyDocumentProcessingError(new Error('network disconnected'))).toEqual({
      error: 'uploadFailed',
      stage: 'upload',
    });
  });
});
