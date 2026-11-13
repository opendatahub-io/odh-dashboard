import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { patchDashboardConfigTemplateDisablementBackend } from '@odh-dashboard/internal/services/dashboardService';
import { patchTemplateAcceptedAnnotationBackend } from '@odh-dashboard/internal/services/templateService';
import { createTestProviders } from '../../../__tests__/hostApiTestUtils';
import CustomServingRuntimeEnabledToggle from '../CustomServingRuntimeEnabledToggle';
import { CustomServingRuntimeContext } from '../CustomServingRuntimeContext';

jest.mock('@odh-dashboard/internal/services/dashboardService', () => ({
  patchDashboardConfigTemplateDisablementBackend: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@odh-dashboard/internal/services/templateService', () => ({
  patchTemplateAcceptedAnnotationBackend: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@odh-dashboard/model-serving/shared/tracking/limitedSupportTracking', () => ({
  ...jest.requireActual('@odh-dashboard/model-serving/shared/tracking/limitedSupportTracking'),
  getResourceVersions: jest.fn(() => ({
    version: '1.0.0',
    fastVersion: '2',
  })),
}));

let trackEvent: ReturnType<typeof createTestProviders>['tracking']['trackEvent'];

const mockContextValue = {
  refreshData: jest.fn(),
  servingRuntimeTemplates: [[], true, undefined] as CustomWatchK8sResult<TemplateKind[]>,
  servingRuntimeTemplateOrder: {
    data: [],
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  },
  servingRuntimeTemplateDisablement: {
    data: [],
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  },
};

const renderWithContext = (template: ReturnType<typeof mockServingRuntimeTemplateK8sResource>) => {
  const providers = createTestProviders({ dashboardNamespace: 'custom-dashboard' });
  trackEvent = providers.tracking.trackEvent;
  render(
    <CustomServingRuntimeContext.Provider value={mockContextValue}>
      <CustomServingRuntimeEnabledToggle template={template} />
    </CustomServingRuntimeContext.Provider>,
    { wrapper: providers.wrapper },
  );
  return providers;
};

describe('CustomServingRuntimeEnabledToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use the host namespace and notify the host when enablement fails', async () => {
    jest
      .mocked(patchDashboardConfigTemplateDisablementBackend)
      .mockRejectedValueOnce(new Error('Update denied'));
    const { notification } = renderWithContext(
      mockServingRuntimeTemplateK8sResource({ name: 'my-runtime' }),
    );

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(notification.error).toHaveBeenCalledWith(
        'Error disabling the serving runtime',
        'Update denied',
      );
    });
    expect(patchDashboardConfigTemplateDisablementBackend).toHaveBeenCalledWith(
      ['my-runtime'],
      'custom-dashboard',
    );
    expect(trackEvent.mock.calls).toEqual([
      [
        'Model Serving Serving Runtime Template Enablement Changed',
        { outcome: 'submit', success: false, enabled: true },
      ],
    ]);
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByRole('switch')).toBeEnabled();
  });

  it('should notify the host when unsupported-runtime acceptance fails', async () => {
    jest
      .mocked(patchTemplateAcceptedAnnotationBackend)
      .mockRejectedValueOnce(new Error('Acceptance denied'));
    const { notification } = renderWithContext(
      mockServingRuntimeTemplateK8sResource({
        annotations: { 'opendatahub.io/support-status': 'unsupported' },
      }),
    );

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByTestId('unsupported-status-acceptance-checkbox'));
    fireEvent.click(screen.getByTestId('unsupported-status-accept-button'));

    await waitFor(() => {
      expect(notification.error).toHaveBeenCalledWith(
        'Error accepting the unsupported serving runtime',
        'Acceptance denied',
      );
    });
    expect(trackEvent).not.toHaveBeenCalled();
    expect(screen.getByRole('switch')).toBeEnabled();
  });

  it('should emit one enablement event after a successful toggle', async () => {
    renderWithContext(mockServingRuntimeTemplateK8sResource({}));
    expect(trackEvent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getByRole('switch')).toBeEnabled());
    expect(trackEvent.mock.calls).toEqual([
      [
        'Model Serving Serving Runtime Template Enablement Changed',
        { outcome: 'submit', success: true, enabled: false },
      ],
    ]);
  });

  it('should fire risk accepted event when modal accept is clicked', async () => {
    const template = mockServingRuntimeTemplateK8sResource({
      name: 'fast-vllm-template',
      displayName: 'Fast vLLM Runtime',
      annotations: {
        'opendatahub.io/support-status': 'unsupported',
      },
    });

    renderWithContext(template);

    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByTestId('unsupported-status-acceptance-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('unsupported-status-acceptance-checkbox'));
    fireEvent.click(screen.getByTestId('unsupported-status-accept-button'));

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('Model Serving Unsupported Runtime Risk Accepted', {
        runtimeResourceType: 'serving-runtime-template',
        resourceId: 'fast-vllm-template',
        resourceName: 'Fast vLLM Runtime',
        version: '1.0.0',
        fastVersion: '2',
        outcome: 'submit',
        success: true,
      });
    });
    await waitFor(() => expect(trackEvent).toHaveBeenCalledTimes(2));
    expect(trackEvent).toHaveBeenNthCalledWith(
      2,
      'Model Serving Serving Runtime Template Enablement Changed',
      { outcome: 'submit', success: true, enabled: true },
    );
  });

  it('should fire risk dismissed event with cancel action when modal cancel is clicked', () => {
    const template = mockServingRuntimeTemplateK8sResource({
      name: 'fast-vllm-template',
      displayName: 'Fast vLLM Runtime',
      annotations: {
        'opendatahub.io/support-status': 'unsupported',
      },
    });

    renderWithContext(template);

    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByTestId('unsupported-status-acceptance-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('unsupported-status-cancel-button'));

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('unsupported-status-acceptance-modal')).not.toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith('Model Serving Unsupported Runtime Risk Dismissed', {
      runtimeResourceType: 'serving-runtime-template',
      resourceId: 'fast-vllm-template',
      resourceName: 'Fast vLLM Runtime',
      version: '1.0.0',
      fastVersion: '2',
      dismissAction: 'cancel',
      outcome: 'cancel',
    });
  });

  it('should fire risk dismissed event with close action when modal close control is used', () => {
    const template = mockServingRuntimeTemplateK8sResource({
      name: 'fast-vllm-template',
      displayName: 'Fast vLLM Runtime',
      annotations: {
        'opendatahub.io/support-status': 'unsupported',
      },
    });

    renderWithContext(template);

    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByTestId('unsupported-status-acceptance-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close'));

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('unsupported-status-acceptance-modal')).not.toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith('Model Serving Unsupported Runtime Risk Dismissed', {
      runtimeResourceType: 'serving-runtime-template',
      resourceId: 'fast-vllm-template',
      resourceName: 'Fast vLLM Runtime',
      version: '1.0.0',
      fastVersion: '2',
      dismissAction: 'close',
      outcome: 'cancel',
    });
  });
});
