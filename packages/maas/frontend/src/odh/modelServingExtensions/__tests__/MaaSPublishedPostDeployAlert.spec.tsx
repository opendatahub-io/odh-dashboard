import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import {
  dismissPostDeployAlert,
  enqueuePostDeployAlert,
  resetPostDeployAlerts,
} from '~/app/utilities/postDeployAlertStore';
import { getMaaSWhoAmI } from '~/app/api/whoami';
import {
  MAAS_PUBLISHED_INTERNAL_ALERT_ID,
  MaaSPublishedPostDeployAlert,
} from '~/odh/modelServingExtensions/MaaSPublishedPostDeployAlert';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('~/app/api/whoami', () => ({ getMaaSWhoAmI: jest.fn() }));

const mockGetMaaSWhoAmI = jest.mocked(getMaaSWhoAmI);

const renderAlert = (alertId: string, modelName = 'Test model'): void => {
  render(
    <MemoryRouter initialEntries={['/ai-hub/models/deployments/external/test-project']}>
      <MaaSPublishedPostDeployAlert alertId={alertId} modelName={modelName} />
    </MemoryRouter>,
  );
};

describe('MaaSPublishedPostDeployAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPostDeployAlerts();
    mockGetMaaSWhoAmI.mockReturnValue(() => Promise.resolve({ sub: 'user-123', isAdmin: false }));
  });

  it('should not render when the alert id is not enqueued', () => {
    renderAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);

    expect(screen.queryByTestId('maas-published-post-deploy-alert')).not.toBeInTheDocument();
  });

  it('should render when the alert id is enqueued', () => {
    enqueuePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID, { modelName: 'Test model' });

    renderAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);

    expect(screen.getByTestId('maas-published-post-deploy-alert')).toBeInTheDocument();
    expect(
      screen.getByText('Additional configuration required for Test model'),
    ).toBeInTheDocument();
  });

  it('should dismiss the alert when the close button is clicked', async () => {
    const user = userEvent.setup();
    enqueuePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID, { modelName: 'Test model' });

    renderAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);

    expect(screen.getByTestId('maas-published-post-deploy-alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByTestId('maas-published-post-deploy-alert')).not.toBeInTheDocument();
  });

  it('should show the governance link when the user is a MaaS admin', async () => {
    mockGetMaaSWhoAmI.mockReturnValue(() => Promise.resolve({ sub: 'user-123', isAdmin: true }));
    enqueuePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID, { modelName: 'Test model' });

    renderAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);

    expect(await screen.findByText('Go to MaaS governance')).toBeInTheDocument();
  });

  it('should not show the governance link when the user is not a MaaS admin', () => {
    mockGetMaaSWhoAmI.mockReturnValue(() => Promise.resolve({ sub: 'user-123', isAdmin: false }));
    enqueuePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID, { modelName: 'Test model' });

    renderAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);

    expect(screen.queryByText('Go to MaaS governance')).not.toBeInTheDocument();
  });

  it('should not show the governance link while MaaS admin status is loading', () => {
    mockGetMaaSWhoAmI.mockReturnValue(
      () =>
        new Promise(() => {
          // Keep the request pending to verify the loading state.
        }),
    );
    enqueuePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID, { modelName: 'Test model' });

    renderAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);

    expect(screen.queryByText('Go to MaaS governance')).not.toBeInTheDocument();
  });

  it('should navigate to MaaS governance when the admin link is clicked', async () => {
    const user = userEvent.setup();
    mockGetMaaSWhoAmI.mockReturnValue(() => Promise.resolve({ sub: 'user-123', isAdmin: true }));
    enqueuePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID, { modelName: 'Test model' });

    renderAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);

    await user.click(await screen.findByText('Go to MaaS governance'));

    expect(mockNavigate).toHaveBeenCalledWith('/maas/maas-governance/overview', {
      state: {
        overviewFilter: {
          modelName: 'Test model',
        },
      },
    });
  });

  it('should not render an alert for a different alert id', () => {
    enqueuePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID, { modelName: 'Test model' });

    renderAlert('other-alert-id');

    expect(screen.queryByTestId('maas-published-post-deploy-alert')).not.toBeInTheDocument();

    dismissPostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);
  });
});
