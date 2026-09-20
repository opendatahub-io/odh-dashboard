import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import KueueProjectsModal from '../KueueProjectsModal';
import useKueueProjectsForClusterQueue from '../../hooks/useKueueProjectsForClusterQueue';

jest.mock('../../hooks/useKueueProjectsForClusterQueue', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useKueueProjectsForClusterQueueMock = jest.mocked(useKueueProjectsForClusterQueue);

describe('KueueProjectsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKueueProjectsForClusterQueueMock.mockReturnValue({
      data: [{ name: 'legacy-jobs' }, { name: 'alpha-team' }, { name: 'beta-workloads' }],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  it('renders title, description, and project rows', () => {
    render(<KueueProjectsModal clusterQueueName="gpu-cq" onClose={jest.fn()} />);

    expect(screen.getByText('Kueue projects')).toBeInTheDocument();
    expect(screen.getByText('Kueue projects using this cluster queue.')).toBeInTheDocument();
    expect(screen.getByTestId('kueue-projects-row-legacy-jobs')).toBeInTheDocument();
    expect(screen.getByTestId('kueue-projects-row-alpha-team')).toBeInTheDocument();
    expect(useKueueProjectsForClusterQueueMock).toHaveBeenCalledWith('gpu-cq');
  });

  it('shows loading state while projects are loading', () => {
    useKueueProjectsForClusterQueueMock.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    render(<KueueProjectsModal clusterQueueName="gpu-cq" onClose={jest.fn()} />);

    expect(screen.getByTestId('kueue-projects-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('kueue-projects-table')).not.toBeInTheDocument();
  });

  it('shows error state when loading projects fails', () => {
    useKueueProjectsForClusterQueueMock.mockReturnValue({
      data: [],
      loaded: true,
      error: new Error('Failed to fetch local queues'),
      refresh: jest.fn(),
    });

    render(<KueueProjectsModal clusterQueueName="gpu-cq" onClose={jest.fn()} />);

    expect(screen.getByTestId('kueue-projects-error-alert')).toBeInTheDocument();
    expect(screen.getByText('Error loading Kueue projects')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch local queues')).toBeInTheDocument();
    expect(screen.queryByTestId('kueue-projects-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kueue-projects-loading')).not.toBeInTheDocument();
  });

  it('filters projects by name', async () => {
    const user = userEvent.setup();
    render(<KueueProjectsModal clusterQueueName="gpu-cq" onClose={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText('Find by name');
    await user.type(searchInput, 'alpha');

    expect(screen.getByTestId('kueue-projects-row-alpha-team')).toBeInTheDocument();
    expect(screen.queryByTestId('kueue-projects-row-legacy-jobs')).not.toBeInTheDocument();
  });

  it('calls onClose when Close is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<KueueProjectsModal clusterQueueName="gpu-cq" onClose={onClose} />);

    await user.click(screen.getByTestId('kueue-projects-close-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
