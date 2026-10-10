import type React from 'react';

/** OpenAI Responses API template used by embedded and passthrough flows. */
type ResponsesTemplate = {
  model: string;
  stream: boolean;
  store: boolean;
  input:
    | string
    | Array<{
        type: 'message';
        role: 'user' | 'assistant' | 'system';
        content: Array<{
          type: 'input_text';
          text: string;
        }>;
      }>;
  metadata: Record<string, string>;
  instructions: string;
  tools: Array<{ type: string; [key: string]: unknown }>;
  tool_choice: {
    type: 'auto' | 'required' | 'none' | 'file_search';
  };
  include: string[];
};

/**
 * Props for the EmbeddableChatbotPlayground component exposed
 * via Module Federation for consumption by other packages (e.g., AutoRAG).
 */
type EmbeddableChatbotPlaygroundProps = {
  namespace: string;
  secretName: string;
  responsesTemplate: ResponsesTemplate;
  patternName?: string;
  /** Base path for the BFF API, e.g. '/gen-ai/api/v1'. No trailing slash. If '/api/v1' is omitted it is appended automatically. Used for both the passthrough and relay routes. */
  bffBasePath: string;
  /**
   * Same-origin path (with its own query string) of the responses endpoint to use
   * instead of the OGX connection-secret flow, e.g. '/autorag/api/v1/responses?namespace=my-project'.
   * Must start with a single '/' (absolute and protocol-relative URLs are rejected)
   * and be under a module prefix the relay allows (currently '/autorag/'); the
   * BFF rejects other destinations.
   * Routed through the BFF responses relay, which forwards the user's bearer token
   * to this path via the externally accessed gateway route.
   */
  responsesEndpointUrl?: string;
  /** Additional key-value pairs merged into the request body's metadata field. */
  additionalMetadata?: Record<string, string>;
  /** Custom content rendered in place of the default welcome prompt when no messages are present. */
  welcomeContent?: React.ReactNode;
  /** Custom text for the initial bot message. Pass empty string to hide it entirely. */
  placeholderBotContent?: string;
};

export type { ResponsesTemplate, EmbeddableChatbotPlaygroundProps };
