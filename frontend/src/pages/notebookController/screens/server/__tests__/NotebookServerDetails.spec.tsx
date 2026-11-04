import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockUseAssignHardwareProfileResult } from '@odh-dashboard/hardware-profiles/__mocks__/mockUseAssignHardwareProfileResult';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { useNotebookHardwareProfile } from '#~/concepts/notebooks/utils';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import { NotebookControllerContextProps } from '#~/pages/notebookController/notebookControllerContextTypes';
import NotebookServerDetails from '#~/pages/notebookController/screens/server/NotebookServerDetails';

jest.mock('#~/redux/selectors', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'opendatahub' })),
}));

jest.mock('#~/utilities/useImageStreams', () => ({
  useImageStreams: jest.fn(() => [[], true, undefined]),
}));

jest.mock('#~/concepts/notebooks/utils', () => ({
  ...jest.requireActual('#~/concepts/notebooks/utils'),
  useNotebookHardwareProfile: jest.fn(),
}));

const mockUseNotebookHardwareProfile = jest.mocked(useNotebookHardwareProfile);

describe('NotebookServerDetails', () => {
  it("should request the workbench's own resources and show them with its DRA hardware profile", () => {
    const resources = {
      requests: { cpu: '2', memory: '8Gi' },
      limits: { cpu: '4', memory: '16Gi' },
    };
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      displayName: 'DRA Profile',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const notebook = mockNotebookK8sResource({
      resources,
      hardwareProfileName: 'dra-profile',
      hardwareProfileNamespace: 'opendatahub',
    });
    mockUseNotebookHardwareProfile.mockReturnValue(
      mockUseAssignHardwareProfileResult({ selectedHardwareProfile: draProfile, resources }),
    );

    render(
      <NotebookControllerContext.Provider
        value={{ currentUserNotebook: notebook } as NotebookControllerContextProps}
      >
        <NotebookServerDetails />
      </NotebookControllerContext.Provider>,
    );

    expect(mockUseNotebookHardwareProfile).toHaveBeenCalledWith(notebook);
    expect(screen.getByText('4 CPU, 16GiB Memory')).toBeInTheDocument();
    expect(screen.getByText('2 CPU, 8GiB Memory')).toBeInTheDocument();
    expect(screen.getByText('DRA Profile')).toBeInTheDocument();
  });
});
