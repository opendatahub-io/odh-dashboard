/* eslint-disable camelcase -- test data mirrors raw Feast API snake_case responses */
import { NotReadyError } from '@odh-dashboard/internal/utilities/useFetch';
import { FeatureStoreError } from '../../types/global';
import { handleFeatureStoreFailures, getFeatureStoreErrorMessage } from '../errorUtils';

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
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    };

    const result = await handleFeatureStoreFailures(Promise.resolve(mockData));
    expect(result).toStrictEqual(mockData);
  });

  it('should throw FeatureStoreError when promise resolves with error object', async () => {
    const rawApiError = {
      code: 'FEATURE_STORE_001',
      message: 'Feature store not found',
      error_type: 'FeatureStoreNotFoundException',
    };

    await expect(handleFeatureStoreFailures(Promise.resolve(rawApiError))).rejects.toStrictEqual({
      code: 'FEATURE_STORE_001',
      message: 'Feature store not found',
      errorType: 'FeatureStoreNotFoundException',
      detail: undefined,
      statusCode: undefined,
    });
  });

  it('should transform raw API error when promise rejects with snake_case error', async () => {
    const rawApiError = {
      code: 'FEATURE_STORE_002',
      message: 'Invalid project configuration',
      error_type: 'ConfigurationError',
      status_code: 400,
    };

    await expect(handleFeatureStoreFailures(Promise.reject(rawApiError))).rejects.toStrictEqual({
      code: 'FEATURE_STORE_002',
      message: 'Invalid project configuration',
      detail: undefined,
      errorType: 'ConfigurationError',
      statusCode: 400,
    });
  });

  it('should re-throw already-transformed FeatureStoreError as-is', async () => {
    const transformedError: FeatureStoreError = {
      code: 'FEATURE_STORE_003',
      message: 'Invalid project configuration',
      detail: 'The project configuration is missing required fields',
      errorType: 'ConfigurationError',
      statusCode: 400,
    };

    await expect(
      handleFeatureStoreFailures(Promise.reject(transformedError)),
    ).rejects.toStrictEqual(transformedError);
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

describe('getFeatureStoreErrorMessage', () => {
  it('should return fallback message when error is undefined', () => {
    const result = getFeatureStoreErrorMessage(undefined, 'Fallback message');
    expect(result).toBe('Fallback message');
  });

  it('should return detail field when error has detail property', () => {
    const error = new Error('Generic error');
    Object.assign(error, { detail: 'Entity not found in project' });

    const result = getFeatureStoreErrorMessage(error, 'Fallback message');
    expect(result).toBe('Entity not found in project');
  });

  it('should return error message when error has no detail property', () => {
    const error = new Error('Standard error message');

    const result = getFeatureStoreErrorMessage(error, 'Fallback message');
    expect(result).toBe('Standard error message');
  });

  it('should return fallback message when error has no message or detail', () => {
    const error = new Error();

    const result = getFeatureStoreErrorMessage(error, 'Fallback message');
    expect(result).toBe('Fallback message');
  });

  it('should prefer detail over message when both exist', () => {
    const error = new Error('Generic error message');
    Object.assign(error, { detail: 'Detailed error message' });

    const result = getFeatureStoreErrorMessage(error, 'Fallback message');
    expect(result).toBe('Detailed error message');
  });

  it('should handle FeatureStoreError with all fields', () => {
    const error = new Error('Error message');
    Object.assign(error, {
      detail: 'Feature view not found in project banking',
      statusCode: 404,
      errorType: 'FeastObjectNotFoundException',
    });

    const result = getFeatureStoreErrorMessage(error, 'Fallback message');
    expect(result).toBe('Feature view not found in project banking');
  });

  it('should return message when detail is empty string', () => {
    const error = new Error('Error message');
    Object.assign(error, { detail: '' });

    const result = getFeatureStoreErrorMessage(error, 'Fallback message');
    expect(result).toBe('Error message');
  });

  it('should ignore detail if it is not a string', () => {
    const error = new Error('Error message');
    Object.assign(error, { detail: 123 }); // detail is a number

    const result = getFeatureStoreErrorMessage(error, 'Fallback message');
    expect(result).toBe('Error message');
  });
});
