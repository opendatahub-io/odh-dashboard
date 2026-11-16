import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  type ProjectIdentity,
  WorkingProjectProvider,
  WorkingProjectStatusValue,
} from '../../../context/WorkingProjectContext';
import WorkingProjectSelector from '../WorkingProjectSelector';

describe('WorkingProjectSelector', () => {
  const project: ProjectIdentity = { name: 'project-x', displayName: 'Project X' };

  it('should report a confirmed selection even when the selected project is already active', () => {
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
    expect(onProjectSelected).toHaveBeenCalledWith(project);
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
});
