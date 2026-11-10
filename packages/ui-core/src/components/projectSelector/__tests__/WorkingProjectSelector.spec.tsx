import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  type ProjectIdentity,
  WorkingProjectProvider,
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
});
