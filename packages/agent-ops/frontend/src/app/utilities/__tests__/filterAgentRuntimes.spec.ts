import {
  AgentRuntimeStatusFilter,
  AgentRuntimesFilterOption,
  emptyAgentRuntimesFilterData,
} from '~/app/pages/agentRuntimes/const';
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
  const runtimes = [
    createReadyRuntime(),
    createPendingRuntime(),
    createFailedRuntime(),
    createToolRuntime(),
  ];

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

  it('filters runtimes by project', () => {
    expect(
      filterAgentRuntimes(
        runtimes,
        {
          ...emptyAgentRuntimesFilterData,
          [AgentRuntimesFilterOption.Project]: 'agent-ops',
        },
        { 'agent-ops-demo': 'Agent Ops Demo' },
      ),
    ).toEqual(runtimes);
  });

  it('filters runtimes by project display name', () => {
    expect(
      filterAgentRuntimes(
        runtimes,
        {
          ...emptyAgentRuntimesFilterData,
          [AgentRuntimesFilterOption.Project]: 'demo',
        },
        { 'agent-ops-demo': 'Agent Ops Demo' },
      ),
    ).toEqual(runtimes);
  });

  it('filters runtimes by Running status', () => {
    expect(
      filterAgentRuntimes(runtimes, {
        ...emptyAgentRuntimesFilterData,
        [AgentRuntimesFilterOption.Status]: {
          label: AgentRuntimeStatusFilter.Running,
          value: AgentRuntimeStatusFilter.Running,
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

  it('returns true when name, project, or status filters are set', () => {
    expect(
      hasActiveAgentRuntimesFilters({
        ...emptyAgentRuntimesFilterData,
        [AgentRuntimesFilterOption.Name]: 'agent',
      }),
    ).toBe(true);

    expect(
      hasActiveAgentRuntimesFilters({
        ...emptyAgentRuntimesFilterData,
        [AgentRuntimesFilterOption.Project]: 'demo',
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
