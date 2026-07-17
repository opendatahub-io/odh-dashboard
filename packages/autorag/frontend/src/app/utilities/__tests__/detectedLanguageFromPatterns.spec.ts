/* eslint-disable camelcase */
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { getDetectedLanguageFromPatterns } from '~/app/utilities/detectedLanguageFromPatterns';

const createPattern = (detectedLanguage?: { code: string; name: string }): AutoragPattern =>
  ({
    name: 'Pattern1',
    iteration: 1,
    max_combinations: 8,
    duration_seconds: 10,
    settings: {
      vector_store: { datasource_type: 'milvus', collection_name: 'c1' },
      chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 32 },
      embedding: {
        model_id: 'embed-1',
        distance_metric: 'cosine',
        embedding_params: {
          embedding_dimension: 768,
          context_length: 512,
          timeout: null,
          model_type: null,
          provider_id: null,
          provider_resource_id: null,
        },
      },
      retrieval: { method: 'vector', number_of_chunks: 5 },
      generation: {
        model_id: 'llm-1',
        context_template_text: '',
        user_message_text: '',
        system_message_text: '',
        ...(detectedLanguage ? { detected_language: detectedLanguage } : {}),
      },
    },
    scores: {},
    final_score: 0.8,
  }) as AutoragPattern;

describe('getDetectedLanguageFromPatterns', () => {
  it('should return detected language from the first pattern that has it', () => {
    const patterns = {
      p1: createPattern(),
      p2: createPattern({ code: 'de', name: 'German' }),
    };

    expect(getDetectedLanguageFromPatterns(patterns)).toEqual({ code: 'de', name: 'German' });
  });

  it('should return undefined when no patterns include detected language', () => {
    expect(getDetectedLanguageFromPatterns({ p1: createPattern() })).toBeUndefined();
  });
});
