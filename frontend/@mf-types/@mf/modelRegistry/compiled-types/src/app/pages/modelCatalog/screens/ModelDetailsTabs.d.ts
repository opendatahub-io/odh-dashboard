import * as React from 'react';
import { CatalogArtifactList, CatalogModel } from '~/app/modelCatalogTypes';
import { ModelDetailsTab } from '~/concepts/modelCatalog/const';
export declare enum ModelDetailsTabTitle {
    OVERVIEW = "Overview",
    PERFORMANCE_INSIGHTS = "Performance insights"
}
type ModelDetailsTabsProps = {
    model: CatalogModel;
    tab: ModelDetailsTab;
    artifacts: CatalogArtifactList;
    artifactLoaded: boolean;
    artifactsLoadError: Error | undefined;
};
declare const ModelDetailsTabs: ({ model, tab, artifacts, artifactLoaded, artifactsLoadError, }: ModelDetailsTabsProps) => React.JSX.Element;
export default ModelDetailsTabs;
