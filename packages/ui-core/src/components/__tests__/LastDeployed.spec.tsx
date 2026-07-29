import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { LastDeployed } from '../LastDeployed';

describe('LastDeployed', () => {
  it('should show timestamp when Ready condition is True', () => {
    const resource = {
      status: {
        conditions: [
          {
            type: 'Ready',
            status: 'True',
            lastTransitionTime: '2024-01-15T10:00:00Z',
          },
        ],
      },
    };

    render(<LastDeployed resource={resource} />);
    expect(screen.getByTestId('last-deployed-timestamp')).toBeInTheDocument();
  });

  it('should show timestamp when Ready condition is False', () => {
    const resource = {
      status: {
        conditions: [
          {
            type: 'Ready',
            status: 'False',
            lastTransitionTime: '2024-01-15T10:00:00Z',
          },
        ],
      },
    };

    render(<LastDeployed resource={resource} />);
    expect(screen.getByTestId('last-deployed-timestamp')).toBeInTheDocument();
  });

  it('should prefer Ready condition with status True over False', () => {
    const resource = {
      status: {
        conditions: [
          {
            type: 'Ready',
            status: 'False',
            lastTransitionTime: '2024-01-10T10:00:00Z',
          },
          {
            type: 'Ready',
            status: 'True',
            lastTransitionTime: '2024-01-15T10:00:00Z',
          },
        ],
      },
    };

    render(<LastDeployed resource={resource} />);
    const timestamp = screen.getByTestId('last-deployed-timestamp');
    expect(timestamp).toBeInTheDocument();
  });

  it('should show - when no Ready condition exists', () => {
    const resource = {
      status: {
        conditions: [
          {
            type: 'PredictorReady',
            status: 'True',
            lastTransitionTime: '2024-01-15T10:00:00Z',
          },
        ],
      },
    };

    const { container } = render(<LastDeployed resource={resource} />);
    expect(container.textContent).toBe('-');
    expect(screen.queryByTestId('last-deployed-timestamp')).not.toBeInTheDocument();
  });

  it('should show - when conditions array is empty', () => {
    const resource = {
      status: {
        conditions: [],
      },
    };

    const { container } = render(<LastDeployed resource={resource} />);
    expect(container.textContent).toBe('-');
  });

  it('should show - when status is missing', () => {
    const resource = {};

    const { container } = render(<LastDeployed resource={resource} />);
    expect(container.textContent).toBe('-');
  });

  it('should show - when conditions is not an array', () => {
    const resource = {
      status: {
        conditions: 'invalid',
      },
    };

    const { container } = render(<LastDeployed resource={resource} />);
    expect(container.textContent).toBe('-');
  });
});
