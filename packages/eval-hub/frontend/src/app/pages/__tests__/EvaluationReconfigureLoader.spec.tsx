/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationReconfigureLoader from '~/app/pages/EvaluationReconfigureLoader';
import { CollectionsListResponse, EvaluationJob, InferenceServiceItem } from '~/app/types';

const mockUseEvaluationJob = jest.fn<
  [EvaluationJob | null, boolean, Error | undefined],
  [string | undefined, string | undefined]
>();

jest.mock('~/app/hooks/useEvaluationJob', () => ({
  useEvaluationJob: (...args: [string | undefined, string | undefined]) =>
    mockUseEvaluationJob(...args),
}));

const mockUseInferenceServices = jest.fn<
  { inferenceServices: InferenceServiceItem[]; loaded: boolean },
  [string]
>();

jest.mock('~/app/hooks/useInferenceServices', () => ({
  useInferenceServices: (...args: [string]) => mockUseInferenceServices(...args),
}));

const mockGetCollections = jest.fn<
  (opts: unknown) => Promise<CollectionsListResponse>,
  [string, { namespace: string; name: string }]
>();

jest.mock('~/app/api/k8s', () => ({
  getCollections: (...args: [string, { namespace: string; name: string }]) =>
    mockGetCollections(...args),
}));

jest.mock('~/app/pages/StartEvaluationRunPage', () => {
  const StartEvaluationRunPage: React.FC<{ sourceJobId?: string }> = ({ sourceJobId }) => (
    <div data-testid="start-evaluation-run-page" data-source-job-id={sourceJobId} />
  );
  return { __esModule: true, default: StartEvaluationRunPage };
});

const renderLoader = (namespace = 'test-ns', jobId = 'job-123') =>
  render(
    <MemoryRouter initialEntries={[`/evaluation/${namespace}/reconfigure/${jobId}`]}>
      <Routes>
        <Route
          path="/evaluation/:namespace/reconfigure/:jobId"
          element={<EvaluationReconfigureLoader />}
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUseInferenceServices.mockReturnValue({ inferenceServices: [], loaded: true });
});

describe('EvaluationReconfigureLoader', () => {
  it('should show a loading spinner while the job is loading', () => {
    mockUseEvaluationJob.mockReturnValue([null, false, undefined]);

    renderLoader();

    expect(screen.getByLabelText('Loading evaluation data')).toBeInTheDocument();
    expect(screen.queryByTestId('start-evaluation-run-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reconfigure-load-error')).not.toBeInTheDocument();
  });

  it('should show a loading spinner while inference services are loading', () => {
    const job = mockEvaluationJob({ id: 'job-123' });
    mockUseEvaluationJob.mockReturnValue([job, true, undefined]);
    mockUseInferenceServices.mockReturnValue({ inferenceServices: [], loaded: false });

    renderLoader();

    expect(screen.getByLabelText('Loading evaluation data')).toBeInTheDocument();
  });

  it('should show an error state when job loading fails', () => {
    mockUseEvaluationJob.mockReturnValue([null, true, new Error('Job not found')]);

    renderLoader();

    const errorState = screen.getByTestId('reconfigure-load-error');
    expect(errorState).toBeInTheDocument();
    expect(errorState).toHaveTextContent('Unable to load evaluation');
    expect(errorState).toHaveTextContent('Job not found');
    expect(screen.getByText('Return to evaluations')).toBeInTheDocument();
  });

  it('should render StartEvaluationRunPage with sourceJobId when loaded', () => {
    const job = mockEvaluationJob({ id: 'job-123', name: 'My Eval' });
    mockUseEvaluationJob.mockReturnValue([job, true, undefined]);

    renderLoader();

    const page = screen.getByTestId('start-evaluation-run-page');
    expect(page).toBeInTheDocument();
    expect(page).toHaveAttribute('data-source-job-id', 'job-123');
  });

  it('should pass namespace and jobId from route params to useEvaluationJob', () => {
    mockUseEvaluationJob.mockReturnValue([null, false, undefined]);

    renderLoader('my-namespace', 'my-job-id');

    expect(mockUseEvaluationJob).toHaveBeenCalledWith('my-namespace', 'my-job-id');
  });

  it('should pass namespace to useInferenceServices', () => {
    mockUseEvaluationJob.mockReturnValue([null, false, undefined]);

    renderLoader('my-namespace');

    expect(mockUseInferenceServices).toHaveBeenCalledWith('my-namespace');
  });

  it('should show an error state when getCollections returns no matching collection', async () => {
    const job = mockEvaluationJob({ id: 'job-123', collectionId: 'missing-collection' });
    mockUseEvaluationJob.mockReturnValue([job, true, undefined]);
    mockGetCollections.mockReturnValue(() =>
      Promise.resolve({ items: [{ resource: { id: 'other-collection' }, name: 'Other' }] }),
    );

    renderLoader();

    await waitFor(() => {
      expect(screen.getByTestId('reconfigure-load-error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('reconfigure-load-error')).toHaveTextContent(
      'Collection "missing-collection" not found',
    );
    expect(screen.queryByTestId('start-evaluation-run-page')).not.toBeInTheDocument();
  });
});
