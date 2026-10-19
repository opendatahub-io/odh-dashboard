import { act } from 'react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import { isKueueManagedDataScienceProject } from '../../utils/kueueProjects';
import {
  enrichInfrastructureWorkloads,
  listInfrastructureWorkloadsBase,
} from '../../utils/infrastructureWorkloads';
import type { InfrastructureWorkloadRow } from '../../types/infrastructureWorkloads';
import type { InfrastructureWorkloadsBaseResult } from '../../utils/infrastructureWorkloads';
import useInfrastructureWorkloads from '../useInfrastructureWorkloads';

jest.mock('@odh-dashboard/ui-core/hooks/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../utils/infrastructureWorkloads', () => ({
  enrichInfrastructureWorkloads: jest.fn(),
  listInfrastructureWorkloadsBase: jest.fn(),
}));

jest.mock('../../utils/kueueProjects', () => ({
  isKueueManagedDataScienceProject: jest.fn(),
}));

const useFetchMock = jest.mocked(useFetch);
const enrichInfrastructureWorkloadsMock = jest.mocked(enrichInfrastructureWorkloads);
const listInfrastructureWorkloadsBaseMock = jest.mocked(listInfrastructureWorkloadsBase);
const isKueueManagedDataScienceProjectMock = jest.mocked(isKueueManagedDataScienceProject);

const result = {
  workloads: [],
  kueueEnabled: true,
  failedSources: [],
};

const baseResult = {
  ...result,
  resources: [],
};

describe('useInfrastructureWorkloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listInfrastructureWorkloadsBaseMock.mockResolvedValue(baseResult);
    enrichInfrastructureWorkloadsMock.mockResolvedValue(baseResult);
    useFetchMock.mockReturnValue({
      data: baseResult,
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
      expect.objectContaining({
        workloads: [],
        kueueEnabled: false,
        failedSources: [],
        resources: [],
      }),
      expect.objectContaining({ initialPromisePurity: true }),
    );
  });

  it('should return an immediately loaded empty result when namespace is undefined', async () => {
    useFetchMock.mockReturnValue({
      data: { workloads: [], kueueEnabled: false, failedSources: [], resources: [] },
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
    await expect(fetchCallback({ signal: new AbortController().signal })).resolves.toEqual({
      workloads: [],
      kueueEnabled: false,
      failedSources: [],
      resources: [],
    });
    expect(listInfrastructureWorkloadsBaseMock).not.toHaveBeenCalled();
  });

  it('should expose base rows before Hardware Profile enrichment completes', async () => {
    let resolveEnrichment: ((value: InfrastructureWorkloadsBaseResult) => void) | undefined;
    enrichInfrastructureWorkloadsMock.mockReturnValue(
      new Promise((resolve) => {
        resolveEnrichment = resolve;
      }),
    );
    const baseWorkload = { name: 'workload-a' } as InfrastructureWorkloadRow;
    const baseData: InfrastructureWorkloadsBaseResult = {
      ...baseResult,
      workloads: [baseWorkload],
      resources: [{} as InfrastructureWorkloadRow['resource']],
    } as InfrastructureWorkloadsBaseResult;
    useFetchMock.mockReturnValue({
      data: baseData,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useInfrastructureWorkloads)('project-a', {
      metadata: { name: 'project-a' },
    } as Parameters<typeof useInfrastructureWorkloads>[1]);

    expect(renderResult.result.current).toMatchObject({
      workloads: [baseWorkload],
      loaded: true,
      hardwareProfilesLoading: true,
    });

    await act(async () => {
      resolveEnrichment?.({
        ...baseData,
        workloads: [{ ...baseWorkload, hardwareProfile: 'A100' }],
      });
      await Promise.resolve();
    });

    expect(renderResult.result.current).toMatchObject({
      workloads: [{ ...baseWorkload, hardwareProfile: 'A100' }],
      loaded: true,
      hardwareProfilesLoading: false,
    });
  });
});
