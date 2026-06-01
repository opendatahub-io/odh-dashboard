/* eslint-disable camelcase */
import { flattenEntries } from '~/app/components/run-results/PatternDetailsModal/components/KeyValueList';

describe('flattenEntries', () => {
  it('should flatten a simple flat object', () => {
    expect(flattenEntries({ chunk_size: 256, method: 'recursive' })).toEqual([
      ['Chunk Size', '256'],
      ['Method', 'recursive'],
    ]);
  });

  it('should flatten nested objects with prefixed labels', () => {
    expect(
      flattenEntries({
        embedding: {
          model_id: 'sentence-transformers',
          dimensions: 768,
        },
      }),
    ).toEqual([
      ['Embedding Model Id', 'sentence-transformers'],
      ['Embedding Dimensions', '768'],
    ]);
  });

  it('should flatten deeply nested objects', () => {
    expect(
      flattenEntries({
        embedding: {
          embedding_params: {
            context_length: 512,
          },
        },
      }),
    ).toEqual([['Embedding Embedding Params Context Length', '512']]);
  });

  it('should handle null values as em-dash', () => {
    expect(flattenEntries({ timeout: null })).toEqual([['Timeout', '\u2014']]);
  });

  it('should handle boolean values', () => {
    expect(flattenEntries({ enabled: true, disabled: false })).toEqual([
      ['Enabled', 'true'],
      ['Disabled', 'false'],
    ]);
  });

  it('should handle empty object', () => {
    expect(flattenEntries({})).toEqual([]);
  });

  it('should handle arrays as JSON strings', () => {
    expect(flattenEntries({ tags: [1, 2, 3] })).toEqual([['Tags', '[1,2,3]']]);
  });

  it('should handle nested empty objects', () => {
    expect(flattenEntries({ config: {} })).toEqual([]);
  });

  it('should handle mixed flat and nested keys', () => {
    const result = flattenEntries({
      method: 'recursive',
      params: {
        chunk_size: 256,
      },
    });
    expect(result).toEqual([
      ['Method', 'recursive'],
      ['Params Chunk Size', '256'],
    ]);
  });
});
