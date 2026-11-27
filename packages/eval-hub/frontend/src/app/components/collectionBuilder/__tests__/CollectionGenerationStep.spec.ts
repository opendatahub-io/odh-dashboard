/* eslint-disable camelcase */
import type { CollectionGenerationResult } from '~/app/types';
import { buildGenerationAlternatives } from '~/app/components/collectionBuilder/CollectionGenerationStep';

const result: CollectionGenerationResult = {
  collection: {
    name: 'Reasoning',
    category: 'General',
    benchmarks: [
      { id: 'recommended-without-reason', provider_id: 'provider-one' },
      { id: 'recommended-with-reason', provider_id: 'provider-one' },
    ],
  },
  yaml: 'name: Reasoning',
  rationale: 'Selected for the goal',
  explanation: {
    selected_benchmarks: [
      { id: 'recommended-with-reason', provider_id: 'provider-one', reason: 'Tests reasoning' },
    ],
    rejected_benchmarks: [],
  },
  actions: [],
};

describe('buildGenerationAlternatives', () => {
  it('restores deselected recommendations when explanation metadata is missing', () => {
    const alternatives = buildGenerationAlternatives(result, [], new Set());

    expect(alternatives).toEqual([
      expect.objectContaining({
        benchmark: expect.objectContaining({ id: 'recommended-without-reason' }),
        reason: 'Previously recommended for this evaluation goal.',
      }),
      expect.objectContaining({
        benchmark: expect.objectContaining({ id: 'recommended-with-reason' }),
        reason: 'Tests reasoning',
      }),
    ]);
  });

  it('does not list currently selected recommendations as alternatives', () => {
    const alternatives = buildGenerationAlternatives(
      result,
      [],
      new Set(['provider-one:recommended-with-reason']),
    );

    expect(alternatives.map(({ benchmark }) => benchmark.id)).toEqual([
      'recommended-without-reason',
    ]);
  });
});
