import * as React from 'react';
import { CatalogModel, CatalogModelDetailsParams } from '~/app/modelCatalogTypes';
type ModelDetailsViewProps = {
    model: CatalogModel;
    decodedParams: CatalogModelDetailsParams;
};
declare const ModelDetailsView: React.FC<ModelDetailsViewProps>;
export default ModelDetailsView;
