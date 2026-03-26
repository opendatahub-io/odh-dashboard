export const formatApiKeyError = (message: string): string => {
  const maxExpirationMatch = message.match(/exceeds maximum allowed \((\d+) days\)/);
  if (maxExpirationMatch) {
    return `Requested expiration exceeds maximum allowed (${maxExpirationMatch[1]} days). Select a shorter duration and try again.`;
  }
  return message.charAt(0).toUpperCase() + message.slice(1);
};
