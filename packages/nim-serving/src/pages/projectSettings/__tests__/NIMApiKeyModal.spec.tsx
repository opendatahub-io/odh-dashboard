import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import { createTrackingTestWrapper } from '../../../__tests__/unit/testUtils/TrackingProvider';
import { NIMAccountStatus } from '../../../api/accounts/hooks';
import { createNIMResources, createOrReplaceSecret } from '../../../api/accounts/api';
import { NimAccountEnabledMode, NimFailureCategory } from '../../../tracking/nimTrackingConstants';
import NIMApiKeyModal from '../NIMApiKeyModal';

jest.mock('../../../api/accounts/api', () => ({
  createNIMResources: jest.fn(),
  createOrReplaceSecret: jest.fn(),
}));

const mockCreateNIMResources = jest.mocked(createNIMResources);
const mockCreateOrReplaceSecret = jest.mocked(createOrReplaceSecret);
const trackEvent = jest.fn();
const trackPageEvent = jest.fn();
const TrackingWrapper = createTrackingTestWrapper({ trackEvent, trackPageEvent });
const renderWithTracking = (ui: React.ReactElement) => render(ui, { wrapper: TrackingWrapper });

const defaultProps = {
  onClose: jest.fn(),
  namespace: 'test-ns',
  refresh: jest.fn().mockResolvedValue(undefined),
  startRevalidation: jest.fn(),
};

describe('NIMApiKeyModal tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateNIMResources.mockResolvedValue({} as never);
    mockCreateOrReplaceSecret.mockResolvedValue({} as never);
  });

  afterEach(() => {
    expect(trackPageEvent).not.toHaveBeenCalled();
  });

  it('should track successful enable after account validation', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderWithTracking(
      <NIMApiKeyModal
        {...defaultProps}
        refresh={refresh}
        accountStatus={NIMAccountStatus.NOT_FOUND}
      />,
    );

    await userEvent.type(screen.getByTestId('nim-api-key-input'), 'nvapi-test-key');
    await userEvent.click(screen.getByTestId('nim-api-key-submit'));

    await waitFor(() => {
      expect(mockCreateNIMResources).toHaveBeenCalledWith('test-ns', 'nvapi-test-key');
    });

    rerender(
      <NIMApiKeyModal
        {...defaultProps}
        refresh={refresh}
        accountStatus={NIMAccountStatus.PENDING}
      />,
    );

    rerender(
      <NIMApiKeyModal {...defaultProps} refresh={refresh} accountStatus={NIMAccountStatus.READY} />,
    );

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Enabled', {
        outcome: TrackingOutcome.submit,
        success: true,
        mode: NimAccountEnabledMode.ENABLE,
      });
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it('should track API failures on submit with an allowlisted error category', async () => {
    mockCreateNIMResources.mockRejectedValue(new Error('Forbidden'));

    renderWithTracking(
      <NIMApiKeyModal {...defaultProps} accountStatus={NIMAccountStatus.NOT_FOUND} />,
    );

    await userEvent.type(screen.getByTestId('nim-api-key-input'), 'nvapi-test-key');
    await userEvent.click(screen.getByTestId('nim-api-key-submit'));

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Enabled', {
        outcome: TrackingOutcome.submit,
        success: false,
        error: NimFailureCategory.API_FAILED,
        mode: NimAccountEnabledMode.ENABLE,
      });
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it('should track validation failures after replace submit', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderWithTracking(
      <NIMApiKeyModal {...defaultProps} refresh={refresh} accountStatus={NIMAccountStatus.READY} />,
    );

    await userEvent.type(screen.getByTestId('nim-api-key-input'), 'nvapi-test-key');
    await userEvent.click(screen.getByTestId('nim-api-key-submit'));

    await waitFor(() => {
      expect(mockCreateOrReplaceSecret).toHaveBeenCalledWith('test-ns', 'nvapi-test-key');
    });

    rerender(
      <NIMApiKeyModal
        {...defaultProps}
        refresh={refresh}
        accountStatus={NIMAccountStatus.PENDING}
      />,
    );

    rerender(
      <NIMApiKeyModal {...defaultProps} refresh={refresh} accountStatus={NIMAccountStatus.ERROR} />,
    );

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Enabled', {
        outcome: TrackingOutcome.submit,
        success: false,
        error: NimFailureCategory.VALIDATION_FAILED,
        mode: NimAccountEnabledMode.REPLACE,
      });
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it('should not track submit failure when refresh fails after a successful create', async () => {
    const refresh = jest.fn().mockRejectedValue(new Error('Refresh failed'));
    renderWithTracking(
      <NIMApiKeyModal
        {...defaultProps}
        refresh={refresh}
        accountStatus={NIMAccountStatus.NOT_FOUND}
      />,
    );

    await userEvent.type(screen.getByTestId('nim-api-key-input'), 'nvapi-test-key');
    await userEvent.click(screen.getByTestId('nim-api-key-submit'));

    await waitFor(() => {
      expect(mockCreateNIMResources).toHaveBeenCalledWith('test-ns', 'nvapi-test-key');
      expect(screen.getByText('Refresh failed')).toBeInTheDocument();
    });

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('should track a successful retry after validation failure', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderWithTracking(
      <NIMApiKeyModal
        {...defaultProps}
        refresh={refresh}
        accountStatus={NIMAccountStatus.NOT_FOUND}
      />,
    );

    await userEvent.type(screen.getByTestId('nim-api-key-input'), 'nvapi-bad-key');
    await userEvent.click(screen.getByTestId('nim-api-key-submit'));

    await waitFor(() => {
      expect(mockCreateNIMResources).toHaveBeenCalledWith('test-ns', 'nvapi-bad-key');
    });

    rerender(
      <NIMApiKeyModal
        {...defaultProps}
        refresh={refresh}
        accountStatus={NIMAccountStatus.PENDING}
      />,
    );
    rerender(
      <NIMApiKeyModal {...defaultProps} refresh={refresh} accountStatus={NIMAccountStatus.ERROR} />,
    );

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Enabled', {
        outcome: TrackingOutcome.submit,
        success: false,
        error: NimFailureCategory.VALIDATION_FAILED,
        mode: NimAccountEnabledMode.ENABLE,
      });
    });

    await userEvent.clear(screen.getByTestId('nim-api-key-input'));
    await userEvent.type(screen.getByTestId('nim-api-key-input'), 'nvapi-good-key');
    await userEvent.click(screen.getByTestId('nim-api-key-submit'));

    rerender(
      <NIMApiKeyModal
        {...defaultProps}
        refresh={refresh}
        accountStatus={NIMAccountStatus.PENDING}
      />,
    );
    rerender(
      <NIMApiKeyModal {...defaultProps} refresh={refresh} accountStatus={NIMAccountStatus.READY} />,
    );

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledTimes(2);
      expect(trackEvent).toHaveBeenLastCalledWith('Model Serving NIM Account Enabled', {
        outcome: TrackingOutcome.submit,
        success: true,
        mode: NimAccountEnabledMode.REPLACE,
      });
    });
  });

  it('should not include the API key in tracking payloads', async () => {
    mockCreateNIMResources.mockRejectedValue(new Error('Forbidden: nvapi-secret-key'));

    renderWithTracking(
      <NIMApiKeyModal {...defaultProps} accountStatus={NIMAccountStatus.NOT_FOUND} />,
    );

    await userEvent.type(screen.getByTestId('nim-api-key-input'), 'nvapi-secret-key');
    await userEvent.click(screen.getByTestId('nim-api-key-submit'));

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalled();
    });

    const trackingPayload = JSON.stringify(trackEvent.mock.calls[0]);
    expect(trackingPayload).not.toContain('nvapi-secret-key');
    expect(trackingPayload).not.toContain('Forbidden');
  });

  it.each([NIMAccountStatus.NOT_FOUND, NIMAccountStatus.READY])(
    'should emit nothing when cancelling an unsubmitted account dialog in %s state',
    async (accountStatus) => {
      renderWithTracking(<NIMApiKeyModal {...defaultProps} accountStatus={accountStatus} />);

      await userEvent.type(screen.getByTestId('nim-api-key-input'), 'nvapi-secret-key');
      await userEvent.click(screen.getByTestId('nim-api-key-cancel'));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
      expect(trackEvent).not.toHaveBeenCalled();
      expect(trackPageEvent).not.toHaveBeenCalled();
      expect(mockCreateNIMResources).not.toHaveBeenCalled();
      expect(mockCreateOrReplaceSecret).not.toHaveBeenCalled();
    },
  );
});
