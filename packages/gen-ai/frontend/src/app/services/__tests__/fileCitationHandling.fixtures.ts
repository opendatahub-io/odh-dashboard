/* eslint-disable camelcase */
import { BackendResponseData, CreateResponseRequest } from '~/app/types';

export const mockRequest: CreateResponseRequest = {
  input: 'Test input',
  model: 'test-model',
  vector_store_ids: ['vector-store-1'],
  temperature: 0.7,
  stream: false,
};

// BFF-processed response: text is clean, annotations are resolved
export const responseWithAnnotations: BackendResponseData = {
  id: 'response-with-sources',
  model: 'test-model',
  status: 'completed',
  created_at: 1755721063,
  output: [
    {
      id: 'output-1',
      type: 'completion_message',
      content: [
        {
          type: 'output_text',
          text: 'Here is information from the document.',
          annotations: [
            {
              type: 'file_citation',
              file_id: 'file-abc123',
              filename: 'report.pdf',
            },
          ],
        },
      ],
    },
  ],
};

// BFF strips citation markers from text and adds annotations
export const responseWithInlineTokens: BackendResponseData = {
  id: 'response-with-tokens',
  model: 'test-model',
  status: 'completed',
  created_at: 1755721063,
  output: [
    {
      id: 'output-1',
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: 'Here is the info .',
          annotations: [
            {
              type: 'file_citation',
              file_id: 'abc123de-f456-7890-abcd-ef1234567890',
              filename: 'document.pdf',
            },
          ],
        },
      ],
    },
  ],
};

export const responseWithMultipleSources: BackendResponseData = {
  id: 'response-multi-sources',
  model: 'test-model',
  status: 'completed',
  created_at: 1755721063,
  output: [
    {
      id: 'output-1',
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: 'Information from multiple sources.',
          annotations: [
            {
              type: 'file_citation',
              file_id: 'file-111',
              filename: 'report1.pdf',
            },
            {
              type: 'file_citation',
              file_id: 'file-222',
              filename: 'report2.pdf',
            },
            {
              type: 'file_citation',
              file_id: 'file-333',
              filename: 'report1.pdf',
            },
          ],
        },
      ],
    },
  ],
};

export const responseWithoutAnnotations: BackendResponseData = {
  id: 'response-no-annotations',
  model: 'test-model',
  status: 'completed',
  created_at: 1755721063,
  output: [
    {
      id: 'output-1',
      type: 'completion_message',
      content: [
        {
          type: 'output_text',
          text: 'Plain response without sources.',
        },
      ],
    },
  ],
};

// BFF-processed response from OGX 1.0.0 file_search_call:
// - Text is clean (BFF stripped markers)
// - Annotations are resolved to filenames (BFF used file_search_call.results.attributes)
export const responseWithFileSearchCall: BackendResponseData = {
  id: 'response-file-search',
  model: 'test-model',
  status: 'completed',
  created_at: 1755721063,
  output: [
    {
      id: 'msg-1',
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: 'Here is the answer.',
          annotations: [
            {
              type: 'file_citation',
              file_id: 'e6053358-ab61-48cb-a600-2d04dfcbb51b',
              filename: 'rag-testing-story.txt',
            },
          ],
        },
      ],
    },
  ],
};

export const streamingCompletedEventWithAnnotations = JSON.stringify({
  type: 'response.completed',
  response: {
    id: 'resp-123',
    model: 'test-model',
    status: 'completed',
    created_at: 1755721063,
    output: [
      {
        id: 'output-1',
        type: 'completion_message',
        content: [
          {
            type: 'output_text',
            text: 'Here is the info',
            annotations: [
              {
                type: 'file_citation',
                file_id: 'file-stream123',
                filename: 'streaming-doc.pdf',
              },
            ],
          },
        ],
      },
    ],
  },
});

// BFF-processed streaming completed event: text is clean, annotations resolved
export const streamingCompletedEventWithMultipleTokens = JSON.stringify({
  type: 'response.completed',
  response: {
    id: 'resp-123',
    model: 'test-model',
    status: 'completed',
    created_at: 1755721063,
    output: [
      {
        id: 'output-1',
        type: 'message',
        content: [
          {
            type: 'output_text',
            text: 'Info from  and .',
            annotations: [
              {
                type: 'file_citation',
                file_id: 'aaa11100-0000-0000-0000-000000000001',
                filename: 'doc1.pdf',
              },
              {
                type: 'file_citation',
                file_id: 'bbb22200-0000-0000-0000-000000000002',
                filename: 'doc2.pdf',
              },
            ],
          },
        ],
      },
    ],
  },
});

// BFF-processed streaming completed event with file_search_call results
export const streamingCompletedEventWithFileSearchCall = JSON.stringify({
  type: 'response.completed',
  response: {
    id: 'resp-ogx',
    model: 'test-model',
    status: 'completed',
    created_at: 1755721063,
    output: [
      {
        id: 'msg-1',
        type: 'message',
        content: [
          {
            type: 'output_text',
            text: 'Here is the answer.',
            annotations: [
              {
                type: 'file_citation',
                file_id: 'e6053358-ab61-48cb-a600-2d04dfcbb51b',
                filename: 'rag-testing-story.txt',
              },
            ],
          },
        ],
      },
    ],
  },
});

// Response with annotations that include index positions for citation insertion
export const responseWithIndexedAnnotations: BackendResponseData = {
  id: 'response-indexed-annotations',
  model: 'test-model',
  status: 'completed',
  created_at: 1755721063,
  output: [
    {
      id: 'output-1',
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: 'First fact. Second fact.',
          annotations: [
            {
              type: 'file_citation',
              file_id: 'file-a',
              filename: 'report.pdf',
              index: 11,
            },
            {
              type: 'file_citation',
              file_id: 'file-b',
              filename: 'manual.pdf',
              index: 24,
            },
          ],
        },
      ],
    },
  ],
};

// Response with a file_search_call output item containing results with scores
export const responseWithFileSearchResults: BackendResponseData = {
  id: 'response-file-search-results',
  model: 'test-model',
  status: 'completed',
  created_at: 1755721063,
  output: [
    {
      id: 'search-1',
      type: 'file_search_call',
      queries: ['What is retrieval augmented generation?'],
      results: [
        {
          score: 0.92,
          text: 'RAG combines retrieval and generation.',
          file_id: 'f1',
          filename: 'rag-guide.pdf',
        },
        {
          score: 0.71,
          text: 'Embeddings are used for similarity search.',
          file_id: 'f2',
          filename: 'embeddings.pdf',
        },
      ],
    },
    {
      id: 'msg-1',
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: 'RAG is a technique that combines retrieval and generation.',
        },
      ],
    },
  ],
};

// Response with no file_search_call results (empty array)
export const responseWithEmptyFileSearchResults: BackendResponseData = {
  id: 'response-empty-file-search',
  model: 'test-model',
  status: 'completed',
  created_at: 1755721063,
  output: [
    {
      id: 'search-1',
      type: 'file_search_call',
      queries: ['test query'],
      results: [],
    },
    {
      id: 'msg-1',
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: 'No results found.',
        },
      ],
    },
  ],
};

// Response with multiple file_search_call outputs to test aggregation
export const responseWithMultipleFileSearchCalls: BackendResponseData = {
  id: 'response-multi-file-search',
  model: 'test-model',
  status: 'completed',
  created_at: 1755721063,
  output: [
    {
      id: 'search-1',
      type: 'file_search_call',
      queries: ['What is RAG?'],
      results: [
        {
          score: 0.95,
          text: 'RAG overview content.',
          file_id: 'f1',
          filename: 'rag-overview.pdf',
        },
      ],
    },
    {
      id: 'search-2',
      type: 'file_search_call',
      queries: ['How do embeddings work?'],
      results: [
        {
          score: 0.88,
          text: 'Embeddings explanation.',
          file_id: 'f2',
          filename: 'embeddings-guide.pdf',
        },
        {
          score: 0.65,
          text: 'Vector databases overview.',
          file_id: 'f3',
          filename: 'vector-db.pdf',
        },
      ],
    },
    {
      id: 'msg-1',
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: 'Here is information about RAG and embeddings.',
        },
      ],
    },
  ],
};

// Streaming completed event with file_search_call results
export const streamingCompletedEventWithFileSearchResults = JSON.stringify({
  type: 'response.completed',
  response: {
    id: 'resp-search',
    model: 'test-model',
    status: 'completed',
    created_at: 1755721063,
    output: [
      {
        id: 'search-1',
        type: 'file_search_call',
        queries: ['streaming search query'],
        results: [
          {
            score: 0.88,
            text: 'Chunk from streaming.',
            file_id: 'sf1',
            filename: 'stream-doc.pdf',
          },
        ],
      },
      {
        id: 'msg-1',
        type: 'message',
        content: [
          {
            type: 'output_text',
            text: 'Streamed answer.',
          },
        ],
      },
    ],
  },
});
