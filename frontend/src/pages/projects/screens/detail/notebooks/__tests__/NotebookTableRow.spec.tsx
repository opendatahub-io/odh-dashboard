import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import NotebookTableRow from '#~/pages/projects/screens/detail/notebooks/NotebookTableRow';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockNotebookState } from '#~/__mocks__/mockNotebookState';
import { stopNotebook } from '#~/api';
import useNotification from '#~/utilities/useNotification';

jest.mock('#~/utilities/useNotification', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/pages/projects/screens/detail/notebooks/useNotebookImage', () =>
  jest.fn(() => [undefined, true, undefined]),
);

jest.mock('#~/concepts/notebooks/utils', () => ({
  ...jest.requireActual('#~/concepts/notebooks/utils'),
  useNotebookHardwareProfile: jest.fn(() => ({
    podSpecOptionsState: {
      podSpecOptions: { resources: {} },
      loaded: true,
      loadError: undefined,
    },
    profileState: { loaded: true, loadError: undefined, hardwareProfile: undefined },
  })),
}));

jest.mock('#~/concepts/hardwareProfiles/useHardwareProfileBindingState', () => ({
  useHardwareProfileBindingState: jest.fn(() => [undefined, true, undefined]),
}));

jest.mock('#~/pages/projects/notebook/useStopNotebookModalAvailability', () =>
  jest.fn(() => [true, jest.fn()]),
);

jest.mock('#~/pages/projects/notebook/utils', () => ({
  fireNotebookTrackingEvent: jest.fn(),
}));

jest.mock('#~/api', () => ({
  ...jest.requireActual('#~/api'),
  startNotebook: jest.fn(),
  stopNotebook: jest.fn(),
}));

jest.mock('#~/pages/projects/notebook/NotebookRouteLink', () => ({
  __esModule: true,
  default: () => <a href="/">test-notebook</a>,
}));

jest.mock('#~/concepts/hardwareProfiles/HardwareProfileTableColumn', () => ({
  __esModule: true,
  default: () => <div>hardware-profile</div>,
}));

jest.mock('#~/pages/projects/notebook/NotebookStateStatus', () => ({
  __esModule: true,
  default: () => <div>status</div>,
}));

jest.mock('#~/pages/projects/notebook/NotebookActionsColumn', () => ({
  NotebookActionsColumn: () => <div>actions</div>,
}));

jest.mock('#~/components/StateActionToggle', () => ({
  __esModule: true,
  default: ({ onStop, isDisabled }: { onStop: () => void; isDisabled: boolean }) => (
    <button type="button" aria-label="stop notebook" onClick={onStop} disabled={isDisabled}>
      stop
    </button>
  ),
}));

jest.mock('#~/components/ResourceNameTooltip', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('#~/pages/projects/screens/detail/notebooks/NotebookImageDisplayName', () => ({
  NotebookImageDisplayName: () => <div>image-display-name</div>,
}));

jest.mock('#~/pages/projects/screens/detail/notebooks/NotebookStorageBars', () => ({
  __esModule: true,
  default: () => <div>storage-bars</div>,
}));

jest.mock('#~/pages/projects/screens/detail/notebooks/NotebookSizeDetails', () => ({
  __esModule: true,
  default: () => <div>size-details</div>,
}));

const mockStopNotebook = jest.mocked(stopNotebook);
const mockUseNotification = jest.mocked(useNotification);
const notification = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
};

const mockContextValue = {
  currentProject: mockProjectK8sResource({ k8sName: 'test-project' }),
};

const renderRow = (refresh: () => Promise<void> = () => Promise.resolve()) =>
  render(
    <MemoryRouter>
      <ProjectDetailsContext.Provider
        value={mockContextValue as unknown as ProjectDetailsContextType}
      >
        <table>
          <NotebookTableRow
            obj={mockNotebookState(mockNotebookK8sResource({ name: 'test-notebook' }), {
              isRunning: true,
              refresh,
            })}
            rowIndex={0}
            onNotebookDelete={jest.fn()}
            canEnablePipelines={false}
            showOutOfDateElyraInfo={false}
          />
        </table>
      </ProjectDetailsContext.Provider>
    </MemoryRouter>,
  );

describe('NotebookTableRow stop action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotification.mockReturnValue(notification);
  });

  it('should report a rejected stop request and re-enable the action', async () => {
    mockStopNotebook.mockRejectedValue(new Error('Unsupported Media Type'));
    const refresh = jest.fn(() => Promise.resolve());

    renderRow(refresh);
    const stopButton = screen.getByRole('button', { name: 'stop notebook' });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(notification.error).toHaveBeenCalledWith(
        'Failed to stop workbench test-notebook',
        'Unsupported Media Type',
      );
    });
    expect(refresh).not.toHaveBeenCalled();
    await waitFor(() => expect(stopButton).not.toBeDisabled());
  });

  it('should report a failed refresh after a successful stop and re-enable the action', async () => {
    mockStopNotebook.mockResolvedValue(mockNotebookK8sResource({ name: 'test-notebook' }));
    const refresh = jest.fn(() => Promise.reject(new Error('refresh failed')));

    renderRow(refresh);
    const stopButton = screen.getByRole('button', { name: 'stop notebook' });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(notification.error).toHaveBeenCalledWith(
        'Failed to refresh workbench test-notebook',
        'refresh failed',
      );
    });
    await waitFor(() => expect(stopButton).not.toBeDisabled());
  });

  it('should refresh without an error notification when the stop succeeds', async () => {
    mockStopNotebook.mockResolvedValue(mockNotebookK8sResource({ name: 'test-notebook' }));
    const refresh = jest.fn(() => Promise.resolve());

    renderRow(refresh);
    const stopButton = screen.getByRole('button', { name: 'stop notebook' });
    fireEvent.click(stopButton);

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(stopButton).not.toBeDisabled());
    expect(notification.error).not.toHaveBeenCalled();
  });
});
