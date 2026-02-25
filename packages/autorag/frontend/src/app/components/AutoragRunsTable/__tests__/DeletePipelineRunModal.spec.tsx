/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PipelineRun } from '~/app/types';
import DeletePipelineRunModal from '~/app/components/AutoragRunsTable/DeletePipelineRunModal';

const mockRun: PipelineRun = {
  id: 'r1',
  name: 'Test Run',
  description: 'A test run',
  tags: ['tag1'],
  stats: '1h',
  pipeline_id: 'p1',
  pipeline_name: 'Pipeline 1',
  status: 'Succeeded',
  created_at: '2025-01-17',
};

describe('DeletePipelineRunModal', () => {
  it('should not render when run is null', () => {
    render(<DeletePipelineRunModal isOpen run={null} onClose={jest.fn()} onConfirm={jest.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when run is provided and isOpen is true', () => {
    render(
      <DeletePipelineRunModal isOpen run={mockRun} onClose={jest.fn()} onConfirm={jest.fn()} />,
    );

    expect(screen.getByRole('dialog', { name: 'Delete pipeline run' })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete run "Test Run"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('should call onClose with false when Cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(<DeletePipelineRunModal isOpen run={mockRun} onClose={onClose} onConfirm={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('should call onConfirm and onClose with true when Delete is clicked', async () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<DeletePipelineRunModal isOpen run={mockRun} onClose={onClose} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(onConfirm).toHaveBeenCalled();
    await expect(onConfirm()).resolves.toBeUndefined();
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('should call onClose with false when onConfirm throws', async () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn().mockRejectedValue(new Error('Delete failed'));
    const user = userEvent.setup();

    render(<DeletePipelineRunModal isOpen run={mockRun} onClose={onClose} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await expect(onConfirm()).rejects.toThrow('Delete failed');
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
