const DEFAULT_API_KEY_VISIBLE_PREFIX_LENGTH = 7;

/** First characters of the key stay readable; the remainder is shown as bullets (matches CreateApiKeyModal). */
export const formatApiKeyHiddenPreview = (
  apiKey: string,
  visiblePrefixLength: number = DEFAULT_API_KEY_VISIBLE_PREFIX_LENGTH,
): string => {
  if (apiKey.length <= visiblePrefixLength) {
    return apiKey;
  }
  return `${apiKey.slice(0, visiblePrefixLength)}${'•'.repeat(apiKey.length - visiblePrefixLength)}`;
};

export const formatApiKeyError = (message: string): string => {
  const maxExpirationMatch = message.match(/exceeds maximum allowed \((\d+) days\)/);
  if (maxExpirationMatch) {
    return `Requested expiration exceeds maximum allowed (${maxExpirationMatch[1]} days). Select a shorter duration and try again.`;
  }
  return message.charAt(0).toUpperCase() + message.slice(1);
};
