import React from 'react';
import type { CatalogModel } from '~/app/modelCatalogTypes';
type ModelGatedAccessRequiredViewProps = {
    model: CatalogModel;
    hfUsername?: string;
};
declare const ModelGatedAccessRequiredView: React.FC<ModelGatedAccessRequiredViewProps>;
export default ModelGatedAccessRequiredView;
