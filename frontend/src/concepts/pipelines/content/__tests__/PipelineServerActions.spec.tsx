import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import { act } from 'react';
import '@testing-library/jest-dom';
import PipelineServerActions from '#~/concepts/pipelines/content/PipelineServerActions';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineAndVersionContext } from '#~/concepts/pipelines/content/PipelineAndVersionContext';
import { getDashboardMainContainer } from '#~/utilities/utils';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
  DeleteServerModal: () => <div data-testid="delete-server-modal" />,
  ViewServerModal: () => <div data-testid="view-server-modal" />,
}));

jest.mock('#~/concepts/pipelines/content/DeletePipelinesModal', () => ({
  __esModule: true,
  default: () => <div data-testid="delete-pipelines-modal" />,
}));

jest.mock('#~/utilities/utils', () => ({
  getDashboardMainContainer: jest.fn(),
}));

jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireSimpleTrackingEvent: jest.fn(),
}));

const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);
const mockGetDashboardMainContainer = jest.mocked(getDashboardMainContainer);

const mockContextValue = {
  pipelineDataSelector: () => ({
    selectedPipelines: [],
    setSelectedPipelines: jest.fn(),
  }),
  versionDataSelector: () => ({
    selectedVersions: [],
    setSelectedVersions: jest.fn(),
  }),
  getResourcesForDeletion: () => ({ pipelines: [], versions: [] }),
  clearAfterDeletion: jest.fn(),
  isPipelineChecked: () => false,
};

describe('PipelineServerActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDashboardMainContainer.mockReturnValue(document.body);

    mockUsePipelinesAPI.mockReturnValue({
      pipelinesServer: {
        initializing: false,
        installed: true,
        compatible: true,
        timedOut: false,
        name: 'dspa',
        crStatus: undefined,
        isStarting: false,
      },
      namespace: 'test-namespace',
      project: {
        apiVersion: 'v1',
        kind: 'Project',
        metadata: { name: 'test-project', annotations: {} },
      },
      refreshAllAPI: jest.fn(),
      getRecurringRunInformation: jest.fn(),
      metadataStoreServiceClient: {} as never,
      refreshState: jest.fn(),
      managedPipelines: undefined,
      mlflowIntegrationMode: undefined,
      apiAvailable: true,
      api: {} as never,
      pipelineLoadError: undefined,
    });
  });

  it('should show the ability to delete the pipeline server kebab option', () => {
    render(
      <PipelineAndVersionContext.Provider value={mockContextValue}>
        <PipelineServerActions variant="kebab" isDisabled={false} />
      </PipelineAndVersionContext.Provider>,
    );

    const kebab = screen.getByRole('button', {
      name: 'Pipeline server action kebab toggle',
    });
    expect(kebab).toBeInTheDocument();
    expect(kebab).toBeEnabled();

    act(() => {
      kebab.click();
    });

    const menu = screen.getByRole('menu');
    expect(
      within(menu).getByRole('menuitem', { name: 'Delete pipeline server' }),
    ).toBeInTheDocument();
  });
});
