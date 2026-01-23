import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import NotebookList from '#~/pages/projects/screens/detail/notebooks/NotebookList';
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

const mockContextValue = {
  currentProject: mockProject,
  notebooks: {
    data: [],
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
};

const renderNotebookList = () =>
  render(
    <MemoryRouter>
      <ProjectDetailsContext.Provider value={mockContextValue as never}>
        <NotebookList />
      </ProjectDetailsContext.Provider>
    </MemoryRouter>,
  );

describe('NotebookList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKueueConfiguration.mockReturnValue(mockKueueConfigurationEnabled);
  });

  it('should disable create button when user lacks create permission', () => {
    mockUseAccessReview.mockReturnValue([false, true]);

    renderNotebookList();

    const createButton = screen.getByTestId('create-workbench-button');
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should enable create button when user has create permission', () => {
    mockUseAccessReview.mockReturnValue([true, true]);

    renderNotebookList();

    const createButton = screen.getByTestId('create-workbench-button');
    expect(createButton).not.toHaveAttribute('aria-disabled');
  });

  it('should disable create button when Kueue is disabled', () => {
    mockUseAccessReview.mockReturnValue([true, true]);
    mockUseKueueConfiguration.mockReturnValue(mockKueueConfigurationDisabled);

    renderNotebookList();

    const createButton = screen.getByTestId('create-workbench-button');
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should disable create button when both permission and Kueue are disabled', () => {
    mockUseAccessReview.mockReturnValue([false, true]);
    mockUseKueueConfiguration.mockReturnValue(mockKueueConfigurationDisabled);

    renderNotebookList();

    const createButton = screen.getByTestId('create-workbench-button');
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should not disable create button while permission check is loading', () => {
    // isAllowed=false, isLoaded=false (still loading)
    mockUseAccessReview.mockReturnValue([false, false]);

    renderNotebookList();

    const createButton = screen.getByTestId('create-workbench-button');
    // Button should remain enabled while loading
    expect(createButton).not.toHaveAttribute('aria-disabled');
  });
});
