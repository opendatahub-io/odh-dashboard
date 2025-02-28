import * as React from 'react';
import { DashboardDescriptionListGroupProps } from '~/shared/components/DashboardDescriptionListGroup';
type EditableTextDescriptionListGroupProps = Pick<DashboardDescriptionListGroupProps, 'title' | 'contentWhenEmpty'> & {
    value: string;
    saveEditedValue: (value: string) => Promise<void>;
    baseTestId?: string;
    isArchive?: boolean;
    editableVariant: 'TextInput' | 'TextArea';
};
declare const EditableTextDescriptionListGroup: React.FC<EditableTextDescriptionListGroupProps>;
export default EditableTextDescriptionListGroup;
