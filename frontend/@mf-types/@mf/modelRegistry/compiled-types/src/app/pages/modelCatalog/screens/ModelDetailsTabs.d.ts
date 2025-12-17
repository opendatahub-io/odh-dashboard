import * as React from 'react';
import { CatalogArtifactList, CatalogModel } from '~/app/modelCatalogTypes';
export declare enum ModelDetailsTab {
    OVERVIEW = "overview",
    PERFORMANCE_INSIGHTS = "performance-insights"
}
export declare enum ModelDetailsTabTitle {
    OVERVIEW = "Overview",
    PERFORMANCE_INSIGHTS = "Performance insights"
}
type ModelDetailsTabsProps = {
    model: CatalogModel;
    artifacts: CatalogArtifactList;
    artifactLoaded: boolean;
    artifactsLoadError: Error | undefined;
};
declare const ModelDetailsTabs: ({ model, artifacts, artifactLoaded, artifactsLoadError, }: ModelDetailsTabsProps) => React.JSX.Element;
export default ModelDetailsTabs;
