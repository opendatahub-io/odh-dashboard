import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import InvalidProject from '../InvalidProject';

jest.mock('../ProjectSelectorNavigator', () => ({
  __esModule: true,
  default: ({ showTitle }: { showTitle?: boolean }) => (
    <div data-testid="project-selector-navigator">{showTitle ? 'with title' : 'without title'}</div>
  ),
}));

describe('InvalidProject', () => {
  it('should preserve the invalid project message and selector', () => {
    render(<InvalidProject namespace="missing-project" getRedirectPath={() => '/projects'} />);

    expect(screen.getByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
    expect(screen.getByText('Project missing-project was not found.')).toBeInTheDocument();
    expect(screen.getByTestId('project-selector-navigator')).toHaveTextContent('with title');
  });

  it('should use the supplied empty namespace wording', () => {
    render(<InvalidProject emptyNamespaceText="The Project" getRedirectPath={() => '/projects'} />);

    expect(screen.getByText('The Project was not found.')).toBeInTheDocument();
  });
});
