import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { NIMAccountStatus } from '../../../api/accounts/hooks';
import { createNIMResources, createOrReplaceSecret } from '../../../api/accounts/api';
import {
  fireNimAccountEnabled,
  NimAccountEnabledMode,
  NimFailureCategory,
} from '../../../tracking/nimTrackingConstants';
import NIMApiKeyModal from '../NIMApiKeyModal';

jest.mock('../../../api/accounts/api', () => ({
  createNIMResources: jest.fn(),
  createOrReplaceSecret: jest.fn(),
}));

jest.mock('../../../tracking/nimTrackingConstants', () => ({
  ...jest.requireActual('../../../tracking/nimTrackingConstants'),
  fireNimAccountEnabled: jest.fn(),
}));

const mockCreateNIMResources = jest.mocked(createNIMResources);
const mockCreateOrReplaceSecret = jest.mocked(createOrReplaceSecret);
const mockFireNimAccountEnabled = jest.mocked(fireNimAccountEnabled);

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

  it('should track successful enable after account validation', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const { rerender } = render(
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
      expect(mockFireNimAccountEnabled).toHaveBeenCalledWith({
        outcome: TrackingOutcome.submit,
        success: true,
        mode: NimAccountEnabledMode.ENABLE,
      });
    });
  });

  it('should track API failures on submit with an allowlisted error category', async () => {
    mockCreateNIMResources.mockRejectedValue(new Error('Forbidden'));

    render(<NIMApiKeyModal {...defaultProps} accountStatus={NIMAccountStatus.NOT_FOUND} />);

    await userEvent.type(screen.getByTestId('nim-api-key-input'), 'nvapi-test-key');
    await userEvent.click(screen.getByTestId('nim-api-key-submit'));

    await waitFor(() => {
      expect(mockFireNimAccountEnabled).toHaveBeenCalledWith({
        outcome: TrackingOutcome.submit,
        success: false,
        error: NimFailureCategory.API_FAILED,
        mode: NimAccountEnabledMode.ENABLE,
      });
    });
    expect(mockFireNimAccountEnabled).toHaveBeenCalledTimes(1);
  });

  it('should track validation failures after replace submit', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const { rerender } = render(
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
      expect(mockFireNimAccountEnabled).toHaveBeenCalledWith({
        outcome: TrackingOutcome.submit,
        success: false,
        error: NimFailureCategory.VALIDATION_FAILED,
        mode: NimAccountEnabledMode.REPLACE,
      });
    });
    expect(mockFireNimAccountEnabled).toHaveBeenCalledTimes(1);
  });

  it('should not include the API key in tracking payloads', async () => {
    mockCreateNIMResources.mockRejectedValue(new Error('Forbidden'));

    render(<NIMApiKeyModal {...defaultProps} accountStatus={NIMAccountStatus.NOT_FOUND} />);

    await userEvent.type(screen.getByTestId('nim-api-key-input'), 'nvapi-secret-key');
    await userEvent.click(screen.getByTestId('nim-api-key-submit'));

    await waitFor(() => {
      expect(mockFireNimAccountEnabled).toHaveBeenCalled();
    });

    const trackingPayload = JSON.stringify(mockFireNimAccountEnabled.mock.calls[0]);
    expect(trackingPayload).not.toContain('nvapi-secret-key');
    expect(trackingPayload).not.toContain('Forbidden');
  });
});
