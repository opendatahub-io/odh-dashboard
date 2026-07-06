import * as React from 'react';
import { render, screen } from '@testing-library/react';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseResourceType } from '~/app/utilities/phaseLabelUtils';

describe('PhaseLabel', () => {
  it('should render Active phase with correct text', () => {
    render(<PhaseLabel phase="Active" resourceType={PhaseResourceType.SUBSCRIPTION} />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Ready');
  });

  it('should render Ready phase with correct text', () => {
    render(<PhaseLabel phase="Ready" resourceType={PhaseResourceType.SUBSCRIPTION} />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Ready');
  });

  it('should render Failed phase with correct text', () => {
    render(<PhaseLabel phase="Failed" resourceType={PhaseResourceType.SUBSCRIPTION} />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Failed');
    expect(label.className).toContain('pf-m-danger');
  });

  it('should render Degraded phase with correct text', () => {
    render(<PhaseLabel phase="Degraded" resourceType={PhaseResourceType.SUBSCRIPTION} />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Degraded');
    expect(label.className).toContain('pf-m-warning');
  });

  it('should render Unhealthy phase with correct text', () => {
    render(<PhaseLabel phase="Unhealthy" resourceType={PhaseResourceType.SUBSCRIPTION} />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Unavailable');
    expect(label.className).toContain('pf-m-warning');
  });

  it('should render Pending phase with correct text', () => {
    render(<PhaseLabel phase="Pending" resourceType={PhaseResourceType.SUBSCRIPTION} />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Pending');
  });

  it('should render Unknown label when phase is undefined', () => {
    render(<PhaseLabel phase={undefined} resourceType={PhaseResourceType.SUBSCRIPTION} />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Unknown');
  });

  it('should render unrecognized phase values as-is', () => {
    render(<PhaseLabel phase="SomethingElse" resourceType={PhaseResourceType.SUBSCRIPTION} />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('SomethingElse');
  });

  it('should render outline variant when no statusMessage is provided', () => {
    render(<PhaseLabel phase="Active" resourceType={PhaseResourceType.SUBSCRIPTION} />);
    const label = screen.getByTestId('phase-label');
    expect(label.className).toContain('pf-m-outline');
    expect(screen.queryByTestId('phase-popover')).toBeNull();
  });

  it('should render filled variant with popover when statusMessage is provided', () => {
    render(
      <PhaseLabel
        phase="Failed"
        resourceType={PhaseResourceType.SUBSCRIPTION}
        statusMessage="Token limit exceeded."
      />,
    );
    const label = screen.getByTestId('phase-label');
    expect(label.className).not.toContain('pf-m-outline');
    expect(label.textContent).toContain('Failed');
  });

  it('should not render popover for Active phase even when statusMessage is provided', () => {
    render(
      <PhaseLabel
        phase="Active"
        resourceType={PhaseResourceType.SUBSCRIPTION}
        statusMessage="Some message."
      />,
    );
    const label = screen.getByTestId('phase-label');
    expect(label.className).toContain('pf-m-outline');
    expect(screen.queryByTestId('phase-popover')).toBeNull();
  });

  it('should not render popover for Ready phase even when statusMessage is provided', () => {
    render(
      <PhaseLabel
        phase="Ready"
        resourceType={PhaseResourceType.SUBSCRIPTION}
        statusMessage="Some message."
      />,
    );
    const label = screen.getByTestId('phase-label');
    expect(label.className).toContain('pf-m-outline');
    expect(screen.queryByTestId('phase-popover')).toBeNull();
  });
});
