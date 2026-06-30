interface MicrocopyTemplate {
  title: string;
  description: string;
}

interface MicrocopyContext {
  modelName?: string;
  maxTokens?: number;
  toolName?: string;
}

function interpolate(template: string, context: MicrocopyContext): string {
  return template
    .replace('{modelName}', context.modelName ?? 'The selected model')
    .replace('{maxTokens}', context.maxTokens?.toString() ?? 'the maximum')
    .replace('{toolName}', context.toolName ?? 'A tool');
}

// Template keys are constructed as `${component}:${code.toLowerCase()}` by the
// error classifier. Only include keys for codes that the BFF or OGX actually
// produce today. See OGXErr* and ErrCode* constants in llamastack/errors.go.
const fullFailureTemplates: Record<string, MicrocopyTemplate> = {
  // BFF error codes (from ErrCode* constants, lowercased by frontend)
  'bff:invalid_request': {
    title: 'Invalid request',
    description: 'The request is invalid. Check your input and try again.',
  },
  'bff:unauthorized': {
    title: 'Authentication required',
    description: 'Your session is invalid. Please sign in again.',
  },
  'bff:not_found': {
    title: 'Resource not found',
    description: 'The requested resource could not be found.',
  },
  'bff:internal_error': {
    title: 'Server error',
    description: 'The server encountered a problem. Please try again.',
  },
  'bff:connection_failed': {
    title: "Couldn't reach the server",
    description: 'Unable to connect to the OGX server. Check that the service is running.',
  },
  'ogx:connection_failed': {
    title: "Couldn't reach the server",
    description: 'Unable to connect to the OGX server. Check that the service is running.',
  },
  'bff:timeout': {
    title: 'Request timed out',
    description: "The server didn't respond in time. This may be a temporary issue.",
  },
  'bff:server_unavailable': {
    title: 'Server unavailable',
    description: 'The OGX server is currently unavailable. Please try again later.',
  },
  // OGX response.failed codes (from OGXErr* constants)
  'ogx:server_error': {
    title: 'Server error',
    description: 'The server encountered an internal error. Please try again.',
  },
  'ogx:rate_limit_exceeded': {
    title: 'Request was rate limited',
    description: 'Too many requests to the model server. Wait a moment before trying again.',
  },
  // ASR error codes (from ASRCode* constants in constants/asr.go)
  'asr:model_not_found': {
    title: 'Transcription model not found',
    description: 'The selected transcription model is no longer available in this namespace.',
  },
  'asr:model_not_running': {
    title: 'Transcription model not ready',
    description: 'The transcription model is starting up. Wait a moment and try again.',
  },
  'asr:model_no_endpoint': {
    title: 'Transcription model has no endpoint',
    description: 'The model has no reachable endpoint. Check its deployment status.',
  },
  'asr:model_invalid': {
    title: 'Invalid transcription model',
    description: 'The selected model cannot be used for audio transcription.',
  },
  'asr:unreachable': {
    title: 'Transcription model unreachable',
    description:
      'Could not connect to the transcription model. Ensure it is running and accessible.',
  },
  'asr:timeout': {
    title: 'Transcription timed out',
    description:
      'The transcription took too long. The audio file may be too large or the model is overloaded.',
  },
  'asr:auth_failed': {
    title: 'Transcription model access denied',
    description: 'Authentication to the transcription model failed. Verify access configuration.',
  },
  'asr:service_error': {
    title: 'Transcription model error',
    description: 'The transcription model returned an error. Try again or check model health.',
  },
  'asr:invalid_response': {
    title: 'Unexpected response from model',
    description: 'The transcription model returned an unexpected response. Try again.',
  },
  'asr:no_speech': {
    title: 'No speech detected',
    description: 'No speech was found in the audio file. Try a clearer recording.',
  },
  'asr:file_retrieval_failed': {
    title: 'Audio file unavailable',
    description: 'Could not retrieve the uploaded audio file. It may have expired.',
  },
  'asr:invalid_format': {
    title: 'Unsupported audio format',
    description: 'The file does not appear to be a valid WAV or MP3 audio file.',
  },
};

const partialFailureTemplates: Record<string, MicrocopyTemplate> = {
  // RAG error codes (from OGXErr* constants in llamastack/errors.go)
  'rag:vector_store_timeout': {
    title: 'Vector store timed out',
    description:
      'The vector store did not respond in time. Contact your Platform Engineer to verify the connection.',
  },
  // Guardrails error codes (from BFF constants in guardrails.go)
  'guardrails:guardrail_service_unavailable': {
    title: 'Guardrail check was not applied',
    description: "The safety filter couldn't process this response. Review the output carefully.",
  },
  'guardrails:guardrail_input_violation': {
    title: 'Content was flagged by guardrails',
    description: 'A guardrail flagged this input. Review the content carefully.',
  },
  'guardrails:guardrail_output_violation': {
    title: 'Content was flagged by guardrails',
    description: 'A guardrail flagged this response. Review the output carefully.',
  },
};

const streamingTemplates: Record<string, MicrocopyTemplate> = {
  'stream:connection_lost': {
    title: 'Streaming error — connection lost',
    description: 'The connection to the model was lost during generation.',
  },
  'stream:timeout': {
    title: 'Streaming error — response timed out',
    description: 'The model stopped responding during generation.',
  },
  'stream:context_length': {
    title: 'Streaming error — context length exceeded',
    description: "The response exceeded the model's context length.",
  },
};

const fallbackTemplate: MicrocopyTemplate = {
  title: 'Something went wrong',
  description: 'An unexpected error occurred. Check the details below for more information.',
};

export function getMicrocopy(
  templateKey: string,
  context: MicrocopyContext = {},
): { title: string; description: string } {
  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  const template =
    fullFailureTemplates[templateKey] ||
    partialFailureTemplates[templateKey] ||
    streamingTemplates[templateKey] ||
    fallbackTemplate;
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */

  return {
    title: interpolate(template.title, context),
    description: interpolate(template.description, context),
  };
}
