import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import NotebooksCard from '#~/pages/projects/screens/detail/overview/trainModels/NotebooksCard';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '#~/api/useAccessReview';
import {
  useKueueConfiguration,
  KueueFilteringState,
} from '#~/concepts/hardwareProfiles/kueueUtils';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';

// Mock the hooks
jest.mock('#~/api/useAccessReview', () => ({
  useAccessReview: jest.fn(),
}));

jest.mock('#~/concepts/hardwareProfiles/kueueUtils', () => ({
  ...jest.requireActual('#~/concepts/hardwareProfiles/kueueUtils'),
  useKueueConfiguration: jest.fn(),
}));

const mockUseAccessReview = jest.mocked(useAccessReview);
const mockUseKueueConfiguration = jest.mocked(useKueueConfiguration);

const mockProject = mockProjectK8sResource({ k8sName: 'test-project' });

const mockKueueConfigurationEnabled = {
  isKueueDisabled: false,
  isKueueFeatureEnabled: true,
  isProjectKueueEnabled: true,
  kueueFilteringState: KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
};

const mockKueueConfigurationDisabled = {
  isKueueDisabled: true,
  isKueueFeatureEnabled: true,
  isProjectKueueEnabled: false,
  kueueFilteringState: KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
};

const createMockContextValue = (notebooks: unknown[] = []) => ({
  currentProject: mockProject,
  notebooks: {
    data: notebooks,
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  },
  dataConnections: {
    data: [],
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  },
  pvcs: {
    data: [],
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  },
  projectConnections: {
    data: [],
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  },
  refreshAllProjectData: jest.fn(),
});

const renderNotebooksCard = (notebooks: unknown[] = []) =>
  render(
    <MemoryRouter>
      <ProjectDetailsContext.Provider value={createMockContextValue(notebooks) as never}>
        <NotebooksCard />
      </ProjectDetailsContext.Provider>
    </MemoryRouter>,
  );

describe('NotebooksCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKueueConfiguration.mockReturnValue(mockKueueConfigurationEnabled);
  });

  describe('Empty state (no notebooks)', () => {
    it('should disable create button when user lacks create permission', () => {
      mockUseAccessReview.mockReturnValue([false, true]);

      renderNotebooksCard([]);

      const createButton = screen.getByRole('button', { name: /create a workbench/i });
      expect(createButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should enable create button when user has create permission', () => {
      mockUseAccessReview.mockReturnValue([true, true]);

      renderNotebooksCard([]);

      const createButton = screen.getByRole('button', { name: /create a workbench/i });
      expect(createButton).not.toHaveAttribute('aria-disabled');
    });

    it('should disable create button when Kueue is disabled', () => {
      mockUseAccessReview.mockReturnValue([true, true]);
      mockUseKueueConfiguration.mockReturnValue(mockKueueConfigurationDisabled);

      renderNotebooksCard([]);

      const createButton = screen.getByRole('button', { name: /create a workbench/i });
      expect(createButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not disable create button while permission check is loading', () => {
      // isAllowed=false, isLoaded=false (still loading)
      mockUseAccessReview.mockReturnValue([false, false]);

      renderNotebooksCard([]);

      const createButton = screen.getByRole('button', { name: /create a workbench/i });
      // Button should remain enabled while loading
      expect(createButton).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('With notebooks', () => {
    const mockNotebooks = [
      {
        notebook: { metadata: { name: 'notebook-1' } },
        isRunning: true,
        isStopped: false,
        isStarting: false,
        isStopping: false,
        refresh: jest.fn(),
      },
    ];

    it('should disable create button when user lacks create permission', () => {
      mockUseAccessReview.mockReturnValue([false, true]);

      renderNotebooksCard(mockNotebooks);

      const createButton = screen.getByRole('button', { name: /create workbench/i });
      expect(createButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should enable create button when user has create permission', () => {
      mockUseAccessReview.mockReturnValue([true, true]);

      renderNotebooksCard(mockNotebooks);

      const createButton = screen.getByRole('button', { name: /create workbench/i });
      expect(createButton).not.toHaveAttribute('aria-disabled');
    });
  });
});
