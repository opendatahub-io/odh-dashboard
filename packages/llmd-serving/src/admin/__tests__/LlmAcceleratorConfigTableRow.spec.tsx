import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LlmAcceleratorConfigTableRow from '../LlmAcceleratorConfigTableRow';
import { isConfigEnabled, isConfigPreInstalled } from '../../utils';
import type { LLMInferenceServiceConfigKind } from '../../types';

jest.mock('@odh-dashboard/ui-core', () => ({
  ResourceNameTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@odh-dashboard/k8s-core', () => ({
  getDisplayNameFromK8sResource: jest.fn(),
}));

jest.mock('@odh-dashboard/model-serving/concepts/unsupportedResources', () => ({
  isUnsupportedResource: jest.fn(),
}));

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  isConfigEnabled: jest.fn(),
  isConfigPreInstalled: jest.fn(),
}));

const mockGetDisplayNameFromK8sResource = jest.mocked(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@odh-dashboard/k8s-core').getDisplayNameFromK8sResource,
);
const mockIsUnsupportedResource = jest.mocked(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@odh-dashboard/model-serving/concepts/unsupportedResources').isUnsupportedResource,
);

const mockIsConfigEnabled = jest.mocked(isConfigEnabled);
const mockIsConfigPreInstalled = jest.mocked(isConfigPreInstalled);

const createMockConfig = (
  overrides: Partial<LLMInferenceServiceConfigKind> = {},
): LLMInferenceServiceConfigKind => ({
  kind: 'LLMInferenceServiceConfig',
  apiVersion: 'serving.kserve.io/v1alpha2',
  metadata: {
    name: 'test-config',
    namespace: 'opendatahub',
    ...overrides.metadata,
  },
  ...overrides,
});

describe('LlmAcceleratorConfigTableRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDisplayNameFromK8sResource.mockReturnValue('Test Config Display Name');
    mockIsUnsupportedResource.mockReturnValue(false);
    mockIsConfigEnabled.mockReturnValue(true);
    mockIsConfigPreInstalled.mockReturnValue(false);
  });

  it('should render the display name from getDisplayNameFromK8sResource', () => {
    const config = createMockConfig();
    mockGetDisplayNameFromK8sResource.mockReturnValue('Custom Display Name');

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('Custom Display Name')).toBeInTheDocument();
    expect(mockGetDisplayNameFromK8sResource).toHaveBeenCalledWith(config);
  });

  it('should show Pre-installed label when isConfigPreInstalled returns true', () => {
    const config = createMockConfig();
    mockIsConfigPreInstalled.mockReturnValue(true);

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('pre-installed-label')).toBeInTheDocument();
    expect(screen.getByTestId('pre-installed-label')).toHaveTextContent('Pre-installed');
  });

  it('should not show Pre-installed label when isConfigPreInstalled returns false', () => {
    const config = createMockConfig();
    mockIsConfigPreInstalled.mockReturnValue(false);

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    expect(screen.queryByTestId('pre-installed-label')).not.toBeInTheDocument();
  });

  it('should show Unsupported label when isUnsupportedResource returns true', () => {
    const config = createMockConfig();
    mockIsUnsupportedResource.mockReturnValue(true);

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('unsupported-label')).toBeInTheDocument();
    expect(screen.getByTestId('unsupported-label')).toHaveTextContent('Unsupported');
  });

  it('should not show Unsupported label when isUnsupportedResource returns false', () => {
    const config = createMockConfig();
    mockIsUnsupportedResource.mockReturnValue(false);

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    expect(screen.queryByTestId('unsupported-label')).not.toBeInTheDocument();
  });

  it('should show both Pre-installed and Unsupported labels when both conditions are true', () => {
    const config = createMockConfig();
    mockIsConfigPreInstalled.mockReturnValue(true);
    mockIsUnsupportedResource.mockReturnValue(true);

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('pre-installed-label')).toBeInTheDocument();
    expect(screen.getByTestId('unsupported-label')).toBeInTheDocument();
  });

  it('should render disabled toggle reflecting config enabled state', () => {
    const config = createMockConfig({ metadata: { name: 'my-config', namespace: 'opendatahub' } });
    mockIsConfigEnabled.mockReturnValue(false);

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    const toggle = screen.getByTestId('llm-accelerator-config-enabled-toggle-my-config');
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
    expect(toggle).toBeDisabled();
  });

  it('should render checked toggle when config is enabled', () => {
    const config = createMockConfig({
      metadata: { name: 'enabled-config', namespace: 'opendatahub' },
    });
    mockIsConfigEnabled.mockReturnValue(true);

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    const toggle = screen.getByTestId('llm-accelerator-config-enabled-toggle-enabled-config');
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
  });

  it('should render Duplicate action in kebab menu', () => {
    const config = createMockConfig();

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    expect(screen.getByRole('button', { name: /kebab toggle/i })).toBeInTheDocument();
  });

  it('should use correct data-testid for the row', () => {
    const config = createMockConfig({
      metadata: { name: 'my-test-config', namespace: 'opendatahub' },
    });

    const { container } = render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    expect(
      container.querySelector('[data-testid="llm-accelerator-config my-test-config"]'),
    ).toBeInTheDocument();
  });
});
