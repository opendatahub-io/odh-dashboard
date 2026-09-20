import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';
import TopologyConfigFormRoutes from '../TopologyConfigFormRoutes';
import { TOPOLOGY_CONFIGS_TAB_PATH } from '../paths';

jest.mock('../../LlmInferenceServiceConfigAccessGate', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../TopologyConfigContext', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="context-provider">{children}</div>
  ),
}));

jest.mock('../TopologyConfigurationCreateEdit', () => ({
  __esModule: true,
  default: ({ isDuplicate }: { isDuplicate?: boolean }) => (
    <div data-testid="create-edit" data-is-duplicate={String(!!isDuplicate)} />
  ),
}));

/**
 * Mounts the component the way the host mounts an `app.route` extension: a single
 * top-level route whose path is the extension's exact registered path. This is the
 * detail that matters — the outer route consumes the whole pathname, so anything
 * the component does internally has to cope with an empty remaining path.
 */
const renderAtRoute = (registeredPath: string, url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={registeredPath} element={<TopologyConfigFormRoutes />} />
      </Routes>
    </MemoryRouter>,
  );

describe('TopologyConfigFormRoutes', () => {
  it('should render the add form (not duplicate) at the add path', () => {
    renderAtRoute(
      `${TOPOLOGY_CONFIGS_TAB_PATH}/add/:topologyType`,
      `${TOPOLOGY_CONFIGS_TAB_PATH}/add/workload-single-node`,
    );
    const form = screen.getByTestId('create-edit');
    expect(form).toHaveAttribute('data-is-duplicate', 'false');
  });

  it('should render the edit form (not duplicate) at the edit path', () => {
    renderAtRoute(
      `${TOPOLOGY_CONFIGS_TAB_PATH}/edit/:configName`,
      `${TOPOLOGY_CONFIGS_TAB_PATH}/edit/my-config`,
    );
    const form = screen.getByTestId('create-edit');
    expect(form).toHaveAttribute('data-is-duplicate', 'false');
  });

  it('should render the duplicate form at the duplicate path', () => {
    renderAtRoute(
      `${TOPOLOGY_CONFIGS_TAB_PATH}/duplicate/:configName`,
      `${TOPOLOGY_CONFIGS_TAB_PATH}/duplicate/my-config`,
    );
    const form = screen.getByTestId('create-edit');
    expect(form).toHaveAttribute('data-is-duplicate', 'true');
  });

  it('should wrap the form in the config context provider', () => {
    renderAtRoute(
      `${TOPOLOGY_CONFIGS_TAB_PATH}/add/:topologyType`,
      `${TOPOLOGY_CONFIGS_TAB_PATH}/add/workload-single-node`,
    );
    expect(screen.getByTestId('context-provider')).toContainElement(
      screen.getByTestId('create-edit'),
    );
  });
});
