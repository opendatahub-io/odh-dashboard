import { K8sResourceBaseOptions } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { ConfigMapModel } from '~/api/models';

describe('applyK8sAPIOptions', () => {
  const mockBaseOptions: K8sResourceBaseOptions = { model: ConfigMapModel };
  const defaultExpect = {
    model: ConfigMapModel,
    fetchOptions: { requestInit: {} },
    queryOptions: { queryParams: {} },
  };
  const { signal } = new AbortController();

  it('should not apply any options', () => {
    expect(applyK8sAPIOptions({}, mockBaseOptions)).toStrictEqual(defaultExpect);
  });

  it('should apply dryRun option to payload and query options', () => {
    expect(
      applyK8sAPIOptions(
        { dryRun: true },
        { ...mockBaseOptions, queryOptions: { name: 'test', queryParams: { foo: 'bar' } } },
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
        { signal: new AbortController().signal },
        { ...mockBaseOptions, fetchOptions: { timeout: 100, requestInit: { pathPrefix: 'test' } } },
      ),
    ).toStrictEqual({
      ...defaultExpect,
      fetchOptions: { timeout: 100, requestInit: { pathPrefix: 'test', signal } },
    });
  });

  it('should not override payload with dryRun option', () => {
    expect(
      applyK8sAPIOptions({ dryRun: true }, { ...mockBaseOptions, payload: 'testing' }),
    ).toStrictEqual({
      ...defaultExpect,
      payload: 'testing',
      queryOptions: { queryParams: { dryRun: 'All' } },
    });
  });

  it('should include all API Data', () => {
    expect(applyK8sAPIOptions({}, { ...mockBaseOptions, foo: 'bar' })).toStrictEqual({
      ...defaultExpect,
      foo: 'bar',
    });
  });
});
