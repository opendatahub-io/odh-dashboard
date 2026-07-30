import * as React from 'react';
import { CollectionsListResponse } from '~/app/types';
type CollectionsContextValue = {
    response: CollectionsListResponse;
    loaded: boolean;
    loadError: Error | undefined;
    refresh: () => void;
};
export declare const CollectionsContext: React.Context<CollectionsContextValue>;
type CollectionsContextProviderProps = {
    namespace: string;
    children: React.ReactNode;
};
/**
 * Fetches all collections for the current namespace once and shares the result
 * with both useCollections (collection picker) and useCollectionNameMap
 * (evaluations table name lookup), eliminating duplicate network requests.
 *
 * Filtering and pagination are intentionally done client-side against this
 * prefetched set. Server-side filter params (name, category, tags, scope) are
 * available on the BFF but are not forwarded here — client-side filtering is
 * sufficient for the expected collection counts (<= COLLECTION_FETCH_LIMIT).
 * A truncation warning is surfaced to the user when the API total_count exceeds
 * the fetch limit.
 */
export declare const CollectionsContextProvider: React.FC<CollectionsContextProviderProps>;
export declare const useCollectionsContext: () => CollectionsContextValue;
export {};
