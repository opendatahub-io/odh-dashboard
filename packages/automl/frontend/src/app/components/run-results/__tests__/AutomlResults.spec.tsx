/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AutomlResults from '~/app/components/run-results/AutomlResults';
import { AutomlResultsContext, type AutomlModel } from '~/app/context/AutomlResultsContext';
import type { PipelineRun } from '~/app/types';
import * as queries from '~/app/hooks/queries';
import * as utils from '~/app/utilities/utils';

jest.mock('~/app/topology/PipelineTopology', () => ({
  __esModule: true,
  default: ({ nodes, className }: { nodes: unknown[]; className?: string }) => (
    <div data-testid="pipeline-topology" data-node-count={nodes.length} className={className} />
  ),
}));

jest.mock('~/app/topology/useAutoMLTaskTopology', () => ({
  useAutoMLTaskTopology: jest.fn().mockReturnValue([{ id: 'task-1' }, { id: 'task-2' }]),
}));

jest.mock('~/app/utilities/utils', () => ({
  ...jest.requireActual('~/app/utilities/utils'),
  downloadBlob: jest.fn(),
}));

jest.mock('~/app/hooks/queries', () => ({
  ...jest.requireActual('~/app/hooks/queries'),
  fetchS3File: jest.fn(),
}));

const mockPipelineRun: PipelineRun = {
  run_id: 'run-123',
  display_name: 'My AutoML Run',
  state: 'SUCCEEDED',
  created_at: '2025-06-01T00:00:00Z',
};

const createMockModel = (displayName: string): AutomlModel => ({
  display_name: displayName,
  model_config: {
    eval_metric: 'accuracy',
  },
  location: {
    model_directory: `/models/${displayName}`,
    predictor: `/models/${displayName}/predictor.pkl`,
    notebook: `/models/${displayName}/notebook.ipynb`,
  },
  metrics: {
    test_data: { accuracy: 0.95 },
  },
});

const fetchS3FileMock = jest.mocked(queries.fetchS3File);
const downloadBlobMock = jest.mocked(utils.downloadBlob);

describe('AutomlResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithContext = (
    pipelineRun?: PipelineRun,
    models: Record<string, AutomlModel> = {},
    namespace = 'test-namespace',
  ) =>
    render(
      <MemoryRouter initialEntries={[`/automl/${namespace}/results`]}>
        <Routes>
          <Route
            path="/automl/:namespace/results"
            element={
              <AutomlResultsContext.Provider
                value={{
                  pipelineRun,
                  models,
                  parameters: { task_type: 'timeseries', label_column: '' },
                }}
              >
                <AutomlResults />
              </AutomlResultsContext.Provider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

  it('should render the PipelineTopology component', () => {
    renderWithContext(mockPipelineRun);
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
  });

  it('should pass the automl-topology-container className to PipelineTopology', () => {
    renderWithContext(mockPipelineRun);
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveClass('automl-topology-container');
  });

  it('should pass nodes from useAutoMLTaskTopology to PipelineTopology', () => {
    renderWithContext(mockPipelineRun);
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveAttribute('data-node-count', '2');
  });

  it('should render gracefully when pipelineRun is undefined', () => {
    renderWithContext();
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
  });

  describe('notebook download error handling', () => {
    it('should display error alert when fetchS3File fails', async () => {
      const testModel = createMockModel('Test Model');
      const models = { 'Test Model': testModel }; // Key must match display_name

      fetchS3FileMock.mockRejectedValueOnce(new Error('S3 connection failed'));

      renderWithContext(mockPipelineRun, models);

      // Get the leaderboard component and trigger save notebook
      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      // Wait for error alert to appear
      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(screen.getByText('Model: Test Model')).toBeInTheDocument();
      expect(screen.getByText('S3 connection failed', { exact: false })).toBeInTheDocument();
    });

    it('should display error when namespace is missing', async () => {
      const testModel = createMockModel('Test Model');
      const models = { 'Test Model': testModel }; // Key must match display_name

      // Render without namespace in the route
      render(
        <MemoryRouter initialEntries={['/automl/results']}>
          <Routes>
            <Route
              path="/automl/results"
              element={
                <AutomlResultsContext.Provider
                  value={{
                    pipelineRun: mockPipelineRun,
                    models,
                    parameters: { task_type: 'timeseries', label_column: '' },
                  }}
                >
                  <AutomlResults />
                </AutomlResultsContext.Provider>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(screen.getByText('Namespace is not available', { exact: false })).toBeInTheDocument();
    });

    it('should display error when notebook location is missing', async () => {
      const testModel: AutomlModel = {
        ...createMockModel('Test Model'),
        location: {
          model_directory: '/models/Test Model',
          predictor: '/models/Test Model/predictor.pkl',
          notebook: '', // Missing notebook location
        },
      };
      const models = { 'Test Model': testModel }; // Key must match display_name

      renderWithContext(mockPipelineRun, models);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Notebook location is not available', { exact: false }),
      ).toBeInTheDocument();
    });

    it('should allow user to dismiss error alert', async () => {
      const testModel = createMockModel('Test Model');
      const models = { 'Test Model': testModel }; // Key must match display_name

      fetchS3FileMock.mockRejectedValueOnce(new Error('Network error'));

      renderWithContext(mockPipelineRun, models);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      // Wait for error alert to appear
      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      // Find and click close button
      const closeButton = screen.getByRole('button', { name: /close.*danger.*alert/i });
      await userEvent.click(closeButton);

      // Alert should be removed
      await waitFor(() => {
        expect(screen.queryByText('Notebook download failed')).not.toBeInTheDocument();
      });
    });

    it('should clear previous error when new download is attempted', async () => {
      const testModel = createMockModel('Test Model');
      const models = { 'Test Model': testModel }; // Key must match display_name

      // First download fails
      fetchS3FileMock.mockRejectedValueOnce(new Error('First error'));

      renderWithContext(mockPipelineRun, models);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      // Wait for first error
      await waitFor(() => {
        expect(screen.getByText('First error', { exact: false })).toBeInTheDocument();
      });

      // Second download succeeds
      fetchS3FileMock.mockResolvedValueOnce(new Blob(['notebook content'], { type: 'text/plain' }));

      // Click save notebook again
      await userEvent.click(kebabButton);
      const saveNotebookAction2 = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction2);

      // First error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('First error', { exact: false })).not.toBeInTheDocument();
      });

      // Download should succeed
      expect(downloadBlobMock).toHaveBeenCalled();
    });

    it('should successfully download notebook when all data is valid', async () => {
      const testModel = createMockModel('Test Model');
      const models = { 'Test Model': testModel }; // Key must match display_name

      const mockBlob = new Blob(['notebook content'], { type: 'application/x-ipynb+json' });
      fetchS3FileMock.mockResolvedValueOnce(mockBlob);

      renderWithContext(mockPipelineRun, models);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(fetchS3FileMock).toHaveBeenCalledWith(
          'test-namespace',
          '/models/Test Model/notebook.ipynb',
        );
        expect(downloadBlobMock).toHaveBeenCalledWith(
          mockBlob,
          'My AutoML Run_Test Model_notebook.ipynb',
        );
      });

      // No error should be shown
      expect(screen.queryByText('Notebook download failed')).not.toBeInTheDocument();
    });
  });
});
