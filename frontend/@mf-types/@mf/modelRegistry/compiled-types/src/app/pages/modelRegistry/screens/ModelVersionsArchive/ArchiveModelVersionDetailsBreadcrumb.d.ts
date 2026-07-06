import React from 'react';
import { RegisteredModel } from '~/app/types';
type ArchiveModelVersionDetailsBreadcrumbProps = {
    preferredModelRegistry?: string;
    registeredModel: RegisteredModel | null;
    modelVersionName?: string;
};
declare const ArchiveModelVersionDetailsBreadcrumb: React.FC<ArchiveModelVersionDetailsBreadcrumbProps>;
export default ArchiveModelVersionDetailsBreadcrumb;
