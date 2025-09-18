import React from 'react';
import { CatalogModel } from '~/app/modelCatalogTypes';
export declare const ModelCatalogDeployButton: ({ model, renderRegisterButton, }: {
    model: CatalogModel;
    renderRegisterButton?: (isDeployAvailable: boolean) => React.ReactNode;
}) => React.JSX.Element;
