import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import FindProjectByName from '../FindProjectByName';

describe('FindProjectByName', () => {
  it('should not navigate when the form closed before the lookup finished', async () => {
    let resolveLookup: (project: ProjectKind) => void = () => undefined;
    const findProject = jest.fn(
      () =>
        new Promise<ProjectKind>((resolve) => {
          resolveLookup = resolve;
        }),
    );
    const onFound = jest.fn();
    const { unmount } = render(<FindProjectByName findProject={findProject} onFound={onFound} />);
    fireEvent.change(screen.getByTestId('find-project-name-input'), {
      target: { value: 'late' },
    });
    fireEvent.click(screen.getByTestId('find-project-submit'));
    expect(findProject).toHaveBeenCalledWith('late');

    unmount();
    await act(async () => {
      resolveLookup(mockProjectK8sResource({ k8sName: 'late' }));
    });
    expect(onFound).not.toHaveBeenCalled();
  });
});
