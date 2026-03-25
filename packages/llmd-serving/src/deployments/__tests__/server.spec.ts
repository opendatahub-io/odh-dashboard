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

  it('returns unchanged resource when baseRef is undefined', () => {
    const svc = mockLLMInferenceServiceK8sResource({ baseRefs: [{ name: 'existing' }] });
    const result = applyConfigBaseRef(svc, undefined);
    expect(result.spec.baseRefs).toEqual([{ name: 'existing' }]);
  });
});
