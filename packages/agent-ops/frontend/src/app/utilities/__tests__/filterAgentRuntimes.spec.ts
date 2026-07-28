import {
  AgentRuntimeStatusFilter,
  AgentRuntimesFilterOption,
  emptyAgentRuntimesFilterData,
} from '~/app/pages/agentRuntimes/const';
import { mockAgentRuntime } from '~/__mocks__/mockAgentRuntime';
import {
  createFailedRuntime,
  createPendingRuntime,
  createReadyRuntime,
  createToolRuntime,
} from '~/app/pages/agentRuntimes/__tests__/agentRuntimeTestUtils';
import {
  filterAgentRuntimes,
  hasActiveAgentRuntimesFilters,
} from '~/app/utilities/filterAgentRuntimes';

describe('filterAgentRuntimes', () => {
  const agentOpsRuntimes = [
    createReadyRuntime(),
    createPendingRuntime(),
    createFailedRuntime(),
    createToolRuntime(),
  ];
  const otherProjectRuntime = mockAgentRuntime({
    name: 'other-project-agent',
    namespace: 'other-project',
    status: 'Stopped',
    endpointUrl: '',
  });
  const runtimes = [...agentOpsRuntimes, otherProjectRuntime];

  it('returns all runtimes when no filters are active', () => {
    expect(filterAgentRuntimes(runtimes, emptyAgentRuntimesFilterData)).toEqual(runtimes);
  });

  it('filters runtimes by name', () => {
    expect(
      filterAgentRuntimes(runtimes, {
        ...emptyAgentRuntimesFilterData,
        [AgentRuntimesFilterOption.Name]: 'pending',
      }),
    ).toEqual([createPendingRuntime()]);
  });

  it('filters runtimes by Ready status', () => {
    expect(
      filterAgentRuntimes(runtimes, {
        ...emptyAgentRuntimesFilterData,
        [AgentRuntimesFilterOption.Status]: {
          label: AgentRuntimeStatusFilter.Ready,
          value: AgentRuntimeStatusFilter.Ready,
        },
      }),
    ).toEqual([createReadyRuntime()]);
  });

  it('filters runtimes by Pending status', () => {
    expect(
      filterAgentRuntimes(runtimes, {
        ...emptyAgentRuntimesFilterData,
        [AgentRuntimesFilterOption.Status]: {
          label: AgentRuntimeStatusFilter.Pending,
          value: AgentRuntimeStatusFilter.Pending,
        },
      }),
    ).toEqual([createPendingRuntime()]);
  });

  it('filters runtimes by Failed status', () => {
    expect(
      filterAgentRuntimes(runtimes, {
        ...emptyAgentRuntimesFilterData,
        [AgentRuntimesFilterOption.Status]: {
          label: AgentRuntimeStatusFilter.Failed,
          value: AgentRuntimeStatusFilter.Failed,
        },
      }),
    ).toEqual([createFailedRuntime()]);
  });

  it('combines name and status filters', () => {
    expect(
      filterAgentRuntimes(runtimes, {
        ...emptyAgentRuntimesFilterData,
        [AgentRuntimesFilterOption.Name]: 'agent',
        [AgentRuntimesFilterOption.Status]: {
          label: AgentRuntimeStatusFilter.Pending,
          value: AgentRuntimeStatusFilter.Pending,
        },
      }),
    ).toEqual([createPendingRuntime()]);
  });
});

describe('hasActiveAgentRuntimesFilters', () => {
  it('returns false when no filters are active', () => {
    expect(hasActiveAgentRuntimesFilters(emptyAgentRuntimesFilterData)).toBe(false);
  });

  it('returns true when name or status filters are set', () => {
    expect(
      hasActiveAgentRuntimesFilters({
        ...emptyAgentRuntimesFilterData,
        [AgentRuntimesFilterOption.Name]: 'agent',
      }),
    ).toBe(true);

    expect(
      hasActiveAgentRuntimesFilters({
        ...emptyAgentRuntimesFilterData,
        [AgentRuntimesFilterOption.Status]: {
          label: AgentRuntimeStatusFilter.Failed,
          value: AgentRuntimeStatusFilter.Failed,
        },
      }),
    ).toBe(true);
  });
});
