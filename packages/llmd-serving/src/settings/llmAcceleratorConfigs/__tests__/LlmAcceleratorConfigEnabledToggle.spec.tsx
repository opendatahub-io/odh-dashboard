import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import LlmAcceleratorConfigEnabledToggle from '../LlmAcceleratorConfigEnabledToggle';
import { patchLLMInferenceServiceConfig } from '../../../api/LLMInferenceServiceConfigs';
import type { LLMInferenceServiceConfigKind } from '../../../types';

jest.mock('@odh-dashboard/internal/utilities/useNotification', () => {
  const mockNotification = { error: jest.fn(), success: jest.fn(), info: jest.fn() };
  return { __esModule: true, default: () => mockNotification };
});

jest.mock('../../../api/LLMInferenceServiceConfigs', () => ({
  patchLLMInferenceServiceConfig: jest.fn(),
}));

const mockPatchConfig = jest.mocked(patchLLMInferenceServiceConfig);

const mockNotification =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@odh-dashboard/internal/utilities/useNotification').default();

describe('LlmAcceleratorConfigEnabledToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPatchConfig.mockResolvedValue({} as LLMInferenceServiceConfigKind);
  });

  it('should render a checked toggle when config is enabled', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({});

    render(<LlmAcceleratorConfigEnabledToggle config={config} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeChecked();
  });

  it('should render an unchecked toggle when config is disabled', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ disabled: true });

    render(<LlmAcceleratorConfigEnabledToggle config={config} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
  });

  it('should patch disabled annotation to true when toggling off', async () => {
    const config = mockLLMInferenceServiceConfigK8sResource({});

    render(<LlmAcceleratorConfigEnabledToggle config={config} />);

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(mockPatchConfig).toHaveBeenCalledWith(
        config,
        expect.objectContaining({
          metadata: expect.objectContaining({
            annotations: expect.objectContaining({
              'opendatahub.io/disabled': 'true',
            }),
          }),
        }),
      );
    });
  });

  it('should patch disabled annotation to false when toggling on a supported config', async () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ disabled: true });

    render(<LlmAcceleratorConfigEnabledToggle config={config} />);

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(mockPatchConfig).toHaveBeenCalledWith(
        config,
        expect.objectContaining({
          metadata: expect.objectContaining({
            annotations: expect.objectContaining({
              'opendatahub.io/disabled': 'false',
            }),
          }),
        }),
      );
    });
  });

  it('should show error notification on patch failure', async () => {
    const config = mockLLMInferenceServiceConfigK8sResource({});
    mockPatchConfig.mockRejectedValue(new Error('Network error'));

    render(<LlmAcceleratorConfigEnabledToggle config={config} />);

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Error updating accelerator configuration',
        'Network error',
      );
    });
  });

  it('should show toggle OFF for unsupported unaccepted config regardless of disabled annotation', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ unsupported: true });

    render(<LlmAcceleratorConfigEnabledToggle config={config} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
  });

  it('should open acceptance modal when toggling ON an unsupported unaccepted config', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ unsupported: true });

    render(<LlmAcceleratorConfigEnabledToggle config={config} />);

    expect(screen.queryByTestId('unsupported-status-acceptance-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch'));

    expect(screen.getByTestId('unsupported-status-acceptance-modal')).toBeInTheDocument();
    expect(
      screen.getByText('Enable limited support accelerator configuration'),
    ).toBeInTheDocument();
    expect(mockPatchConfig).not.toHaveBeenCalled();
  });

  it('should patch both annotations on accept from the modal', async () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ unsupported: true });

    render(<LlmAcceleratorConfigEnabledToggle config={config} />);

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByTestId('unsupported-status-accept-button'));

    await waitFor(() => {
      expect(mockPatchConfig).toHaveBeenCalledWith(
        config,
        expect.objectContaining({
          metadata: expect.objectContaining({
            annotations: expect.objectContaining({
              'opendatahub.io/unsupported-status-accepted': 'true',
              'opendatahub.io/disabled': 'false',
            }),
          }),
        }),
      );
    });

    expect(screen.queryByTestId('unsupported-status-acceptance-modal')).not.toBeInTheDocument();
  });

  it('should close modal without patching when cancel is clicked', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ unsupported: true });

    render(<LlmAcceleratorConfigEnabledToggle config={config} />);

    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByTestId('unsupported-status-acceptance-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('unsupported-status-cancel-button'));

    expect(screen.queryByTestId('unsupported-status-acceptance-modal')).not.toBeInTheDocument();
    expect(mockPatchConfig).not.toHaveBeenCalled();
  });

  it('should toggle normally without modal for already-accepted unsupported config', async () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ unsupported: true, disabled: true });
    config.metadata.annotations = {
      ...config.metadata.annotations,
      'opendatahub.io/unsupported-status-accepted': 'true',
    };

    render(<LlmAcceleratorConfigEnabledToggle config={config} />);

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(mockPatchConfig).toHaveBeenCalledWith(
        config,
        expect.objectContaining({
          metadata: expect.objectContaining({
            annotations: expect.objectContaining({
              'opendatahub.io/disabled': 'false',
            }),
          }),
        }),
      );
    });

    expect(screen.queryByTestId('unsupported-status-acceptance-modal')).not.toBeInTheDocument();
  });
});
