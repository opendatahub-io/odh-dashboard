import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import { DEFAULT_LIST_FETCH_STATE } from '#~/utilities/const';
import HardwareProfileTableColumn from '#~/concepts/hardwareProfiles/HardwareProfileTableColumn';

jest.mock('#~/concepts/areas', () => ({
  ...jest.requireActual('#~/concepts/areas'),
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
          resource={mockNotebookResource as never}
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
    it('should render italic Custom text instead of popover', () => {
      renderWithContext(
        <HardwareProfileTableColumn
          namespace="test-project"
          resource={mockNotebookResource as never}
          bindingState={{
            bindingStateInfo: {
              profile: undefined,
            },
            bindingStateLoaded: true,
            loadError: undefined,
          }}
        />,
      );

      const column = screen.getByTestId('hardware-profile-table-column');
      expect(column).toHaveTextContent('Custom');
      expect(column.querySelector('i')).toBeInTheDocument();
      expect(screen.queryByTestId('hardware-profile-details-popover')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show spinner when binding state is not loaded', () => {
      renderWithContext(
        <HardwareProfileTableColumn
          namespace="test-project"
          resource={mockNotebookResource as never}
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
