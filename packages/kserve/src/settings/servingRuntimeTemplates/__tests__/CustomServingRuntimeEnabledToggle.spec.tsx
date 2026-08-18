import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { LimitedSupportEvent } from '@odh-dashboard/model-serving/shared/tracking/limitedSupportTracking';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import CustomServingRuntimeEnabledToggle from '../CustomServingRuntimeEnabledToggle';
import { CustomServingRuntimeContext } from '../CustomServingRuntimeContext';

jest.mock('@odh-dashboard/internal/utilities/useNotification', () => ({
  __esModule: true,
  default: () => ({ error: jest.fn(), success: jest.fn(), info: jest.fn() }),
}));

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: () => ({ dashboardNamespace: 'opendatahub' }),
}));

jest.mock('@odh-dashboard/internal/services/dashboardService', () => ({
  patchDashboardConfigTemplateDisablementBackend: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@odh-dashboard/internal/services/templateService', () => ({
  patchTemplateAcceptedAnnotationBackend: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('@odh-dashboard/model-serving/shared/tracking/limitedSupportTracking', () => ({
  ...jest.requireActual('@odh-dashboard/model-serving/shared/tracking/limitedSupportTracking'),
  getResourceVersions: jest.fn(() => ({
    version: '1.0.0',
    fastVersion: '2',
  })),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

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

const renderWithContext = (template: ReturnType<typeof mockServingRuntimeTemplateK8sResource>) =>
  render(
    <CustomServingRuntimeContext.Provider value={mockContextValue}>
      <CustomServingRuntimeEnabledToggle template={template} />
    </CustomServingRuntimeContext.Provider>,
  );

describe('CustomServingRuntimeEnabledToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(LimitedSupportEvent.RISK_ACCEPTED, {
        runtimeResourceType: 'serving-runtime-template',
        resourceId: 'fast-vllm-template',
        resourceName: 'Fast vLLM Runtime',
        version: '1.0.0',
        fastVersion: '2',
        outcome: 'submit',
        success: true,
      });
    });
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

    expect(screen.queryByTestId('unsupported-status-acceptance-modal')).not.toBeInTheDocument();
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(LimitedSupportEvent.RISK_DISMISSED, {
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

    expect(screen.queryByTestId('unsupported-status-acceptance-modal')).not.toBeInTheDocument();
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(LimitedSupportEvent.RISK_DISMISSED, {
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
