/* eslint-disable camelcase */
import type { InferenceServiceItem } from '~/app/types';
import { getGeneratorModelEndpoint } from '~/app/utils/generatorModelUtils';

const makeInferenceService = (
  overrides: Partial<InferenceServiceItem> = {},
): InferenceServiceItem => ({
  name: 'generator',
  ready: true,
  url: 'https://model.example.com/custom-endpoint',
  ...overrides,
});

describe('getGeneratorModelEndpoint', () => {
  it('preserves a compatible ready model endpoint URL without normalizing it', () => {
    const url = 'https://model.example.com/custom-endpoint';
    expect(getGeneratorModelEndpoint(makeInferenceService({ url }))).toBe(url);
  });

  it.each(['sklearn', 'xgboost'])('rejects incompatible model format %s', (model_format_name) => {
    expect(getGeneratorModelEndpoint(makeInferenceService({ model_format_name }))).toBeUndefined();
  });

  it('rejects gRPC models even when their URL is HTTP formatted', () => {
    expect(
      getGeneratorModelEndpoint(makeInferenceService({ api_protocol: 'gRPC' })),
    ).toBeUndefined();
  });

  it('allows internal HTTP while rejecting external HTTP', () => {
    expect(
      getGeneratorModelEndpoint(
        makeInferenceService({ url: 'http://model.ns.svc.cluster.local:8080/v1' }),
      ),
    ).toBe('http://model.ns.svc.cluster.local:8080/v1');
    expect(
      getGeneratorModelEndpoint(makeInferenceService({ url: 'http://model.example.com/v1' })),
    ).toBeUndefined();
  });
});
