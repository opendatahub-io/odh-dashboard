import { uploadFileToS3 } from '~/app/api/s3';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/autorag',
  BFF_API_VERSION: 'v1',
}));

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn(),
  restCREATE: jest.fn(),
  isModArchResponse: jest.fn(),
}));

describe('uploadFileToS3', () => {
  it('should throw for empty key', async () => {
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    await expect(
      uploadFileToS3('', { namespace: 'ns', secretName: 'secret', key: '' }, file),
    ).rejects.toThrow('Upload key must be a non-empty string');
  });

  it('should throw for whitespace-only key', async () => {
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    await expect(
      uploadFileToS3('', { namespace: 'ns', secretName: 'secret', key: '   ' }, file),
    ).rejects.toThrow('Upload key must be a non-empty string');
  });
});
