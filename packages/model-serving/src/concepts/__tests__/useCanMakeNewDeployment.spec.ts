import React from 'react';
import { renderHook } from '@testing-library/react';
import type { ProjectKind, TemplateKind } from '@odh-dashboard/k8s-core';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import {
  KueueFilteringState,
  useKueueConfiguration,
} from '@odh-dashboard/hardware-profiles/shared';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '../../__mocks__/mockServingRuntimeTemplateK8sResource';
import type { Deployment } from '../../../extension-points';
import type { ModelServingDeploy } from '../../../extension-points/deployment-wizard';
import { useCanMakeNewDeployment } from '../useCanMakeNewDeployment';
import { useModelServingDeployMethods } from '../useModelServingDeployMethods';
import { useServingRuntimeTemplates } from '../servingRuntimeTemplates/useServingRuntimeTemplates';

jest.mock('@odh-dashboard/hardware-profiles/shared', () => ({
  ...jest.requireActual('@odh-dashboard/hardware-profiles/shared'),
  useKueueConfiguration: jest.fn(),
}));
jest.mock('../useModelServingDeployMethods');
jest.mock('../servingRuntimeTemplates/useServingRuntimeTemplates');

const mockUseKueueConfiguration = jest.mocked(useKueueConfiguration);
const mockUseModelServingDeployMethods = jest.mocked(useModelServingDeployMethods);
const mockUseServingRuntimeTemplates = jest.mocked(useServingRuntimeTemplates);

const mockTemplates = (
  templates: TemplateKind[] = [mockServingRuntimeTemplateK8sResource({})],
  loaded = true,
): [TemplateKind[], boolean, undefined] => [templates, loaded, undefined];

const setDeployMethods = (...platforms: string[]): void => {
  mockUseModelServingDeployMethods.mockReturnValue({
    deployMethods: platforms.map(
      (platform): ModelServingDeploy<Deployment> => ({
        type: 'model-serving.deployment/deploy',
        properties: {
          platform,
          isActive: true,
          priority: 0,
          deploy: async () => async () => ({
            modelServingPlatformId: platform,
            model: {
              apiVersion: 'example.com/v1',
              kind: 'Model',
              metadata: { name: `${platform}-model`, namespace: 'test-project' },
            },
          }),
        },
      }),
    ),
    hasDeployMethods: platforms.length > 0,
  });
};

describe('useCanMakeNewDeployment', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setDeployMethods('kserve');
    mockUseKueueConfiguration.mockReturnValue({
      isKueueDisabled: false,
      isKueueFeatureEnabled: true,
      isProjectKueueEnabled: false,
      kueueFilteringState: KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
    });
    mockUseServingRuntimeTemplates.mockReturnValue(mockTemplates());
  });

  it('should enable deployment when all requirements are met', () => {
    const renderResult = testHook(useCanMakeNewDeployment)();

    expect(renderResult).hookToStrictEqual({
      disabled: false,
      disabledReason: 'Deploying a model is not possible. Contact your administrator.',
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should disable deployment when no deploy methods are available', () => {
    setDeployMethods();
    mockUseServingRuntimeTemplates.mockReturnValue(mockTemplates());

    const renderResult = testHook(useCanMakeNewDeployment)();

    expect(renderResult).hookToStrictEqual({
      disabled: true,
      disabledReason:
        'At least one model serving platform must be enabled to deploy a model. Contact your administrator.',
    });
  });

  it('should not disable deployment while serving runtime templates are still loading', () => {
    mockUseServingRuntimeTemplates.mockReturnValue(mockTemplates([], false));

    const renderResult = testHook(useCanMakeNewDeployment)();

    expect(renderResult).hookToStrictEqual({
      disabled: false,
      disabledReason: 'Deploying a model is not possible. Contact your administrator.',
    });
  });

  it('should disable KServe deployment when templates finish loading empty', () => {
    mockUseServingRuntimeTemplates.mockReturnValue(mockTemplates([], true));

    const renderResult = testHook(useCanMakeNewDeployment)();

    expect(renderResult).hookToStrictEqual({
      disabled: true,
      disabledReason:
        'At least one serving runtime must be enabled to deploy a model. Contact your administrator.',
    });
  });

  it('should not require serving runtime templates for non-KServe deploy methods', () => {
    setDeployMethods('llmd');
    mockUseServingRuntimeTemplates.mockReturnValue([[], true, undefined]);

    const renderResult = testHook(useCanMakeNewDeployment)();

    expect(renderResult).hookToStrictEqual({
      disabled: false,
      disabledReason: 'Deploying a model is not possible. Contact your administrator.',
    });
  });

  it('should disable deployment when Kueue is disabled for a Kueue-managed project', () => {
    mockUseKueueConfiguration.mockReturnValue({
      isKueueDisabled: true,
      isKueueFeatureEnabled: false,
      isProjectKueueEnabled: true,
      kueueFilteringState: KueueFilteringState.NO_PROFILES,
    });

    const renderResult = testHook(useCanMakeNewDeployment)();

    expect(renderResult).hookToStrictEqual({
      disabled: true,
      disabledReason: 'Kueue is not enabled. Contact your administrator.',
    });
  });

  it('should prioritize the missing-template reason over other disabled states', () => {
    setDeployMethods('kserve');
    mockUseKueueConfiguration.mockReturnValue({
      isKueueDisabled: true,
      isKueueFeatureEnabled: false,
      isProjectKueueEnabled: true,
      kueueFilteringState: KueueFilteringState.NO_PROFILES,
    });
    mockUseServingRuntimeTemplates.mockReturnValue([[], true, undefined]);

    const renderResult = testHook(useCanMakeNewDeployment)();

    expect(renderResult).hookToStrictEqual({
      disabled: true,
      disabledReason:
        'At least one serving runtime must be enabled to deploy a model. Contact your administrator.',
    });
  });

  it('should pass the project to the Kueue configuration hook', () => {
    const project = mockProjectK8sResource({ k8sName: 'test-project' });

    testHook(useCanMakeNewDeployment)(project);

    expect(mockUseKueueConfiguration).toHaveBeenCalledWith(project);
  });

  it('should pass undefined to the Kueue configuration hook when the project is null', () => {
    testHook(useCanMakeNewDeployment)(null);

    expect(mockUseKueueConfiguration).toHaveBeenCalledWith(undefined);
  });

  describe('deployment targets', () => {
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
        wrapper: ({ children }) =>
          React.createElement(ProjectsContext.Provider, { value: context }, children),
      }).result.current;
    };

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
});
