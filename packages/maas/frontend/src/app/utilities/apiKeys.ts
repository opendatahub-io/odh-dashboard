import { APIKey, APIKeyDisplayStatus } from '~/app/types/api-key';

export type InactiveFilterResult = {
  data: APIKey[];
  /** True when client-side filtering removed rows from the server response. */
  clientFiltered: boolean;
};

/**
 * Applies client-side inactive-status filtering and sorting to API key data.
 *
 * "Inactive" is a UI-derived status: an active key whose subscription is no longer
 * available. The server only knows `active | revoked | expired`, so the inactive
 * distinction must be applied client-side after the response arrives.
 *
 * When only one of `active` / `inactive` is selected the data is filtered;
 * when both are selected inactive keys are sorted to the end.
 *
 * **Pagination caveat:** because the server paginates before this filter runs,
 * the server's `has_more` flag and page size do not account for removed rows.
 * Callers that display pagination counts should use the returned `data.length`
 * rather than the server's page size when `clientFiltered` is true.
 */
export const applyInactiveFilter = (
  data: APIKey[],
  statuses: APIKeyDisplayStatus[],
  isKeyInactive: (key: APIKey) => boolean,
): InactiveFilterResult => {
  const hasActive = statuses.includes('active');
  const hasInactive = statuses.includes('inactive');

  if (hasActive !== hasInactive) {
    return {
      data: data.filter((key) => {
        if (key.status !== 'active') {
          return true;
        }
        return hasInactive ? isKeyInactive(key) : !isKeyInactive(key);
      }),
      clientFiltered: true,
    };
  }

  if (hasActive && hasInactive) {
    return {
      data: data.toSorted((a, b) => {
        const aInactive = isKeyInactive(a) ? 1 : 0;
        const bInactive = isKeyInactive(b) ? 1 : 0;
        return aInactive - bInactive;
      }),
      clientFiltered: false,
    };
  }

  return { data, clientFiltered: false };
};
