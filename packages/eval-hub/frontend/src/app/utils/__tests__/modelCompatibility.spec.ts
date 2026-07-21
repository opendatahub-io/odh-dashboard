/* eslint-disable camelcase */
import type { InferenceServiceItem } from '~/app/types';
import { isEvalCompatibleModel, getIncompatibleModelReason } from '~/app/utils/modelCompatibility';

const makeModel = (overrides: Partial<InferenceServiceItem> = {}): InferenceServiceItem => ({
  name: 'test-model',
  ready: true,
  ...overrides,
});

describe('isEvalCompatibleModel', () => {
  it.each(['vLLM', 'tgis', 'HuggingFace', 'caikit', 'OpenVINO'])(
    'returns true for compatible format %s',
    (format) => {
      expect(isEvalCompatibleModel(makeModel({ model_format_name: format }))).toBe(true);
    },
  );

  it('is case-insensitive for format names', () => {
    expect(isEvalCompatibleModel(makeModel({ model_format_name: 'VLLM' }))).toBe(true);
    expect(isEvalCompatibleModel(makeModel({ model_format_name: 'Tgis' }))).toBe(true);
  });

  it('returns true when model_format_name is absent (legacy models)', () => {
    expect(isEvalCompatibleModel(makeModel())).toBe(true);
  });

  it('returns true when model_format_name is empty string', () => {
    expect(isEvalCompatibleModel(makeModel({ model_format_name: '' }))).toBe(true);
  });

  it.each(['AutoGluon', 'sklearn', 'tensorflow', 'pytorch', 'xgboost'])(
    'returns false for incompatible format %s',
    (format) => {
      expect(isEvalCompatibleModel(makeModel({ model_format_name: format }))).toBe(false);
    },
  );

  it('returns false for gRPC protocol regardless of format', () => {
    expect(
      isEvalCompatibleModel(makeModel({ model_format_name: 'vLLM', api_protocol: 'gRPC' })),
    ).toBe(false);
  });

  it('returns true for REST protocol with compatible format', () => {
    expect(
      isEvalCompatibleModel(makeModel({ model_format_name: 'vLLM', api_protocol: 'REST' })),
    ).toBe(true);
  });

  it('returns true when api_protocol is absent', () => {
    expect(isEvalCompatibleModel(makeModel({ model_format_name: 'vLLM' }))).toBe(true);
  });
});

describe('getIncompatibleModelReason', () => {
  it('returns undefined for a compatible, ready model', () => {
    expect(getIncompatibleModelReason(makeModel({ model_format_name: 'vLLM' }))).toBeUndefined();
  });

  it('returns undefined for a legacy model without format', () => {
    expect(getIncompatibleModelReason(makeModel())).toBeUndefined();
  });

  it('returns not-ready reason when model is not ready', () => {
    const reason = getIncompatibleModelReason(makeModel({ ready: false }));
    expect(reason).toContain('unavailable');
  });

  it('returns not-ready reason even if format is also incompatible', () => {
    const reason = getIncompatibleModelReason(
      makeModel({ ready: false, model_format_name: 'AutoGluon' }),
    );
    expect(reason).toContain('unavailable');
    expect(reason).not.toContain('AutoGluon');
  });

  it('returns format reason for incompatible model', () => {
    const reason = getIncompatibleModelReason(makeModel({ model_format_name: 'AutoGluon' }));
    expect(reason).toContain('AutoGluon');
    expect(reason).toContain('not compatible');
  });

  it('returns gRPC reason for gRPC-only model', () => {
    const reason = getIncompatibleModelReason(
      makeModel({ model_format_name: 'vLLM', api_protocol: 'gRPC' }),
    );
    expect(reason).toContain('gRPC');
    expect(reason).toContain('REST');
  });

  it('returns gRPC reason before checking format', () => {
    const reason = getIncompatibleModelReason(
      makeModel({ model_format_name: 'AutoGluon', api_protocol: 'gRPC' }),
    );
    expect(reason).toContain('gRPC');
    expect(reason).not.toContain('AutoGluon');
  });
});
/* eslint-enable camelcase */
