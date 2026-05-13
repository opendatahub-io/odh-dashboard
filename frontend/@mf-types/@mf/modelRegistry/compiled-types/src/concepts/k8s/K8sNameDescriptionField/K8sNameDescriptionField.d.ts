import * as React from 'react';
import { UseK8sNameDescriptionDataConfiguration, UseK8sNameDescriptionFieldData } from './types';
/** Companion data hook */
export declare const useK8sNameDescriptionFieldData: (configuration?: UseK8sNameDescriptionDataConfiguration) => UseK8sNameDescriptionFieldData;
type K8sNameDescriptionFieldProps = {
    data: UseK8sNameDescriptionFieldData['data'];
    onDataChange?: UseK8sNameDescriptionFieldData['onDataChange'];
    dataTestId: string;
    descriptionLabel?: string;
    nameLabel?: string;
    nameHelperText?: React.ReactNode;
    hideDescription?: boolean;
};
/**
 * Use in place of any K8s Resource creation / edit.
 * @see useK8sNameDescriptionFieldData
 */
declare const K8sNameDescriptionField: React.FC<K8sNameDescriptionFieldProps>;
export default K8sNameDescriptionField;
