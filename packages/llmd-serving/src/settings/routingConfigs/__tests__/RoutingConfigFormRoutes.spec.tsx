import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';
import RoutingConfigFormRoutes from '../RoutingConfigFormRoutes';
import { ROUTING_CONFIGS_TAB_PATH } from '../paths';

jest.mock('../../LlmInferenceServiceConfigAccessGate', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../RoutingConfigContext', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="context-provider">{children}</div>
  ),
}));

jest.mock('../RoutingConfigurationCreateEdit', () => ({
  __esModule: true,
  default: ({ isDuplicate }: { isDuplicate: boolean }) => (
    <div data-testid="create-edit-form" data-is-duplicate={isDuplicate} />
  ),
}));

/**
 * Mounts the component the way the host mounts an `app.route` extension: a single
 * top-level route whose path is the extension's exact registered path. This is the
 * detail that matters — the outer route consumes the whole pathname, so anything
 * the component does internally has to cope with an empty remaining path. This is
 * the regression guard for the blank-page bug: a nested `<Routes>` inside the
 * mounted component would receive nothing left to match and render blank.
 */
const renderAtRoute = (registeredPath: string, url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={registeredPath} element={<RoutingConfigFormRoutes />} />
      </Routes>
    </MemoryRouter>,
  );

describe('RoutingConfigFormRoutes', () => {
  it('should render the form with isDuplicate false when mounted at the registered add path', () => {
    renderAtRoute(`${ROUTING_CONFIGS_TAB_PATH}/add`, `${ROUTING_CONFIGS_TAB_PATH}/add`);

    const form = screen.getByTestId('create-edit-form');
    expect(form).toHaveAttribute('data-is-duplicate', 'false');
  });

  it('should render the form with isDuplicate false when mounted at the registered edit path', () => {
    renderAtRoute(
      `${ROUTING_CONFIGS_TAB_PATH}/edit/:configName`,
      `${ROUTING_CONFIGS_TAB_PATH}/edit/prefill-decode`,
    );

    const form = screen.getByTestId('create-edit-form');
    expect(form).toHaveAttribute('data-is-duplicate', 'false');
  });

  it('should render the form with isDuplicate true when mounted at the registered duplicate path', () => {
    renderAtRoute(
      `${ROUTING_CONFIGS_TAB_PATH}/duplicate/:configName`,
      `${ROUTING_CONFIGS_TAB_PATH}/duplicate/prefill-decode`,
    );

    const form = screen.getByTestId('create-edit-form');
    expect(form).toHaveAttribute('data-is-duplicate', 'true');
  });

  it('should wrap the form in the routing config context provider', () => {
    renderAtRoute(`${ROUTING_CONFIGS_TAB_PATH}/add`, `${ROUTING_CONFIGS_TAB_PATH}/add`);

    expect(screen.getByTestId('context-provider')).toContainElement(
      screen.getByTestId('create-edit-form'),
    );
  });
});
