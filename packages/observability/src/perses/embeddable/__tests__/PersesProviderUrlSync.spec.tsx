import * as React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { DashboardResource } from '@perses-dev/core';
import {
  useVariableDefinitionAndState,
  useVariableDefinitionActions,
} from '@perses-dev/dashboards';
import PersesProvider from '../PersesProvider';

// The provider wires real plugin/datasource loaders for browser use; neither is
// needed to exercise variable URL sync, so stub them to keep the test hermetic.
jest.mock('../../persesPluginsLoader', () => ({
  createPluginLoader: () => ({ loadPlugin: jest.fn() }),
}));
jest.mock('../../perses-client', () => ({
  OdhDatasourceApi: class {},
  CachedDatasourceAPI: class {},
  PERSES_PROXY_BASE_PATH: '/perses',
}));

/** Dashboard with a non-namespace variable (Usage-style subscription/model). */
const textVariableDashboard = {
  kind: 'Dashboard',
  metadata: { name: 'dashboard-4-usage' },
  spec: {
    display: { name: 'Usage' },
    variables: [{ kind: 'TextVariable', spec: { name: 'model_name', value: '' } }],
  },
} as unknown as DashboardResource;

const VariableProbe: React.FC = () => {
  const { state } = useVariableDefinitionAndState('model_name');
  const { setVariableValue } = useVariableDefinitionActions();
  return (
    <div>
      <div data-testid="var-value">{JSON.stringify(state?.value ?? null)}</div>
      <button data-testid="var-set" onClick={() => setVariableValue('model_name', 'bar')} />
    </div>
  );
};

const LocationProbe: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
};

const renderProvider = (initialEntry: string, syncToUrl: boolean) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PersesProvider dashboardResource={textVariableDashboard} syncToUrl={syncToUrl}>
        <VariableProbe />
        <LocationProbe />
      </PersesProvider>
    </MemoryRouter>,
  );

describe('PersesProvider variable URL sync', () => {
  it('syncToUrl restores a variable selection from var-<name> query params', async () => {
    renderProvider('/?var-model_name=foo', true);

    // The dropdown must come back as `foo` after a (simulated) hard refresh.
    await waitFor(() => expect(screen.getByTestId('var-value').textContent).toBe('"foo"'));
  });

  it('syncToUrl writes variable changes to the URL as var-<name>', async () => {
    renderProvider('/', true);

    await waitFor(() => expect(screen.getByTestId('var-value').textContent).toBe('""'));

    act(() => {
      screen.getByTestId('var-set').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toContain('var-model_name=bar'),
    );
    await waitFor(() => expect(screen.getByTestId('var-value').textContent).toBe('"bar"'));
  });

  it('without syncToUrl, variables stay in memory and never touch the URL', async () => {
    renderProvider('/?var-model_name=foo', false);

    await waitFor(() => expect(screen.getByTestId('var-value').textContent).toBe('""'));

    act(() => {
      screen.getByTestId('var-set').click();
    });

    await waitFor(() => expect(screen.getByTestId('var-value').textContent).toBe('"bar"'));
    // Memory-only: the selection change must not reach the URL. The initial
    // query string stays as-is (nothing strips it); the new value must not appear.
    expect(screen.getByTestId('location').textContent).not.toContain('var-model_name=bar');
  });
});
