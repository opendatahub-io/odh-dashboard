import * as React from 'react';
import { DashboardDescriptionListGroupProps } from '~/shared/components/DashboardDescriptionListGroup';
type EditableTextDescriptionListGroupProps = Partial<Pick<DashboardDescriptionListGroupProps, 'title' | 'contentWhenEmpty'>> & {
    labels: string[];
    saveEditedLabels: (labels: string[]) => Promise<unknown>;
    allExistingKeys?: string[];
    isArchive?: boolean;
};
declare const EditableLabelsDescriptionListGroup: React.FC<EditableTextDescriptionListGroupProps>;
export default EditableLabelsDescriptionListGroup;
