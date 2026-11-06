import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { DashboardResource } from '@perses-dev/core';
import type { VariableState } from '@perses-dev/plugin-system';
import { useVariableDefinitionAndState } from '@perses-dev/dashboards';
import { PersesDashboardGate } from '../PersesProvider';

jest.mock('@perses-dev/dashboards', () => ({
  ...jest.requireActual('@perses-dev/dashboards'),
  useVariableDefinitionAndState: jest.fn(),
}));

const useVariableDefinitionAndStateMock = jest.mocked(useVariableDefinitionAndState);

const namespaceDashboard = {
  kind: 'Dashboard',
  metadata: { name: 'dashboard-model' },
  spec: {
    variables: [{ kind: 'ListVariable', spec: { name: 'namespace' } }],
  },
} as unknown as DashboardResource;

const clusterDashboard = {
  kind: 'Dashboard',
  metadata: { name: 'dashboard-cluster' },
  spec: { variables: [] },
} as unknown as DashboardResource;

const renderGate = (dashboardResource: DashboardResource, namespaceState?: VariableState) => {
  useVariableDefinitionAndStateMock.mockReturnValue({
    definition: undefined,
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
  });

  it('should delay panels while the namespace variable is loading', () => {
    renderGate(namespaceDashboard, { value: 'project-a', loading: true });

    expect(screen.queryByTestId('dashboard-panels')).toBeNull();
  });

  it('should delay panels when the namespace variable is empty', () => {
    renderGate(namespaceDashboard, { value: '', loading: false });

    expect(screen.queryByTestId('dashboard-panels')).toBeNull();
  });

  it('should delay panels when no namespace state has been initialized', () => {
    renderGate(namespaceDashboard);

    expect(screen.queryByTestId('dashboard-panels')).toBeNull();
  });

  it('should render panels when the namespace variable has a value', () => {
    renderGate(namespaceDashboard, { value: 'project-a', loading: false });

    expect(screen.getByTestId('dashboard-panels')).toBeDefined();
  });

  it('should render panels when all namespaces are selected', () => {
    renderGate(namespaceDashboard, { value: '$__all', loading: false });

    expect(screen.getByTestId('dashboard-panels')).toBeDefined();
  });

  it('should render panels for a non-null scalar variable value', () => {
    renderGate(namespaceDashboard, { value: 0, loading: false } as unknown as VariableState);

    expect(screen.getByTestId('dashboard-panels')).toBeDefined();
  });

  it('should render panels after the namespace variable finishes loading', () => {
    const rendered = renderGate(namespaceDashboard, { value: null, loading: true });

    expect(screen.queryByTestId('dashboard-panels')).toBeNull();

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
    renderGate(namespaceDashboard, { value: [], loading: false });

    expect(screen.queryByTestId('dashboard-panels')).toBeNull();
  });

  it('should render panels immediately for dashboards without a namespace variable', () => {
    renderGate(clusterDashboard);

    expect(screen.getByTestId('dashboard-panels')).toBeDefined();
  });
});
