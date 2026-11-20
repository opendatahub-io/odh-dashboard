import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import NewProjectButton from '#~/pages/projects/screens/projects/NewProjectButton';

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  useAccessReview: jest.fn(),
}));

jest.mock('../ManageProjectModal', () => ({
  __esModule: true,
  default: () => <div data-testid="manage-project-modal" />,
}));

const mockUseAccessReview = jest.mocked(useAccessReview);

describe('NewProjectButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show the create project button when the user can create projects', () => {
    mockUseAccessReview.mockReturnValue([true, true]);
    render(<NewProjectButton />);
    expect(screen.getByTestId('create-project')).toBeEnabled();
    expect(screen.queryByTestId('create-project-admin-help')).not.toBeInTheDocument();
  });

  it('should show administrator help when the user cannot create projects', () => {
    mockUseAccessReview.mockReturnValue([false, true]);
    render(<NewProjectButton />);
    expect(screen.queryByTestId('create-project')).not.toBeInTheDocument();
    expect(screen.getByTestId('create-project-admin-help')).toBeInTheDocument();
  });

  it('should render nothing while RBAC is loading', () => {
    mockUseAccessReview.mockReturnValue([false, false]);
    const { container } = render(<NewProjectButton />);
    expect(container).toBeEmptyDOMElement();
  });
});
