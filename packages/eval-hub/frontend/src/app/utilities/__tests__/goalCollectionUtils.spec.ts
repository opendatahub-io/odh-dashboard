/* eslint-disable camelcase */
import { buildGoalCollectionCreateRequest } from '~/app/utilities/goalCollectionUtils';
import type { CollectionBenchmark, CollectionGenerationResult } from '~/app/types';

describe('buildGoalCollectionCreateRequest', () => {
  it('should preserve generated metadata while replacing editable values and selections', () => {
    const generatedCollection: CollectionGenerationResult['collection'] = {
      name: 'Generated name',
      description: 'Generated description',
      category: 'trustworthiness',
      domains: ['trustworthiness'],
      tags: ['generated'],
      evaluation_targets: ['agent'],
      custom: { source: 'generation' },
      pass_criteria: { threshold: 0.75 },
      benchmarks: [
        {
          id: 'recommended',
          provider_id: 'provider-a',
          pass_criteria: { threshold: 0.75 },
        },
      ],
    };
    const selectedBenchmarks: CollectionBenchmark[] = [
      {
        id: 'alternative',
        provider_id: 'provider-b',
        primary_score: { metric: 'accuracy', lower_is_better: false },
        pass_criteria: { threshold: 0.8 },
        parameters: { samples: 12 },
      },
    ];

    const result = buildGoalCollectionCreateRequest(
      generatedCollection,
      '  Review name  ',
      '  Review description  ',
      selectedBenchmarks,
    );

    expect(result).toEqual({
      ...generatedCollection,
      name: 'Review name',
      description: 'Review description',
      evaluation_targets: ['model'],
      benchmarks: selectedBenchmarks,
    });
    expect(result.benchmarks).not.toBe(selectedBenchmarks);
    expect(generatedCollection.name).toBe('Generated name');
    expect(generatedCollection.benchmarks).toHaveLength(1);
  });

  it('should omit a blank description instead of keeping the generated description', () => {
    const result = buildGoalCollectionCreateRequest(
      {
        name: 'Generated name',
        description: 'Generated description',
        benchmarks: [],
      },
      'Suite name',
      '   ',
      [],
    );

    expect(result).not.toHaveProperty('description');
  });
});
/* eslint-enable camelcase */
