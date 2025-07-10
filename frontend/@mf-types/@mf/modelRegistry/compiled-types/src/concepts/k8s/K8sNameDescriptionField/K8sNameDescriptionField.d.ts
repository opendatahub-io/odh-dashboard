import * as React from 'react';
/** Companion data hook */
type NameDescType = {
    name: string;
    description: string;
};
type K8sNameDescriptionFieldProps = {
    data: NameDescType;
    onDataChange: (data: NameDescType) => void;
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
