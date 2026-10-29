import { appendChunkingFields } from '~/app/Chatbot/hooks/useFileUploadWithPolling';

describe('appendChunkingFields', () => {
  it('sends static chunking when overlap is zero and max length is unset', () => {
    const formData = new FormData();

    appendChunkingFields(formData, {
      embeddingModel: '',
      vectorStore: 'vs-1',
      chunkOverlap: 0,
    });

    expect(formData.get('chunking_type')).toBe('static');
    expect(formData.get('chunk_overlap_tokens')).toBe('0');
    expect(formData.get('max_chunk_size_tokens')).toBe('800');
  });
});
