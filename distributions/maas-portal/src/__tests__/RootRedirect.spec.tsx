import React from 'react';
import { MemoryRouter, Route, Routes, useHref, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import RootRedirect from '../RootRedirect';
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
    it('redirects to Model endpoints and preserves the basename', () => {
      render(
        <MemoryRouter basename={PORTAL_BASE_PATH} initialEntries={[`${PORTAL_BASE_PATH}${path}`]}>
          <Routes>
            <Route path={path} element={<RootRedirect />} />
            <Route path="*" element={<CurrentPath />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('current-path').textContent).toBe('/maas/models');
      expect(screen.getByTestId('redirected-href').textContent).toBe(
        `${PORTAL_BASE_PATH}/maas/models`,
      );
    });
  });
});
