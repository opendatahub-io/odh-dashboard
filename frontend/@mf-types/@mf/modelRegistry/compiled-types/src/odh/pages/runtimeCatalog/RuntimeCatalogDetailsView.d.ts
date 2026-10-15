import * as React from 'react';
import { ServingRuntime, ServingRuntimeVersion } from '~/odh/types/servingRuntimeCatalogTypes';
export type RuntimeCatalogDetailsViewProps = {
    breadcrumbs: {
        title: string;
        href: string;
    }[];
    runtimeDetails?: ServingRuntime | null;
    runtimeVersions?: ServingRuntimeVersion[];
    loading?: boolean;
    error?: Error;
    notFound?: boolean;
};
declare const RuntimeCatalogDetailsView: React.FC<RuntimeCatalogDetailsViewProps>;
export default RuntimeCatalogDetailsView;
