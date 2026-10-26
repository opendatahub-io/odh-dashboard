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
import { useIsMaasAdmin } from '~/app/hooks/useIsMaasAdmin';
import {
  MAAS_PUBLISHED_INTERNAL_ALERT_ID,
  MaaSPublishedPostDeployAlert,
} from '~/odh/modelServingExtensions/MaaSPublishedPostDeployAlert';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('~/app/hooks/useIsMaasAdmin', () => ({
  useIsMaasAdmin: jest.fn(),
}));

const mockUseIsMaasAdmin = jest.mocked(useIsMaasAdmin);

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
    mockUseIsMaasAdmin.mockReturnValue([false, true, undefined]);
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

  it('should show the governance link when the user is a MaaS admin', () => {
    mockUseIsMaasAdmin.mockReturnValue([true, true, undefined]);
    enqueuePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID, { modelName: 'Test model' });

    renderAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);

    expect(screen.getByText('Go to MaaS governance')).toBeInTheDocument();
  });

  it('should not show the governance link when the user is not a MaaS admin', () => {
    mockUseIsMaasAdmin.mockReturnValue([false, true, undefined]);
    enqueuePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID, { modelName: 'Test model' });

    renderAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);

    expect(screen.queryByText('Go to MaaS governance')).not.toBeInTheDocument();
  });

  it('should not show the governance link while MaaS admin status is loading', () => {
    mockUseIsMaasAdmin.mockReturnValue([true, false, undefined]);
    enqueuePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID, { modelName: 'Test model' });

    renderAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);

    expect(screen.queryByText('Go to MaaS governance')).not.toBeInTheDocument();
  });

  it('should navigate to MaaS governance when the admin link is clicked', async () => {
    const user = userEvent.setup();
    mockUseIsMaasAdmin.mockReturnValue([true, true, undefined]);
    enqueuePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID, { modelName: 'Test model' });

    renderAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);

    await user.click(screen.getByText('Go to MaaS governance'));

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
