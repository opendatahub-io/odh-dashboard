import React from 'react';
import { render, screen } from '@testing-library/react';
import { AreaContext, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { DataScienceClusterKindStatus } from '@odh-dashboard/k8s-core';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';
import { isAreaAvailable } from '#~/concepts/areas/utils';
import { InvalidArgoDeploymentAlert } from '#~/concepts/pipelines/content/InvalidArgoDeploymentAlert';

// Only the dismissal storage and presentational bits are mocked. The area map, `isAreaAvailable`,
// `AreaContext`, and `useIsAreaAvailable` are all real so this covers the full wiring.
jest.mock('@odh-dashboard/ui-core/utilities', () => ({
  useBrowserStorage: jest.fn(),
}));

jest.mock('#~/concepts/pipelines/content/PipelineMigrationNoteLinks', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-migration-links" />,
}));

jest.mock('#~/utilities/const', () => ({
  ODH_PRODUCT_NAME: 'OpenShift AI',
}));

const mockUseBrowserStorage = jest.mocked(useBrowserStorage);

/**
 * Renders the alert behind the real area pipeline:
 * SupportedAreasStateMap -> isAreaAvailable -> AreaContext -> useIsAreaAvailable -> component.
 */
const renderWithRealArea = (dscStatus: DataScienceClusterKindStatus) =>
  render(
    <AreaContext.Provider
      value={{
        dscStatus,
        dsciStatus: null,
        areasStatus: {
          [SupportedArea.DS_PIPELINES_ARGO_INVALID]: isAreaAvailable(
            SupportedArea.DS_PIPELINES_ARGO_INVALID,
            mockDashboardConfig({}).spec,
            dscStatus,
            null,
          ),
        },
      }}
    >
      <InvalidArgoDeploymentAlert />
    </AreaContext.Provider>,
  );

describe('InvalidArgoDeploymentAlert area wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBrowserStorage.mockReturnValue([false, jest.fn()]);
  });

  it('should show the alert when the DSC reports an unmanaged Argo install', () => {
    renderWithRealArea(
      mockDscStatus({ conditions: [{ type: 'CapabilityDSPv2Argo', status: 'False' }] }),
    );

    expect(screen.getByTestId('invalid-argo-alert')).toBeInTheDocument();
  });

  it('should not show the alert when the DSC has no Argo condition', () => {
    renderWithRealArea(mockDscStatus({ conditions: [] }));

    expect(screen.queryByTestId('invalid-argo-alert')).not.toBeInTheDocument();
  });

  it('should not show the alert when the Argo condition is satisfied', () => {
    renderWithRealArea(
      mockDscStatus({ conditions: [{ type: 'CapabilityDSPv2Argo', status: 'True' }] }),
    );

    expect(screen.queryByTestId('invalid-argo-alert')).not.toBeInTheDocument();
  });
});
