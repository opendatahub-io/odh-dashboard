import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useNIMSettingsAccessAllowed } from '../useNIMSettingsAccessAllowed';
import useNIMAccountStatus, { NIMAccountStatus } from '../../../api/accounts/hooks';
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
  const Mock = () => <div data-testid="nim-delete-modal" />;
  Mock.displayName = 'MockDeleteModal';
  return Mock;
});

const mockUseNIMSettingsAccessAllowed = jest.mocked(useNIMSettingsAccessAllowed);
const mockUseNIMAccountStatus = jest.mocked(useNIMAccountStatus);

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

  it('should show skeleton while access reviews are loading', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: false, allowed: undefined });
    render(<NIMSettingsCard namespace="test-ns" />);
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
    render(<NIMSettingsCard namespace="test-ns" />);
    expect(screen.getByTestId('nim-permissions-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('nim-enable-button')).not.toBeInTheDocument();
  });

  it('should show skeleton regardless of account status while RBAC loads', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: false, allowed: undefined });
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.ERROR,
      errorMessages: ['API key validation failed'],
    });
    render(<NIMSettingsCard namespace="test-ns" />);
    expect(screen.getByTestId('nim-permissions-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('nim-remove-button')).not.toBeInTheDocument();
    expect(screen.queryByText('API key validation failed')).not.toBeInTheDocument();
  });

  it('should show enabled button when user has all permissions and account is NOT_FOUND', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: true });
    render(<NIMSettingsCard namespace="test-ns" />);
    const button = screen.getByTestId('nim-enable-button');
    expect(button).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('should show disabled button when user lacks permission and account is NOT_FOUND', () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
    render(<NIMSettingsCard namespace="test-ns" />);
    const button = screen.getByTestId('nim-enable-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('should show permission tooltip when hovering disabled enable button', async () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
    render(<NIMSettingsCard namespace="test-ns" />);
    const button = screen.getByTestId('nim-enable-button');
    await userEvent.hover(button);
    expect(
      await screen.findByText(/don't have permission to add a personal API key/),
    ).toBeInTheDocument();
  });

  it('should not open API key modal when permission is denied and button is clicked', async () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
    render(<NIMSettingsCard namespace="test-ns" />);
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
    render(<NIMSettingsCard namespace="test-ns" />);
    expect(screen.getByTestId('nim-remove-button')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('nim-replace-key-button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('should show remove tooltip on disabled Remove button', async () => {
    mockUseNIMSettingsAccessAllowed.mockReturnValue({ loaded: true, allowed: false });
    mockUseNIMAccountStatus.mockReturnValue({
      ...defaultAccountStatus,
      status: NIMAccountStatus.READY,
    });
    render(<NIMSettingsCard namespace="test-ns" />);
    await userEvent.hover(screen.getByTestId('nim-remove-button'));
    expect(
      await screen.findByText(/don't have permission to remove a personal API key/),
    ).toBeInTheDocument();
  });
});
