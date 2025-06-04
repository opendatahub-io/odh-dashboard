import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { K8sCondition } from '#~/k8sTypes';
import StartingStatusModal from '#~/concepts/pipelines/content/StartingStatusModal';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';

// Mock the usePipelinesAPI hook
jest.mock('../../context', () => ({
  usePipelinesAPI: jest.fn(),
}));

const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);

describe('StartingStatusModal', () => {
  const mockOnClose = jest.fn();

  const createMockConditions = (conditions: K8sCondition[]) => ({
    pipelinesServer: {
      crStatus: {
        conditions,
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show spinner when no conditions are ready', () => {
    mockUsePipelinesAPI.mockReturnValue(
      createMockConditions([
        { type: 'APIServerReady', status: 'False', message: 'API server not ready' },
        { type: 'Ready', status: 'False', message: 'Server not ready' },
      ]),
    );

    render(<StartingStatusModal onClose={mockOnClose} />);

    expect(screen.getByText('Initializing Pipeline Server')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show API ready message when APIServerReady is True', () => {
    mockUsePipelinesAPI.mockReturnValue(
      createMockConditions([
        { type: 'APIServerReady', status: 'True', message: 'API server ready' },
        { type: 'Ready', status: 'False', message: 'Server not ready' },
      ]),
    );

    render(<StartingStatusModal onClose={mockOnClose} />);

    expect(
      screen.getByText(
        'The Pipeline Server API is Ready to Use, although the entire server is still initializing',
      ),
    ).toBeInTheDocument();
  });

  it('should show all ready message when Ready is True', () => {
    mockUsePipelinesAPI.mockReturnValue(
      createMockConditions([
        { type: 'APIServerReady', status: 'True', message: 'API server ready' },
        { type: 'Ready', status: 'True', message: 'Server ready' },
      ]),
    );

    render(<StartingStatusModal onClose={mockOnClose} />);

    expect(
      screen.getByText('Pipeline Server is all done initializing and ready to use.'),
    ).toBeInTheDocument();
  });

  it('should display conditions in the progress tab', () => {
    const conditions = [
      { type: 'APIServerReady', status: 'False', message: 'API server not ready' },
      { type: 'Ready', status: 'False', message: 'Server not ready' },
    ];
    mockUsePipelinesAPI.mockReturnValue(createMockConditions(conditions));

    render(<StartingStatusModal onClose={mockOnClose} />);

    conditions.forEach((condition) => {
      expect(screen.getByText(condition.type)).toBeInTheDocument();
    });
  });

  it('should display conditions in the events log tab', () => {
    const conditions = [
      { type: 'APIServerReady', status: 'False', message: 'API server not ready' },
      { type: 'Ready', status: 'False', message: 'Server not ready' },
    ];
    mockUsePipelinesAPI.mockReturnValue(createMockConditions(conditions));

    render(<StartingStatusModal onClose={mockOnClose} />);

    // Switch to events log tab
    fireEvent.click(screen.getByText('Events log'));

    conditions.forEach((condition) => {
      expect(
        screen.getByText(`${condition.type}: ${condition.status} - ${condition.message}`),
      ).toBeInTheDocument();
    });
  });

  it('should call onClose when close button is clicked', () => {
    mockUsePipelinesAPI.mockReturnValue(
      createMockConditions([
        { type: 'APIServerReady', status: 'False', message: 'API server not ready' },
      ]),
    );

    render(<StartingStatusModal onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Close'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
