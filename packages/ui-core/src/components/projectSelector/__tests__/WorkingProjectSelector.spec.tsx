import * as React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  type ProjectIdentity,
  WorkingProjectProvider,
  WorkingProjectStatusValue,
} from '../../../context/WorkingProjectContext';
import WorkingProjectSelector from '../WorkingProjectSelector';

describe('WorkingProjectSelector', () => {
  const project: ProjectIdentity = { name: 'project-x', displayName: 'Project X' };

  it('should report a confirmed selection even when the selected project is already active', async () => {
    const onProjectChange = jest.fn();
    const onProjectSelected = jest.fn();

    render(
      <WorkingProjectProvider
        projects={[project]}
        activeProject={project}
        onProjectChange={onProjectChange}
      >
        <WorkingProjectSelector
          emptyListContent={<div>No projects</div>}
          onProjectSelected={onProjectSelected}
        />
      </WorkingProjectProvider>,
    );

    fireEvent.click(screen.getByTestId('working-project-selector'));
    fireEvent.click(screen.getByTestId('modal-submit-button'));

    expect(onProjectChange).toHaveBeenCalledWith(project);
    await waitFor(() => expect(onProjectSelected).toHaveBeenCalledWith(project));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show the search empty state when the filter matches no projects', () => {
    render(
      <WorkingProjectProvider
        projects={[project]}
        activeProject={project}
        onProjectChange={jest.fn()}
      >
        <WorkingProjectSelector emptyListContent={<div>No projects</div>} />
      </WorkingProjectProvider>,
    );

    fireEvent.click(screen.getByTestId('working-project-selector'));
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Filter projects by name or description' }),
      { target: { value: 'does-not-exist' } },
    );

    const noResults = screen.getByTestId('working-project-no-results');
    expect(noResults).toHaveTextContent('No results found');
    expect(noResults).toHaveTextContent('Adjust your filters and try again.');
    expect(screen.queryByTestId(`working-project-option-${project.name}`)).not.toBeInTheDocument();
  });

  it('should allow selecting a project when the current route is invalid', () => {
    const onProjectChange = jest.fn();

    render(
      <WorkingProjectProvider
        status={WorkingProjectStatusValue.RouteInvalid}
        projects={[project]}
        activeProject={null}
        onProjectChange={onProjectChange}
      >
        <WorkingProjectSelector emptyListContent={<div>No projects</div>} />
      </WorkingProjectProvider>,
    );

    fireEvent.click(screen.getByTestId('working-project-selector'));
    fireEvent.click(screen.getByTestId(`working-project-option-${project.name}`));
    fireEvent.click(screen.getByTestId('modal-submit-button'));

    expect(onProjectChange).toHaveBeenCalledWith(project);
  });

  it('should allow selecting a project when no project is selected', () => {
    const onProjectChange = jest.fn();

    render(
      <WorkingProjectProvider
        projects={[project]}
        activeProject={null}
        onProjectChange={onProjectChange}
      >
        <WorkingProjectSelector emptyListContent={<div>No projects</div>} />
      </WorkingProjectProvider>,
    );

    fireEvent.click(screen.getByTestId('working-project-selector'));
    fireEvent.click(screen.getByTestId(`working-project-option-${project.name}`));
    fireEvent.click(screen.getByTestId('modal-submit-button'));

    expect(onProjectChange).toHaveBeenCalledWith(project);
  });

  it.each([
    {
      name: 'an empty project list',
      projects: [],
      status: undefined,
      expectedLabel: 'No projects',
    },
    {
      name: 'a route-invalid state',
      projects: [project],
      status: WorkingProjectStatusValue.RouteInvalid,
      expectedLabel: 'No project selected',
    },
    {
      name: 'a list with no active project',
      projects: [project],
      status: undefined,
      expectedLabel: 'No project selected',
    },
  ])('should show the correct label for $name', ({ projects, status, expectedLabel }) => {
    render(
      <WorkingProjectProvider
        {...(status ? { status } : {})}
        projects={projects}
        activeProject={null}
        onProjectChange={jest.fn()}
      >
        <WorkingProjectSelector emptyListContent={<div>No projects available</div>} />
      </WorkingProjectProvider>,
    );

    expect(screen.getByTestId('working-project-selector')).toHaveTextContent(expectedLabel);
  });

  it('should preserve the default selector UX without the xKS opt-in', () => {
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[]}
        activeProject={null}
        onProjectChange={jest.fn()}
        discoverProject={jest.fn()}
        rememberProject={jest.fn()}
      >
        <WorkingProjectSelector emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    const trigger = screen.getByTestId('working-project-selector');
    expect(trigger).toHaveTextContent('No project selected');
    fireEvent.click(trigger);
    expect(screen.queryByTestId('working-project-empty-image')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    expect(screen.queryByTestId('manual-project-name-help')).not.toBeInTheDocument();
    expect(screen.getByText(/Find an existing project by its resource name/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Start by adding a project')).toBeInTheDocument();
  });

  it('should retain normal list-backed selection when the xKS opt-in is enabled', async () => {
    const onProjectChange = jest.fn();
    render(
      <WorkingProjectProvider
        projects={[project]}
        activeProject={project}
        onProjectChange={onProjectChange}
      >
        <WorkingProjectSelector manualProjectMode emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    expect(screen.getByRole('dialog', { name: 'Working project' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add project' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('working-project-empty-image')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(onProjectChange).toHaveBeenCalledWith(project);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByTestId('working-project-updated-notification')).not.toBeInTheDocument();
  });

  it('should search, reject stale results and remember a validated project without selecting it', async () => {
    let resolveFirst: (project: ProjectIdentity) => void = () => undefined;
    const discoverProject = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ProjectIdentity>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue({ name: 'second' });
    const rememberProject = jest.fn().mockResolvedValue(undefined);
    const onProjectChange = jest.fn();
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[]}
        activeProject={null}
        onProjectChange={onProjectChange}
        discoverProject={discoverProject}
        rememberProject={rememberProject}
      >
        <WorkingProjectSelector emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    expect(screen.getByText('Start by adding a project')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    const input = screen.getByTestId('manual-project-name');
    const search = screen.getByRole('button', { name: 'Search' });
    const add = screen.getByTestId('modal-submit-button');
    expect(search).toBeDisabled();
    expect(add).toBeDisabled();
    fireEvent.change(input, { target: { value: 'first' } });
    fireEvent.click(search);
    fireEvent.change(input, { target: { value: 'second' } });
    fireEvent.click(search);
    resolveFirst({ name: 'first' });
    await waitFor(() => expect(screen.getByText(/Found project "second"/)).toBeInTheDocument());
    expect(screen.queryByText(/Found project "first"/)).not.toBeInTheDocument();
    fireEvent.click(add);
    await waitFor(() =>
      expect(rememberProject).toHaveBeenCalledWith('second', expect.any(AbortSignal)),
    );
    expect(onProjectChange).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Start by adding a project')).toBeInTheDocument());
    expect(screen.queryByTestId('working-project-updated-notification')).not.toBeInTheDocument();
  });

  it.each(['success', 'failure', 'cancel'])(
    'should lock the input during Add project submission and handle %s',
    async (outcome) => {
      let complete: () => void = () => undefined;
      let fail: (error: Error) => void = () => undefined;
      const pending = new Promise<void>((resolve, reject) => {
        complete = resolve;
        fail = reject;
      });
      const rememberProject = jest.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined);
      const discoverProject = jest.fn(async (name: string) => ({ name }));
      render(
        <WorkingProjectProvider
          status="listing-unavailable"
          projects={[]}
          activeProject={null}
          onProjectChange={jest.fn()}
          discoverProject={discoverProject}
          rememberProject={rememberProject}
        >
          <WorkingProjectSelector manualProjectMode emptyListContent="No projects" />
        </WorkingProjectProvider>,
      );
      fireEvent.click(screen.getByTestId('working-project-selector'));
      fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
      fireEvent.change(screen.getByTestId('manual-project-name'), { target: { value: 'first' } });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      await waitFor(() => expect(screen.getByTestId('modal-submit-button')).not.toBeDisabled());
      fireEvent.click(screen.getByTestId('modal-submit-button'));
      const signal = rememberProject.mock.calls[0][1] as AbortSignal;
      expect(screen.getByTestId('manual-project-name')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
      expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
      expect(screen.getByTestId('modal-cancel-button')).not.toBeDisabled();
      fireEvent.change(screen.getByTestId('manual-project-name'), { target: { value: 'second' } });
      expect(screen.getByTestId('manual-project-name')).toHaveValue('first');
      expect(signal.aborted).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      expect(discoverProject).toHaveBeenCalledTimes(1);
      if (outcome === 'cancel') {
        fireEvent.click(screen.getByTestId('modal-cancel-button'));
        expect(signal.aborted).toBe(true);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      }
      await act(async () => {
        if (outcome === 'failure') {
          fail(new Error('Access denied'));
        } else {
          complete();
        }
        await pending.catch(() => undefined);
      });
      if (outcome === 'failure') {
        expect(screen.getByTestId('manual-project-lookup-error')).toHaveTextContent(
          'Access denied',
        );
        expect(screen.getByTestId('manual-project-name')).not.toBeDisabled();
        expect(screen.getByRole('button', { name: 'Search' })).not.toBeDisabled();
        expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
        fireEvent.change(screen.getByTestId('manual-project-name'), {
          target: { value: 'second' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));
        await waitFor(() => expect(screen.getByTestId('modal-submit-button')).not.toBeDisabled());
        fireEvent.click(screen.getByTestId('modal-submit-button'));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(rememberProject).toHaveBeenLastCalledWith('second', expect.any(AbortSignal));
        expect(screen.getByTestId('project-added-notification')).toHaveTextContent('second');
      } else if (outcome === 'success') {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByTestId('project-added-notification')).toHaveTextContent('first');
      } else {
        expect(screen.queryByTestId('project-added-notification')).not.toBeInTheDocument();
        expect(
          screen.queryByTestId('working-project-updated-notification'),
        ).not.toBeInTheDocument();
      }
    },
  );

  it.each([false, true])(
    'should await selection and allow retry outside manual fallback (manual mode %s)',
    async (manualProjectMode) => {
      let rejectSelection: (error: Error) => void = () => undefined;
      let complete: () => void = () => undefined;
      const onProjectChange = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<void>((_resolve, reject) => {
              rejectSelection = reject;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              complete = resolve;
            }),
        );
      const onProjectSelected = jest.fn();
      render(
        <WorkingProjectProvider
          projects={[project, { name: 'another' }]}
          activeProject={project}
          onProjectChange={onProjectChange}
        >
          <WorkingProjectSelector
            manualProjectMode={manualProjectMode}
            emptyListContent="No projects"
            onProjectSelected={onProjectSelected}
          />
        </WorkingProjectProvider>,
      );
      fireEvent.click(screen.getByTestId('working-project-selector'));
      fireEvent.click(screen.getByTestId('working-project-option-another'));
      fireEvent.click(screen.getByTestId('modal-submit-button'));
      expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
      expect(screen.getByTestId('modal-cancel-button')).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(onProjectSelected).not.toHaveBeenCalled();
      await act(async () => rejectSelection(new Error('Selection denied')));
      expect(screen.getByTestId('error-message-alert')).toHaveTextContent('Selection denied');
      expect(screen.getByTestId('working-project-selector')).toHaveTextContent(
        'Project: Project X',
      );
      fireEvent.click(screen.getByTestId('modal-submit-button'));
      expect(onProjectSelected).not.toHaveBeenCalled();
      await act(async () => complete());
      expect(onProjectSelected).toHaveBeenCalledTimes(1);
      expect(onProjectSelected).toHaveBeenCalledWith({ name: 'another' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );

  it('should show the manual empty-state illustration and only Add project and Cancel actions', () => {
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[]}
        activeProject={null}
        onProjectChange={jest.fn()}
        discoverProject={jest.fn()}
        rememberProject={jest.fn()}
      >
        <WorkingProjectSelector
          manualProjectMode
          emptyListContent="No projects"
          onCreateProject={jest.fn()}
        />
      </WorkingProjectProvider>,
    );
    const trigger = screen.getByTestId('working-project-selector');
    expect(trigger).toHaveTextContent('No projects');
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByTestId('working-project-empty-image')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create project' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it.each(['Cancel', 'Close'])('should dismiss the whole Add project flow using %s', (action) => {
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[]}
        activeProject={null}
        onProjectChange={jest.fn()}
        discoverProject={jest.fn()}
        rememberProject={jest.fn()}
      >
        <WorkingProjectSelector manualProjectMode emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    const trigger = screen.getByTestId('working-project-selector');
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    fireEvent.click(screen.getByRole('button', { name: action }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('should show xKS Add project copy, resource name help, and disabled initial actions', async () => {
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[]}
        activeProject={null}
        onProjectChange={jest.fn()}
        discoverProject={jest.fn()}
        rememberProject={jest.fn()}
      >
        <WorkingProjectSelector manualProjectMode emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    expect(screen.getByRole('dialog', { name: 'Add project' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Search for an existing project by its resource name to add it to the project selector. Added projects remain visible in this browser until its data is cleared. This does not create a project or grant access.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter resource name')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    fireEvent.click(screen.getByTestId('manual-project-name-help'));
    await waitFor(() =>
      expect(screen.getByTestId('manual-project-name-help-content')).toHaveTextContent(
        'Enter the exact Kubernetes namespace resource name, not its display name.',
      ),
    );
  });

  it('should show lookup errors and invalidate a previous success when input changes', async () => {
    const discoverProject = jest
      .fn()
      .mockResolvedValueOnce({ name: 'allowed' })
      .mockRejectedValueOnce(new Error('No access to that project, or it does not exist.'));
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[]}
        activeProject={null}
        onProjectChange={jest.fn()}
        discoverProject={discoverProject}
        rememberProject={jest.fn()}
      >
        <WorkingProjectSelector emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    const input = screen.getByTestId('manual-project-name');
    fireEvent.change(input, { target: { value: 'allowed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByTestId('modal-submit-button')).toBeEnabled());
    fireEvent.change(input, { target: { value: 'Missing Project' } });
    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    fireEvent.change(input, { target: { value: 'missing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() =>
      expect(
        screen.getByText('No access to that project, or it does not exist.'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
  });

  it('should show a plain inline success message only for the xKS fallback', async () => {
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[]}
        activeProject={null}
        onProjectChange={jest.fn()}
        discoverProject={jest.fn().mockResolvedValue({ name: 'testing' })}
        rememberProject={jest.fn()}
      >
        <WorkingProjectSelector manualProjectMode emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    fireEvent.change(screen.getByTestId('manual-project-name'), {
      target: { value: 'testing' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    const message = await screen.findByTestId('manual-project-lookup-success');
    expect(message).toHaveClass('pf-m-inline', 'pf-m-plain', 'pf-m-success');
    expect(message).toHaveAttribute('aria-live', 'polite');
    expect(message).toHaveTextContent(
      'Found project "testing". Select Add project to make it available.',
    );
    expect(screen.getByTestId('modal-submit-button')).toBeEnabled();
    fireEvent.change(screen.getByTestId('manual-project-name'), {
      target: { value: 'another' },
    });
    expect(screen.queryByTestId('manual-project-lookup-success')).not.toBeInTheDocument();
    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
  });

  it('should show the xKS failed-lookup input and plain error, then clear it for retry', async () => {
    const discoverProject = jest
      .fn()
      .mockRejectedValueOnce(new Error('No access to that project, or it does not exist.'))
      .mockResolvedValue({ name: 'allowed' });
    const rememberProject = jest.fn();
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[]}
        activeProject={null}
        onProjectChange={jest.fn()}
        discoverProject={discoverProject}
        rememberProject={rememberProject}
      >
        <WorkingProjectSelector manualProjectMode emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    const input = screen.getByTestId('manual-project-name');
    fireEvent.change(input, { target: { value: 'missing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    const error = await screen.findByTestId('manual-project-lookup-error');
    expect(error).toHaveClass('pf-m-inline', 'pf-m-plain', 'pf-m-danger');
    expect(error).toHaveTextContent('No access to that project, or it does not exist.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
    expect(rememberProject).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'allowed' } });
    expect(screen.queryByTestId('manual-project-lookup-error')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByTestId('modal-submit-button')).toBeEnabled());
    expect(screen.getByTestId('manual-project-lookup-success')).toBeInTheDocument();
  });

  it('should notify a changed xKS selection but not a repeated selection', async () => {
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[project, { name: 'another' }]}
        activeProject={project}
        onProjectChange={jest.fn()}
      >
        <WorkingProjectSelector manualProjectMode emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    expect(screen.getByRole('button', { name: 'Select' })).toBeDisabled();
    expect(screen.queryByTestId('working-project-updated-notification')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('working-project-option-another'));
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    const notification = await screen.findByTestId('working-project-updated-notification');
    expect(notification).toHaveClass('pf-m-info');
    expect(notification).toHaveTextContent("You're now working in another.");
    expect(screen.queryByTestId('project-added-notification')).not.toBeInTheDocument();
    fireEvent.click(within(notification).getByRole('button'));
    expect(screen.queryByTestId('working-project-updated-notification')).not.toBeInTheDocument();
  });

  it('should show the populated xKS selector with help, project count, descriptions, and ordered actions', async () => {
    const onProjectChange = jest.fn();
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[project, { name: 'another' }]}
        activeProject={project}
        onProjectChange={onProjectChange}
        discoverProject={jest.fn()}
        rememberProject={jest.fn()}
      >
        <WorkingProjectSelector manualProjectMode emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    const dialog = screen.getByRole('dialog', { name: 'Project selector' });
    expect(within(dialog).getByRole('heading', { name: 'Working project' })).toBeInTheDocument();
    expect(screen.getByTestId('working-project-help')).toBeInTheDocument();
    expect(screen.getByTestId('available-projects-help')).toBeInTheDocument();
    expect(screen.queryByText('Project listing unavailable')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Project type' })).toHaveTextContent('2');
    expect(within(dialog).getAllByText('No description')).toHaveLength(2);
    expect(
      within(dialog).queryByRole('button', { name: 'Create project' }),
    ).not.toBeInTheDocument();
    const select = within(dialog).getByRole('button', { name: 'Select' });
    const add = within(dialog).getByRole('button', { name: 'Add project' });
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    expect(select).toBeDisabled();
    expect(select.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(add.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Filter projects by name or description' }),
      { target: { value: 'another' } },
    );
    expect(screen.queryByTestId('working-project-option-project-x')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('working-project-option-another'));
    expect(select).toBeEnabled();
    fireEvent.click(select);
    await waitFor(() => expect(onProjectChange).toHaveBeenCalledWith({ name: 'another' }));
  });

  it('should show both identity names only in the xKS fallback and avoid duplicate names', () => {
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[project, { name: 'same', displayName: 'same' }]}
        activeProject={project}
        onProjectChange={jest.fn()}
      >
        <WorkingProjectSelector manualProjectMode emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    const distinct = within(screen.getByTestId('working-project-option-project-x'));
    expect(distinct.getByText('Project X')).toBeInTheDocument();
    expect(distinct.getByText('project-x')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('working-project-option-same')).getAllByText('same'),
    ).toHaveLength(1);
  });

  it('should wait for xKS switch validation, display rejection, and allow retry', async () => {
    let rejectSelection: (reason: Error) => void = () => undefined;
    const onProjectChange = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectSelection = reject;
          }),
      )
      .mockResolvedValue(undefined);
    const onProjectSelected = jest.fn();
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[project, { name: 'another' }]}
        activeProject={project}
        onProjectChange={onProjectChange}
      >
        <WorkingProjectSelector
          manualProjectMode
          emptyListContent="No projects"
          onProjectSelected={onProjectSelected}
        />
      </WorkingProjectProvider>,
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    fireEvent.click(screen.getByTestId('working-project-option-another'));
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('working-project-updated-notification')).not.toBeInTheDocument();
    await waitFor(() => expect(onProjectChange).toHaveBeenCalledTimes(1));
    rejectSelection(new Error('No access to that project, or it does not exist.'));
    await waitFor(() =>
      expect(screen.getByTestId('error-message-alert')).toHaveTextContent(
        'No access to that project',
      ),
    );
    expect(onProjectSelected).not.toHaveBeenCalled();
    expect(screen.getByTestId('working-project-selector')).toHaveTextContent('Project: Project X');
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onProjectSelected).toHaveBeenCalledWith({ name: 'another' });
  });

  it('should prevent dismissal during xKS switch validation and show success only after it completes', async () => {
    let complete: () => void = () => undefined;
    const onProjectChange = jest.fn<Promise<void>, [ProjectIdentity]>(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[project, { name: 'another' }]}
        activeProject={project}
        onProjectChange={onProjectChange}
      >
        <WorkingProjectSelector manualProjectMode emptyListContent="No projects" />
      </WorkingProjectProvider>,
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    fireEvent.click(screen.getByTestId('working-project-option-another'));
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    await waitFor(() => expect(onProjectChange).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('working-project-updated-notification')).not.toBeInTheDocument();
    complete();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('working-project-updated-notification')).toBeInTheDocument();
  });
});
