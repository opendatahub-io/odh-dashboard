import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceK8sResource';
import { applyConfigBaseRef } from '../server';

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

  it('should keep scheduler when baseRef is undefined (llm-d selection)', () => {
    const svc = mockLLMInferenceServiceK8sResource({ name: 'my-deployment' });
    const result = applyConfigBaseRef(svc, undefined);
    expect(result.spec.router?.scheduler).toEqual({});
  });

  it('should keep scheduler when baseRef does not match the resource name', () => {
    const svc = mockLLMInferenceServiceK8sResource({});
    const result = applyConfigBaseRef(svc, 'unrelated-config');
    expect(result.spec.router?.scheduler).toEqual({});
  });

  it('should remove scheduler when baseRef matches the resource name (non-llm-d selection)', () => {
    const svc = mockLLMInferenceServiceK8sResource({ name: 'my-deployment' });
    const result = applyConfigBaseRef(svc, 'my-deployment');
    expect(result.spec.router?.scheduler).toBeUndefined();
    expect(result.spec.router?.route).toBeDefined();
    expect(result.spec.router?.gateway).toBeDefined();
  });

  it('should remove scheduler when resource already has a self-referencing baseRef', () => {
    const svc = mockLLMInferenceServiceK8sResource({
      name: 'my-deployment',
      baseRefs: [{ name: 'my-deployment' }],
    });
    const result = applyConfigBaseRef(svc, 'my-deployment');
    expect(result.spec.router?.scheduler).toBeUndefined();
  });
});
