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

  describe('No hardware profile scenario', () => {
    it('renders "No hardware profile" trigger, shows correct header/body, and no "Expand row" without the prop', async () => {
      renderWithContext(
        <HardwareProfileTableColumn
          namespace="test-project"
          resource={mockNotebookResource as unknown as NotebookKind}
          bindingState={{
            bindingStateInfo: { profile: undefined },
            bindingStateLoaded: true,
            loadError: undefined,
          }}
        />,
      );

      expect(screen.getByTestId('hardware-profile-table-column')).toHaveTextContent(
        'No hardware profile',
      );

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      expect(screen.getByText('No hardware profile defined')).toBeInTheDocument();
      expect(screen.getByTestId('hardware-profile-details')).toHaveTextContent(
        'No hardware profile is defined for this workbench',
      );
      expect(screen.queryByRole('button', { name: 'Expand row' })).not.toBeInTheDocument();
    });

    it('calls onExpandRow when "Expand row" is clicked', async () => {
      const onExpandRow = jest.fn();

      renderWithContext(
        <HardwareProfileTableColumn
          namespace="test-project"
          resource={mockNotebookResource as unknown as NotebookKind}
          bindingState={{
            bindingStateInfo: { profile: undefined },
            bindingStateLoaded: true,
            loadError: undefined,
          }}
          onExpandRow={onExpandRow}
        />,
      );

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));
      await userEvent.click(screen.getByRole('button', { name: 'Expand row' }));

      expect(onExpandRow).toHaveBeenCalledTimes(1);
    });

    it('renders details popover with "Local queue" when notebook has a direct queue label and no HP', async () => {
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
      expect(screen.queryByText('No hardware profile')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      const details = screen.getByTestId('hardware-profile-details');
      expect(details).toHaveTextContent('Local queue');
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
