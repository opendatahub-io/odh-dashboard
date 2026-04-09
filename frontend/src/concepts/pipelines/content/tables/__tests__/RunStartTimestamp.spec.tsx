/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RuntimeStateKF } from '#~/concepts/pipelines/kfTypes';
import RunStartTimestamp from '#~/concepts/pipelines/content/tables/RunStartTimestamp';

jest.mock('#~/utilities/time', () => ({
  relativeTime: () => '1 day ago',
}));

const validRun = {
  created_at: '2025-01-17T00:00:00Z',
};

describe('RunStartTimestamp', () => {
  it('renders a timestamp for a valid created_at', () => {
    render(<RunStartTimestamp run={validRun} />);
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });

  it('renders em dash when created_at is invalid and no state_history', () => {
    render(<RunStartTimestamp run={{ created_at: 'not-a-date', state_history: [] }} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders em dash when created_at is empty and no state_history', () => {
    render(<RunStartTimestamp run={{ created_at: '', state_history: [] }} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders timestamp from created_at when state_history has no RUNNING entry', () => {
    render(
      <RunStartTimestamp
        run={{
          created_at: '2025-01-17T00:00:00Z',
          state_history: [{ update_time: '2025-01-17T00:00:01Z', state: RuntimeStateKF.PENDING }],
        }}
      />,
    );
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });

  it('renders timestamp from last RUNNING state_history entry on retry', () => {
    render(
      <RunStartTimestamp
        run={{
          created_at: '2024-01-01T00:00:00Z',
          state_history: [{ update_time: '2024-01-02T00:00:00Z', state: RuntimeStateKF.RUNNING }],
        }}
      />,
    );
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });

  it('skips malformed state_history entries and falls back to created_at', () => {
    render(
      <RunStartTimestamp
        run={{
          created_at: '2025-01-17T00:00:00Z',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          state_history: [null, 42, { state: 'SUCCEEDED' }] as any,
        }}
      />,
    );
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });

  it('falls back to created_at when state_history is undefined', () => {
    render(<RunStartTimestamp run={{ created_at: '2025-01-17T00:00:00Z' }} />);
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });
});
