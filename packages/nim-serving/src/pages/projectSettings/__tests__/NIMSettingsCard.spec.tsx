import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import { createTrackingTestWrapper } from '../../../__tests__/unit/testUtils/TrackingProvider';
import { useNIMSettingsAccessAllowed } from '../useNIMSettingsAccessAllowed';
import useNIMAccountStatus, { NIMAccountStatus } from '../../../api/accounts/hooks';
import { deleteNIMResources } from '../../../api/accounts/api';
import { NimFailureCategory } from '../../../tracking/nimTrackingConstants';
import NIMSettingsCard from '../NIMSettingsCard';

jest.mock('../useNIMSettingsAccessAllowed');

jest.mock('../../../api/accounts/hooks', () => ({
  __esModule: true,
  default: jest.fn(),
  NIMAccountStatus: {
    LOADING: 'LOADING',
    NOT_FOUND: 'NOT_FOUND',
    PENDING: 'PENDING',
    ERROR: 'ERROR',
    READY: 'READY',
  },
}));

jest.mock('../../../api/accounts/api', () => ({
  deleteNIMResources: jest.fn(),
}));

jest.mock('../NIMApiKeyModal', () => {
  const Mock = () => <div data-testid="nim-api-key-modal" />;
  Mock.displayName = 'MockNIMApiKeyModal';
  return Mock;
});

jest.mock('@odh-dashboard/internal/pages/projects/components/DeleteModal', () => {
  const Mock = ({
    onDelete,
    onClose,
  }: {
    onDelete: () => void | Promise<void>;
    onClose: () => void;
  }) => (
    <div data-testid="nim-delete-modal">
      <button type="button" data-testid="nim-delete-confirm" onClick={() => void onDelete()}>
        Confirm delete
      </button>
      <button type="button" data-testid="nim-delete-cancel" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
  Mock.displayName = 'MockDeleteModal';
  return Mock;
});

const mockUseNIMSettingsAccessAllowed = jest.mocked(useNIMSettingsAccessAllowed);
const mockUseNIMAccountStatus = jest.mocked(useNIMAccountStatus);
const mockDeleteNIMResources = jest.mocked(deleteNIMResources);
const trackEvent = jest.fn();
const trackPageEvent = jest.fn();
const TrackingWrapper = createTrackingTestWrapper({ trackEvent, trackPageEvent });
const renderWithTracking = (ui: React.ReactElement) => render(ui, { wrapper: TrackingWrapper });

const defaultAccountStatus = {
  status: NIMAccountStatus.NOT_FOUND,
  errorMessages: [],
  refresh: jest.fn().mockResolvedValue(undefined),
  startRevalidation: jest.fn(),
  nimAccount: null,
  loaded: true,
};

describe('NIMSettingsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNIMAccountStatus.mockReturnValue(defaultAccountStatus);
  });

  afterEach(() => {
    expect(trackPageEvent).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('should show skeleton while access reviews are loading', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: false, allowed: undefined });
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);
    expect(screen.getByTestId('nim-permissions-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('nim-enable-button')).not.toBeInTheDocument();
  });

  it('should show skeleton while NIM account status is loading', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.LOADING,
      loaded: false,
    });
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);
    expect(screen.getByTestId('nim-permissions-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('nim-enable-button')).not.toBeInTheDocument();
  });

  it('should show an actionable error when the NIM Account request fails', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.LOADING,
      loaded: false,
      loadError: new Error('Forbidden'),
    });

    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);

    expect(screen.getByText('Unable to load NVIDIA NIM account')).toBeInTheDocument();
    expect(screen.getByText(/permission to view NIM accounts/)).toBeInTheDocument();
    expect(screen.queryByTestId('nim-permissions-loading')).not.toBeInTheDocument();
  });

  it('should show skeleton regardless of account status while RBAC loads', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: false, allowed: undefined });
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.ERROR,
      errorMessages: ['API key validation failed'],
    });
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);
    expect(screen.getByTestId('nim-permissions-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('nim-remove-button')).not.toBeInTheDocument();
    expect(screen.queryByText('API key validation failed')).not.toBeInTheDocument();
  });

  it('should show enabled button when user has all permissions and account is NOT_FOUND', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);
    const button = screen.getByTestId('nim-enable-button');
    expect(button).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('should show disabled button when user lacks permission and account is NOT_FOUND', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);
    const button = screen.getByTestId('nim-enable-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('should show permission tooltip when hovering disabled enable button', async () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);
    const button = screen.getByTestId('nim-enable-button');
    await userEvent.hover(button);
    expect(
      await screen.findByText(/don't have permission to add a personal API key/),
    ).toBeInTheDocument();
  });

  it('should not open API key modal when permission is denied and button is clicked', async () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);
    const button = screen.getByTestId('nim-enable-button');
    await userEvent.click(button);
    expect(screen.queryByTestId('nim-api-key-modal')).not.toBeInTheDocument();
  });

  it('should show disabled Remove and Replace buttons when permission is denied in READY state', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.READY,
    });
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);
    expect(screen.getByTestId('nim-remove-button')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('nim-replace-key-button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('should show enabled Remove and Replace buttons when user has permission in READY state', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.READY,
    });
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);
    expect(screen.getByTestId('nim-remove-button')).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('nim-replace-key-button')).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('should show remove tooltip on disabled Remove button', async () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.READY,
    });
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);
    await userEvent.hover(screen.getByTestId('nim-remove-button'));
    expect(
      await screen.findByText(/don't have permission to remove a personal API key/),
    ).toBeInTheDocument();
  });

  it('should deliver one removal event after deletion completes', async () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.READY,
      refresh: jest.fn().mockResolvedValue(null),
    });
    mockDeleteNIMResources.mockResolvedValue(undefined);
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);

    expect(trackEvent).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('nim-remove-button'));
    await userEvent.click(screen.getByTestId('nim-delete-confirm'));

    await waitFor(() => expect(screen.queryByTestId('nim-delete-modal')).not.toBeInTheDocument());
    expect(trackEvent.mock.calls).toEqual([
      ['Model Serving NIM Account Removed', { outcome: 'submit', success: true }],
    ]);
  });

  it.each(['delete', 'refresh'])(
    'should deliver one allowlisted removal failure when %s fails',
    async (failure) => {
      mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
      const error = new Error('nvapi-secret-key: internal diagnostic');
      const refresh = jest.fn().mockResolvedValue(null);
      if (failure === 'refresh') {
        refresh.mockRejectedValue(error);
      }
      mockUseNIMAccountStatus.mockReturnValue({
        ...defaultAccountStatus,
        status: NIMAccountStatus.READY,
        refresh,
      });
      mockDeleteNIMResources.mockResolvedValue(undefined);
      if (failure === 'delete') {
        mockDeleteNIMResources.mockRejectedValue(error);
      }
      renderWithTracking(<NIMSettingsCard namespace="test-ns" />);

      await userEvent.click(screen.getByTestId('nim-remove-button'));
      await userEvent.click(screen.getByTestId('nim-delete-confirm'));

      await waitFor(() => expect(trackEvent).toHaveBeenCalledTimes(1));
      expect(trackEvent.mock.calls).toEqual([
        [
          'Model Serving NIM Account Removed',
          {
            outcome: 'submit',
            success: false,
            error: 'delete_failed',
          },
        ],
      ]);
    },
  );

  it('should emit nothing when cancelling an unsubmitted removal', async () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.READY,
    });
    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);

    await userEvent.click(screen.getByTestId('nim-remove-button'));
    await userEvent.click(screen.getByTestId('nim-delete-cancel'));

    expect(screen.queryByTestId('nim-delete-modal')).not.toBeInTheDocument();
    expect(trackEvent).not.toHaveBeenCalled();
    expect(mockDeleteNIMResources).not.toHaveBeenCalled();
  });

  it('should time out delete polling after ten seconds', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
    const refresh = jest.fn().mockResolvedValue({ name: 'nim-account' });
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.READY,
      refresh,
    });
    mockDeleteNIMResources.mockResolvedValue(undefined);

    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);

    await user.click(screen.getByTestId('nim-remove-button'));
    await user.click(screen.getByTestId('nim-delete-confirm'));

    await jest.advanceTimersByTimeAsync(9000);
    expect(trackEvent).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1000);
    expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Removed', {
      outcome: TrackingOutcome.submit,
      success: false,
      error: NimFailureCategory.DELETE_TIMEOUT,
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(10);

    jest.useRealTimers();
  });

  it('should stop delete polling when refresh hangs past the deadline', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
    const refresh = jest.fn(
      () =>
        new Promise<null>(() => {
          /* never resolves */
        }),
    );
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.READY,
      refresh,
    });
    mockDeleteNIMResources.mockResolvedValue(undefined);

    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);

    await user.click(screen.getByTestId('nim-remove-button'));
    await user.click(screen.getByTestId('nim-delete-confirm'));

    await jest.advanceTimersByTimeAsync(10000);
    expect(trackEvent).toHaveBeenCalledWith('Model Serving NIM Account Removed', {
      outcome: TrackingOutcome.submit,
      success: false,
      error: NimFailureCategory.DELETE_TIMEOUT,
    });

    await jest.advanceTimersByTimeAsync(5000);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('should ignore a late refresh completion after delete polling times out', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
    let resolveRefresh: ((value: null) => void) | undefined;
    const refresh = jest.fn(
      () =>
        new Promise<null>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.READY,
      refresh,
    });
    mockDeleteNIMResources.mockResolvedValue(undefined);

    renderWithTracking(<NIMSettingsCard namespace="test-ns" />);

    await user.click(screen.getByTestId('nim-remove-button'));
    await user.click(screen.getByTestId('nim-delete-confirm'));

    await jest.advanceTimersByTimeAsync(10000);
    expect(trackEvent).toHaveBeenCalledTimes(1);

    resolveRefresh?.(null);
    await Promise.resolve();
    await Promise.resolve();

    expect(trackEvent).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
