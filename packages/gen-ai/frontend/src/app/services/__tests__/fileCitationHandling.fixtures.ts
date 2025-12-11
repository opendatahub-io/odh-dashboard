/* eslint-disable camelcase */
import { BackendResponseData, CreateResponseRequest } from '~/app/types';

export const mockRequest: CreateResponseRequest = {
  input: 'Test input',
  model: 'test-model',
  vector_store_ids: ['vector-store-1'],
  temperature: 0.7,
  stream: false,
};

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

export const responseWithInlineTokens: BackendResponseData = {
  id: 'response-with-tokens',
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
          text: 'Here is the info <|file-abc123def456|>.',
          annotations: [
            {
              type: 'file_citation',
              file_id: 'file-abc123def456',
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
      type: 'completion_message',
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
              filename: 'report1.pdf', // Duplicate filename
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
        type: 'completion_message',
        content: [
          {
            type: 'output_text',
            text: 'Info from <|file-aaa111|> and <|file-bbb222|>.',
            annotations: [
              {
                type: 'file_citation',
                file_id: 'file-aaa111',
                filename: 'doc1.pdf',
              },
              {
                type: 'file_citation',
                file_id: 'file-bbb222',
                filename: 'doc2.pdf',
              },
            ],
          },
        ],
      },
    ],
  },
});
