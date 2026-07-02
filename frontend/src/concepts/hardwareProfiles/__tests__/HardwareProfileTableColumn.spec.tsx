import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import { DEFAULT_LIST_FETCH_STATE } from '#~/utilities/const';
import { NotebookKind } from '#~/k8sTypes';
import { KUEUE_QUEUE_LABEL } from '#~/concepts/kueue/index';
import HardwareProfileTableColumn from '#~/concepts/hardwareProfiles/HardwareProfileTableColumn';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn().mockReturnValue({ status: false }),
}));

const mockNotebookResource = {
  apiVersion: 'v1',
  kind: 'Notebook',
  metadata: {
    name: 'test-notebook',
    namespace: 'test-project',
    annotations: {},
    labels: {},
  },
  spec: {
    template: {
      spec: {
        containers: [{ name: 'test-notebook', resources: {} }],
      },
    },
  },
};

const renderWithContext = (ui: React.ReactElement) =>
  render(
    <ProjectDetailsContext.Provider
      value={
        {
          currentProject: { metadata: { name: 'test-project' } },
          localQueues: DEFAULT_LIST_FETCH_STATE,
        } as unknown as ProjectDetailsContextType
      }
    >
      {ui}
    </ProjectDetailsContext.Provider>,
  );

describe('HardwareProfileTableColumn', () => {
  describe('with a matched hardware profile', () => {
    it('should render HardwareProfileDetailsPopover with profile name', () => {
      const profile = mockHardwareProfile({ displayName: 'Test Profile' });

      renderWithContext(
        <HardwareProfileTableColumn
          namespace="test-project"
          resource={mockNotebookResource as unknown as NotebookKind}
          bindingState={{
            bindingStateInfo: {
              profile,
            },
            bindingStateLoaded: true,
            loadError: undefined,
          }}
        />,
      );

      expect(screen.getByTestId('hardware-profile-details-popover')).toHaveTextContent(
        'Test Profile',
      );
    });
  });

  describe('Custom scenario (no hardware profile)', () => {
    it('renders Custom text as a focusable button with no details popover', () => {
      renderWithContext(
        <HardwareProfileTableColumn
          namespace="test-project"
          resource={mockNotebookResource as unknown as NotebookKind}
          bindingState={{
            bindingStateInfo: {
              profile: undefined,
            },
            bindingStateLoaded: true,
            loadError: undefined,
          }}
        />,
      );

      expect(screen.getByTestId('hardware-profile-table-column')).toHaveTextContent('Custom');
      expect(screen.queryByTestId('hardware-profile-details-popover')).not.toBeInTheDocument();
      expect(screen.getByText('Custom').closest('button')).toBeInTheDocument();
    });

    it('renders details popover with "applied directly" when notebook has a direct queue label and no HP', async () => {
      const notebookWithQueueLabel = {
        ...mockNotebookResource,
        metadata: {
          ...mockNotebookResource.metadata,
          labels: {
            ...mockNotebookResource.metadata.labels,
            [KUEUE_QUEUE_LABEL]: 'gitops-queue',
          },
        },
      };

      renderWithContext(
        <HardwareProfileTableColumn
          namespace="test-project"
          resource={notebookWithQueueLabel as unknown as NotebookKind}
          bindingState={{
            bindingStateInfo: {
              profile: undefined,
            },
            bindingStateLoaded: true,
            loadError: undefined,
          }}
        />,
      );

      expect(screen.getByTestId('hardware-profile-details-popover')).toBeInTheDocument();
      expect(screen.queryByText('Custom')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      const details = screen.getByTestId('hardware-profile-details');
      expect(details).toHaveTextContent('Local queue (applied directly)');
      expect(details).toHaveTextContent('gitops-queue');
      expect(details).not.toHaveTextContent('No matching hardware profile found');
    });
  });

  describe('loading state', () => {
    it('should show spinner when binding state is not loaded', () => {
      renderWithContext(
        <HardwareProfileTableColumn
          namespace="test-project"
          resource={mockNotebookResource as unknown as NotebookKind}
          bindingState={{
            bindingStateInfo: null,
            bindingStateLoaded: false,
            loadError: undefined,
          }}
        />,
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByTestId('hardware-profile-table-column')).not.toBeInTheDocument();
    });
  });
});
