import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HostApiCoreContext } from '@odh-dashboard/plugin-core/host-api';
import * as access from '../../../../concepts/useDeploymentAccess';
import * as modelOperations from '../../utils';
import type { Deployment } from '../../../../../extension-points';
import { mockDeploymentWizardState } from '../../../../__tests__/mockUtils';
import { useDeployMethod } from '../useDeployMethod';
import { useWizardFieldApply } from '../../useWizardFieldApply';
import { useWizardFieldPreDeploy } from '../useWizardFieldPreDeploy';
import { useWizardFieldPostDeploy } from '../useWizardFieldPostDeploy';
import { useModelDeploymentSubmit } from '../useModelDeploymentSubmit';

jest.mock('@odh-dashboard/plugin-core');
jest.mock('../useDeployMethod');
jest.mock('../../useWizardFieldApply');
jest.mock('../useWizardFieldPreDeploy');
jest.mock('../useWizardFieldPostDeploy');
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

const renderSubmit = (
  existingDeployment?: Deployment,
  wrapper?: React.ComponentType<React.PropsWithChildren>,
) => {
  const { state } = mockDeploymentWizardState();
  return renderHook(
    (namespace) =>
      useModelDeploymentSubmit(
        state,
        { modelLocationData: { data: undefined } },
        {
          model: {
            kind: 'LLMInferenceService',
            apiVersion: 'serving.kserve.io/v1alpha2',
            metadata: { name: 'test-model', namespace },
          },
        },
        { isAllValid: true } as Parameters<typeof useModelDeploymentSubmit>[3],
        {},
        jest.fn(),
        'yaml-edit',
        undefined,
        existingDeployment,
      ),
    { initialProps: 'test-project', wrapper },
  );
};

describe('useModelDeploymentSubmit readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureReadiness();
  });

  it('should be ready when the method and all extensions are resolved', () => {
    expect(renderSubmit().result.current.isReady).toBe(true);
  });

  it.each(['create', 'update', 'patch'] as const)(
    'should stop a denied %s before any deployment side effects',
    async (verb) => {
      const review = jest
        .spyOn(access, 'useDeploymentAccess')
        .mockImplementation((requested) =>
          requested === verb
            ? { allowed: false, loaded: true, reason: `Access denied to ${verb}.` }
            : { allowed: true, loaded: true },
        );
      const deploy = jest.spyOn(modelOperations, 'deployModel');
      try {
        const existing =
          verb === 'create'
            ? undefined
            : {
                modelServingPlatformId: 'llmd-serving',
                model: {
                  apiVersion: 'serving.kserve.io/v1alpha2',
                  kind: 'LLMInferenceService',
                  metadata: { name: 'test-model', namespace: 'test-project' },
                },
              };
        const { result } = renderSubmit(existing);
        expect(review).toHaveBeenCalledWith(verb, 'test-project', existing?.model.metadata.name);
        if (verb === 'patch') {
          expect(result.current.onOverwrite).toBeUndefined();
        } else {
          expect(result.current.isReady).toBe(false);
        }
        await act(async () => result.current.onSave(verb === 'patch'));
        expect(result.current.submitError?.message).toBe(`Access denied to ${verb}.`);
        expect(deploy).not.toHaveBeenCalled();
      } finally {
        review.mockRestore();
        deploy.mockRestore();
      }
    },
  );

  it('should revoke submission access when YAML changes to a pending or denied namespace', async () => {
    let resolveReview: (allowed: boolean) => void = () => undefined;
    const nextReview = new Promise<boolean>((resolve) => {
      resolveReview = resolve;
    });
    const checkAccess = jest.fn().mockResolvedValueOnce(true).mockReturnValue(nextReview);
    const deploymentApi = {
      group: 'serving.kserve.io',
      resource: 'llminferenceservices',
      resources: { llminferenceservices: ['create'] },
    };
    const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
      const core = React.useContext(HostApiCoreContext);
      const value = React.useMemo(() => ({ ...core, checkAccess, deploymentApi }), [core]);
      return React.createElement(HostApiCoreContext.Provider, { value }, children);
    };

    const deploy = jest.spyOn(modelOperations, 'deployModel');
    try {
      const { result, rerender } = renderSubmit(undefined, Wrapper);
      await waitFor(() => expect(result.current.isReady).toBe(true));

      rerender('restricted-project');
      expect(result.current.isReady).toBe(false);
      expect(checkAccess).toHaveBeenLastCalledWith(
        expect.objectContaining({ namespace: 'restricted-project', verb: 'create' }),
      );
      await act(async () => result.current.onSave());
      expect(result.current.submitError?.message).toContain('Checking access');
      expect(deploy).not.toHaveBeenCalled();

      await act(async () => resolveReview(false));
      expect(result.current.isReady).toBe(false);
      await act(async () => result.current.onSave());
      expect(result.current.submitError?.message).toContain('Access denied');
      expect(deploy).not.toHaveBeenCalled();
    } finally {
      deploy.mockRestore();
    }
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
