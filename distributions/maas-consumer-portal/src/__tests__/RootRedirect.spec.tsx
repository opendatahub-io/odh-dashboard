import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import RootRedirect from '../RootRedirect';
import { PORTAL_BASE_PATH } from '../portalPaths';

const CurrentPath: React.FC = () => {
  const location = useLocation();
  return <span data-testid="current-path">{location.pathname}</span>;
};

describe('RootRedirect', () => {
  it('should preserve the portal basename while redirecting its root', () => {
    render(
      <MemoryRouter basename={PORTAL_BASE_PATH} initialEntries={[`${PORTAL_BASE_PATH}/`]}>
        <RootRedirect />
        <CurrentPath />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('current-path').textContent).toBe('/maas/keys-and-subs');
  });
});
