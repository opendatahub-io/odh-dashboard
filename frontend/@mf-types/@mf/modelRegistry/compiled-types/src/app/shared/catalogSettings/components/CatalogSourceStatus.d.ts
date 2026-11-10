import * as React from 'react';
import { CatalogSourceList } from '~/app/shared/types/catalogTypes';
export type CatalogSourceStatusConfig = {
    id: string;
    enabled?: boolean;
    isDefault?: boolean;
};
type CatalogSourceStatusProps<TConfig extends CatalogSourceStatusConfig> = {
    catalogSourceConfig: TConfig;
    catalogSources: CatalogSourceList | null;
    catalogSourcesLoaded: boolean;
    catalogSourcesLoadError?: Error;
    /** Map of sourceId -> previous status, for sources with an in-flight optimistic update. */
    pendingSourceIds?: Map<string, string>;
    /** Prefix applied to every testid rendered by this component (e.g. `'mcp-'`). */
    testIdPrefix?: string;
    validationFailedTitle?: string;
    validationFailedBody?: string;
};
declare const CatalogSourceStatus: <TConfig extends CatalogSourceStatusConfig>({ catalogSourceConfig, catalogSources, catalogSourcesLoaded, catalogSourcesLoadError, pendingSourceIds, testIdPrefix, validationFailedTitle, validationFailedBody, }: CatalogSourceStatusProps<TConfig>) => React.ReactElement;
export default CatalogSourceStatus;
