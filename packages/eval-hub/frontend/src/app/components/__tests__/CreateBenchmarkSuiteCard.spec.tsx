import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateBenchmarkSuiteCard from '~/app/components/CreateBenchmarkSuiteCard';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

jest.mock('~/app/tracking/evalhubTracking', () => ({
  trackEvalHubEvent: jest.fn(),
}));

const mockTrackEvalHubEvent = jest.mocked(trackEvalHubEvent);

describe('CreateBenchmarkSuiteCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the suite creation CTA content', () => {
    render(<CreateBenchmarkSuiteCard />);

    expect(screen.getByTestId('create-suite-card')).toHaveTextContent('Create your own collection');
    expect(screen.getByText(/Build a reusable collection/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create collection' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import from git' })).not.toBeInTheDocument();
  });

  it('should render as a default white card with the collection-card title size', () => {
    render(<CreateBenchmarkSuiteCard />);

    // RHAI-15138: keep the tile on the plain white card (no grey secondary
    // variant) and its title at the xl size the collection cards use.
    expect(screen.getByTestId('create-suite-card')).not.toHaveClass('pf-m-secondary');
    expect(screen.getByText('Create your own collection')).toHaveClass('pf-m-xl');
  });

  it('should invoke the supplied CTA callback', () => {
    const onCreateSuite = jest.fn();
    render(<CreateBenchmarkSuiteCard onCreateSuite={onCreateSuite} />);

    fireEvent.click(screen.getByTestId('create-suite-button'));

    expect(onCreateSuite).toHaveBeenCalledTimes(1);
  });

  it('should link to the suite creation route when provided', () => {
    render(
      <MemoryRouter>
        <CreateBenchmarkSuiteCard createSuiteRoute="/evaluation/evalhub/create/collections/new" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Create collection' })).toHaveAttribute(
      'href',
      '/evaluation/evalhub/create/collections/new',
    );
  });

  it('should track opening the create suite form', () => {
    render(
      <MemoryRouter>
        <CreateBenchmarkSuiteCard
          createSuiteRoute="/evaluation/evalhub/create/collections/new"
          trackingSurface="my_benchmark_suites"
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('create-suite-button'));

    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(EVAL_HUB_EVENTS.COLLECTION_CREATE_OPENED, {
      surface: 'my_benchmark_suites',
    });
  });
});
