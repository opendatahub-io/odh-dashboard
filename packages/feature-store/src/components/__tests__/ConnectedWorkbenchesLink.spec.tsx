import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
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
jest.mock('../../FeatureStoreContext', () => ({
  useFeatureStoreProject: jest.fn(),
}));
jest.mock('../../hooks/useFeatureStoreAccessibleProjects');
jest.mock('../ConnectedWorkbenchesModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="connected-workbenches-modal">
      <button data-testid="modal-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const mockUseAccessAllowed = useAccessAllowed as jest.MockedFunction<typeof useAccessAllowed>;
const mockUseFeatureStoreProject = useFeatureStoreProject as jest.MockedFunction<
  typeof useFeatureStoreProject
>;
const mockUseFeatureStoreAccessibleProjects =
  useFeatureStoreAccessibleProjects as jest.MockedFunction<
    typeof useFeatureStoreAccessibleProjects
  >;

describe('ConnectedWorkbenchesLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureStoreProject.mockReturnValue({
      currentProject: 'credit_scoring_local',
      setCurrentProject: jest.fn(),
      preferredFeatureStoreProject: null,
      updatePreferredFeatureStoreProject: jest.fn(),
    });
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

    it('should render the button as enabled', () => {
      render(<ConnectedWorkbenchesLink />);

      const button = screen.getByTestId('connected-workbenches-link');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('View connected workbenches');
      expect(button).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should open the modal on click', async () => {
      const user = userEvent.setup();
      render(<ConnectedWorkbenchesLink />);

      expect(screen.queryByTestId('connected-workbenches-modal')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('connected-workbenches-link'));

      expect(screen.getByTestId('connected-workbenches-modal')).toBeInTheDocument();
    });

    it('should close the modal when onClose is called', async () => {
      const user = userEvent.setup();
      render(<ConnectedWorkbenchesLink />);

      await user.click(screen.getByTestId('connected-workbenches-link'));
      expect(screen.getByTestId('connected-workbenches-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('modal-close'));
      expect(screen.queryByTestId('connected-workbenches-modal')).not.toBeInTheDocument();
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
      expect(button).toHaveAttribute('aria-disabled', 'true');
      await user.hover(button);

      expect(
        await screen.findByText(
          'To create and connect workbenches, you must first have a project with access permission. Contact your administrator to request project authorization.',
        ),
      ).toBeInTheDocument();
    });

    it('should not open the modal when disabled', async () => {
      const user = userEvent.setup();
      render(<ConnectedWorkbenchesLink />);

      await user.click(screen.getByTestId('connected-workbenches-link'));

      expect(screen.queryByTestId('connected-workbenches-modal')).not.toBeInTheDocument();
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
    it('should render disabled without tooltip while projects are loading', () => {
      mockUseAccessAllowed.mockReturnValue([false, false]);
      mockUseFeatureStoreAccessibleProjects.mockReturnValue({
        accessibleProjects: [],
        projectsLoaded: false,
        projectsError: undefined,
      });

      render(<ConnectedWorkbenchesLink />);

      const button = screen.getByTestId('connected-workbenches-link');
      expect(button).toBeDisabled();
      expect(screen.queryByText(/To create and connect workbenches/)).not.toBeInTheDocument();
    });
  });
});
