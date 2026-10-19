/* eslint-disable camelcase */

import {
  mapArtifactToQualityInsight,
  type CatalogQualityArtifact,
} from '~/app/pages/modelCatalog/qualityInsightsTypes';

describe('mapArtifactToQualityInsight', () => {
  it('maps the evaluation-metrics schema to a table insight', () => {
    const artifact: CatalogQualityArtifact = {
      artifactType: 'metrics-artifact',
      id: 'quality-artifact-1',
      metricsType: 'evaluation-metrics',
      customProperties: {
        evaluation: {
          metadataType: 'MetadataStringValue',
          string_value: 'Python function generation',
        },
        category: { metadataType: 'MetadataStringValue', string_value: 'code' },
        benchmark: { metadataType: 'MetadataStringValue', string_value: 'HumanEval' },
        description: {
          metadataType: 'MetadataStringValue',
          string_value: 'Writes correct Python functions.',
        },
        result: { metadataType: 'MetadataDoubleValue', double_value: 0.628 },
        result_metric: {
          metadataType: 'MetadataStringValue',
          string_value: 'accuracy',
        },
      },
    };

    expect(mapArtifactToQualityInsight(artifact)).toEqual({
      id: 'quality-artifact-1',
      resultMetric: 'accuracy',
      evaluation: 'Python function generation',
      category: 'code',
      benchmarkName: 'HumanEval',
      benchmarkDescription: 'Writes correct Python functions.',
      score: 0.628,
      result: '62.8%',
    });
  });

  it('returns empty display values for missing custom properties', () => {
    expect(mapArtifactToQualityInsight({ artifactType: 'metrics-artifact' })).toEqual({
      evaluation: '',
      category: '',
      benchmarkName: '',
      benchmarkDescription: '',
      score: undefined,
      result: '',
    });
  });

  it('maps the run timestamp from created_at', () => {
    expect(
      mapArtifactToQualityInsight({
        artifactType: 'metrics-artifact',
        customProperties: {
          created_at: {
            metadataType: 'MetadataStringValue',
            string_value: '2026-03-02T10:00:00Z',
          },
        },
      }),
    ).toMatchObject({ createdAt: '2026-03-02T10:00:00Z' });
  });

  it('maps the run timestamp from the artifact creation epoch when created_at is absent', () => {
    expect(
      mapArtifactToQualityInsight({
        artifactType: 'metrics-artifact',
        createTimeSinceEpoch: '1791300634000',
      }).createdAt,
    ).toBe('2026-10-06T15:30:34.000Z');
  });

  it('falls back to the artifact creation epoch when created_at is not a valid date', () => {
    expect(
      mapArtifactToQualityInsight({
        artifactType: 'metrics-artifact',
        createTimeSinceEpoch: '1791300634000',
        customProperties: {
          created_at: { metadataType: 'MetadataStringValue', string_value: 'not-a-date' },
        },
      }).createdAt,
    ).toBe('2026-10-06T15:30:34.000Z');
  });

  it('omits createdAt when the artifact has no created_at property', () => {
    expect(
      mapArtifactToQualityInsight({ artifactType: 'metrics-artifact' }).createdAt,
    ).toBeUndefined();
  });

  it('handles values already expressed as percentages', () => {
    expect(
      mapArtifactToQualityInsight({
        artifactType: 'metrics-artifact',
        customProperties: {
          result: { metadataType: 'MetadataDoubleValue', double_value: 62.8 },
        },
      }).result,
    ).toBe('62.8%');
  });

  it('formats non-percentage metrics with their metric unit', () => {
    expect(
      mapArtifactToQualityInsight({
        artifactType: 'metrics-artifact',
        customProperties: {
          result: { metadataType: 'MetadataDoubleValue', double_value: 41.377 },
          result_metric: {
            metadataType: 'MetadataStringValue',
            string_value: 'output_tokens_per_second',
          },
        },
      }),
    ).toMatchObject({
      resultMetric: 'output_tokens_per_second',
      score: 41.377,
      result: '41.38 output tokens/s',
    });
  });

  it('maps the record fields without parsing execution context', () => {
    const artifact: CatalogQualityArtifact = {
      artifactType: 'metrics-artifact',
      metricsType: 'evaluation-metrics',
      customProperties: {
        evaluation: { metadataType: 'MetadataStringValue', string_value: 'EvalHub run' },
        category: { metadataType: 'MetadataStringValue', string_value: 'reasoning' },
        benchmark: { metadataType: 'MetadataStringValue', string_value: 'BBH' },
        description: { metadataType: 'MetadataStringValue', string_value: 'Reasoning benchmark.' },
        result: { metadataType: 'MetadataDoubleValue', double_value: 0.254732 },
        execution_context: {
          metadataType: 'MetadataStringValue',
          string_value: '{"job_data":{"results":{"benchmarks":[]}}}',
        },
      },
    };

    expect(mapArtifactToQualityInsight(artifact)).toEqual({
      evaluation: 'EvalHub run',
      category: 'reasoning',
      benchmarkName: 'BBH',
      benchmarkDescription: 'Reasoning benchmark.',
      score: 0.254732,
      result: '25.5%',
    });
  });
});
