import React from 'react';
import { renderHook } from '@testing-library/react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { useKueueConfiguration } from '@odh-dashboard/hardware-profiles/shared';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useCanMakeNewDeployment } from '../useCanMakeNewDeployment';
import { useServingRuntimeTemplates } from '../servingRuntimeTemplates/useServingRuntimeTemplates';

jest.mock('@odh-dashboard/plugin-core', () => ({ useExtensions: jest.fn() }));
jest.mock('@odh-dashboard/hardware-profiles/shared', () => ({ useKueueConfiguration: jest.fn() }));
jest.mock('../servingRuntimeTemplates/useServingRuntimeTemplates', () => ({
  useServingRuntimeTemplates: jest.fn(),
}));

const namespace = (name: string): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name },
});

const renderWithTargets = (
  project: ProjectKind | null,
  deploymentTargetProjects: ProjectKind[] | undefined,
) => {
  const context: ProjectsContextType = {
    projects: [],
    modelServingProjects: [],
    nonActiveProjects: [],
    deploymentTargetProjects,
    preferredProject: null,
    updatePreferredProject: jest.fn(),
    waitForProject: jest.fn(),
    loaded: true,
    loadError: undefined,
  };
  return renderHook(() => useCanMakeNewDeployment(project), {
    wrapper: ({ children }) => (
      <ProjectsContext.Provider value={context}>{children}</ProjectsContext.Provider>
    ),
  }).result.current;
};

describe('useCanMakeNewDeployment', () => {
  beforeEach(() => {
    jest.mocked(useExtensions).mockReturnValue([{ type: 'deploy' }] as never);
    jest.mocked(useKueueConfiguration).mockReturnValue({ isKueueDisabled: false } as never);
    jest.mocked(useServingRuntimeTemplates).mockReturnValue([[{}], true, undefined] as never);
  });

  it('should not offer deploying in a project that is not a deployment target', () => {
    expect(renderWithTargets(namespace('view-only'), [namespace('other')])).toEqual({
      disabled: true,
      disabledReason: 'You do not have permission to deploy models in this project.',
    });
  });

  it('should not offer deploying without a project when there is no target', () => {
    expect(renderWithTargets(null, [])).toEqual({
      disabled: true,
      disabledReason: 'You do not have permission to deploy models in any project.',
    });
  });

  it.each([
    ['a target project', namespace('mine'), [namespace('mine')]],
    ['no project with targets', null, [namespace('mine')]],
    ['a host without targets', namespace('any'), undefined],
  ])('should offer deploying for %s', (_label, project, targets) => {
    expect(renderWithTargets(project, targets).disabled).toBe(false);
  });
});
