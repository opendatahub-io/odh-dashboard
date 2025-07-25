import React from 'react';
import { RegisteredModel } from '~/app/types';
type RegisteredModelArchiveDetailsBreadcrumbProps = {
    preferredModelRegistry?: string;
    registeredModel: RegisteredModel | null;
};
declare const RegisteredModelArchiveDetailsBreadcrumb: React.FC<RegisteredModelArchiveDetailsBreadcrumbProps>;
export default RegisteredModelArchiveDetailsBreadcrumb;
