import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Outlet } from 'react-router-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import LlmInferenceServiceConfigContextProvider from '../LlmInferenceServiceConfigContext';
import { useWatchLLMInferenceServiceConfigs } from '../../../api/LLMInferenceServiceConfigs';
import { ConfigType } from '../../../types';
import { createTestProviders } from '../../../__tests__/hostApiTestUtils';

const { wrapper } = createTestProviders();

jest.mock('../../../api/LLMInferenceServiceConfigs', () => ({
  useWatchLLMInferenceServiceConfigs: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  Outlet: jest.fn(() => <div data-testid="outlet">Outlet Content</div>),
}));

const mockUseWatchLLMInferenceServiceConfigs = jest.mocked(useWatchLLMInferenceServiceConfigs);
const MockedOutlet = jest.mocked(Outlet);

describe('LlmInferenceServiceConfigContextProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render EmptyState with danger status when there is an error', () => {
    const error = new Error('Failed to load configurations');
    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([[], false, error]);

    render(<LlmInferenceServiceConfigContextProvider />, { wrapper });

    expect(
      screen.getByText('Problem loading LLM inference service configurations'),
    ).toBeInTheDocument();
    expect(screen.getByText('Failed to load configurations')).toBeInTheDocument();
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
  });

  it('should render Spinner when loading', () => {
    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([[], false, undefined]);

    render(<LlmInferenceServiceConfigContextProvider />, { wrapper });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
  });

  it('should render Outlet with context when loaded', () => {
    const mockConfigs = [mockLLMInferenceServiceConfigK8sResource({ name: 'test-config' })];

    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([mockConfigs, true, undefined]);

    render(<LlmInferenceServiceConfigContextProvider />, { wrapper });

    expect(MockedOutlet).toHaveBeenCalled();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('should call useWatchLLMInferenceServiceConfigs with correct parameters', () => {
    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([[], true, undefined]);

    render(<LlmInferenceServiceConfigContextProvider />, { wrapper });

    expect(mockUseWatchLLMInferenceServiceConfigs).toHaveBeenCalledWith('opendatahub', {
      'opendatahub.io/config-type': ConfigType.ACCELERATOR,
    });
  });
});
