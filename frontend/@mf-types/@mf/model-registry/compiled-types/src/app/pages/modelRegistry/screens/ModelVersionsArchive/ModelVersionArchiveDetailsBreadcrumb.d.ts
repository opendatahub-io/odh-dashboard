import React from 'react';
import { RegisteredModel } from '~/app/types';
type ModelVersionArchiveDetailsBreadcrumbProps = {
    preferredModelRegistry?: string;
    registeredModel: RegisteredModel | null;
    modelVersionName?: string;
};
declare const ModelVersionArchiveDetailsBreadcrumb: React.FC<ModelVersionArchiveDetailsBreadcrumbProps>;
export default ModelVersionArchiveDetailsBreadcrumb;
