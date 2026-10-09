import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import YAML from 'yaml';
import { TrackingOutcome } from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import {
  createLLMInferenceServiceConfig,
  updateLLMInferenceServiceConfig,
} from '../../api/LLMInferenceServiceConfigs';
import { mockLLMInferenceServiceConfigK8sResource } from '../../__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { fireLlmAcceleratorConfigCreated } from '../../tracking/llmdTrackingConstants';
import { LLM_ACCELERATOR_CONFIGS_TAB_PATH } from '../../settings/llmAcceleratorConfigs/paths';
import LlmAcceleratorInstallTarget from '../LlmAcceleratorInstallTarget';

jest.mock('@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed', () => ({
  useAccessAllowed: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: () => ({ dashboardNamespace: 'opendatahub' }),
}));
jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  createLLMInferenceServiceConfig: jest.fn(),
  updateLLMInferenceServiceConfig: jest.fn(),
}));
jest.mock('../../tracking/llmdTrackingConstants', () => ({
  fireLlmAcceleratorConfigCreated: jest.fn(),
  fireLlmAcceleratorConfigUpdated: jest.fn(),
}));
jest.mock('../../settings/ConfigYAMLEditor', () => ({
  __esModule: true,
  default: ({ code, onCodeChange }: { code: string; onCodeChange: (value: string) => void }) => (
    <textarea
      aria-label="Config YAML"
      data-testid="yaml-editor-mock"
      value={code}
      onChange={(event) => onCodeChange(event.target.value)}
    />
  ),
}));

const createMock = jest.mocked(createLLMInferenceServiceConfig);
const trackingMock = jest.mocked(fireLlmAcceleratorConfigCreated);
const returnRoute = '/runtime-image-detail';
const back = jest.fn();
const source = () =>
  mockLLMInferenceServiceConfigK8sResource({
    name: 'library-config',
    namespace: 'source-namespace',
    displayName: 'Library config',
    runtimeVersion: '0.6.0',
  });

const renderTarget = (data = JSON.stringify(source())) =>
  render(
    <MemoryRouter initialEntries={['/install']}>
      <Routes>
        <Route
          path="/install"
          element={
            <LlmAcceleratorInstallTarget
              targetData={data}
              onBack={back}
              cancelReturnRoute={returnRoute}
            />
          }
        />
        <Route path={returnRoute} element={<div>Runtime image detail</div>} />
        <Route
          path={LLM_ACCELERATOR_CONFIGS_TAB_PATH}
          element={<div>Accelerator configs list</div>}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('LlmAcceleratorInstallTarget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAccessAllowed).mockReturnValue([true, true]);
  });

  it('should prefill the whole resource and create without changing the inputs', async () => {
    const config = source();
    createMock.mockResolvedValue(config);
    renderTarget(JSON.stringify(config));
    expect(screen.getByTestId('llm-accelerator-config-name')).toHaveValue('Library config');
    expect(screen.getByTestId('llm-accelerator-config-version')).toHaveValue('0.6.0');
    expect(screen.getByTestId('yaml-editor-mock')).toHaveValue(YAML.stringify(config));
    expect(screen.getByTestId('submit-button')).toBeEnabled();
    fireEvent.click(screen.getByTestId('submit-button'));
    expect(await screen.findByText('Accelerator configs list')).toBeInTheDocument();
    expect(createMock).toHaveBeenCalledWith({
      ...config,
      metadata: {
        ...config.metadata,
        namespace: 'opendatahub',
      },
    });
    expect(updateLLMInferenceServiceConfig).not.toHaveBeenCalled();
    expect(trackingMock).toHaveBeenCalledWith({
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'install',
    });
  });

  it('should let explicit name and version fields override the edited YAML metadata', async () => {
    const config = source();
    createMock.mockResolvedValue(config);
    renderTarget();
    fireEvent.change(screen.getByTestId('llm-accelerator-config-name'), {
      target: { value: 'Edited config' },
    });
    fireEvent.click(screen.getByTestId('llm-accelerator-config-editResourceLink'));
    fireEvent.change(screen.getByTestId('llm-accelerator-config-resourceName'), {
      target: { value: 'custom-resource' },
    });
    fireEvent.change(screen.getByTestId('llm-accelerator-config-version'), {
      target: { value: '1.0.0' },
    });
    const edited = {
      ...config,
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'ignored-yaml-name',
        namespace: 'ignored-yaml-namespace',
        annotations: {
          'openshift.io/display-name': 'Ignored',
          'opendatahub.io/runtime-version': 'ignored-version',
        },
      },
    };
    fireEvent.change(screen.getByTestId('yaml-editor-mock'), {
      target: { value: YAML.stringify(edited) },
    });
    fireEvent.click(screen.getByTestId('submit-button'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiVersion: 'serving.kserve.io/v1alpha2',
        kind: 'LLMInferenceServiceConfig',
        spec: config.spec,
        metadata: expect.objectContaining({
          name: 'custom-resource',
          namespace: 'opendatahub',
          labels: {
            'opendatahub.io/dashboard': 'true',
            'opendatahub.io/config-type': 'accelerator',
          },
          annotations: {
            'openshift.io/display-name': 'Edited config',
            'opendatahub.io/runtime-version': '1.0.0',
          },
        }),
      }),
    );
  });

  it('should fall back to resource name and allow installation without a version', async () => {
    const config = source();
    const withoutAnnotations = {
      ...config,
      metadata: { ...config.metadata, annotations: undefined },
    };
    createMock.mockResolvedValue(config);
    renderTarget(JSON.stringify(withoutAnnotations));
    expect(screen.getByTestId('llm-accelerator-config-name')).toHaveValue('library-config');
    expect(screen.getByTestId('llm-accelerator-config-version')).toHaveValue('');
    fireEvent.click(screen.getByTestId('submit-button'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock.mock.calls[0][0].metadata.annotations).toEqual({
      'openshift.io/display-name': 'library-config',
    });
  });

  it('should call Back and navigate Cancel without creating a config', () => {
    renderTarget();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(trackingMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('cancel-button'));
    expect(screen.getByText('Runtime image detail')).toBeInTheDocument();
    expect(trackingMock).toHaveBeenCalledWith({
      outcome: TrackingOutcome.cancel,
      mode: 'install',
    });
  });

  it.each(['{broken', '{}'])(
    'should show an error EmptyState for %s and allow returning safely',
    (input) => {
      renderTarget(input);
      expect(
        screen.getByRole('heading', { name: 'Unable to configure LLM accelerator configuration' }),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('submit-button')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(back).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByText('Runtime image detail')).toBeInTheDocument();
      expect(createMock).not.toHaveBeenCalled();
      expect(trackingMock).toHaveBeenCalledWith({
        outcome: TrackingOutcome.cancel,
        mode: 'install',
      });
    },
  );

  it('should block submission without a name and report YAML validation failures', () => {
    renderTarget();
    fireEvent.change(screen.getByTestId('llm-accelerator-config-name'), { target: { value: '' } });
    expect(screen.getByTestId('submit-button')).toBeDisabled();
    fireEvent.change(screen.getByTestId('llm-accelerator-config-name'), {
      target: { value: 'Config' },
    });
    fireEvent.change(screen.getByTestId('yaml-editor-mock'), { target: { value: '{}' } });
    fireEvent.click(screen.getByTestId('submit-button'));
    expect(
      screen.getByText('YAML must represent a valid kubernetes resource object'),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
    expect(trackingMock).toHaveBeenCalledWith({
      outcome: TrackingOutcome.submit,
      success: false,
      mode: 'install',
    });
    fireEvent.change(screen.getByTestId('yaml-editor-mock'), { target: { value: 'metadata: [' } });
    fireEvent.click(screen.getByTestId('submit-button'));
    expect(createMock).not.toHaveBeenCalled();
    expect(trackingMock).toHaveBeenCalledTimes(2);
  });

  it('should show creation errors and allow retry', async () => {
    createMock
      .mockRejectedValueOnce(new Error('Config already exists'))
      .mockResolvedValueOnce(source());
    renderTarget();
    fireEvent.click(screen.getByTestId('submit-button'));
    expect(await screen.findByText('Config already exists')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeEnabled();
    expect(trackingMock).toHaveBeenCalledWith({
      outcome: TrackingOutcome.submit,
      success: false,
      mode: 'install',
    });
    fireEvent.click(screen.getByTestId('submit-button'));
    expect(await screen.findByText('Accelerator configs list')).toBeInTheDocument();
  });

  it('should not render install configuration without create permission', () => {
    jest
      .mocked(useAccessAllowed)
      .mockReturnValueOnce([false, true])
      .mockReturnValueOnce([true, true]);
    renderTarget();
    expect(screen.getByRole('heading', { name: "We can't find that page" })).toBeInTheDocument();
    expect(screen.queryByTestId('llm-accelerator-config-name')).not.toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should show a loading state until create and patch permissions resolve', () => {
    jest
      .mocked(useAccessAllowed)
      .mockReturnValueOnce([false, false])
      .mockReturnValueOnce([false, false]);
    renderTarget();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('llm-accelerator-config-name')).not.toBeInTheDocument();
  });

  it('should disable target actions while creation is pending', async () => {
    let resolveCreate: (value: ReturnType<typeof source>) => void = () => undefined;
    createMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    renderTarget();
    fireEvent.click(screen.getByTestId('submit-button'));
    expect(screen.getByTestId('submit-button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(screen.getByTestId('cancel-button')).toBeDisabled();
    resolveCreate(source());
    expect(await screen.findByText('Accelerator configs list')).toBeInTheDocument();
  });
});
