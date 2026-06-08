/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { ResponsesTemplate } from '~/types/embeddable-chatbot';
import EmbeddableChatbotPlayground from '~/app/Chatbot/EmbeddableChatbotPlayground';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/autorag', state: null }),
}));

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  ModularArchContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  NotificationContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('~/app/context/UserContext', () => ({
  UserContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
  fireSimpleTrackingEvent: jest.fn(),
}));

jest.mock('~/app/Chatbot/ChatbotPlayground', () => ({
  __esModule: true,
  default: () => <div data-testid="chatbot-playground">Chatbot Playground</div>,
}));

const mockResponses: ResponsesTemplate = {
  model: 'vllm-inference/meta-llama/Llama-3.3-70B-Instruct',
  stream: false,
  store: true,
  input: [
    {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: '<user_query_placeholder>' }],
    },
  ],
  metadata: {
    autorag_run_id: '012345678',
    rag_pattern_name: 'Pattern1',
  },
  instructions: 'Answer using file_search results.',
  tools: [
    {
      type: 'file_search',
      vector_store_ids: ['vs-123'],
      max_num_results: 5,
      ranking_options: {
        search_mode: 'hybrid',
        ranker_strategy: 'rrf',
        ranker_k: 60,
        ranker_alpha: 0.5,
      },
    },
  ],
  tool_choice: { type: 'file_search' },
  include: ['file_search_call.results'],
};

describe('EmbeddableChatbotPlayground', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the chatbot playground with required props', () => {
    render(
      <EmbeddableChatbotPlayground
        namespace="test-ns"
        secretName="ogx-secret"
        responsesTemplate={mockResponses}
        bffBasePath="/gen-ai/api/v1"
      />,
    );

    expect(screen.getByTestId('chatbot-playground')).toBeInTheDocument();
  });

  it('should render with optional patternName prop', () => {
    render(
      <EmbeddableChatbotPlayground
        namespace="test-ns"
        secretName="ogx-secret"
        responsesTemplate={mockResponses}
        patternName="Pattern1"
        bffBasePath="/gen-ai/api/v1"
      />,
    );

    expect(screen.getByTestId('chatbot-playground')).toBeInTheDocument();
  });

  it('should render with custom welcome content', () => {
    render(
      <EmbeddableChatbotPlayground
        namespace="test-ns"
        secretName="ogx-secret"
        responsesTemplate={mockResponses}
        bffBasePath="/gen-ai/api/v1"
        welcomeContent={<div data-testid="custom-welcome">Welcome!</div>}
      />,
    );

    expect(screen.getByTestId('chatbot-playground')).toBeInTheDocument();
  });

  it('should render without errors when responsesTemplate has a different model', () => {
    const templateWithDifferentModel: ResponsesTemplate = {
      ...mockResponses,
      model: 'another-model/GPT-4o',
    };

    render(
      <EmbeddableChatbotPlayground
        namespace="other-ns"
        secretName="other-secret"
        responsesTemplate={templateWithDifferentModel}
        bffBasePath="/gen-ai/api/v1"
      />,
    );

    expect(screen.getByTestId('chatbot-playground')).toBeInTheDocument();
  });
});
