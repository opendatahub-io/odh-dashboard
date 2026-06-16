import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar, ToolbarContent } from '@patternfly/react-core';
import ConnectedWorkbenchesToolbar from '../ConnectedWorkbenchesToolbar';
import type { GroupedProjectOptions } from '../useConnectedWorkbenchFilters';

const defaultProjectOptions: GroupedProjectOptions = {
  withConnected: ['project-a', 'project-b'],
  withoutConnected: ['project-c'],
};

const defaultProps = {
  workbenchNameFilter: '',
  selectedProjects: [] as string[],
  selectedPermissions: [] as string[],
  hideProjectsWithConnectedWorkbenches: false,
  projectOptions: defaultProjectOptions,
  onWorkbenchNameFilterChange: jest.fn(),
  onProjectToggle: jest.fn(),
  onPermissionToggle: jest.fn(),
  onHideProjectsWithConnectedWorkbenchesChange: jest.fn(),
};

const renderToolbar = (overrides: Partial<typeof defaultProps> = {}) => {
  const props = { ...defaultProps, ...overrides };
  return render(
    <Toolbar>
      <ToolbarContent>
        <ConnectedWorkbenchesToolbar {...props} />
      </ToolbarContent>
    </Toolbar>,
  );
};

const FILTER_TYPE_TESTIDS: Record<string, string> = {
  'Workbench name': 'filter-type-option-workbenchName',
  'Authorized project': 'filter-type-option-authorizedProject',
  Permission: 'filter-type-option-permission',
};

const selectFilterType = async (user: ReturnType<typeof userEvent.setup>, type: string) => {
  await user.click(screen.getByTestId('filter-type-toggle'));
  const item = screen.getByTestId(FILTER_TYPE_TESTIDS[type]);
  const button = within(item).getByRole('menuitem');
  await user.click(button);
};

describe('ConnectedWorkbenchesToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('filter type selector', () => {
    it('should render with Authorized project selected by default', () => {
      renderToolbar();
      expect(screen.getByTestId('filter-type-toggle')).toHaveTextContent('Authorized project');
    });

    it('should show all filter type options', async () => {
      renderToolbar();
      const user = userEvent.setup();

      await user.click(screen.getByTestId('filter-type-toggle'));

      expect(screen.getByTestId('filter-type-option-workbenchName')).toHaveTextContent(
        'Workbench name',
      );
      expect(screen.getByTestId('filter-type-option-authorizedProject')).toHaveTextContent(
        'Authorized project',
      );
      expect(screen.getByTestId('filter-type-option-permission')).toHaveTextContent('Permission');
    });

    it('should switch to Permission filter type', async () => {
      renderToolbar();
      const user = userEvent.setup();

      await selectFilterType(user, 'Permission');

      expect(screen.getByTestId('filter-type-toggle')).toHaveTextContent('Permission');
      expect(screen.getByTestId('permission-filter-toggle')).toBeInTheDocument();
    });

    it('should switch to Workbench name filter type', async () => {
      renderToolbar();
      const user = userEvent.setup();

      await selectFilterType(user, 'Workbench name');

      expect(screen.getByTestId('filter-type-toggle')).toHaveTextContent('Workbench name');
      expect(screen.getByTestId('workbench-name-filter-input')).toBeInTheDocument();
    });
  });

  describe('workbench name filter', () => {
    it('should call onWorkbenchNameFilterChange on input', async () => {
      const onWorkbenchNameFilterChange = jest.fn();
      renderToolbar({ onWorkbenchNameFilterChange });
      const user = userEvent.setup();

      await selectFilterType(user, 'Workbench name');
      const input = screen.getByPlaceholderText('Find by workbench name');
      await user.type(input, 'test');

      expect(onWorkbenchNameFilterChange).toHaveBeenCalled();
    });

    it('should render a chip when workbenchNameFilter is set', () => {
      renderToolbar({ workbenchNameFilter: 'my-search' });
      expect(screen.getByTestId('workbench-name-filter-chip')).toHaveTextContent('my-search');
    });
  });

  describe('project filter', () => {
    it('should render the project filter toggle by default', () => {
      renderToolbar();
      expect(screen.getByTestId('project-filter-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('project-filter-toggle')).toHaveTextContent(
        'Filter by a project name',
      );
    });

    it('should show project options when opened', async () => {
      renderToolbar();
      const user = userEvent.setup();

      await user.click(screen.getByTestId('project-filter-toggle'));

      expect(screen.getByText('Projects with connected workbenches')).toBeInTheDocument();
      expect(screen.getByText('Projects without connected workbenches')).toBeInTheDocument();
      expect(screen.getByTestId('project-option-project-a')).toBeInTheDocument();
      expect(screen.getByTestId('project-option-project-b')).toBeInTheDocument();
      expect(screen.getByTestId('project-option-project-c')).toBeInTheDocument();
    });

    it('should call onProjectToggle when a project is selected', async () => {
      const onProjectToggle = jest.fn();
      renderToolbar({ onProjectToggle });
      const user = userEvent.setup();

      await user.click(screen.getByTestId('project-filter-toggle'));
      const option = screen.getByTestId('project-option-project-a');
      const button = within(option).getByRole('option');
      await user.click(button);

      expect(onProjectToggle).toHaveBeenCalledWith('project-a');
    });

    it('should show badge when projects are selected', () => {
      renderToolbar({ selectedProjects: ['project-a', 'project-b'] });

      const badge = screen.getByTestId('project-filter-badge');
      expect(badge).toHaveTextContent('2');
    });

    it('should not show badge when no projects selected', () => {
      renderToolbar();
      expect(screen.queryByTestId('project-filter-badge')).not.toBeInTheDocument();
    });

    it('should render chips for selected projects', () => {
      renderToolbar({ selectedProjects: ['project-a'] });
      expect(screen.getByTestId('project-filter-chip-project-a')).toBeInTheDocument();
    });
  });

  describe('permission filter', () => {
    it('should render the permission filter toggle when Permission type is selected', async () => {
      renderToolbar();
      const user = userEvent.setup();

      await selectFilterType(user, 'Permission');

      expect(screen.getByTestId('permission-filter-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('permission-filter-toggle')).toHaveTextContent(
        'Filter by permission',
      );
    });

    it('should show all permission options when opened', async () => {
      renderToolbar();
      const user = userEvent.setup();

      await selectFilterType(user, 'Permission');
      await user.click(screen.getByTestId('permission-filter-toggle'));

      expect(screen.getByTestId('permission-option-Create')).toBeInTheDocument();
      expect(screen.getByTestId('permission-option-Read')).toBeInTheDocument();
      expect(screen.getByTestId('permission-option-Write')).toBeInTheDocument();
      expect(screen.getByTestId('permission-option-Delete')).toBeInTheDocument();
      expect(screen.getByTestId('permission-option-Update')).toBeInTheDocument();
      expect(screen.getByTestId('permission-option-Describe')).toBeInTheDocument();
      expect(screen.getByTestId('permission-option-Read_online')).toBeInTheDocument();
      expect(screen.getByTestId('permission-option-Read_offline')).toBeInTheDocument();
      expect(screen.getByTestId('permission-option-Write_online')).toBeInTheDocument();
      expect(screen.getByTestId('permission-option-Write_offline')).toBeInTheDocument();
    });

    it('should call onPermissionToggle when a permission is selected', async () => {
      const onPermissionToggle = jest.fn();
      renderToolbar({ onPermissionToggle });
      const user = userEvent.setup();

      await selectFilterType(user, 'Permission');
      await user.click(screen.getByTestId('permission-filter-toggle'));
      const option = screen.getByTestId('permission-option-Create');
      const checkbox = within(option).getByRole('checkbox');
      await user.click(checkbox);

      expect(onPermissionToggle).toHaveBeenCalledWith('Create');
    });

    it('should show badge when permissions are selected', async () => {
      renderToolbar({ selectedPermissions: ['Read', 'Write', 'Delete'] });
      const user = userEvent.setup();

      await selectFilterType(user, 'Permission');

      const badge = screen.getByTestId('permission-filter-badge');
      expect(badge).toHaveTextContent('3');
    });

    it('should render chips for selected permissions', () => {
      renderToolbar({ selectedPermissions: ['Read', 'Write'] });
      expect(screen.getByTestId('permission-filter-chip-Read')).toBeInTheDocument();
      expect(screen.getByTestId('permission-filter-chip-Write')).toBeInTheDocument();
    });
  });

  describe('hide toggle', () => {
    it('should render the switch', () => {
      renderToolbar();
      expect(screen.getByTestId('hide-connected-workbenches-switch')).toBeInTheDocument();
    });

    it('should call onHideProjectsWithConnectedWorkbenchesChange on toggle', async () => {
      const onHideProjectsWithConnectedWorkbenchesChange = jest.fn();
      renderToolbar({ onHideProjectsWithConnectedWorkbenchesChange });
      const user = userEvent.setup();

      const switchInput = screen.getByTestId('hide-connected-workbenches-switch');
      await user.click(switchInput);

      expect(onHideProjectsWithConnectedWorkbenchesChange).toHaveBeenCalledWith(true);
    });
  });

  describe('disabled state', () => {
    it('should disable the project filter when no options are available', () => {
      renderToolbar({
        projectOptions: { withConnected: [], withoutConnected: [] },
      });

      const toggle = screen.getByTestId('project-filter-toggle');
      expect(toggle).toBeDisabled();
    });
  });
});
