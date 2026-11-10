import * as React from 'react';
import { CatalogArtifactList, CatalogModel } from '~/app/modelCatalogTypes';
export declare const MODEL_CATALOG_DETAILS_GROUP = "model-catalog.details";
export declare enum ModelDetailsTabTitle {
    OVERVIEW = "Overview",
    PERFORMANCE_INSIGHTS = "Performance insights"
}
type ModelDetailsTabsProps = {
    model: CatalogModel;
    tab: string;
    sourceId: string;
    artifacts: CatalogArtifactList;
    artifactLoaded: boolean;
    artifactsLoadError: Error | undefined;
    gatedAccessDenied: boolean;
    hfUsername?: string;
};
declare const ModelDetailsTabs: ({ model, tab, sourceId, artifacts, artifactLoaded, artifactsLoadError, gatedAccessDenied, hfUsername, }: ModelDetailsTabsProps) => React.JSX.Element;
export default ModelDetailsTabs;
