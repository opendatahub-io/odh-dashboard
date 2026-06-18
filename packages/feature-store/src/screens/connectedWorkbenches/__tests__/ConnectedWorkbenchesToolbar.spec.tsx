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

  it('should render with Authorized project selected by default and show all filter types', async () => {
    renderToolbar();
    expect(screen.getByTestId('filter-type-toggle')).toHaveTextContent('Authorized project');

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

  it('should switch filter types and show the correct input', async () => {
    renderToolbar();
    const user = userEvent.setup();

    await selectFilterType(user, 'Permission');
    expect(screen.getByTestId('filter-type-toggle')).toHaveTextContent('Permission');
    expect(screen.getByTestId('permission-filter-toggle')).toBeInTheDocument();

    await selectFilterType(user, 'Workbench name');
    expect(screen.getByTestId('filter-type-toggle')).toHaveTextContent('Workbench name');
    expect(screen.getByTestId('workbench-name-filter-input')).toBeInTheDocument();
  });

  it('should handle workbench name input and render chips', async () => {
    const onWorkbenchNameFilterChange = jest.fn();
    renderToolbar({ onWorkbenchNameFilterChange });
    const user = userEvent.setup();

    await selectFilterType(user, 'Workbench name');
    await user.type(screen.getByPlaceholderText('Find by workbench name'), 'test');
    expect(onWorkbenchNameFilterChange).toHaveBeenCalled();

    renderToolbar({ workbenchNameFilter: 'my-search' });
    expect(screen.getByTestId('workbench-name-filter-chip')).toHaveTextContent('my-search');
  });

  it('should show grouped project options with divider, call onProjectToggle, and show badge/chips', async () => {
    const onProjectToggle = jest.fn();
    renderToolbar({ onProjectToggle });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('project-filter-toggle'));
    expect(screen.getByText('Projects with connected workbenches')).toBeInTheDocument();
    expect(screen.getByText('Projects without connected workbenches')).toBeInTheDocument();
    expect(screen.getByTestId('project-option-project-a')).toBeInTheDocument();
    expect(screen.getByTestId('project-option-project-c')).toBeInTheDocument();

    const option = screen.getByTestId('project-option-project-a');
    await user.click(within(option).getByRole('option'));
    expect(onProjectToggle).toHaveBeenCalledWith('project-a');

    const { unmount } = renderToolbar({ selectedProjects: ['project-a', 'project-b'] });
    expect(screen.getByTestId('project-filter-badge')).toHaveTextContent('2');
    expect(screen.getByTestId('project-filter-chip-project-a')).toBeInTheDocument();
    unmount();

    renderToolbar();
    expect(screen.queryByTestId('project-filter-badge')).not.toBeInTheDocument();
  });

  it('should show permission options, call onPermissionToggle, and show badge/chips', async () => {
    const onPermissionToggle = jest.fn();
    const { unmount } = renderToolbar({ onPermissionToggle });
    const user = userEvent.setup();

    await selectFilterType(user, 'Permission');
    await user.click(screen.getByTestId('permission-filter-toggle'));
    expect(screen.getByTestId('permission-option-Create')).toBeInTheDocument();
    expect(screen.getByTestId('permission-option-Read')).toBeInTheDocument();
    expect(screen.getByTestId('permission-option-Delete')).toBeInTheDocument();
    expect(screen.getByTestId('permission-option-Write_offline')).toBeInTheDocument();

    const option = screen.getByTestId('permission-option-Create');
    await user.click(within(option).getByRole('checkbox'));
    expect(onPermissionToggle).toHaveBeenCalledWith('Create');
    unmount();

    renderToolbar({ selectedPermissions: ['Read', 'Write', 'Delete'] });
    await selectFilterType(userEvent.setup(), 'Permission');
    expect(screen.getByTestId('permission-filter-badge')).toHaveTextContent('3');
    expect(screen.getByTestId('permission-filter-chip-Read')).toBeInTheDocument();
    expect(screen.getByTestId('permission-filter-chip-Write')).toBeInTheDocument();
  });

  it('should render the hide toggle and call the handler', async () => {
    const onHideProjectsWithConnectedWorkbenchesChange = jest.fn();
    renderToolbar({ onHideProjectsWithConnectedWorkbenchesChange });
    const user = userEvent.setup();

    const switchInput = screen.getByTestId('hide-connected-workbenches-switch');
    expect(switchInput).toBeInTheDocument();
    await user.click(switchInput);
    expect(onHideProjectsWithConnectedWorkbenchesChange).toHaveBeenCalledWith(true);
  });

  it('should disable the project filter when no options are available', () => {
    renderToolbar({ projectOptions: { withConnected: [], withoutConnected: [] } });
    expect(screen.getByTestId('project-filter-toggle')).toBeDisabled();
  });
});
