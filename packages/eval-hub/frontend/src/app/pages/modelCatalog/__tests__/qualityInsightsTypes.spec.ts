/* eslint-disable camelcase */

import {
  mapArtifactToQualityInsight,
  type CatalogQualityArtifact,
} from '~/app/pages/modelCatalog/qualityInsightsTypes';

describe('mapArtifactToQualityInsight', () => {
  it('maps the evaluation-metrics schema to a table insight', () => {
    const artifact: CatalogQualityArtifact = {
      artifactType: 'metrics-artifact',
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
      },
    };

    expect(mapArtifactToQualityInsight(artifact)).toEqual({
      evaluation: 'Python function generation',
      category: 'code',
      benchmarkName: 'HumanEval',
      benchmarkDescription: 'Writes correct Python functions.',
      result: '62.8%',
    });
  });

  it('returns empty display values for missing custom properties', () => {
    expect(mapArtifactToQualityInsight({ artifactType: 'metrics-artifact' })).toEqual({
      evaluation: '',
      category: '',
      benchmarkName: '',
      benchmarkDescription: '',
      result: '',
    });
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
      result: '25.5%',
    });
  });
});
