import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import LlmAcceleratorConfigRoutes from '../LlmAcceleratorConfigRoutes';

jest.mock('@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed', () => ({
  useAccessAllowed: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/pages/NotFound', () => ({
  __esModule: true,
  default: () => <div data-testid="not-found">Not Found</div>,
}));

jest.mock('../LlmAcceleratorConfigContext', () => ({
  __esModule: true,
  default: () => <div data-testid="context-provider">Context Provider</div>,
}));

jest.mock('../LlmAcceleratorConfigView', () => ({
  __esModule: true,
  default: () => <div data-testid="view">View</div>,
}));

// Mock react-router-dom minimally for Routes/Route
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: ({ element }: { element?: React.ReactNode }) => <>{element}</>,
  Navigate: () => null,
}));

const mockUseAccessAllowed = jest.mocked(useAccessAllowed);

describe('LlmAcceleratorConfigRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render Spinner when RBAC checks are loading', () => {
    // First call (create) is loading
    mockUseAccessAllowed.mockReturnValueOnce([false, false]).mockReturnValueOnce([false, true]);

    render(<LlmAcceleratorConfigRoutes />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
    expect(screen.queryByTestId('context-provider')).not.toBeInTheDocument();
  });

  it('should render Spinner when patch check is loading', () => {
    // Second call (patch) is loading
    mockUseAccessAllowed.mockReturnValueOnce([true, true]).mockReturnValueOnce([false, false]);

    render(<LlmAcceleratorConfigRoutes />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
    expect(screen.queryByTestId('context-provider')).not.toBeInTheDocument();
  });

  it('should render NotFound when user cannot create configs', () => {
    mockUseAccessAllowed.mockReturnValueOnce([false, true]).mockReturnValueOnce([true, true]);

    render(<LlmAcceleratorConfigRoutes />);

    expect(screen.getByTestId('not-found')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('context-provider')).not.toBeInTheDocument();
  });

  it('should render NotFound when user cannot patch configs', () => {
    mockUseAccessAllowed.mockReturnValueOnce([true, true]).mockReturnValueOnce([false, true]);

    render(<LlmAcceleratorConfigRoutes />);

    expect(screen.getByTestId('not-found')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('context-provider')).not.toBeInTheDocument();
  });

  it('should render routes when user has both create and patch permissions', () => {
    mockUseAccessAllowed.mockReturnValue([true, true]);

    render(<LlmAcceleratorConfigRoutes />);

    expect(screen.getByTestId('context-provider')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
  });
});
