import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Table, Tbody } from '@patternfly/react-table';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationsTableRow from '../EvaluationsTableRow';

const renderRow = (jobOverrides = {}, rowIndex = 0) => {
  const job = mockEvaluationJob(jobOverrides);
  return render(
    <Table aria-label="test">
      <Tbody>
        <EvaluationsTableRow job={job} rowIndex={rowIndex} />
      </Tbody>
    </Table>,
  );
};

describe('EvaluationsTableRow', () => {
  it('should render the evaluation name from tenant', () => {
    renderRow({ tenant: 'My Evaluation' });
    expect(screen.getByTestId('evaluation-name')).toHaveTextContent('My Evaluation');
  });

  it('should fall back to resource id when tenant is not set', () => {
    renderRow({ id: 'eval-fallback-id' });
    expect(screen.getByTestId('evaluation-name')).toHaveTextContent('eval-fallback-id');
  });

  it('should render status label', () => {
    renderRow({ state: 'running' });
    expect(screen.getByTestId('status-label-running')).toBeInTheDocument();
  });

  it('should render benchmark name', () => {
    renderRow({ benchmarkId: 'MMLU Finance' });
    expect(screen.getByTestId('evaluation-benchmark')).toHaveTextContent('MMLU Finance');
  });

  it('should render model name in the Type column', () => {
    renderRow({ modelName: 'gpt-4-turbo' });
    expect(screen.getByTestId('evaluation-type')).toHaveTextContent('gpt-4-turbo');
  });

  it('should render formatted run date', () => {
    renderRow({ createdAt: '2026-02-20T10:00:00Z' });
    const dateCell = screen.getByTestId('evaluation-run-date');
    expect(dateCell.textContent).toContain('2026');
  });

  it('should render result percentage when metrics exist', () => {
    renderRow({ metrics: { score: 0.85 } });
    expect(screen.getByTestId('evaluation-result')).toHaveTextContent('85%');
  });

  it('should render dash for result when no metrics', () => {
    renderRow({ state: 'running' });
    expect(screen.getByTestId('evaluation-result')).toHaveTextContent('-');
  });

  describe('kebab actions', () => {
    it('should show Stop action for running jobs', () => {
      renderRow({ state: 'running' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.getByText('Stop')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should show Stop action for pending jobs', () => {
      renderRow({ state: 'pending' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('should not show Stop action for completed jobs', () => {
      renderRow({ state: 'completed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should not show Stop action for failed jobs', () => {
      renderRow({ state: 'failed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    });

    it('should not show Stop action for stopped jobs', () => {
      renderRow({ state: 'stopped' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    });
  });

  describe('confirmation modals', () => {
    it('should open stop confirmation modal', () => {
      renderRow({ state: 'running' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Stop'));
      expect(screen.getByText('Stop evaluation run')).toBeInTheDocument();
      expect(
        screen.getByText(
          'By stopping this evaluation run you will cancel this evaluation process.',
        ),
      ).toBeInTheDocument();
    });

    it('should open delete confirmation modal', () => {
      renderRow({ state: 'completed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Delete'));
      expect(screen.getByText('Delete evaluation run')).toBeInTheDocument();
      expect(
        screen.getByText(
          'By deleting this evaluation run you will be removing it from the list of evaluation reports.',
        ),
      ).toBeInTheDocument();
    });

    it('should close modal when Cancel is clicked', () => {
      renderRow({ state: 'completed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Delete'));
      expect(screen.getByText('Delete evaluation run')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('evaluation-delete-cancel'));
      expect(screen.queryByText('Delete evaluation run')).not.toBeInTheDocument();
    });

    it('should close modal when Confirm is clicked', () => {
      renderRow({ state: 'completed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Delete'));

      fireEvent.click(screen.getByTestId('evaluation-delete-confirm'));
      expect(screen.queryByText('Delete evaluation run')).not.toBeInTheDocument();
    });
  });
});
