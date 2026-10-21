import React from 'react';
import { MemoryRouter, Route, Routes, useHref, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import RootRedirect from '../RootRedirect';
import { GRID } from '../featureFlags';
import { PORTAL_BASE_PATH } from '../portalPaths';

const CurrentPath: React.FC = () => {
  const location = useLocation();
  const href = useHref(location.pathname);
  return (
    <>
      <span data-testid="current-path">{location.pathname}</span>
      <span data-testid="redirected-href">{href}</span>
    </>
  );
};

describe('RootRedirect', () => {
  describe.each(['/', '/maas'])('from %s', (path) => {
    it.each([
      { grid: true, destination: '/maas/models' },
      { grid: false, destination: '/gen-ai-studio/assets' },
      { grid: undefined, destination: '/gen-ai-studio/assets' },
    ])(
      'should redirect to $destination with grid=$grid and preserve the basename',
      ({ grid, destination }) => {
        const store = new PluginStore({});
        if (grid !== undefined) {
          store.setFeatureFlags({ [GRID]: grid });
        }

        render(
          <PluginStoreProvider store={store}>
            <MemoryRouter
              basename={PORTAL_BASE_PATH}
              initialEntries={[`${PORTAL_BASE_PATH}${path}`]}
            >
              <Routes>
                <Route path={path} element={<RootRedirect />} />
                <Route path="*" element={<CurrentPath />} />
              </Routes>
            </MemoryRouter>
          </PluginStoreProvider>,
        );

        expect(screen.getByTestId('current-path').textContent).toBe(destination);
        expect(screen.getByTestId('redirected-href').textContent).toBe(
          `${PORTAL_BASE_PATH}${destination}`,
        );
      },
    );
  });
});
