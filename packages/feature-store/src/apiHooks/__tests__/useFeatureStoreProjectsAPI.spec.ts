/* eslint-disable camelcase */
import { renderHook } from '@testing-library/react';
import { standardUseFetchStateObject, testHook } from '@odh-dashboard/jest-config/hooks';
import { mockFeatureStoreProject } from '../../__mocks__/mockFeatureStoreProject';
import { ProjectList } from '../../types/featureStoreProjects';
import { FeatureStoreAPIState } from '../useFeatureStoreAPIState';
import useFeatureStoreProjectsAPI from '../useFeatureStoreProjectsAPI';

jest.mock('@odh-dashboard/internal/utilities/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseFetch = jest.mocked(require('@odh-dashboard/internal/utilities/useFetch').default);

describe('useFeatureStoreProjectsAPI', () => {
  const mockProjectList: ProjectList = {
    projects: [
      mockFeatureStoreProject({ spec: { name: 'project-1' } }),
      mockFeatureStoreProject({ spec: { name: 'project-2' } }),
    ],
    pagination: {
      page: 1,
      limit: 10,
      total_count: 2,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    },
  };

  const defaultProjectList: ProjectList = {
    projects: [],
    pagination: {
      page: 0,
      limit: 0,
      total_count: 0,
      total_pages: 0,
      has_next: false,
      has_previous: false,
    },
  };

  const mockListFeatureStoreProject = jest.fn();

  const mockApiState: FeatureStoreAPIState = {
    apiAvailable: true,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    api: {
      listFeatureStoreProject: mockListFeatureStoreProject,
    } as unknown as FeatureStoreAPIState['api'],
  };

  const mockApiStateUnavailable: FeatureStoreAPIState = {
    apiAvailable: false,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    api: null as unknown as FeatureStoreAPIState['api'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetch.mockReturnValue(standardUseFetchStateObject({ data: defaultProjectList }));
  });

  it('should call useFetch with correct parameters when API is available', () => {
    testHook(useFeatureStoreProjectsAPI)(mockApiState);

    expect(mockUseFetch).toHaveBeenCalledWith(expect.any(Function), defaultProjectList, {
      initialPromisePurity: true,
    });
  });

  it('should return default project list initially', () => {
    const renderResult = testHook(useFeatureStoreProjectsAPI)(mockApiState);

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: defaultProjectList }),
    );
  });

  it('should return loaded project list when data is available', () => {
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({ data: mockProjectList, loaded: true }),
    );

    const renderResult = testHook(useFeatureStoreProjectsAPI)(mockApiState);

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: mockProjectList, loaded: true }),
    );
  });

  it('should handle errors properly', () => {
    const testError = new Error('Failed to fetch projects');
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({ data: defaultProjectList, error: testError }),
    );

    const renderResult = testHook(useFeatureStoreProjectsAPI)(mockApiState);

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: defaultProjectList, error: testError }),
    );
  });

  describe('API call function', () => {
    it('should call listFeatureStoreProject when API is available', async () => {
      mockListFeatureStoreProject.mockResolvedValue(mockProjectList);

      testHook(useFeatureStoreProjectsAPI)(mockApiState);

      const callbackFn = mockUseFetch.mock.calls[0][0];

      const mockOpts = { signal: new AbortController().signal };
      await callbackFn(mockOpts);

      expect(mockListFeatureStoreProject).toHaveBeenCalledWith(mockOpts);
    });

    it('should reject when API is not available', async () => {
      testHook(useFeatureStoreProjectsAPI)(mockApiStateUnavailable);

      const callbackFn = mockUseFetch.mock.calls[0][0];

      const mockOpts = { signal: new AbortController().signal };

      await expect(callbackFn(mockOpts)).rejects.toThrow('API not yet available');
      expect(mockListFeatureStoreProject).not.toHaveBeenCalled();
    });
  });

  it('should recreate callback when apiState changes', () => {
    const { rerender } = renderHook(({ apiState }) => useFeatureStoreProjectsAPI(apiState), {
      initialProps: { apiState: mockApiState },
    });

    const firstCallback = mockUseFetch.mock.calls[0][0];

    jest.clearAllMocks();
    mockUseFetch.mockReturnValue(standardUseFetchStateObject({ data: defaultProjectList }));

    const newMockFn = jest.fn();
    const newApiState: FeatureStoreAPIState = {
      apiAvailable: true,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      api: { listFeatureStoreProject: newMockFn } as unknown as FeatureStoreAPIState['api'],
    };

    rerender({ apiState: newApiState });

    const secondCallback = mockUseFetch.mock.calls[0][0];
    expect(firstCallback).not.toBe(secondCallback);
  });
});
