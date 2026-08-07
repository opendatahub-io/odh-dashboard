/* eslint-disable camelcase */
import { isValidAAModel } from '~/app/hooks/useFetchAIModels';

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
  FetchStateCallbackPromise: jest.fn(),
  NotReadyError: class NotReadyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotReadyError';
    }
  },
}));

jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: jest.fn(),
}));

jest.mock('~/app/hooks/useGenAiDashboardConfig', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/hooks/useAiAssetModelAsServiceEnabled', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const validModel = {
  model_name: 'test',
  model_id: 'test-id',
  serving_runtime: 'vllm',
  api_protocol: 'REST',
  version: '1',
  usecase: 'LLM',
  description: 'A model',
  status: 'Running',
  display_name: 'Test Model',
  model_source_type: 'namespace',
  endpoints: ['internal:http://svc.local:8080'],
};

describe('isValidAAModel', () => {
  it('accepts a valid namespace model', () => {
    expect(isValidAAModel(validModel)).toBe(true);
  });

  it('accepts a valid maas model', () => {
    expect(isValidAAModel({ ...validModel, model_source_type: 'maas' })).toBe(true);
  });

  it('accepts a valid custom_endpoint model', () => {
    expect(isValidAAModel({ ...validModel, model_source_type: 'custom_endpoint' })).toBe(true);
  });

  it('rejects null', () => {
    expect(isValidAAModel(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidAAModel(undefined)).toBe(false);
  });

  it('rejects a non-object', () => {
    expect(isValidAAModel('not-an-object')).toBe(false);
  });

  it('rejects when a required string field is missing', () => {
    const noName = { ...validModel } as Record<string, unknown>;
    delete noName.model_name;
    expect(isValidAAModel(noName)).toBe(false);
  });

  it('rejects when a required string field is a number', () => {
    expect(isValidAAModel({ ...validModel, model_id: 42 })).toBe(false);
  });

  it('rejects an unknown model_source_type', () => {
    expect(isValidAAModel({ ...validModel, model_source_type: 'unknown_type' })).toBe(false);
  });

  it('rejects when endpoints is not an array', () => {
    expect(isValidAAModel({ ...validModel, endpoints: 'not-array' })).toBe(false);
  });

  it('rejects endpoints containing null', () => {
    expect(isValidAAModel({ ...validModel, endpoints: ['http://valid.com', null] })).toBe(false);
  });

  it('rejects endpoints containing objects', () => {
    expect(isValidAAModel({ ...validModel, endpoints: [{ url: 'http://bad.com' }] })).toBe(false);
  });

  it('rejects endpoints containing numbers', () => {
    expect(isValidAAModel({ ...validModel, endpoints: [123] })).toBe(false);
  });

  it('accepts empty endpoints array', () => {
    expect(isValidAAModel({ ...validModel, endpoints: [] })).toBe(true);
  });
});
