import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';
import YAML from 'yaml';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  ServingRuntimeAPIProtocol,
  ServingRuntimeModelType,
} from '@odh-dashboard/model-serving/shared';
import { createServingRuntimeTemplateBackend } from '@odh-dashboard/internal/services/templateService';
import { fireServingRuntimeTemplateCreated } from '../../settings/servingRuntimeTemplates/tracking/servingRuntimeTemplateTracking';
import ServingRuntimeInstallTarget from '../ServingRuntimeInstallTarget';

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: () => ({ dashboardNamespace: 'opendatahub' }),
}));
jest.mock('@odh-dashboard/internal/services/templateService', () => ({
  createServingRuntimeTemplateBackend: jest.fn(),
}));
jest.mock('../../settings/servingRuntimeTemplates/tracking/servingRuntimeTemplateTracking', () => ({
  fireServingRuntimeTemplateCreated: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/concepts/dashboard/codeEditor/DashboardCodeEditor', () => ({
  __esModule: true,
  default: ({ code, onCodeChange }: { code: string; onCodeChange: (value: string) => void }) => (
    <textarea
      aria-label="ServingRuntime YAML"
      data-testid="dashboard-code-editor"
      value={code}
      onChange={(event) => onCodeChange(event.target.value)}
    />
  ),
}));
jest.mock('../../settings/servingRuntimeTemplates/CustomServingRuntimeAPIProtocolSelector', () => ({
  __esModule: true,
  default: ({ selectedAPIProtocol }: { selectedAPIProtocol?: string }) => (
    <span data-testid="selected-protocol">{selectedAPIProtocol ?? 'unselected'}</span>
  ),
}));
jest.mock('../../settings/servingRuntimeTemplates/CustomServingRuntimeModelTypeSelector', () => ({
  __esModule: true,
  default: ({ selectedModelTypes }: { selectedModelTypes: string[] }) => (
    <span data-testid="selected-model-types">{selectedModelTypes.join(',')}</span>
  ),
}));

const createMock = jest.mocked(createServingRuntimeTemplateBackend);
const trackingMock = jest.mocked(fireServingRuntimeTemplateCreated);
const template = () => mockServingRuntimeTemplateK8sResource({ name: 'runtime-from-library' });
const returnRoute = '/runtime-image-detail';
const listRoute =
  '/settings/model-resources-operations/model-deployment-settings/serving-runtime-templates';
const back = jest.fn();

const renderTarget = (targetData: string = JSON.stringify(template())) =>
  render(
    <MemoryRouter initialEntries={['/install']}>
      <Routes>
        <Route
          path="/install"
          element={
            <ServingRuntimeInstallTarget
              targetData={targetData}
              onBack={back}
              cancelReturnRoute={returnRoute}
            />
          }
        />
        <Route path={returnRoute} element={<div>Runtime image detail</div>} />
        <Route path={listRoute} element={<div>Serving runtime templates list</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ServingRuntimeInstallTarget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prefill all inputs and allow installation without editing the source', async () => {
    const source = template();
    createMock.mockResolvedValue(source);
    renderTarget(JSON.stringify(source));
    expect(
      screen.getByRole('heading', { name: 'Add serving runtime template', level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Review the pre-filled configuration for this runtime image. Edit any fields before creating it on this cluster.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-code-editor')).toHaveValue(
      YAML.stringify(source.objects[0]),
    );
    expect(screen.getByTestId('selected-protocol')).toHaveTextContent(
      ServingRuntimeAPIProtocol.REST,
    );
    expect(screen.getByTestId('selected-model-types')).toHaveTextContent(
      ServingRuntimeModelType.PREDICTIVE,
    );
    const install = screen.getByRole('button', { name: 'Create' });
    expect(install).toBeEnabled();
    fireEvent.click(install);
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(
      YAML.stringify(source.objects[0]),
      'opendatahub',
      ServingRuntimeAPIProtocol.REST,
      [ServingRuntimeModelType.PREDICTIVE, ServingRuntimeModelType.GENERATIVE],
    );
    expect(await screen.findByText('Serving runtime templates list')).toBeInTheDocument();
    expect(trackingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'install',
        outcome: TrackingOutcome.submit,
        success: true,
      }),
    );
  });

  it('should route Back and Cancel separately without creating a resource', () => {
    renderTarget();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(trackingMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Runtime image detail')).toBeInTheDocument();
    expect(trackingMock).toHaveBeenCalledWith({
      outcome: TrackingOutcome.cancel,
      mode: 'install',
    });
  });

  it('should prevent submission when source annotations are missing or unsupported', () => {
    const source = template();
    renderTarget(JSON.stringify({ ...source, metadata: { ...source.metadata, annotations: {} } }));
    expect(screen.getByTestId('selected-protocol')).toHaveTextContent('unselected');
    expect(screen.getByTestId('selected-model-types')).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it.each([
    ['{broken', 'not valid JSON'],
    ['{}', 'must contain a Kubernetes Template'],
    [JSON.stringify({ ...template(), objects: [] }), 'must have a named ServingRuntime'],
    [
      JSON.stringify({ ...template(), objects: [{ ...template().objects[0], spec: {} }] }),
      'Missing parameter: spec.containers: is required.',
    ],
  ])('should show an error empty state for invalid prefill %s', (input, message) => {
    renderTarget(input);
    expect(
      screen.getByRole('heading', { name: 'Unable to configure serving runtime', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(message))).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Add serving runtime template' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Runtime image detail')).toBeInTheDocument();
    expect(trackingMock).toHaveBeenCalledWith({
      outcome: TrackingOutcome.cancel,
      mode: 'install',
    });
  });

  it('should report create failures and let the user retry', async () => {
    createMock.mockRejectedValueOnce(new Error('Serving runtime name already exists'));
    createMock.mockResolvedValueOnce(template());
    renderTarget();
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Serving runtime name already exists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
    expect(trackingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: TrackingOutcome.submit,
        success: false,
        mode: 'install',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Serving runtime templates list')).toBeInTheDocument();
  });

  it('should retain YAML/kind checks before invoking the create API', () => {
    renderTarget();
    fireEvent.change(screen.getByTestId('dashboard-code-editor'), {
      target: { value: 'kind: ConfigMap' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByText('kind: must be ServingRuntime.')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
    expect(trackingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: TrackingOutcome.submit,
        success: false,
        mode: 'install',
      }),
    );
  });
});
