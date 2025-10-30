import React from 'react';
import { CatalogModel, CatalogSource } from '~/app/modelCatalogTypes';
type ModelCatalogCardProps = {
    model: CatalogModel;
    source: CatalogSource | undefined;
    truncate?: boolean;
};
declare const ModelCatalogCard: React.FC<ModelCatalogCardProps>;
export default ModelCatalogCard;
