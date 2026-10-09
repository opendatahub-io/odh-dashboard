import { testHook } from '@odh-dashboard/jest-config/hooks';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import { isKueueManagedDataScienceProject } from '../../utils/kueueProjects';
import { listInfrastructureWorkloads } from '../../utils/infrastructureWorkloads';
import useInfrastructureWorkloads from '../useInfrastructureWorkloads';

jest.mock('@odh-dashboard/ui-core/hooks/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../utils/infrastructureWorkloads', () => ({
  listInfrastructureWorkloads: jest.fn(),
}));

jest.mock('../../utils/kueueProjects', () => ({
  isKueueManagedDataScienceProject: jest.fn(),
}));

const useFetchMock = jest.mocked(useFetch);
const listInfrastructureWorkloadsMock = jest.mocked(listInfrastructureWorkloads);
const isKueueManagedDataScienceProjectMock = jest.mocked(isKueueManagedDataScienceProject);

const result = {
  workloads: [],
  kueueEnabled: true,
  failedSources: [],
};

describe('useInfrastructureWorkloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFetchMock.mockReturnValue({
      data: result,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    isKueueManagedDataScienceProjectMock.mockReturnValue(true);
  });

  it('should return loaded data and fetch using the namespace and Kueue state', () => {
    const project = { metadata: { name: 'project-a' } } as Parameters<
      typeof useInfrastructureWorkloads
    >[1];
    const renderResult = testHook(useInfrastructureWorkloads)('project-a', project);

    expect(renderResult.result.current).toMatchObject({ ...result, loaded: true });
    expect(isKueueManagedDataScienceProjectMock).toHaveBeenCalledWith(project);
    expect(useFetchMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ workloads: [], kueueEnabled: false, failedSources: [] }),
      expect.objectContaining({ initialPromisePurity: true }),
    );
  });

  it('should return an immediately loaded empty result when namespace is undefined', () => {
    useFetchMock.mockReturnValue({
      data: { workloads: [], kueueEnabled: false, failedSources: [] },
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });
    const renderResult = testHook(useInfrastructureWorkloads)(undefined, null);
    const [fetchCallback] = useFetchMock.mock.calls[0];

    expect(renderResult.result.current).toMatchObject({
      workloads: [],
      kueueEnabled: false,
      failedSources: [],
      loaded: true,
    });
    expect(fetchCallback({ signal: new AbortController().signal })).resolves.toEqual({
      workloads: [],
      kueueEnabled: false,
      failedSources: [],
    });
    expect(listInfrastructureWorkloadsMock).not.toHaveBeenCalled();
  });
});
