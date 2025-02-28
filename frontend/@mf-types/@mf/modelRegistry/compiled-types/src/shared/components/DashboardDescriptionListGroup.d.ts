import * as React from 'react';
import './DashboardDescriptionListGroup.scss';
type EditableProps = {
    isEditing: boolean;
    contentWhenEditing: React.ReactNode;
    isSavingEdits?: boolean;
    onEditClick: () => void;
    onSaveEditsClick: () => void;
    onDiscardEditsClick: () => void;
    editButtonTestId?: string;
    saveButtonTestId?: string;
    cancelButtonTestId?: string;
    discardButtonTestId?: string;
};
export type DashboardDescriptionListGroupProps = {
    title: string;
    popover?: React.ReactNode;
    action?: React.ReactNode;
    isEmpty?: boolean;
    contentWhenEmpty?: React.ReactNode;
    children: React.ReactNode;
    groupTestId?: string;
    isSaveDisabled?: boolean;
} & (({
    isEditable: true;
} & EditableProps) | ({
    isEditable?: false;
} & Partial<EditableProps>));
declare const DashboardDescriptionListGroup: React.FC<DashboardDescriptionListGroupProps>;
export default DashboardDescriptionListGroup;
