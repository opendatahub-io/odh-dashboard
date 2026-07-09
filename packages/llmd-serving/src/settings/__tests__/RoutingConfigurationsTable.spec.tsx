import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoutingConfigurationsTable from '../RoutingConfigurationsTable';
import { patchLLMInferenceServiceConfig } from '../../api/LLMInferenceServiceConfigs';
import type { LLMInferenceServiceConfigKind } from '../../types';

jest.mock('react-router', () => ({
  useNavigate: jest.fn(() => jest.fn()),
}));

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'test-ns' })),
}));

jest.mock('@odh-dashboard/internal/utilities/useNotification', () => ({
  __esModule: true,
  default: jest.fn(() => ({ error: jest.fn() })),
}));

jest.mock('@odh-dashboard/k8s-core', () => ({
  getDisplayNameFromK8sResource: (r: { metadata: { name: string } }) => r.metadata.name,
  getDescriptionFromK8sResource: () => '',
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  Table: ({
    data,
    rowRenderer,
  }: {
    data: LLMInferenceServiceConfigKind[];
    rowRenderer: (config: LLMInferenceServiceConfigKind) => React.ReactNode;
  }) => (
    <table>
      <tbody>{data.map((config) => rowRenderer(config))}</tbody>
    </table>
  ),
  SortableData: jest.fn(),
  ResourceNameTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@odh-dashboard/internal/components/table/TableRowTitleDescription', () => ({
  __esModule: true,
  default: ({ title }: { title: React.ReactNode }) => <td>{title}</td>,
}));

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  patchLLMInferenceServiceConfig: jest.fn(),
}));

const mockPatch = jest.mocked(patchLLMInferenceServiceConfig);

const createMockConfig = (
  name: string,
  enabled: boolean,
): LLMInferenceServiceConfigKind =>
  ({
    kind: 'LLMInferenceServiceConfig',
    apiVersion: 'serving.kserve.io/v1alpha2',
    metadata: {
      name,
      namespace: 'test-ns',
      annotations: enabled ? {} : { 'opendatahub.io/disabled': 'true' },
      labels: { 'opendatahub.io/config-type': 'router' },
    },
    spec: {},
  }) as unknown as LLMInferenceServiceConfigKind;

describe('RoutingConfigurationsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should keep toggle disabled until watch data updates after successful patch', async () => {
    let resolvePatch: (value: LLMInferenceServiceConfigKind) => void = () => undefined;
    mockPatch.mockImplementation(
      () => new Promise<LLMInferenceServiceConfigKind>((resolve) => {
        resolvePatch = resolve;
      }),
    );

    const enabledConfig = createMockConfig('my-config', true);
    const { rerender } = render(<RoutingConfigurationsTable configs={[enabledConfig]} />);

    const toggle = screen.getByTestId('routing-config-enabled-toggle');
    expect(toggle).not.toBeDisabled();
    expect(toggle).toBeChecked();

    await act(async () => {
      toggle.click();
    });

    expect(toggle).toBeDisabled();

    await act(async () => {
      resolvePatch(createMockConfig('my-config', false));
    });

    expect(toggle).toBeDisabled();

    const disabledConfig = createMockConfig('my-config', false);
    rerender(<RoutingConfigurationsTable configs={[disabledConfig]} />);

    const updatedToggle = screen.getByTestId('routing-config-enabled-toggle');
    expect(updatedToggle).not.toBeDisabled();
    expect(updatedToggle).not.toBeChecked();
  });

  it('should re-enable toggle immediately on patch error', async () => {
    mockPatch.mockRejectedValue(new Error('Network error'));

    const enabledConfig = createMockConfig('my-config', true);
    render(<RoutingConfigurationsTable configs={[enabledConfig]} />);

    const toggle = screen.getByTestId('routing-config-enabled-toggle');

    await act(async () => {
      toggle.click();
    });

    expect(toggle).not.toBeDisabled();
    expect(toggle).toBeChecked();
  });
});
