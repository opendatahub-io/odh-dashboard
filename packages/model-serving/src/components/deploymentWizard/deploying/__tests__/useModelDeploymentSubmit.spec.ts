import React from 'react';
import { act, renderHook } from '@testing-library/react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import type { Deployment } from '../../../../../extension-points';
import { deployModel } from '../../utils';
import { mockDeploymentWizardState } from '../../../../__tests__/mockUtils';
import { useDeployMethod } from '../useDeployMethod';
import { useWizardFieldApply } from '../../useWizardFieldApply';
import { useWizardFieldPreDeploy } from '../useWizardFieldPreDeploy';
import { useWizardFieldPostDeploy } from '../useWizardFieldPostDeploy';
import { useModelDeploymentSubmit, WITHHELD_TOKENS_MESSAGE } from '../useModelDeploymentSubmit';

jest.mock('@odh-dashboard/plugin-core');
jest.mock('../useDeployMethod');
jest.mock('../../useWizardFieldApply');
jest.mock('../useWizardFieldPreDeploy');
jest.mock('../useWizardFieldPostDeploy');
jest.mock('../../utils', () => ({
  deployModel: jest.fn(() => Promise.resolve()),
  getConnectionSecret: jest.fn(),
}));
jest.mock('../../../../shared/tracking/useModelDeployedTracking', () => ({
  useModelDeployedTracking: () => ({ fireModelDeployedTracking: jest.fn() }),
}));

const configureReadiness = (pending?: string) => {
  jest.mocked(useDeployMethod).mockReturnValue({
    deployMethodLoaded: pending !== 'method',
    deployMethodErrors: [],
    deployMethod: {
      properties: { platform: 'llmd-serving', supportsOverwrite: true },
    } as NonNullable<ReturnType<typeof useDeployMethod>['deployMethod']>,
  });
  jest.mocked(useWizardFieldApply).mockReturnValue({
    applyAllFieldDataFn: jest.fn(),
    applyExtensionsLoaded: pending !== 'apply',
    applyExtensionErrors: [],
  });
  jest.mocked(useWizardFieldPreDeploy).mockReturnValue({
    runPreDeploy: jest.fn(),
    preDeployExtensionsLoaded: pending !== 'preDeploy',
  });
  jest.mocked(useWizardFieldPostDeploy).mockReturnValue({
    runPostDeploy: jest.fn(),
    postDeployExtensionsLoaded: pending !== 'postDeploy',
    postDeployExtensionErrors: [],
  });
};

const renderSubmit = () =>
  renderHook(() =>
    useModelDeploymentSubmit(
      mockDeploymentWizardState().state,
      { modelLocationData: { data: undefined } },
      {
        model: {
          kind: 'LLMInferenceService',
          apiVersion: 'serving.kserve.io/v1alpha2',
          metadata: { name: 'test-model', namespace: 'test-project' },
        },
      },
      { isAllValid: true } as Parameters<typeof useModelDeploymentSubmit>[3],
      {},
      jest.fn(),
      'yaml-edit',
    ),
  );

describe('useModelDeploymentSubmit readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureReadiness();
  });

  it('should be ready when the method and all extensions are resolved', () => {
    expect(renderSubmit().result.current.isReady).toBe(true);
  });

  it('should resolve readiness but remain not ready when no deployment method can be inferred', async () => {
    jest.mocked(useDeployMethod).mockReturnValue({
      deployMethodLoaded: true,
      deployMethodErrors: [],
    });
    const { result } = renderSubmit();
    expect(result.current.isReadinessLoading).toBe(false);
    expect(result.current.isReady).toBe(false);

    await act(async () => result.current.onSave());
    expect(result.current.submitError?.message).toBe(
      'Deploy method or extensions not loaded or could not be inferred from resources',
    );
  });

  it('should become ready if a deployment method is registered after extensions finish loading', () => {
    jest.mocked(useDeployMethod).mockReturnValue({
      deployMethodLoaded: true,
      deployMethodErrors: [],
    });
    const { result, rerender } = renderSubmit();
    expect(result.current.isReadinessLoading).toBe(false);
    expect(result.current.isReady).toBe(false);

    configureReadiness();
    rerender();
    expect(result.current.isReady).toBe(true);
  });

  it.each(['method', 'apply', 'preDeploy', 'postDeploy'])(
    'should become ready only after %s finishes loading',
    (pending) => {
      configureReadiness(pending);
      const { result, rerender } = renderSubmit();
      expect(result.current.isReadinessLoading).toBe(true);
      expect(result.current.isReady).toBe(false);
      configureReadiness();
      rerender();
      expect(result.current.isReadinessLoading).toBe(false);
      expect(result.current.isReady).toBe(true);
    },
  );
});

describe('useModelDeploymentSubmit deployment targets', () => {
  const target = (name: string): ProjectKind => ({
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: { name },
  });

  const renderWithTargets = (
    deploymentTargetProjects: ProjectKind[] | undefined,
    {
      viewMode = 'yaml-edit',
      yamlNamespace = 'test-project',
      existingDeployment,
      canEdit,
    }: {
      viewMode?: 'form' | 'yaml-edit';
      yamlNamespace?: string;
      existingDeployment?: Deployment;
      canEdit?: boolean;
    } = {},
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
      getProjectDeploymentActions: () => (canEdit === undefined ? undefined : { canEdit }),
    };
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
      React.createElement(ProjectsContext.Provider, { value: context }, children);
    return renderHook(
      () =>
        useModelDeploymentSubmit(
          mockDeploymentWizardState().state,
          { modelLocationData: { data: undefined } },
          {
            model: {
              kind: 'LLMInferenceService',
              apiVersion: 'serving.kserve.io/v1alpha2',
              metadata: { name: 'test-model', namespace: yamlNamespace },
            },
          },
          { isAllValid: true } as Parameters<typeof useModelDeploymentSubmit>[3],
          {},
          jest.fn(),
          viewMode,
          undefined,
          existingDeployment,
        ),
      { wrapper },
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configureReadiness();
  });

  it.each(['form', 'yaml-edit'] as const)(
    'should not deploy to a project that is no longer a target (%s)',
    async (viewMode) => {
      const { result } = renderWithTargets([target('other')], { viewMode });
      await act(async () => result.current.onSave());
      expect(result.current.submitError?.message).toBe(
        'You can no longer deploy models to the project "test-project".',
      );
      expect(deployModel).not.toHaveBeenCalled();
    },
  );

  it('should reject YAML that names another project than the selected one', async () => {
    // Both are targets, but permissions were checked in the selected project.
    const { result } = renderWithTargets([target('test-project'), target('elsewhere')], {
      yamlNamespace: 'elsewhere',
    });
    await act(async () => result.current.onSave());
    expect(result.current.submitError?.message).toBe(
      'The YAML namespace "elsewhere" must match the project "test-project".',
    );
    expect(deployModel).not.toHaveBeenCalled();
  });

  it('should reject an edit whose YAML moves the deployment out of its project', async () => {
    const { result } = renderWithTargets(undefined, {
      yamlNamespace: 'elsewhere',
      existingDeployment: {
        modelServingPlatformId: 'llmd-serving',
        model: { metadata: { name: 'test-model', namespace: 'original' } },
      } as Deployment,
    });
    await act(async () => result.current.onSave());
    expect(result.current.submitError?.message).toBe(
      'The YAML namespace "elsewhere" must match the project "original".',
    );
    expect(deployModel).not.toHaveBeenCalled();
  });

  it('should deploy to a current target', async () => {
    const { result } = renderWithTargets([target('test-project')]);
    await act(async () => result.current.onSave());
    expect(result.current.submitError).toBeNull();
    expect(deployModel).toHaveBeenCalled();
  });

  it('should save an edit and deploy where the host reports no targets', async () => {
    const edit = renderWithTargets([target('other')], {
      existingDeployment: {
        modelServingPlatformId: 'llmd-serving',
        model: { metadata: { name: 'test-model', namespace: 'test-project' } },
      } as Deployment,
    });
    await act(async () => edit.result.current.onSave());
    expect(edit.result.current.submitError).toBeNull();

    const unknown = renderWithTargets(undefined);
    await act(async () => unknown.result.current.onSave());
    expect(unknown.result.current.submitError).toBeNull();
    expect(deployModel).toHaveBeenCalledTimes(2);
  });

  it('should not save an edit, even one opened by URL, without edit access', async () => {
    const existingDeployment = {
      modelServingPlatformId: 'llmd-serving',
      model: {
        kind: 'LLMInferenceService',
        metadata: { name: 'test-model', namespace: 'test-project' },
      },
    } as Deployment;
    const denied = renderWithTargets(undefined, { existingDeployment, canEdit: false });
    await act(async () => denied.result.current.onSave());
    expect(denied.result.current.submitError?.message).toBe(
      'You do not have permission to edit deployments in the project "test-project".',
    );
    expect(deployModel).not.toHaveBeenCalled();

    const allowed = renderWithTargets(undefined, { existingDeployment, canEdit: true });
    await act(async () => allowed.result.current.onSave());
    expect(allowed.result.current.submitError).toBeNull();
    expect(deployModel).toHaveBeenCalledTimes(1);
  });

  it("should not apply LLMInferenceService edit permission to another platform's edit", async () => {
    const { result } = renderWithTargets(undefined, {
      canEdit: false,
      existingDeployment: {
        modelServingPlatformId: 'kserve',
        model: {
          kind: 'InferenceService',
          metadata: { name: 'test-model', namespace: 'test-project' },
        },
      } as Deployment,
    });
    await act(async () => result.current.onSave());
    expect(result.current.submitError).toBeNull();
    expect(deployModel).toHaveBeenCalled();
  });

  it('should need a project selected in the form for a new deployment where targets are known', async () => {
    const { state } = mockDeploymentWizardState();
    const context: ProjectsContextType = {
      projects: [],
      modelServingProjects: [],
      nonActiveProjects: [],
      deploymentTargetProjects: [target('x')],
      preferredProject: null,
      updatePreferredProject: jest.fn(),
      waitForProject: jest.fn(),
      loaded: true,
      loadError: undefined,
    };
    const { result } = renderHook(
      () =>
        useModelDeploymentSubmit(
          { ...state, project: { ...state.project, projectName: undefined } },
          { modelLocationData: { data: undefined } },
          {
            model: {
              kind: 'LLMInferenceService',
              apiVersion: 'serving.kserve.io/v1alpha2',
              metadata: { name: 'test-model', namespace: 'x' },
            },
          },
          { isAllValid: true } as Parameters<typeof useModelDeploymentSubmit>[3],
          {},
          jest.fn(),
          'yaml-edit',
        ),
      {
        wrapper: ({ children }) =>
          React.createElement(ProjectsContext.Provider, { value: context }, children),
      },
    );
    await act(async () => result.current.onSave());
    expect(result.current.submitError?.message).toBe('Select a project before deploying.');
    expect(deployModel).not.toHaveBeenCalled();
  });

  it('should refuse to deploy without new tokens withheld from this project', async () => {
    const { state } = mockDeploymentWizardState();
    const { result } = renderHook(() =>
      useModelDeploymentSubmit(
        {
          ...state,
          tokenAuthentication: { ...state.tokenAuthentication, data: [], withheldDraftCount: 1 },
        },
        { modelLocationData: { data: undefined } },
        {
          model: {
            kind: 'LLMInferenceService',
            apiVersion: 'serving.kserve.io/v1alpha2',
            metadata: { name: 'test-model', namespace: 'test-project' },
          },
        },
        { isAllValid: true } as Parameters<typeof useModelDeploymentSubmit>[3],
        {},
        jest.fn(),
        'form',
      ),
    );
    await act(async () => result.current.onSave());
    expect(result.current.submitError?.message).toBe(WITHHELD_TOKENS_MESSAGE);
    expect(deployModel).not.toHaveBeenCalled();
  });
});
