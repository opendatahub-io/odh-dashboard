import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ExecutorLogsTearsheet from '~/components/feature/ExecutorLogsTearsheet';

describe('ExecutorLogsTearsheet', () => {
  it('should render the log content and step description when open', () => {
    render(
      <ExecutorLogsTearsheet
        logText="[KFP Executor ERROR]: ValueError: boom"
        isOpen
        onClose={() => undefined}
        stepLabel="Documents discovery"
      />,
    );

    expect(screen.getByTestId('executor-logs-content')).toHaveTextContent(
      '[KFP Executor ERROR]: ValueError: boom',
    );
    expect(
      screen.getByText(
        'Stdout and stderr captured by the KFP executor for the Documents discovery step.',
      ),
    ).toBeInTheDocument();
  });

  it('should describe the first failed step when no step label is provided', () => {
    render(<ExecutorLogsTearsheet logText="log" isOpen onClose={() => undefined} />);

    expect(
      screen.getByText('Stdout and stderr captured by the KFP executor for the first failed step.'),
    ).toBeInTheDocument();
  });

  it('should not render the log when closed', () => {
    render(<ExecutorLogsTearsheet logText="log" isOpen={false} onClose={() => undefined} />);

    expect(screen.queryByTestId('executor-logs-content')).not.toBeInTheDocument();
  });

  it('should call onClose when the tearsheet is dismissed', () => {
    const onClose = jest.fn();
    render(<ExecutorLogsTearsheet logText="log" isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
