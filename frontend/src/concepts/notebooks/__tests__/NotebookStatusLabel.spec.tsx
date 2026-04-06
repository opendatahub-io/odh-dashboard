import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { EventStatus } from '#~/types';
import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import NotebookStatusLabel from '#~/concepts/notebooks/NotebookStatusLabel';

const getStatusLabel = () => screen.getByTestId('notebook-status-text').textContent;
const getStatusLabelElement = () => screen.getByTestId('notebook-status-text');

describe('NotebookStatusLabel', () => {
  it('should show Failed with danger status when notebook has error status', () => {
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
    expect(getStatusLabelElement()).toHaveClass('pf-m-danger');
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

  it('should show Starting with blue color when isStarting and kueueStatus is null', () => {
    render(
      <NotebookStatusLabel isStarting isStopping={false} isRunning={false} kueueStatus={null} />,
    );
    expect(getStatusLabel()).toBe('Starting');
    expect(getStatusLabelElement()).toHaveClass('pf-m-blue');
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
    expect(getStatusLabelElement()).not.toHaveClass('pf-m-success');
    expect(getStatusLabelElement()).not.toHaveClass('pf-m-danger');
  });

  it('should show Stopping when isStopping even if kueueStatus is Complete', () => {
    render(
      <NotebookStatusLabel
        isStarting={false}
        isStopping
        isRunning={false}
        kueueStatus={{ status: KueueWorkloadStatus.Complete }}
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

  it('should show Complete with success status when kueueStatus is Complete', () => {
    render(
      <NotebookStatusLabel
        isStarting={false}
        isStopping={false}
        isRunning={false}
        kueueStatus={{ status: KueueWorkloadStatus.Complete }}
      />,
    );
    expect(getStatusLabel()).toBe('Complete');
    expect(getStatusLabelElement()).toHaveClass('pf-m-success');
  });

  it('should show Ready with success status when isRunning and no kueue override', () => {
    render(
      <NotebookStatusLabel isStarting={false} isStopping={false} isRunning kueueStatus={null} />,
    );
    expect(getStatusLabel()).toBe('Ready');
    expect(getStatusLabelElement()).toHaveClass('pf-m-success');
  });

  it('should show Stopped with no semantic status when not starting, stopping, or running', () => {
    render(
      <NotebookStatusLabel
        isStarting={false}
        isStopping={false}
        isRunning={false}
        kueueStatus={null}
      />,
    );
    expect(getStatusLabel()).toBe('Stopped');
    expect(getStatusLabelElement()).not.toHaveClass('pf-m-success');
    expect(getStatusLabelElement()).not.toHaveClass('pf-m-danger');
    expect(getStatusLabelElement()).not.toHaveClass('pf-m-info');
  });

  it('should use outline variant when onClick is not provided', () => {
    render(
      <NotebookStatusLabel isStarting={false} isStopping={false} isRunning kueueStatus={null} />,
    );
    expect(getStatusLabelElement()).toHaveClass('pf-m-outline');
  });

  it('should use filled variant when onClick is provided', () => {
    render(
      <NotebookStatusLabel
        isStarting={false}
        isStopping={false}
        isRunning
        kueueStatus={null}
        onClick={jest.fn()}
      />,
    );
    expect(getStatusLabelElement()).not.toHaveClass('pf-m-outline');
  });
});
