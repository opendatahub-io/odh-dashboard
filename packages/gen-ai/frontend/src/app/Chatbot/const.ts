import { MessageProps } from '@patternfly/chatbot';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { getId } from '~/app/utilities/utils';

// Alert and notification constants
export const ALERT_TIMEOUT_MS = 8000;

// Accordion item identifiers
export const ACCORDION_ITEMS = {
  MODEL_DETAILS: 'model-details-item',
  SOURCES: 'sources-item',
  MCP_SERVERS: 'mcp-servers-item',
} as const;

// Default expanded accordion items
export const DEFAULT_EXPANDED_ACCORDION_ITEMS = [
  ACCORDION_ITEMS.MODEL_DETAILS,
  ACCORDION_ITEMS.MCP_SERVERS,
];

// Query configuration constants
export const QUERY_CONFIG = {
  CHUNK_TEMPLATE: 'Result {index}\nContent: {chunk.content}\nMetadata: {metadata}\n',
  MAX_CHUNKS: 5,
  MAX_TOKENS_IN_CONTEXT: 1000,
  MAX_TOKENS: 500,
} as const;

// Sampling strategy constants
export const SAMPLING_STRATEGY = {
  TYPE: 'greedy',
} as const;

// Initial bot message
export const initialBotMessage = (): MessageProps => ({
  id: getId(),
  role: 'bot',
  content: 'Send a message to test your configuration',
  name: 'Bot',
  avatar: botAvatar,
  timestamp: new Date().toLocaleString(),
});

// File upload constants
export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  MAX_FILES_IN_VECTOR_STORE: 10, // Maximum number of files allowed in vector store
  ALLOWED_FILE_TYPES: {
    'application/pdf': ['.pdf'],
    'text/csv': ['.csv'],
    'text/plain': ['.txt'],
  },
  ACCEPTED_EXTENSIONS: '.pdf,.csv,.txt',
} as const;

// Job polling constants
export const JOB_POLLING_CONFIG = {
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  BACKOFF_MULTIPLIER: 1.5,
  MAX_POLL_TIME: 10 * 60 * 1000, // 10 minutes
} as const;

// Error handling constants
export const ERROR_MESSAGES = {
  NO_MODEL_OR_SOURCE: 'No model or source settings selected',
  FILE_UPLOAD_REJECTED: 'File upload rejected',
  FILE_TOO_LARGE: 'File size exceeds 10MB',
  TOO_MANY_FILES: 'Maximum number of files exceeded',
} as const;

export const DEFAULT_SYSTEM_INSTRUCTIONS = `You are a helpful AI assistant. You are designed to answer questions in a concise and professional manner.
`;
