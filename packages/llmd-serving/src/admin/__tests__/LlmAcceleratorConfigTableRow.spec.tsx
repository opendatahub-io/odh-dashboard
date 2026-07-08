import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import LlmAcceleratorConfigTableRow from '../LlmAcceleratorConfigTableRow';

jest.mock('@odh-dashboard/internal/utilities/useNotification', () => {
  const mockNotification = { error: jest.fn(), success: jest.fn(), info: jest.fn() };
  return { __esModule: true, default: () => mockNotification };
});

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
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
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('Custom Display Name')).toBeInTheDocument();
  });

  it('should show Pre-installed label when config is pre-installed', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ preInstalled: true });

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

  it('should not show Pre-installed label when config is not pre-installed', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({});

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    expect(screen.queryByTestId('pre-installed-label')).not.toBeInTheDocument();
  });

  it('should show Unsupported label when config is unsupported', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ unsupported: true });

    render(
      <table>
        <tbody>
          <LlmAcceleratorConfigTableRow obj={config} rowIndex={0} />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('unsupported-label')).toBeInTheDocument();
    expect(screen.getByTestId('unsupported-label')).toHaveTextContent('Limited support');
  });

  it('should not show Unsupported label when config is not unsupported', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({});

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
    const config = mockLLMInferenceServiceConfigK8sResource({
      preInstalled: true,
      unsupported: true,
    });

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

  it('should render Duplicate action in kebab menu', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({});

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
    const config = mockLLMInferenceServiceConfigK8sResource({ name: 'my-test-config' });

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
