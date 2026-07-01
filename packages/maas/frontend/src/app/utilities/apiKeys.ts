import { APIKey, APIKeyDisplayStatus, SubscriptionDetail } from '~/app/types/api-key';

/**
 * Determines whether an API key should be displayed as "inactive".
 *
 * A key is inactive when it has `active` status on the server but its
 * subscription no longer appears in the enrichment map returned alongside the
 * key list — meaning the subscription was deleted or is otherwise unavailable.
 *
 * When `subscriptionDetails` is `undefined` (enrichment was not returned at
 * all, e.g. due to a transient fetch failure), no key is classified as
 * inactive so we avoid false positives.
 */
export const isKeyInactive = (
  key: APIKey,
  subscriptionDetails: Record<string, SubscriptionDetail> | undefined,
): boolean =>
  key.status === 'active' &&
  !!key.subscription &&
  subscriptionDetails != null &&
  !(key.subscription in subscriptionDetails);

export type InactiveFilterResult = {
  data: APIKey[];
  /** True when client-side filtering removed rows from the server response. */
  clientFiltered: boolean;
};

/**
 * Applies client-side inactive-status filtering to API key data.
 *
 * "Inactive" is a UI-derived status: an active key whose subscription is no longer
 * available. The server only knows `active | revoked | expired`, so the inactive
 * distinction must be applied client-side after the response arrives.
 *
 * When only one of `active` / `inactive` is selected the data is filtered
 * to show only the matching subset; when both (or neither) are selected the
 * data is returned as-is in the server's original order.
 *
 * **Pagination caveat:** because the server paginates before this filter runs,
 * the server's `has_more` flag and page size do not account for removed rows.
 * Callers that display pagination counts should use the returned `data.length`
 * rather than the server's page size when `clientFiltered` is true.
 */
export const applyInactiveFilter = (
  data: APIKey[],
  statuses: APIKeyDisplayStatus[],
  checkInactive: (key: APIKey) => boolean,
): InactiveFilterResult => {
  const hasActive = statuses.includes('active');
  const hasInactive = statuses.includes('inactive');

  if (hasActive !== hasInactive) {
    return {
      data: data.filter((key) => {
        if (key.status !== 'active') {
          return true;
        }
        return hasInactive ? checkInactive(key) : !checkInactive(key);
      }),
      clientFiltered: true,
    };
  }

  return { data, clientFiltered: false };
};
