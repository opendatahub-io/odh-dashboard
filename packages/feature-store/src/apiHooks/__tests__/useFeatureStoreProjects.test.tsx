/* eslint-disable camelcase */
import * as React from 'react';
import { act } from 'react';
import { standardUseFetchStateObject, testHook } from '@odh-dashboard/jest-config/hooks';
import { mockFeatureStoreProject } from '../../__mocks__/mockFeatureStoreProject';
import { ProjectList } from '../../types/featureStoreProjects';
import { DEFAULT_PROJECT_LIST } from '../../const';
import useFeatureStoreProjects from '../useFeatureStoreProjects';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const mockUseContext = React.useContext as jest.Mock;
const mockRefreshFeatureStoreProjects = jest.fn();

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return project list from context', () => {
    mockUseContext.mockReturnValue({
      featureStoreProjects: mockProjectList,
      featureStoreProjectsLoaded: true,
      featureStoreProjectsError: undefined,
      refreshFeatureStoreProjects: mockRefreshFeatureStoreProjects,
    });

    const renderResult = testHook(useFeatureStoreProjects)();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: mockProjectList, loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should handle errors from context', () => {
    const testError = new Error('Failed to fetch projects');

    mockUseContext.mockReturnValue({
      featureStoreProjects: DEFAULT_PROJECT_LIST,
      featureStoreProjectsLoaded: false,
      featureStoreProjectsError: testError,
      refreshFeatureStoreProjects: mockRefreshFeatureStoreProjects,
    });

    const renderResult = testHook(useFeatureStoreProjects)();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: DEFAULT_PROJECT_LIST,
        loaded: false,
        error: testError,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return loading state when projects are not loaded', () => {
    mockUseContext.mockReturnValue({
      featureStoreProjects: DEFAULT_PROJECT_LIST,
      featureStoreProjectsLoaded: false,
      featureStoreProjectsError: undefined,
      refreshFeatureStoreProjects: mockRefreshFeatureStoreProjects,
    });

    const renderResult = testHook(useFeatureStoreProjects)();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: DEFAULT_PROJECT_LIST,
        loaded: false,
        error: undefined,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should be stable when re-rendered with same context values', () => {
    mockUseContext.mockReturnValue({
      featureStoreProjects: mockProjectList,
      featureStoreProjectsLoaded: true,
      featureStoreProjectsError: undefined,
      refreshFeatureStoreProjects: mockRefreshFeatureStoreProjects,
    });

    const renderResult = testHook(useFeatureStoreProjects)();

    expect(renderResult).hookToHaveUpdateCount(1);

    renderResult.rerender();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({
      data: false,
      loaded: true,
      error: true,
      refresh: false, // refresh function changes due to dependencies
    });
  });

  it('should handle refresh functionality', async () => {
    mockUseContext.mockReturnValue({
      featureStoreProjects: mockProjectList,
      featureStoreProjectsLoaded: true,
      featureStoreProjectsError: undefined,
      refreshFeatureStoreProjects: mockRefreshFeatureStoreProjects,
    });

    const renderResult = testHook(useFeatureStoreProjects)();

    expect(renderResult).hookToHaveUpdateCount(1);

    mockRefreshFeatureStoreProjects.mockResolvedValue(undefined);

    await act(() => renderResult.result.current.refresh());

    expect(mockRefreshFeatureStoreProjects).toHaveBeenCalledTimes(1);
  });

  it('should handle context value changes', () => {
    mockUseContext.mockReturnValue({
      featureStoreProjects: DEFAULT_PROJECT_LIST,
      featureStoreProjectsLoaded: false,
      featureStoreProjectsError: undefined,
      refreshFeatureStoreProjects: mockRefreshFeatureStoreProjects,
    });

    const renderResult = testHook(useFeatureStoreProjects)();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: DEFAULT_PROJECT_LIST,
        loaded: false,
      }),
    );

    mockUseContext.mockReturnValue({
      featureStoreProjects: mockProjectList,
      featureStoreProjectsLoaded: true,
      featureStoreProjectsError: undefined,
      refreshFeatureStoreProjects: mockRefreshFeatureStoreProjects,
    });

    renderResult.rerender();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: mockProjectList, loaded: true }),
    );
  });
});
