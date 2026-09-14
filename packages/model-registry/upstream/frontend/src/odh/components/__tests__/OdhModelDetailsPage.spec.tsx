import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { AdminStatusProvider } from '~/odh/context/AdminStatusContext';
import OdhModelDetailsPage from '~/odh/components/OdhModelDetailsPage';

jest.mock('~/app/pages/modelCatalog/screens/ModelDetailsPage', () => {
  const MockModelDetailsPage = ({
    customNoRegistriesButton,
  }: {
    customNoRegistriesButton?: (variant: 'primary' | 'secondary') => React.ReactNode;
  }) => (
    <div data-testid="model-details-page">
      {customNoRegistriesButton ? (
        <div data-testid="custom-button-slot">{customNoRegistriesButton('primary')}</div>
      ) : (
        <div data-testid="default-button-slot">default register button</div>
      )}
    </div>
  );
  return { __esModule: true, default: MockModelDetailsPage };
});

const SETTINGS_URL = '/settings/model-resources-operations/model-registry';
const SETTINGS_TITLE = 'Model registry settings';

describe('OdhModelDetailsPage', () => {
  it('should pass the default register button when user is not admin', () => {
    render(
      <MemoryRouter>
        <AdminStatusProvider
          isAdmin={false}
          loaded
          settingsUrl={SETTINGS_URL}
          settingsTitle={SETTINGS_TITLE}
        >
          <OdhModelDetailsPage tab="overview" />
        </AdminStatusProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('default-button-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-button-slot')).not.toBeInTheDocument();
  });

  it('should pass the default register button when admin status has not loaded', () => {
    render(
      <MemoryRouter>
        <AdminStatusProvider
          isAdmin
          loaded={false}
          settingsUrl={SETTINGS_URL}
          settingsTitle={SETTINGS_TITLE}
        >
          <OdhModelDetailsPage tab="overview" />
        </AdminStatusProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('default-button-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-button-slot')).not.toBeInTheDocument();
  });

  it('should provide an admin-specific disabled register button for admin users', () => {
    render(
      <MemoryRouter>
        <AdminStatusProvider
          isAdmin
          loaded
          settingsUrl={SETTINGS_URL}
          settingsTitle={SETTINGS_TITLE}
        >
          <OdhModelDetailsPage tab="overview" />
        </AdminStatusProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('default-button-slot')).not.toBeInTheDocument();
    expect(screen.getByTestId('custom-button-slot')).toBeInTheDocument();

    const registerButton = screen.getByTestId('register-model-button');
    expect(registerButton).toHaveTextContent('Register model');
    expect(registerButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should pass the default register button when no provider wraps the component', () => {
    render(
      <MemoryRouter>
        <OdhModelDetailsPage tab="overview" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('default-button-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-button-slot')).not.toBeInTheDocument();
  });
});
