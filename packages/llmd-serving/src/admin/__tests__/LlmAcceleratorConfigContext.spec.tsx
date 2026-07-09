import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Outlet } from 'react-router-dom';
import LlmAcceleratorConfigContextProvider from '../LlmAcceleratorConfigContext';
import { useWatchLLMInferenceServiceConfigs } from '../../api/LLMInferenceServiceConfigs';
import { ConfigType, type LLMInferenceServiceConfigKind } from '../../types';

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: jest.fn(),
}));

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  useWatchLLMInferenceServiceConfigs: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  Outlet: jest.fn(() => <div data-testid="outlet">Outlet Content</div>),
}));

const mockUseDashboardNamespace = jest.mocked(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@odh-dashboard/internal/redux/selectors/project').useDashboardNamespace,
);

const mockUseWatchLLMInferenceServiceConfigs = jest.mocked(useWatchLLMInferenceServiceConfigs);
const MockedOutlet = jest.mocked(Outlet);

describe('LlmAcceleratorConfigContextProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'opendatahub' });
  });

  it('should render EmptyState with danger status when there is an error', () => {
    const error = new Error('Failed to load configurations');
    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([[], false, error]);

    render(<LlmAcceleratorConfigContextProvider />);

    expect(screen.getByText('Problem loading LLM accelerator configurations')).toBeInTheDocument();
    expect(screen.getByText('Failed to load configurations')).toBeInTheDocument();
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
  });

  it('should render Spinner when loading', () => {
    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([[], false, undefined]);

    render(<LlmAcceleratorConfigContextProvider />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
  });

  it('should render Outlet with context when loaded', () => {
    const mockConfigs: LLMInferenceServiceConfigKind[] = [
      {
        kind: 'LLMInferenceServiceConfig',
        apiVersion: 'serving.kserve.io/v1alpha2',
        metadata: {
          name: 'test-config',
          namespace: 'opendatahub',
        },
      },
    ];

    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([mockConfigs, true, undefined]);

    render(<LlmAcceleratorConfigContextProvider />);

    expect(MockedOutlet).toHaveBeenCalled();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('should call useWatchLLMInferenceServiceConfigs with correct parameters', () => {
    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([[], true, undefined]);

    render(<LlmAcceleratorConfigContextProvider />);

    expect(mockUseWatchLLMInferenceServiceConfigs).toHaveBeenCalledWith('opendatahub', {
      'opendatahub.io/config-type': ConfigType.ACCELERATOR,
    });
  });
});
