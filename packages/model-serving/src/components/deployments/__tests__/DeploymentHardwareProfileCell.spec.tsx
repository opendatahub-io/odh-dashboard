import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { mockExtensions } from '../../../__tests__/mockUtils';
import { DeploymentHardwareProfileCell } from '../row/DeploymentHardwareProfileCell';

jest.mock('@odh-dashboard/plugin-core');

jest.mock(
  '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileBindingState',
  () => ({
    useHardwareProfileBindingState: () => [null, true, undefined],
  }),
);

jest.mock('@odh-dashboard/internal/concepts/hardwareProfiles/HardwareProfileTableColumn', () => {
  const MockHardwareProfileTableColumn = (props: { namespace: string }) => (
    <td data-testid="hardware-profile-table-column" data-namespace={props.namespace}>
      Hardware Profile
    </td>
  );
  MockHardwareProfileTableColumn.displayName = 'MockHardwareProfileTableColumn';
  return { __esModule: true, default: MockHardwareProfileTableColumn };
});

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

  it('should render HardwareProfileTableColumn with the correct namespace', () => {
    render(
      <table>
        <tbody>
          <tr>
            <DeploymentHardwareProfileCell deployment={mockDeployment()} />
          </tr>
        </tbody>
      </table>,
    );

    const column = screen.getByTestId('hardware-profile-table-column');
    expect(column).toBeInTheDocument();
    expect(column).toHaveAttribute('data-namespace', 'test-project');
  });
});
