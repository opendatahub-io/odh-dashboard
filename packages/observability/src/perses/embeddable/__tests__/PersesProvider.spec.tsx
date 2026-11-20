import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { DashboardResource, ListVariableDefinition } from '@perses-dev/core';
import { useListVariablePluginValues, type VariableState } from '@perses-dev/plugin-system';
import { useVariableDefinitionAndState } from '@perses-dev/dashboards';
import { PersesDashboardGate } from '../PersesDashboardGate';

jest.mock('@perses-dev/dashboards', () => ({
  ...jest.requireActual('@perses-dev/dashboards'),
  useVariableDefinitionAndState: jest.fn(),
}));

jest.mock('@perses-dev/plugin-system', () => ({
  ...jest.requireActual('@perses-dev/plugin-system'),
  useListVariablePluginValues: jest.fn(),
}));

const useVariableDefinitionAndStateMock = jest.mocked(useVariableDefinitionAndState);
const useListVariablePluginValuesMock = jest.mocked(useListVariablePluginValues);
type NamespaceOptionsQuery = ReturnType<typeof useListVariablePluginValues>;

const createNamespaceOptionsQuery = (
  data: NonNullable<NamespaceOptionsQuery['data']> = [],
  overrides: Partial<Pick<NamespaceOptionsQuery, 'error' | 'isError' | 'isFetched'>> = {},
): NamespaceOptionsQuery =>
  ({
    data,
    error: null,
    isError: false,
    isFetched: true,
    ...overrides,
  } as unknown as NamespaceOptionsQuery);

const namespaceDefinition = {
  kind: 'ListVariable',
  spec: {
    name: 'namespace',
    allowMultiple: true,
    allowAllValue: true,
    defaultValue: '$__all',
    plugin: { kind: 'StaticListVariable', spec: { values: [] } },
  },
} as ListVariableDefinition;

const customAllNamespaceDefinition = {
  ...namespaceDefinition,
  spec: { ...namespaceDefinition.spec, customAllValue: '.*' },
} as ListVariableDefinition;

const namespaceDashboard = {
  kind: 'Dashboard',
  metadata: { name: 'dashboard-model' },
  spec: {
    variables: [namespaceDefinition],
  },
} as unknown as DashboardResource;

const clusterDashboard = {
  kind: 'Dashboard',
  metadata: { name: 'dashboard-cluster' },
  spec: { variables: [] },
} as unknown as DashboardResource;

const renderGate = (
  dashboardResource: DashboardResource,
  namespaceState?: VariableState,
  namespaceDefinitionOverride = namespaceDefinition,
) => {
  useVariableDefinitionAndStateMock.mockReturnValue({
    definition: namespaceDefinitionOverride,
    state: namespaceState,
  });

  return render(
    <PersesDashboardGate dashboardResource={dashboardResource}>
      <div data-testid="dashboard-panels" />
    </PersesDashboardGate>,
  );
};

describe('PersesDashboardGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useListVariablePluginValuesMock.mockReturnValue(createNamespaceOptionsQuery());
  });

  it('should delay panels while the namespace variable is loading', () => {
    renderGate(namespaceDashboard, { value: 'project-a', loading: true });

    expect(screen.queryByTestId('dashboard-panels')).toBeNull();
    expect(screen.getByTestId('namespace-loading-state')).toBeDefined();
  });

  it('should delay panels when the namespace variable is empty', () => {
    renderGate(namespaceDashboard, { value: '', loading: false });

    expect(screen.getByTestId('namespace-empty-state')).toBeDefined();
  });

  it('should delay panels when no namespace state has been initialized', () => {
    renderGate(namespaceDashboard);

    expect(screen.queryByTestId('dashboard-panels')).toBeNull();
    expect(screen.getByTestId('namespace-loading-state')).toBeDefined();
  });

  it('should render panels when the namespace variable has a value', () => {
    renderGate(namespaceDashboard, { value: 'project-a', loading: false });

    expect(screen.getByTestId('dashboard-panels')).toBeDefined();
  });

  it('should render panels when all namespaces are selected', () => {
    useListVariablePluginValuesMock.mockReturnValue(
      createNamespaceOptionsQuery([{ label: 'Project A', value: 'project-a' }]),
    );
    renderGate(namespaceDashboard, {
      value: '$__all',
      loading: false,
      options: [{ label: 'Project A', value: 'project-a' }],
    });

    expect(screen.getByTestId('dashboard-panels')).toBeDefined();
  });

  it('should delay the default All value until namespace options are loaded', () => {
    useListVariablePluginValuesMock.mockReturnValue(
      createNamespaceOptionsQuery([], { isFetched: false }),
    );
    renderGate(namespaceDashboard, { value: '$__all', loading: false });

    expect(screen.queryByTestId('dashboard-panels')).toBeNull();
    expect(screen.getByTestId('namespace-loading-state')).toBeDefined();
  });

  it('should show an empty state when the default All options query returns no projects', () => {
    renderGate(namespaceDashboard, { value: '$__all', loading: false });

    expect(screen.getByTestId('namespace-options-empty-state')).toBeDefined();
  });

  it('should show an error state when the default All options query fails', () => {
    useListVariablePluginValuesMock.mockReturnValue(
      createNamespaceOptionsQuery([], { error: new Error('options unavailable'), isError: true }),
    );
    renderGate(namespaceDashboard, { value: '$__all', loading: false });

    expect(screen.getByTestId('namespace-options-error-state')).toBeDefined();
  });

  it('should not wait for options when a custom All value is configured', () => {
    renderGate(
      namespaceDashboard,
      { value: '$__all', loading: false, options: [] },
      customAllNamespaceDefinition,
    );

    expect(screen.getByTestId('dashboard-panels')).toBeDefined();
  });

  it('should render panels for a non-null scalar variable value', () => {
    renderGate(namespaceDashboard, { value: 0, loading: false } as unknown as VariableState);

    expect(screen.getByTestId('dashboard-panels')).toBeDefined();
  });

  it('should render panels after the namespace variable finishes loading', () => {
    const rendered = renderGate(namespaceDashboard, { value: null, loading: true });

    expect(screen.queryByTestId('dashboard-panels')).toBeNull();
    expect(screen.getByTestId('namespace-loading-state')).toBeDefined();

    useVariableDefinitionAndStateMock.mockReturnValue({
      definition: undefined,
      state: { value: 'project-a', loading: false },
    });
    rendered.rerender(
      <PersesDashboardGate dashboardResource={namespaceDashboard}>
        <div data-testid="dashboard-panels" />
      </PersesDashboardGate>,
    );

    expect(screen.getByTestId('dashboard-panels')).toBeDefined();
  });

  it('should delay panels for an empty namespace selection', () => {
    renderGate(namespaceDashboard, {
      value: [],
      loading: false,
      options: [{ label: 'Project A', value: 'project-a' }],
    });

    expect(screen.getByTestId('namespace-empty-state')).toBeDefined();
  });

  it('should render panels immediately for dashboards without a namespace variable', () => {
    renderGate(clusterDashboard);

    expect(screen.getByTestId('dashboard-panels')).toBeDefined();
  });
});
