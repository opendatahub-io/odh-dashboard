import React from 'react';
import { CatalogModel } from '~/app/modelCatalogTypes';
type ModelCatalogDeployModalExtensionProps = {
    model: CatalogModel;
    render: (buttonState: {
        enabled?: boolean;
        tooltip?: string;
    }, onOpenModal: () => void, isModalAvailable: boolean) => React.ReactNode;
};
declare const ModelCatalogDeployModalExtension: React.FC<ModelCatalogDeployModalExtensionProps>;
export default ModelCatalogDeployModalExtension;
