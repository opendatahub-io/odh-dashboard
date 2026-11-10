const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// BFF error messages embed the upstream service's JSON error body verbatim, e.g.
// 'EvalHub error on operation GetInfo: {"message_code":"internal_server_error","message":"..."}'.
// Surface the embedded message when the body parses; otherwise show the string as-is.
// The whole body runs inside the try so a malformed runtime input (non-string message,
// unparseable body) degrades to the fallback instead of throwing.
export const parseEmbeddedErrorMessage = (message: string): string => {
  try {
    const start = message.indexOf('{');
    if (start !== -1) {
      const parsed: unknown = JSON.parse(message.slice(start));
      if (isRecord(parsed) && typeof parsed.message === 'string' && parsed.message.trim() !== '') {
        return parsed.message;
      }
    }
  } catch {
    // Not a string or not an embedded JSON body — fall back to the raw message.
  }
  return message;
};
