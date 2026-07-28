import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockRayJobK8sResource } from '@odh-dashboard/model-training/__mocks__/mockRayJobK8sResource';
import RayJobStatus from '../RayJobStatus';
import { RayJobDeploymentStatus, RayJobStatusValue } from '../../../../types';

describe('RayJobStatus', () => {
  it('should show Running status for a running RayJob', () => {
    const job = mockRayJobK8sResource({
      jobStatus: RayJobStatusValue.RUNNING,
      jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    });

    render(<RayJobStatus job={job} />);

    const statusLabel = screen.getByTestId('ray-job-status');
    expect(statusLabel).toBeInTheDocument();
    expect(statusLabel).toHaveTextContent('Running');
  });

  it('should show Complete status for a succeeded RayJob', () => {
    const job = mockRayJobK8sResource({
      jobStatus: RayJobStatusValue.SUCCEEDED,
      jobDeploymentStatus: RayJobDeploymentStatus.COMPLETE,
    });

    render(<RayJobStatus job={job} />);

    const statusLabel = screen.getByTestId('ray-job-status');
    expect(statusLabel).toHaveTextContent('Complete');
  });

  it('should show Failed status for a failed RayJob', () => {
    const job = mockRayJobK8sResource({
      jobStatus: RayJobStatusValue.FAILED,
      jobDeploymentStatus: RayJobDeploymentStatus.FAILED,
    });

    render(<RayJobStatus job={job} />);

    const statusLabel = screen.getByTestId('ray-job-status');
    expect(statusLabel).toHaveTextContent('Failed');
  });

  it('should show Paused status for a suspended RayJob', () => {
    const job = mockRayJobK8sResource({
      suspend: true,
      jobDeploymentStatus: RayJobDeploymentStatus.SUSPENDED,
    });

    render(<RayJobStatus job={job} />);

    const statusLabel = screen.getByTestId('ray-job-status');
    expect(statusLabel).toHaveTextContent('Paused');
  });

  it('should show Pending status for an initializing RayJob', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
      jobStatus: undefined,
    });

    render(<RayJobStatus job={job} />);

    const statusLabel = screen.getByTestId('ray-job-status');
    expect(statusLabel).toHaveTextContent('Pending');
  });

  it('should show Queued status for a waiting RayJob', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.WAITING,
      jobStatus: undefined,
    });

    render(<RayJobStatus job={job} />);

    const statusLabel = screen.getByTestId('ray-job-status');
    expect(statusLabel).toHaveTextContent('Queued');
  });

  it('should show Deleting status for a RayJob with deletionTimestamp', () => {
    const job = mockRayJobK8sResource({
      isDeleting: true,
      jobStatus: RayJobStatusValue.RUNNING,
      jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    });

    render(<RayJobStatus job={job} />);

    const statusLabel = screen.getByTestId('ray-job-status');
    expect(statusLabel).toHaveTextContent('Deleting');
  });

  it('should show loading skeleton when isLoading is true and jobStatus is undefined', () => {
    const job = mockRayJobK8sResource({
      jobStatus: RayJobStatusValue.RUNNING,
      jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    });

    render(<RayJobStatus job={job} isLoading />);

    expect(screen.getByTestId('ray-job-status-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('ray-job-status')).not.toBeInTheDocument();
  });
});
