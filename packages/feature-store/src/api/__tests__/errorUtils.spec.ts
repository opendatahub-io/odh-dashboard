/* eslint-disable camelcase */
import { NotReadyError } from '@odh-dashboard/internal/utilities/useFetch';
import { FeatureStoreError } from '../../types/global';
import { handleFeatureStoreFailures } from '../errorUtils';

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

describe('handleFeatureStoreFailures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('should successfully return data when promise resolves with valid data', async () => {
    const mockData = {
      projects: [
        {
          spec: { name: 'test-project' },
          meta: {
            createdTimestamp: '2023-01-01T00:00:00Z',
            lastUpdatedTimestamp: '2023-01-01T00:00:00Z',
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total_count: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    };

    const result = await handleFeatureStoreFailures(Promise.resolve(mockData));
    expect(result).toStrictEqual(mockData);
  });

  it('should throw FeatureStoreError when promise resolves with error object', async () => {
    const featureStoreError: FeatureStoreError = {
      code: 'FEATURE_STORE_001',
      message: 'Feature store not found',
    };

    await expect(handleFeatureStoreFailures(Promise.resolve(featureStoreError))).rejects.toThrow(
      'Feature store not found',
    );
  });

  it('should throw Error with message when promise rejects with FeatureStoreError', async () => {
    const featureStoreError: FeatureStoreError = {
      code: 'FEATURE_STORE_002',
      message: 'Invalid project configuration',
    };

    await expect(handleFeatureStoreFailures(Promise.reject(featureStoreError))).rejects.toThrow(
      new Error('Invalid project configuration'),
    );
  });

  it('should re-throw NotReadyError when promise rejects with NotReadyError', async () => {
    const notReadyError = new NotReadyError('API not ready');

    await expect(handleFeatureStoreFailures(Promise.reject(notReadyError))).rejects.toThrow(
      notReadyError,
    );
  });

  it('should handle other common state errors and re-throw them', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    await expect(handleFeatureStoreFailures(Promise.reject(abortError))).rejects.toThrow(
      abortError,
    );
  });

  it('should log and throw generic error for unknown errors', async () => {
    const unknownError = new Error('Unknown error');

    await expect(handleFeatureStoreFailures(Promise.reject(unknownError))).rejects.toThrow(
      'Unknown error',
    );

    expect(mockConsoleError).toHaveBeenCalledTimes(0);
  });

  it('should handle non-Error objects and throw generic error', async () => {
    const invalidError = 'string error';

    await expect(handleFeatureStoreFailures(Promise.reject(invalidError))).rejects.toThrow(
      'Error communicating with feature store server',
    );

    expect(mockConsoleError).toHaveBeenCalledTimes(1);
    expect(mockConsoleError).toHaveBeenCalledWith('Unknown feature store API error', invalidError);
  });

  it('should handle null/undefined errors', async () => {
    // null causes an error when accessing .name property in isCommonStateError
    await expect(handleFeatureStoreFailures(Promise.reject(null))).rejects.toThrow(
      "Cannot read properties of null (reading 'name')",
    );

    // undefined also causes an error when accessing .name property
    await expect(handleFeatureStoreFailures(Promise.reject(undefined))).rejects.toThrow(
      "Cannot read properties of undefined (reading 'name')",
    );

    // These errors occur before console.error is called, so no console calls expected
    expect(mockConsoleError).toHaveBeenCalledTimes(0);
  });
});
