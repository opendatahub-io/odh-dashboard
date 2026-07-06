import * as React from 'react';
import { CatalogArtifactList, CatalogModel } from '~/app/modelCatalogTypes';
type ModelDetailsViewProps = {
    model: CatalogModel;
    artifacts: CatalogArtifactList;
    artifactLoaded: boolean;
    artifactsLoadError: Error | undefined;
};
declare const ModelDetailsView: React.FC<ModelDetailsViewProps>;
export default ModelDetailsView;
