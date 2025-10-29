import React from 'react';
import { CatalogModel, CatalogSource } from '~/app/modelCatalogTypes';
type ModelCatalogCardBodyProps = {
    model: CatalogModel;
    isValidated: boolean;
    source: CatalogSource | undefined;
};
declare const ModelCatalogCardBody: React.FC<ModelCatalogCardBodyProps>;
export default ModelCatalogCardBody;
