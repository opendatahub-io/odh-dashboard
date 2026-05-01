import React from 'react';
import { CatalogModel } from '~/app/modelCatalogTypes';
type ModelCatalogDeployWrapperProps = {
    model: CatalogModel;
    render: (buttonState: {
        enabled?: boolean;
        tooltip?: string;
    }, onOpenWizard: () => void, isWizardAvailable: boolean) => React.ReactNode;
};
declare const ModelCatalogDeployWrapper: React.FC<ModelCatalogDeployWrapperProps>;
export default ModelCatalogDeployWrapper;
