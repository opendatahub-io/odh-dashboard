/* eslint-disable camelcase */
import { flattenEntries } from '~/app/components/run-results/PatternDetailsModal/components/KeyValueList';

describe('flattenEntries', () => {
  it('should flatten a simple flat object', () => {
    expect(flattenEntries({ chunk_size: 256, method: 'recursive' })).toEqual([
      ['Chunk Size', '256'],
      ['Method', 'recursive'],
    ]);
  });

  it('should flatten nested objects without prefixing child labels', () => {
    expect(
      flattenEntries({
        embedding: {
          model_id: 'sentence-transformers',
          dimensions: 768,
        },
      }),
    ).toEqual([
      ['Model ID', 'sentence-transformers'],
      ['Dimensions', '768'],
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
    ).toEqual([['Context Length', '512']]);
  });

  it('should handle null values as em-dash', () => {
    expect(flattenEntries({ timeout: null })).toEqual([['Timeout', '—']]);
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
    expect(
      flattenEntries({
        method: 'recursive',
        params: {
          chunk_size: 256,
        },
      }),
    ).toEqual([
      ['Method', 'recursive'],
      ['Chunk Size', '256'],
    ]);
  });
});
