import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnavailableModelRegistry from '~/app/pages/modelRegistry/screens/UnavailableModelRegistry';

jest.mock('~/app/pages/modelRegistry/screens/components/AdminHelpAction', () => {
  const AdminHelpAction = () => <div data-testid="admin-help-action">AdminHelpAction</div>;
  AdminHelpAction.displayName = 'AdminHelpAction';
  return { __esModule: true, default: AdminHelpAction };
});

describe('UnavailableModelRegistry', () => {
  it('should show non-admin messaging by default', () => {
    render(<UnavailableModelRegistry registryDisplayName="Test Registry" />);

    expect(screen.getByTestId('unavailable-model-registry')).toBeInTheDocument();
    expect(screen.getByText('Model registry unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(
        /contact your administrator/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('admin-help-action')).toBeInTheDocument();
  });

  it('should include registry display name in body text', () => {
    render(<UnavailableModelRegistry registryDisplayName="My Custom Registry" />);

    expect(screen.getByText(/My Custom Registry/)).toBeInTheDocument();
  });

  it('should show admin messaging when isAdmin is true and adminAction is provided', () => {
    const adminAction = <a data-testid="settings-link" href="/settings">Go to settings</a>;
    render(
      <UnavailableModelRegistry
        registryDisplayName="Test Registry"
        isAdmin
        adminAction={adminAction}
      />,
    );

    expect(
      screen.getByText(/check the registry configuration in Settings/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/contact your administrator/)).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-link')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-help-action')).not.toBeInTheDocument();
  });

  it('should show AdminHelpAction when isAdmin is true but no adminAction provided', () => {
    render(<UnavailableModelRegistry registryDisplayName="Test Registry" isAdmin />);

    expect(screen.getByTestId('admin-help-action')).toBeInTheDocument();
  });

  it('should show AdminHelpAction when isAdmin is false', () => {
    render(
      <UnavailableModelRegistry
        registryDisplayName="Test Registry"
        isAdmin={false}
      />,
    );

    expect(
      screen.getByText(/contact your administrator/),
    ).toBeInTheDocument();
    expect(screen.getByTestId('admin-help-action')).toBeInTheDocument();
  });
});
