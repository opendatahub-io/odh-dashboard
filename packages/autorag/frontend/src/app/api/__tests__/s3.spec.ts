import { handleRestFailures, restCREATE } from 'mod-arch-core';
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

const mockRestCREATE = jest.mocked(restCREATE);
const mockHandleRestFailures = jest.mocked(handleRestFailures);

describe('uploadFileToS3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw for empty key', async () => {
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    await expect(
      uploadFileToS3('', { namespace: 'ns', secretName: 'secret', key: '' }, file),
    ).rejects.toThrow('Upload key must be a non-empty string');
    expect(mockRestCREATE).not.toHaveBeenCalled();
    expect(mockHandleRestFailures).not.toHaveBeenCalled();
  });

  it('should throw for whitespace-only key', async () => {
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    await expect(
      uploadFileToS3('', { namespace: 'ns', secretName: 'secret', key: '   ' }, file),
    ).rejects.toThrow('Upload key must be a non-empty string');
    expect(mockRestCREATE).not.toHaveBeenCalled();
    expect(mockHandleRestFailures).not.toHaveBeenCalled();
  });
});
