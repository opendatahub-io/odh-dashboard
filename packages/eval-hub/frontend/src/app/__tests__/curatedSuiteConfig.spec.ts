/* eslint-disable camelcase */
import type { Collection } from '~/app/types';
import { getCuratedCollectionConfig } from '~/app/curatedSuiteConfig';

const makeCollection = (overrides: Partial<Collection>): Collection => ({
  resource: { id: 'some-collection' },
  name: 'Some collection',
  ...overrides,
});

describe('getCuratedCollectionConfig', () => {
  it('should return the hardcoded config for a mapped collection id', () => {
    const collection = makeCollection({
      resource: { id: 'tool-use-v1' },
      benchmarks: [{ id: 'benchmark-one' }],
    });

    expect(getCuratedCollectionConfig(collection)).toEqual({
      prerequisite: {
        short: 'Requires a model that supports multiple tool/function calls.',
        long: 'The model you are evaluating must support multiple tool/function calls.',
      },
    });
  });

  it('should return the judge model config when any benchmark defines judge_model', () => {
    const collection = makeCollection({
      benchmarks: [
        { id: 'benchmark-one', parameters: { num_examples: 50 } },
        { id: 'benchmark-two', parameters: { judge_model: '', num_few_shot: 0 } },
      ],
    });

    expect(getCuratedCollectionConfig(collection)).toEqual({
      prerequisite: {
        short: 'Requires a judge model.',
        long: 'Requires a judge model in addition to the model you are evaluating. The judge model scores and evaluates the responses produced by the model you are evaluating.',
      },
      parameters: {
        judge_model: {
          required: true,
          description:
            'The language model name used to score and evaluate responses produced by the model under evaluation.',
        },
      },
    });
  });

  it('should return undefined when no benchmark defines judge_model and the id is unmapped', () => {
    const collection = makeCollection({
      benchmarks: [{ id: 'benchmark-one', parameters: { num_examples: 50 } }],
    });

    expect(getCuratedCollectionConfig(collection)).toBeUndefined();
  });

  it('should return undefined for a collection without benchmarks', () => {
    expect(getCuratedCollectionConfig(makeCollection({}))).toBeUndefined();
  });

  it('should merge the hardcoded config with the judge model config when both apply', () => {
    const collection = makeCollection({
      resource: { id: 'tool-use-v1' },
      benchmarks: [{ id: 'benchmark-one', parameters: { judge_model: '' } }],
    });

    expect(getCuratedCollectionConfig(collection)).toEqual({
      prerequisite: {
        short:
          'Requires a model that supports multiple tool/function calls. Requires a judge model.',
        long: 'The model you are evaluating must support multiple tool/function calls. Requires a judge model in addition to the model you are evaluating. The judge model scores and evaluates the responses produced by the model you are evaluating.',
      },
      parameters: {
        judge_model: {
          required: true,
          description:
            'The language model name used to score and evaluate responses produced by the model under evaluation.',
        },
      },
    });
  });
});
