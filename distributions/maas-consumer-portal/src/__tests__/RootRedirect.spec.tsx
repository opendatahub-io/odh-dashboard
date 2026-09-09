import React from 'react';
import { MemoryRouter, useHref, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import RootRedirect from '../RootRedirect';
import { PORTAL_BASE_PATH, PORTAL_ROOT_REDIRECT_PATH } from '../portalPaths';

const CurrentPath: React.FC = () => {
  const location = useLocation();
  return <span data-testid="current-path">{location.pathname}</span>;
};

const RedirectedHref: React.FC = () => (
  <span data-testid="redirected-href">{useHref(PORTAL_ROOT_REDIRECT_PATH)}</span>
);

describe('RootRedirect', () => {
  it('should preserve the portal basename while redirecting its root', () => {
    render(
      <MemoryRouter basename={PORTAL_BASE_PATH} initialEntries={[`${PORTAL_BASE_PATH}/`]}>
        <RootRedirect />
        <CurrentPath />
        <RedirectedHref />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('current-path').textContent).toBe('/maas/keys-and-subs');
    expect(screen.getByTestId('redirected-href').textContent).toBe(
      '/maas-consumer-portal/maas/keys-and-subs',
    );
  });
});
