import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { mockUseAssignHardwareProfileResult } from '@odh-dashboard/internal/__mocks__/mockUseAssignHardwareProfileResult';
import { useAssignHardwareProfile } from '@odh-dashboard/internal/concepts/hardwareProfiles/useAssignHardwareProfile';
import type { ContainerResources } from '@odh-dashboard/internal/types';
import { mockExtensions } from '../../../__tests__/mockUtils';
import { DeploymentHardwareProfileCell } from '../row/DeploymentHardwareProfileCell';

jest.mock('@odh-dashboard/plugin-core');

jest.mock('@odh-dashboard/internal/concepts/hardwareProfiles/useAssignHardwareProfile', () => ({
  useAssignHardwareProfile: jest.fn(),
}));

jest.mock(
  '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileBindingState',
  () => ({
    useHardwareProfileBindingState: () => [null, true, undefined],
  }),
);

jest.mock('@odh-dashboard/internal/concepts/hardwareProfiles/HardwareProfileTableColumn', () => {
  const MockHardwareProfileTableColumn = (props: { containerResources?: ContainerResources }) => (
    <td
      data-testid="hardware-profile-table-column"
      data-resources={JSON.stringify(props.containerResources)}
    >
      Hardware Profile
    </td>
  );
  MockHardwareProfileTableColumn.displayName = 'MockHardwareProfileTableColumn';
  return { __esModule: true, default: MockHardwareProfileTableColumn };
});

const mockUseAssignHardwareProfile = jest.mocked(useAssignHardwareProfile);

const mockDeployment = () => ({
  modelServingPlatformId: 'test-platform',
  model: {
    apiVersion: 'v1',
    kind: 'TestModelKind',
    metadata: {
      name: 'test-deployment',
      namespace: 'test-project',
    },
  },
});

describe('DeploymentHardwareProfileCell', () => {
  beforeEach(() => {
    mockExtensions();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should pass podSpecOptions.resources to HardwareProfileTableColumn', () => {
    const podSpecResources: ContainerResources = {
      requests: { cpu: '4', memory: '8Gi' },
      limits: { cpu: '8', memory: '16Gi' },
    };
    const formDataResources: ContainerResources = {
      requests: { cpu: '1', memory: '2Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    };

    const result = mockUseAssignHardwareProfileResult({
      resources: podSpecResources,
    });
    result.podSpecOptionsState.hardwareProfile.formData.resources = formDataResources;

    mockUseAssignHardwareProfile.mockReturnValue(result);

    render(
      <table>
        <tbody>
          <tr>
            <DeploymentHardwareProfileCell
              deployment={mockDeployment()}
              hardwareProfilePaths={{
                containerResourcesPath: 'spec.predictor.model.resources',
                tolerationsPath: 'spec.predictor.tolerations',
                nodeSelectorPath: 'spec.predictor.nodeSelector',
              }}
            />
          </tr>
        </tbody>
      </table>,
    );

    const column = screen.getByTestId('hardware-profile-table-column');
    const resources = JSON.parse(column.getAttribute('data-resources') ?? '{}');

    expect(resources).toEqual(podSpecResources);
    expect(resources).not.toEqual(formDataResources);
  });
});
