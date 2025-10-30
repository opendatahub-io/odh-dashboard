import React from 'react';
import { ModelRegistry } from '~/app/types';
import { CatalogArtifacts, CatalogModel, CatalogModelDetailsParams } from '~/app/modelCatalogTypes';
interface RegisterCatalogModelFormProps {
    model: CatalogModel | null;
    preferredModelRegistry: ModelRegistry;
    artifacts: CatalogArtifacts[];
    decodedParams: CatalogModelDetailsParams;
    removeChildrenTopPadding?: boolean;
}
declare const RegisterCatalogModelForm: React.FC<RegisterCatalogModelFormProps>;
export default RegisterCatalogModelForm;
