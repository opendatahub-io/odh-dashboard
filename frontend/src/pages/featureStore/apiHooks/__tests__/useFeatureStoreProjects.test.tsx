/* eslint-disable camelcase */
import { act } from 'react';
import { standardUseFetchStateObject, testHook } from '#~/__tests__/unit/testUtils/hooks';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext.tsx';
import useFeatureStoreProjects from '#~/pages/featureStore/apiHooks/useFeatureStoreProjects.tsx';
import { mockFeatureStoreProject } from '#~/__mocks__/mockFeatureStoreProject.ts';
import { ProjectList } from '#~/pages/featureStore/types/featureStoreProjects';

jest.mock('#~/pages/featureStore/FeatureStoreContext.tsx', () => ({
  useFeatureStoreAPI: jest.fn(),
}));

const useFeatureStoreAPIMock = jest.mocked(useFeatureStoreAPI);
const mockListFeatureStoreProject = jest.fn();

describe('useFeatureStoreProjects', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful project list when API is available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        listFeatureStoreProject: mockListFeatureStoreProject,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockListFeatureStoreProject.mockResolvedValue(mockProjectList);

    const renderResult = testHook(useFeatureStoreProjects)();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: defaultProjectList }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: mockProjectList, loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockListFeatureStoreProject).toHaveBeenCalledTimes(1);
    expect(mockListFeatureStoreProject).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('should handle errors when API call fails', async () => {
    const testError = new Error('Failed to fetch projects');

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        listFeatureStoreProject: mockListFeatureStoreProject,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockListFeatureStoreProject.mockRejectedValue(testError);

    const renderResult = testHook(useFeatureStoreProjects)();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: defaultProjectList }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: defaultProjectList,
        loaded: false,
        error: testError,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockListFeatureStoreProject).toHaveBeenCalledTimes(1);
  });

  it('should return error when API is not available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        listFeatureStoreProject: mockListFeatureStoreProject,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreProjects)();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: defaultProjectList }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: defaultProjectList,
        loaded: false,
        error: new Error('API not yet available'),
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockListFeatureStoreProject).not.toHaveBeenCalled();
  });

  it('should be stable when re-rendered with same parameters', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        listFeatureStoreProject: mockListFeatureStoreProject,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockListFeatureStoreProject.mockResolvedValue(mockProjectList);

    const renderResult = testHook(useFeatureStoreProjects)();

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);

    renderResult.rerender();
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable({
      data: false,
      loaded: true,
      error: true,
      refresh: true,
    });
  });

  it('should handle refresh functionality', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        listFeatureStoreProject: mockListFeatureStoreProject,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockListFeatureStoreProject.mockResolvedValue(mockProjectList);

    const renderResult = testHook(useFeatureStoreProjects)();

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockListFeatureStoreProject).toHaveBeenCalledTimes(1);

    const updatedProjectList: ProjectList = {
      ...mockProjectList,
      projects: [mockFeatureStoreProject({ spec: { name: 'project-3' } })],
    };
    mockListFeatureStoreProject.mockResolvedValue(updatedProjectList);

    await act(() => renderResult.result.current.refresh());

    expect(renderResult).hookToHaveUpdateCount(3);
    expect(mockListFeatureStoreProject).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: updatedProjectList, loaded: true }),
    );
  });

  it('should handle API availability change', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        listFeatureStoreProject: mockListFeatureStoreProject,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreProjects)();

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: defaultProjectList,
        loaded: false,
        error: new Error('API not yet available'),
      }),
    );

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        listFeatureStoreProject: mockListFeatureStoreProject,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockListFeatureStoreProject.mockResolvedValue(mockProjectList);

    renderResult.rerender();

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: mockProjectList, loaded: true }),
    );
    expect(mockListFeatureStoreProject).toHaveBeenCalledTimes(1);
  });
});
