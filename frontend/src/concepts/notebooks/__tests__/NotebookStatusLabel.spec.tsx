import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { EventStatus } from '#~/types';
import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import NotebookStatusLabel from '#~/concepts/notebooks/NotebookStatusLabel';

const getStatusLabel = () => screen.getByTestId('notebook-status-text').textContent;

describe('NotebookStatusLabel', () => {
  it('should show Failed when notebook has error status', () => {
    render(
      <NotebookStatusLabel
        isStarting={false}
        isStopping={false}
        isRunning={false}
        notebookStatus={{
          currentStatus: EventStatus.ERROR,
          currentEvent: '',
          currentEventReason: '',
          currentEventDescription: '',
        }}
      />,
    );
    expect(getStatusLabel()).toBe('Failed');
  });

  it('should show Queued when isStarting and kueueStatus is Queued (kueue status takes precedence)', () => {
    render(
      <NotebookStatusLabel
        isStarting
        isStopping={false}
        isRunning={false}
        kueueStatus={{ status: KueueWorkloadStatus.Queued }}
      />,
    );
    expect(getStatusLabel()).toBe('Queued');
  });

  it('should show Starting when isStarting and kueueStatus is null', () => {
    render(
      <NotebookStatusLabel isStarting isStopping={false} isRunning={false} kueueStatus={null} />,
    );
    expect(getStatusLabel()).toBe('Starting');
  });

  it('should show Starting when isStarting and kueueStatus is Running (Running not in override list)', () => {
    render(
      <NotebookStatusLabel
        isStarting
        isStopping={false}
        isRunning={false}
        kueueStatus={{ status: KueueWorkloadStatus.Running }}
      />,
    );
    expect(getStatusLabel()).toBe('Starting');
  });

  it('should show Stopping when isStopping even if kueueStatus is Queued', () => {
    render(
      <NotebookStatusLabel
        isStarting={false}
        isStopping
        isRunning={false}
        kueueStatus={{ status: KueueWorkloadStatus.Queued }}
      />,
    );
    expect(getStatusLabel()).toBe('Stopping');
  });

  it('should show Stopping when isStopping even if kueueStatus is Succeeded', () => {
    render(
      <NotebookStatusLabel
        isStarting={false}
        isStopping
        isRunning={false}
        kueueStatus={{ status: KueueWorkloadStatus.Succeeded }}
      />,
    );
    expect(getStatusLabel()).toBe('Stopping');
  });

  it('should show Queued when not starting or stopping and kueueStatus is Queued', () => {
    render(
      <NotebookStatusLabel
        isStarting={false}
        isStopping={false}
        isRunning={false}
        kueueStatus={{ status: KueueWorkloadStatus.Queued }}
      />,
    );
    expect(getStatusLabel()).toBe('Queued');
  });

  it('should show Complete when not starting or stopping and kueueStatus is Succeeded', () => {
    render(
      <NotebookStatusLabel
        isStarting={false}
        isStopping={false}
        isRunning={false}
        kueueStatus={{ status: KueueWorkloadStatus.Succeeded }}
      />,
    );
    expect(getStatusLabel()).toBe('Complete');
  });

  it('should show Running when isRunning and no kueue override', () => {
    render(
      <NotebookStatusLabel isStarting={false} isStopping={false} isRunning kueueStatus={null} />,
    );
    expect(getStatusLabel()).toBe('Running');
  });

  it('should show Stopped when not starting, stopping, or running and no kueue status', () => {
    render(
      <NotebookStatusLabel
        isStarting={false}
        isStopping={false}
        isRunning={false}
        kueueStatus={null}
      />,
    );
    expect(getStatusLabel()).toBe('Stopped');
  });
});
