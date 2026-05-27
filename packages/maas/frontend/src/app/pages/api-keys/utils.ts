import { TokenRateLimitInfo, UserSubscription } from '~/app/types/subscriptions';

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

export type ModelGroupSubscription = {
  subscriptionIdHeader: string;
  displayName?: string;
  keyCount?: number;
  tokenRateLimits?: TokenRateLimitInfo[];
};

export type ModelGroupEntry = {
  name: string;
  displayName?: string;
  description?: string;
  source?: string;
  subscriptions: ModelGroupSubscription[];
};

export const formatTokenLimit = (limits?: TokenRateLimitInfo[]): string => {
  if (!limits || limits.length === 0) {
    return '—';
  }
  return limits
    .map((l) => {
      const formatted = l.limit >= 1000 ? `${Math.round(l.limit / 1000)}K` : String(l.limit);
      return `${formatted} / ${l.window}`;
    })
    .join(', ');
};

export const deriveModelGroups = (subscriptions: UserSubscription[]): ModelGroupEntry[] => {
  const modelMap = new Map<string, ModelGroupEntry>();

  subscriptions.forEach((sub) => {
    sub.model_refs.forEach((ref) => {
      const existing = modelMap.get(ref.name);
      const subEntry: ModelGroupSubscription = {
        subscriptionIdHeader: sub.subscription_id_header,
        displayName: sub.display_name,
        keyCount: sub.key_count,
        tokenRateLimits: ref.token_rate_limits,
      };

      if (existing) {
        existing.subscriptions.push(subEntry);
      } else {
        modelMap.set(ref.name, {
          name: ref.name,
          displayName: ref.display_name,
          description: ref.description,
          source: ref.source,
          subscriptions: [subEntry],
        });
      }
    });
  });

  return Array.from(modelMap.values());
};

export const getSourceLabelColor = (source: string): 'blue' | 'purple' =>
  source === 'internal' ? 'blue' : 'purple';
