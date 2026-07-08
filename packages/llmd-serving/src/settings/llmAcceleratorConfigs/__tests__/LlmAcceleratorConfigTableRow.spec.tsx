import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import LlmAcceleratorConfigTableRow from '../LlmAcceleratorConfigTableRow';
import { isConfigEnabled, isConfigPreInstalled } from '../../../utils';
import { isUnsupportedResource } from '@odh-dashboard/model-serving/concepts/unsupportedResources';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';

jest.mock('@odh-dashboard/ui-core', () => ({
  ResourceNameTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@odh-dashboard/model-serving/concepts/unsupportedResources', () => ({
  isUnsupportedResource: jest.fn(),
}));

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  isConfigEnabled: jest.fn(),
  isConfigPreInstalled: jest.fn(),
}));

const mockIsUnsupportedResource = jest.mocked(isUnsupportedResource);
const mockIsConfigEnabled = jest.mocked(isConfigEnabled);
const mockIsConfigPreInstalled = jest.mocked(isConfigPreInstalled);

describe('LlmAcceleratorConfigTableRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsUnsupportedResource.mockReturnValue(false);
    mockIsConfigEnabled.mockReturnValue(true);
    mockIsConfigPreInstalled.mockReturnValue(false);
  });

  it('should render the display name', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      displayName: 'Custom Display Name',
    });

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} onDeleteConfig={jest.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('Custom Display Name')).toBeInTheDocument();
  });

  it('should show Pre-installed label for pre-installed configs', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      preInstalled: true,
    });

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} onDeleteConfig={jest.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('pre-installed-label')).toBeInTheDocument();
    expect(screen.getByTestId('pre-installed-label')).toHaveTextContent('Pre-installed');
  });

  it('should not show Pre-installed label for user-created configs', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      preInstalled: false,
    });

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} onDeleteConfig={jest.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.queryByTestId('pre-installed-label')).not.toBeInTheDocument();
  });

  it('should show Unsupported label for unsupported configs', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      unsupported: true,
    });

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} onDeleteConfig={jest.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('unsupported-label')).toBeInTheDocument();
    expect(screen.getByTestId('unsupported-label')).toHaveTextContent('Unsupported');
  });

  it('should not show Unsupported label for supported configs', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      unsupported: false,
    });

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} onDeleteConfig={jest.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.queryByTestId('unsupported-label')).not.toBeInTheDocument();
  });

  it('should show both Pre-installed and Unsupported labels when both apply', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      preInstalled: true,
      unsupported: true,
    });

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} onDeleteConfig={jest.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('pre-installed-label')).toBeInTheDocument();
    expect(screen.getByTestId('unsupported-label')).toBeInTheDocument();
  });

  it('should render disabled unchecked toggle when config is disabled', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'my-config',
      disabled: true,
    });

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} onDeleteConfig={jest.fn()} />
        </tbody>
      </table>,
    );

    const toggle = screen.getByTestId('llm-accelerator-config-enabled-toggle-my-config');
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
    expect(toggle).toBeDisabled();
  });

  it('should render disabled checked toggle when config is enabled', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'enabled-config',
      disabled: false,
    });

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} onDeleteConfig={jest.fn()} />
        </tbody>
      </table>,
    );

    const toggle = screen.getByTestId('llm-accelerator-config-enabled-toggle-enabled-config');
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
  });

  it('should render kebab menu', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({});

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} onDeleteConfig={jest.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByRole('button', { name: /kebab toggle/i })).toBeInTheDocument();
  });

  it('should use correct data-testid for the row', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'my-test-config',
    });

    const { container } = render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} onDeleteConfig={jest.fn()} />
        </tbody>
      </table>,
    );

    expect(
      container.querySelector('[data-testid="llm-accelerator-config my-test-config"]'),
    ).toBeInTheDocument();
  });
});
