import React from 'react';
import { ModelRegistry } from '~/app/types';
import { CatalogModel, CatalogModelArtifact, CatalogModelDetailsParams } from '~/app/modelCatalogTypes';
interface RegisterCatalogModelFormProps {
    model: CatalogModel | null;
    preferredModelRegistry: ModelRegistry;
    artifacts: CatalogModelArtifact[];
    decodedParams: CatalogModelDetailsParams;
    removeChildrenTopPadding?: boolean;
}
declare const RegisterCatalogModelForm: React.FC<RegisterCatalogModelFormProps>;
export default RegisterCatalogModelForm;
