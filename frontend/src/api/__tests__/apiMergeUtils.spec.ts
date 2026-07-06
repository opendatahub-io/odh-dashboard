import { K8sResourceBaseOptions } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions, mergeRequestInit } from '#~/api/apiMergeUtils';
import { ConfigMapModel } from '#~/api/models';

const { signal } = new AbortController();
describe('applyK8sAPIOptions', () => {
  const mockBaseOptions: K8sResourceBaseOptions = { model: ConfigMapModel };
  const defaultExpect = {
    model: ConfigMapModel,
    fetchOptions: { requestInit: {} },
    queryOptions: { queryParams: {} },
  };

  it('should not apply any options', () => {
    expect(applyK8sAPIOptions(mockBaseOptions, {})).toStrictEqual(defaultExpect);
  });

  it('should apply dryRun option to payload and query options', () => {
    expect(
      applyK8sAPIOptions(
        { ...mockBaseOptions, queryOptions: { name: 'test', queryParams: { foo: 'bar' } } },
        { dryRun: true },
      ),
    ).toStrictEqual({
      ...defaultExpect,
      payload: { dryRun: ['All'] },
      queryOptions: { name: 'test', queryParams: { foo: 'bar', dryRun: 'All' } },
    });
  });

  it('should apply signal to fetch options', () => {
    expect(
      applyK8sAPIOptions(
        { ...mockBaseOptions, fetchOptions: { timeout: 100, requestInit: { pathPrefix: 'test' } } },
        { signal },
      ),
    ).toStrictEqual({
      ...defaultExpect,
      fetchOptions: { timeout: 100, requestInit: { pathPrefix: 'test', signal } },
    });
  });

  it('should not override payload with dryRun option', () => {
    expect(
      applyK8sAPIOptions({ ...mockBaseOptions, payload: 'testing' }, { dryRun: true }),
    ).toStrictEqual({
      ...defaultExpect,
      payload: 'testing',
      queryOptions: { queryParams: { dryRun: 'All' } },
    });
  });

  it('should include all API Data', () => {
    expect(applyK8sAPIOptions({ ...mockBaseOptions, foo: 'bar' }, {})).toStrictEqual({
      ...defaultExpect,
      foo: 'bar',
    });
  });
});

describe('mergeRequestInit', () => {
  it('should apply request init options correctly when k8s api options is not present', async () => {
    expect(mergeRequestInit(undefined, { method: 'PUT' })).toStrictEqual({ method: 'PUT' });
  });

  it('should apply request init options correctly when k8s api options is present', async () => {
    expect(mergeRequestInit({ signal }, { method: 'PUT' })).toStrictEqual({
      method: 'PUT',
      signal,
    });
  });
});
