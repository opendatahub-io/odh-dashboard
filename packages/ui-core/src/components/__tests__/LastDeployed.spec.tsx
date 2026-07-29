import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { LastDeployed } from '../LastDeployed';

jest.mock('@patternfly/react-core', () => {
  const actual = jest.requireActual('@patternfly/react-core');
  return {
    ...actual,
    Timestamp: ({
      date,
      children,
      ...rest
    }: {
      date: Date;
      children: React.ReactNode;
      'data-testid'?: string;
    }) => (
      <span data-testid={rest['data-testid']} data-date={date.toISOString()}>
        {children}
      </span>
    ),
  };
});

describe('LastDeployed', () => {
  it('should show timestamp when Ready condition is True', () => {
    const resource: K8sResourceCommon = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
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
    const resource: K8sResourceCommon = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
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
    const trueTimestamp = '2024-01-15T10:00:00Z';
    const falseTimestamp = '2024-01-10T10:00:00Z';
    const resource: K8sResourceCommon = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      status: {
        conditions: [
          {
            type: 'Ready',
            status: 'False',
            lastTransitionTime: falseTimestamp,
          },
          {
            type: 'Ready',
            status: 'True',
            lastTransitionTime: trueTimestamp,
          },
        ],
      },
    };

    render(<LastDeployed resource={resource} />);
    const timestamp = screen.getByTestId('last-deployed-timestamp');
    expect(timestamp).toBeInTheDocument();
    expect(timestamp).toHaveAttribute('data-date', new Date(trueTimestamp).toISOString());
  });

  it('should show - when no Ready condition exists', () => {
    const resource: K8sResourceCommon = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
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
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      status: {
        conditions: [],
      },
    } as K8sResourceCommon;

    const { container } = render(<LastDeployed resource={resource} />);
    expect(container.textContent).toBe('-');
  });

  it('should show - when status is missing', () => {
    const resource = {} as K8sResourceCommon;

    const { container } = render(<LastDeployed resource={resource} />);
    expect(container.textContent).toBe('-');
  });

  it('should show - when conditions is not an array', () => {
    const resource = {
      status: {
        conditions: 'invalid',
      },
    } as unknown as K8sResourceCommon;

    const { container } = render(<LastDeployed resource={resource} />);
    expect(container.textContent).toBe('-');
  });

  it('should show - when conditions contains null entries', () => {
    const resource = {
      status: {
        conditions: [
          null,
          undefined,
          { type: 'Ready', status: 'True', lastTransitionTime: '2024-01-15T10:00:00Z' },
        ],
      },
    } as unknown as K8sResourceCommon;

    render(<LastDeployed resource={resource} />);
    expect(screen.getByTestId('last-deployed-timestamp')).toBeInTheDocument();
  });

  it('should show - when conditions contains only null entries', () => {
    const resource = {
      status: {
        conditions: [null, undefined],
      },
    } as unknown as K8sResourceCommon;

    const { container } = render(<LastDeployed resource={resource} />);
    expect(container.textContent).toBe('-');
  });

  it('should show - when Ready condition has no lastTransitionTime', () => {
    const resource = {
      status: {
        conditions: [
          {
            type: 'Ready',
            status: 'True',
          },
        ],
      },
    } as unknown as K8sResourceCommon;

    const { container } = render(<LastDeployed resource={resource} />);
    expect(container.textContent).toBe('-');
  });
});
