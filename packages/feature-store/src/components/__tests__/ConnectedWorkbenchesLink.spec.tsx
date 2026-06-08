import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { useFeatureStoreAccessibleProjects } from '../../hooks/useFeatureStoreAccessibleProjects';
import ConnectedWorkbenchesLink from '../ConnectedWorkbenchesLink';

jest.mock('@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed');
jest.mock('@odh-dashboard/internal/concepts/userSSAR/utils', () => ({
  verbModelAccess: jest.fn(() => ({
    group: 'feast.dev',
    resource: 'featurestores',
    verb: 'create',
  })),
}));
jest.mock('../../hooks/useFeatureStoreAccessibleProjects');

const mockUseAccessAllowed = useAccessAllowed as jest.MockedFunction<typeof useAccessAllowed>;
const mockUseFeatureStoreAccessibleProjects =
  useFeatureStoreAccessibleProjects as jest.MockedFunction<
    typeof useFeatureStoreAccessibleProjects
  >;

describe('ConnectedWorkbenchesLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enabled state', () => {
    beforeEach(() => {
      mockUseAccessAllowed.mockReturnValue([false, true]);
      mockUseFeatureStoreAccessibleProjects.mockReturnValue({
        accessibleProjects: [
          {
            apiVersion: 'project.openshift.io/v1',
            kind: 'Project',
            metadata: { name: 'my-project', uid: 'uid-1', creationTimestamp: '2024-01-01' },
            spec: {},
            status: { phase: 'Active' },
          },
        ],
        projectsLoaded: true,
        projectsError: undefined,
      });
    });

    it('should render the button as aria-disabled', () => {
      render(<ConnectedWorkbenchesLink />);

      const button = screen.getByTestId('connected-workbenches-link');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('View connected workbenches');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not throw on click', async () => {
      const user = userEvent.setup();
      render(<ConnectedWorkbenchesLink />);

      const button = screen.getByTestId('connected-workbenches-link');
      await expect(user.click(button)).resolves.not.toThrow();
    });

    it('should not render a tooltip when enabled', () => {
      render(<ConnectedWorkbenchesLink />);

      expect(screen.queryByText(/To create and connect workbenches/)).not.toBeInTheDocument();
    });
  });

  describe('disabled state - regular user', () => {
    beforeEach(() => {
      mockUseAccessAllowed.mockReturnValue([false, true]);
      mockUseFeatureStoreAccessibleProjects.mockReturnValue({
        accessibleProjects: [],
        projectsLoaded: true,
        projectsError: undefined,
      });
    });

    it('should show regular user tooltip on hover', async () => {
      const user = userEvent.setup();
      render(<ConnectedWorkbenchesLink />);

      const button = screen.getByTestId('connected-workbenches-link');
      await user.hover(button);

      expect(
        await screen.findByText(
          'To create and connect workbenches, you must first have a project with access permission. Contact your administrator to request project authorization.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('disabled state - admin user', () => {
    beforeEach(() => {
      mockUseAccessAllowed.mockReturnValue([true, true]);
      mockUseFeatureStoreAccessibleProjects.mockReturnValue({
        accessibleProjects: [],
        projectsLoaded: true,
        projectsError: undefined,
      });
    });

    it('should show admin tooltip on hover', async () => {
      const user = userEvent.setup();
      render(<ConnectedWorkbenchesLink />);

      const button = screen.getByTestId('connected-workbenches-link');
      await user.hover(button);

      expect(
        await screen.findByText(
          'To create and connect workbenches, you must first have a project with access permission. Update project permissions.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should render without tooltip while admin check is loading', () => {
      mockUseAccessAllowed.mockReturnValue([false, false]);
      mockUseFeatureStoreAccessibleProjects.mockReturnValue({
        accessibleProjects: [],
        projectsLoaded: true,
        projectsError: undefined,
      });

      render(<ConnectedWorkbenchesLink />);

      const button = screen.getByTestId('connected-workbenches-link');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(screen.queryByText(/To create and connect workbenches/)).not.toBeInTheDocument();
    });
  });
});
