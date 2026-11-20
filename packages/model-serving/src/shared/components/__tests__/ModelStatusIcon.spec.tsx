import React from 'react';
import { render, screen } from '@testing-library/react';
import { ModelStatusIcon } from '../ModelStatusIcon';
import { ModelDeploymentState } from '../../types';

describe('ModelStatusIcon', () => {
  it('should show deletion ahead of stale stopped state', () => {
    render(
      <ModelStatusIcon
        state={ModelDeploymentState.DELETING}
        stoppedStates={{ isStopped: true, isStarting: false, isStopping: false, isRunning: false }}
      />,
    );
    expect(screen.getByText('Deleting')).toBeVisible();
    expect(screen.queryByText('Stopped')).not.toBeInTheDocument();
  });
});
