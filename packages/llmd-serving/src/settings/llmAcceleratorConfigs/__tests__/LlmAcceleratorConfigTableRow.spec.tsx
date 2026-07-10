import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import LlmAcceleratorConfigTableRow from '../LlmAcceleratorConfigTableRow';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(() => jest.fn()),
}));

jest.mock('@odh-dashboard/internal/utilities/useNotification', () => ({
  __esModule: true,
  default: () => ({ error: jest.fn(), success: jest.fn(), info: jest.fn() }),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ResourceNameTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../api/LLMInferenceServiceConfigs', () => ({
  patchLLMInferenceServiceConfig: jest.fn(),
}));

describe('LlmAcceleratorConfigTableRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should show Limited support label for unsupported configs', () => {
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
    expect(screen.getByTestId('unsupported-label')).toHaveTextContent('Limited support');
  });

  it('should not show Limited support label for supported configs', () => {
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

  it('should show both Pre-installed and Limited support labels when both apply', () => {
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

  it('should render unchecked toggle when config is disabled', () => {
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
  });

  it('should render checked toggle when config is enabled', () => {
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
