import * as React from 'react';
import { K8sNameDescriptionFieldData, K8sNameDescriptionFieldUpdateFunction } from './types';
type ResourceNameFieldProps = {
    allowEdit: boolean;
    dataTestId: string;
    k8sName: K8sNameDescriptionFieldData['k8sName'];
    onDataChange?: K8sNameDescriptionFieldUpdateFunction;
};
/** Sub-resource; not for public consumption */
declare const ResourceNameField: React.FC<ResourceNameFieldProps>;
export default ResourceNameField;
