import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { FeatureStoreEmptyState } from '../EmptyStateFeatureStore';

jest.mock('@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed', () => ({
  __esModule: true,
  useAccessAllowed: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/concepts/userSSAR/utils', () => ({
  verbModelAccess: jest.fn(() => ({
    group: 'feast.dev',
    resource: 'featurestores',
    verb: 'create',
  })),
}));
jest.mock('../../../FeatureStoreContext', () => ({
  useFeatureStoreProject: jest.fn(),
}));
jest.mock('../../../components/ConnectedWorkbenchesModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="connected-workbenches-modal">
      <button data-testid="modal-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));
jest.mock('../../../components/IntegrationInstructionsPopover', () => ({
  __esModule: true,
  default: ({ trigger }: { trigger: React.ReactElement }) => (
    <div data-testid="integration-instructions-popover">{trigger}</div>
  ),
}));

const mockUseAccessAllowed = useAccessAllowed as jest.MockedFunction<typeof useAccessAllowed>;
const mockUseFeatureStoreProject = useFeatureStoreProject as jest.MockedFunction<
  typeof useFeatureStoreProject
>;

describe('FeatureStoreEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureStoreProject.mockReturnValue({
      currentProject: 'credit_scoring_local',
      setCurrentProject: jest.fn(),
      preferredFeatureStoreProject: null,
      updatePreferredFeatureStoreProject: jest.fn(),
    });
  });

  describe('non-admin', () => {
    beforeEach(() => {
      mockUseAccessAllowed.mockReturnValue([false, true]);
    });

    it('should render the non-admin empty state message', () => {
      render(
        <FeatureStoreEmptyState resourceTypeSingular="entity" resourceTypePlural="entities" />,
      );

      expect(screen.getByTestId('empty-state-title')).toHaveTextContent('No entities');
      expect(screen.getByTestId('empty-state-body')).toHaveTextContent(
        "This feature store doesn't contain any entities. To add entities, create them from a workbench connected to this feature store.",
      );
      expect(screen.queryByTestId('view-connected-workbenches-link')).not.toBeInTheDocument();
      expect(screen.getByTestId('learn-how-to-connect-link')).toBeInTheDocument();
    });
  });

  describe('admin', () => {
    beforeEach(() => {
      mockUseAccessAllowed.mockReturnValue([true, true]);
    });

    it('should render the admin empty state message and both action links', () => {
      render(
        <FeatureStoreEmptyState resourceTypeSingular="entity" resourceTypePlural="entities" />,
      );

      expect(screen.getByTestId('empty-state-title')).toHaveTextContent('No entities');
      expect(screen.getByTestId('empty-state-body')).toHaveTextContent(
        "This feature store doesn't contain any entities. To add entities:",
      );
      expect(screen.getByTestId('empty-state-body')).toHaveTextContent(
        'Create an entity from a workbench in an authorized project.',
      );
      expect(screen.getByTestId('view-connected-workbenches-link')).toBeInTheDocument();
      expect(screen.getByTestId('learn-how-to-connect-link')).toBeInTheDocument();
    });

    it('should open and close the connected workbenches modal', async () => {
      const user = userEvent.setup();
      render(
        <FeatureStoreEmptyState resourceTypeSingular="dataset" resourceTypePlural="datasets" />,
      );

      expect(screen.queryByTestId('connected-workbenches-modal')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('view-connected-workbenches-link'));
      expect(screen.getByTestId('connected-workbenches-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('modal-close'));
      expect(screen.queryByTestId('connected-workbenches-modal')).not.toBeInTheDocument();
    });

    it('should use the correct article for vowel-starting resource types', () => {
      render(
        <FeatureStoreEmptyState resourceTypeSingular="entity" resourceTypePlural="entities" />,
      );

      expect(screen.getByTestId('empty-state-body')).toHaveTextContent('Create an entity');
    });
  });
});
