import * as React from 'react';
import { render } from '@testing-library/react';
import { RunStatus } from '@patternfly/react-topology';
import NodeStatusIcon from '#~/concepts/topology/NodeStatusIcon';

describe('NodeStatusIcon', () => {
  it('should render icon for RunStatus.Pending', () => {
    const { container } = render(<NodeStatusIcon runStatus={RunStatus.Pending} />);
    expect(container.querySelector('.pf-v6-c-icon')).toBeInTheDocument();
  });

  it('should render icon for RunStatus.Idle', () => {
    const { container } = render(<NodeStatusIcon runStatus={RunStatus.Idle} />);
    expect(container.querySelector('.pf-v6-c-icon')).toBeInTheDocument();
  });

  it('should render with info status for RunStatus.Running', () => {
    const { container } = render(<NodeStatusIcon runStatus={RunStatus.Running} />);
    expect(container.querySelector('.pf-v6-c-icon__content')).toHaveClass('pf-m-info');
  });

  it('should render with info status for RunStatus.InProgress', () => {
    const { container } = render(<NodeStatusIcon runStatus={RunStatus.InProgress} />);
    expect(container.querySelector('.pf-v6-c-icon__content')).toHaveClass('pf-m-info');
  });

  it('should render with success status for RunStatus.Skipped', () => {
    const { container } = render(<NodeStatusIcon runStatus={RunStatus.Skipped} />);
    expect(container.querySelector('.pf-v6-c-icon__content')).toHaveClass('pf-m-success');
  });

  it('should render with success status for RunStatus.Succeeded', () => {
    const { container } = render(<NodeStatusIcon runStatus={RunStatus.Succeeded} />);
    expect(container.querySelector('.pf-v6-c-icon__content')).toHaveClass('pf-m-success');
  });

  it('should render with danger status for RunStatus.Failed', () => {
    const { container } = render(<NodeStatusIcon runStatus={RunStatus.Failed} />);
    expect(container.querySelector('.pf-v6-c-icon__content')).toHaveClass('pf-m-danger');
  });

  it('should render with danger status for RunStatus.FailedToStart', () => {
    const { container } = render(<NodeStatusIcon runStatus={RunStatus.FailedToStart} />);
    expect(container.querySelector('.pf-v6-c-icon__content')).toHaveClass('pf-m-danger');
  });

  it('should render with no status modifier for RunStatus.Cancelled', () => {
    const { container } = render(<NodeStatusIcon runStatus={RunStatus.Cancelled} />);
    const content = container.querySelector('.pf-v6-c-icon__content');
    expect(content).not.toHaveClass('pf-m-info');
    expect(content).not.toHaveClass('pf-m-success');
    expect(content).not.toHaveClass('pf-m-danger');
  });

  it('should render with no status modifier for RunStatus.Pending', () => {
    const { container } = render(<NodeStatusIcon runStatus={RunStatus.Pending} />);
    const content = container.querySelector('.pf-v6-c-icon__content');
    expect(content).not.toHaveClass('pf-m-info');
    expect(content).not.toHaveClass('pf-m-success');
    expect(content).not.toHaveClass('pf-m-danger');
  });

  it('should render with no status modifier for unknown status', () => {
    const { container } = render(<NodeStatusIcon runStatus="unknown-status" />);
    const content = container.querySelector('.pf-v6-c-icon__content');
    expect(content).not.toHaveClass('pf-m-info');
    expect(content).not.toHaveClass('pf-m-success');
    expect(content).not.toHaveClass('pf-m-danger');
  });
});
