import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useAccessReview } from '@odh-dashboard/internal/api';
import useNIMAccountStatus, { NIMAccountStatus } from '../../../api/accounts/hooks';
import NIMSettingsCard from '../NIMSettingsCard';

jest.mock('@odh-dashboard/internal/api', () => ({
  useAccessReview: jest.fn(),
}));

jest.mock('../../../api/accounts/hooks', () => ({
  __esModule: true,
  default: jest.fn(),
  NIMAccountStatus: {
    NOT_FOUND: 'NOT_FOUND',
    PENDING: 'PENDING',
    ERROR: 'ERROR',
    READY: 'READY',
  },
}));

jest.mock('../../../api/accounts/utils', () => ({
  deleteNIMResources: jest.fn(),
}));

jest.mock('../NIMApiKeyModal', () => {
  const Mock = () => <div data-testid="nim-api-key-modal" />;
  Mock.displayName = 'MockNIMApiKeyModal';
  return Mock;
});

jest.mock('@odh-dashboard/internal/pages/projects/components/DeleteModal', () => {
  const Mock = () => <div data-testid="nim-delete-modal" />;
  Mock.displayName = 'MockDeleteModal';
  return Mock;
});

const mockUseAccessReview = jest.mocked(useAccessReview);
const mockUseNIMAccountStatus = jest.mocked(useNIMAccountStatus);

describe('NIMSettingsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNIMAccountStatus.mockReturnValue({
      status: NIMAccountStatus.NOT_FOUND,
      errorMessages: [],
      refresh: jest.fn().mockResolvedValue(undefined),
      startRevalidation: jest.fn(),
      nimAccount: null,
      loaded: true,
    });
  });

  it('should show skeleton while access reviews are loading', () => {
    mockUseAccessReview.mockReturnValue([false, false]);
    render(<NIMSettingsCard namespace="test-ns" />);
    expect(screen.getByTestId('nim-permissions-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('nim-enable-button')).not.toBeInTheDocument();
  });

  it('should show enabled button when user has permission and account is NOT_FOUND', () => {
    mockUseAccessReview.mockReturnValue([true, true]);
    render(<NIMSettingsCard namespace="test-ns" />);
    const button = screen.getByTestId('nim-enable-button');
    expect(button).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('should show disabled button when user lacks permission and account is NOT_FOUND', () => {
    mockUseAccessReview.mockReturnValue([false, true]);
    render(<NIMSettingsCard namespace="test-ns" />);
    const button = screen.getByTestId('nim-enable-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('should show permission tooltip when hovering disabled enable button', async () => {
    mockUseAccessReview.mockReturnValue([false, true]);
    render(<NIMSettingsCard namespace="test-ns" />);
    const button = screen.getByTestId('nim-enable-button');
    await userEvent.hover(button);
    expect(
      await screen.findByText(/don't have permission to add a personal API key/),
    ).toBeInTheDocument();
  });

  it('should not open API key modal when permission is denied and button is clicked', async () => {
    mockUseAccessReview.mockReturnValue([false, true]);
    render(<NIMSettingsCard namespace="test-ns" />);
    const button = screen.getByTestId('nim-enable-button');
    await userEvent.click(button);
    expect(screen.queryByTestId('nim-api-key-modal')).not.toBeInTheDocument();
  });

  it('should show disabled Remove and Replace buttons when permission is denied in READY state', () => {
    mockUseAccessReview.mockReturnValue([false, true]);
    mockUseNIMAccountStatus.mockReturnValue({
      status: NIMAccountStatus.READY,
      errorMessages: [],
      refresh: jest.fn().mockResolvedValue(undefined),
      startRevalidation: jest.fn(),
      nimAccount: null,
      loaded: true,
    });
    render(<NIMSettingsCard namespace="test-ns" />);
    expect(screen.getByTestId('nim-remove-button')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('nim-replace-key-button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('should show remove tooltip on disabled Remove button', async () => {
    mockUseAccessReview.mockReturnValue([false, true]);
    mockUseNIMAccountStatus.mockReturnValue({
      status: NIMAccountStatus.READY,
      errorMessages: [],
      refresh: jest.fn().mockResolvedValue(undefined),
      startRevalidation: jest.fn(),
      nimAccount: null,
      loaded: true,
    });
    render(<NIMSettingsCard namespace="test-ns" />);
    await userEvent.hover(screen.getByTestId('nim-remove-button'));
    expect(
      await screen.findByText(/don't have permission to remove a personal API key/),
    ).toBeInTheDocument();
  });
});
