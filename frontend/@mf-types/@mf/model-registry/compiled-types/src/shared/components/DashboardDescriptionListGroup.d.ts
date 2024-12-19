import * as React from 'react';
import '~/shared/components/DashboardDescriptionListGroup.scss';
type EditableProps = {
    isEditing: boolean;
    contentWhenEditing: React.ReactNode;
    isSavingEdits?: boolean;
    onEditClick: () => void;
    onSaveEditsClick: () => void;
    onDiscardEditsClick: () => void;
};
export type DashboardDescriptionListGroupProps = {
    title: string;
    tooltip?: React.ReactNode;
    action?: React.ReactNode;
    isEmpty?: boolean;
    contentWhenEmpty?: React.ReactNode;
    children: React.ReactNode;
} & (({
    isEditable: true;
} & EditableProps) | ({
    isEditable?: false;
} & Partial<EditableProps>));
declare const DashboardDescriptionListGroup: React.FC<DashboardDescriptionListGroupProps>;
export default DashboardDescriptionListGroup;
