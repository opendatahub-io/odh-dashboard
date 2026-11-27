import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
import { mockLLMInferenceServiceConfigK8sResource } from '../../__mocks__/mockLLMInferenceServiceConfigK8sResource';
import type { LLMdDeployment } from '../../types';
import { applyConfigBaseRef, extractModelServerTemplate } from '../server';

describe('extractModelServerTemplate', () => {
  it.each([true, false])('should select the resolved config when isLLMd is %s', (isLLMd) => {
    const server = mockLLMInferenceServiceConfigK8sResource({
      name: 'my-config',
      namespace: 'test-project',
      displayName: 'My config',
      runtimeVersion: 'v0.9.1',
    });
    const deployment: LLMdDeployment = {
      modelServingPlatformId: 'llmd-serving',
      model: mockLLMInferenceServiceK8sResource({ isLLMd }),
      server,
    };

    expect(extractModelServerTemplate(deployment)).toEqual({
      data: {
        selection: {
          name: 'my-config',
          namespace: 'test-project',
          label: 'My config',
          template: server,
          version: 'v0.9.1',
        },
      },
    });
  });

  it('should select llm-d when no config resolves and a scheduler is present', () => {
    const deployment: LLMdDeployment = {
      modelServingPlatformId: 'llmd-serving',
      model: mockLLMInferenceServiceK8sResource({}),
    };

    expect(extractModelServerTemplate(deployment)).toEqual({
      data: {
        selection: { name: 'llmd-serving', label: 'Distributed inference with llm-d' },
      },
    });
  });

  it('should select llm-d when the scheduler is empty', () => {
    const deployment: LLMdDeployment = {
      modelServingPlatformId: 'llmd-serving',
      model: mockLLMInferenceServiceK8sResource({}),
    };
    deployment.model.spec.router = { scheduler: {} };

    expect(extractModelServerTemplate(deployment).data.selection?.label).toBe(
      'Distributed inference with llm-d',
    );
  });

  it.each([false, true])(
    'should select a template-less custom default without a scheduler (router absent: %s)',
    (noRouter) => {
      const deployment: LLMdDeployment = {
        modelServingPlatformId: 'llmd-serving',
        model: mockLLMInferenceServiceK8sResource({ isLLMd: false }),
      };
      if (noRouter) {
        delete deployment.model.spec.router;
      }

      const { selection } = extractModelServerTemplate(deployment).data;
      expect(selection?.label).toBe('Custom LLMInferenceService');
      expect(selection?.name).not.toBe('llmd-serving');
      expect(selection?.template).toBeUndefined();
      expect(selection?.version).toBeUndefined();
    },
  );
});

describe('applyConfigBaseRef', () => {
  it('adds a baseRef when none exist', () => {
    const svc = mockLLMInferenceServiceK8sResource({});
    const result = applyConfigBaseRef(svc, 'my-config');
    expect(result.spec.baseRefs).toEqual([{ name: 'my-config' }]);
  });

  it('appends a baseRef to existing refs', () => {
    const svc = mockLLMInferenceServiceK8sResource({ baseRefs: [{ name: 'other-config' }] });
    const result = applyConfigBaseRef(svc, 'my-config');
    expect(result.spec.baseRefs).toEqual([{ name: 'other-config' }, { name: 'my-config' }]);
  });

  it('does not add a duplicate baseRef', () => {
    const svc = mockLLMInferenceServiceK8sResource({ baseRefs: [{ name: 'my-config' }] });
    const result = applyConfigBaseRef(svc, 'my-config');
    expect(result.spec.baseRefs).toHaveLength(1);
    expect(result.spec.baseRefs).toEqual([{ name: 'my-config' }]);
  });

  it('does not mutate the original resource', () => {
    const svc = mockLLMInferenceServiceK8sResource({});
    applyConfigBaseRef(svc, 'my-config');
    expect(svc.spec.baseRefs).toBeUndefined();
  });

  it('removes baseRef with same name as the LLMInferenceService if baseRef is undefined', () => {
    const svc = mockLLMInferenceServiceK8sResource({
      name: 'llm-deployment',
      baseRefs: [{ name: 'llm-deployment' }, { name: 'other-config' }],
    });
    const result = applyConfigBaseRef(svc, undefined);
    expect(result.spec.baseRefs).toEqual([{ name: 'other-config' }]);
  });
});
