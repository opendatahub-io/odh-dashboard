import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { FindProjectNotice } from '@odh-dashboard/ui-core/context/ProjectsContext';
import FindProjectByName from '../FindProjectByName';

describe('FindProjectByName', () => {
  it('should not navigate when the form closed before the lookup finished', async () => {
    let resolveLookup: (project: ProjectKind) => void = () => undefined;
    const signals: (AbortSignal | undefined)[] = [];
    const findProject = jest.fn(
      (_name: string, signal?: AbortSignal) =>
        new Promise<ProjectKind>((resolve) => {
          signals.push(signal);
          resolveLookup = resolve;
        }),
    );
    const onFound = jest.fn();
    const { unmount } = render(<FindProjectByName findProject={findProject} onFound={onFound} />);
    fireEvent.change(screen.getByTestId('find-project-name-input'), {
      target: { value: 'late' },
    });
    fireEvent.click(screen.getByTestId('find-project-submit'));
    expect(findProject).toHaveBeenCalledWith('late', expect.any(AbortSignal));

    unmount();
    // The host sees the cancellation, so it changes nothing either.
    expect(signals[0]?.aborted).toBe(true);
    await act(async () => {
      resolveLookup(mockProjectK8sResource({ k8sName: 'late' }));
    });
    expect(onFound).not.toHaveBeenCalled();
  });

  it('should show a kept-but-not-opened project as a notice, not an error', async () => {
    const findProject = jest.fn(() =>
      Promise.reject(new FindProjectNotice('You can deploy models to only-deploy.')),
    );
    const onFound = jest.fn();
    render(<FindProjectByName findProject={findProject} onFound={onFound} />);
    fireEvent.change(screen.getByTestId('find-project-name-input'), {
      target: { value: 'only-deploy' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('find-project-submit'));
    });
    expect(screen.getByTestId('find-project-notice')).toHaveTextContent(
      'You can deploy models to only-deploy.',
    );
    expect(screen.queryByTestId('find-project-error')).not.toBeInTheDocument();
    expect(onFound).not.toHaveBeenCalled();
  });
});
