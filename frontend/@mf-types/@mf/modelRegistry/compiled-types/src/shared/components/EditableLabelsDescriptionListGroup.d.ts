import React from 'react';
interface EditableLabelsProps {
    labels: string[];
    onLabelsChange: (labels: string[]) => Promise<void>;
    isArchive?: boolean;
    title?: string;
    contentWhenEmpty?: string;
    allExistingKeys: string[];
}
export declare const EditableLabelsDescriptionListGroup: React.FC<EditableLabelsProps>;
export {};
