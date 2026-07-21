import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import OdhUnavailableModelRegistry from '~/odh/components/OdhUnavailableModelRegistry';

jest.mock('mod-arch-shared', () => ({
  WhosMyAdministrator: ({ linkTestId }: { linkTestId?: string }) => (
    <button type="button" data-testid={linkTestId}>
      Who is my administrator?
    </button>
  ),
}));

const REGISTRY_DISPLAY_NAME = 'My Registry';
const SETTINGS_URL = '/model-registry-settings';
const SETTINGS_TITLE = 'Model registry settings';

describe('OdhUnavailableModelRegistry', () => {
  it('renders admin-specific messaging and settings link for admin users', () => {
    render(
      <MemoryRouter>
        <OdhUnavailableModelRegistry
          registryDisplayName={REGISTRY_DISPLAY_NAME}
          isAdmin
          settingsUrl={SETTINGS_URL}
          settingsTitle={SETTINGS_TITLE}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Model registry unavailable')).toBeVisible();
    expect(
      screen.getByText(
        `The ${REGISTRY_DISPLAY_NAME} registry is currently unavailable. Check the registry configuration in settings to troubleshoot the issue.`,
      ),
    ).toBeVisible();

    const settingsLink = screen.getByTestId('registry-settings-link');
    expect(settingsLink).toBeVisible();
    expect(settingsLink).toHaveTextContent(`Go to ${SETTINGS_TITLE}`);
    expect(settingsLink).toHaveAttribute('href', SETTINGS_URL);

    expect(screen.queryByTestId('whos-my-admin-link')).not.toBeInTheDocument();
  });

  it("renders non-admin messaging with Who's my administrator link for non-admin users", () => {
    render(
      <MemoryRouter>
        <OdhUnavailableModelRegistry
          registryDisplayName={REGISTRY_DISPLAY_NAME}
          isAdmin={false}
          settingsUrl={SETTINGS_URL}
          settingsTitle={SETTINGS_TITLE}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Model registry unavailable')).toBeVisible();
    expect(
      screen.getByText(
        `The ${REGISTRY_DISPLAY_NAME} registry is currently unavailable. It might still be starting up, or there might be a configuration error. Wait a few minutes and try again. If the problem persists, contact your administrator.`,
      ),
    ).toBeVisible();

    expect(screen.getByTestId('whos-my-admin-link')).toBeVisible();

    expect(screen.queryByTestId('registry-settings-link')).not.toBeInTheDocument();
  });
});
