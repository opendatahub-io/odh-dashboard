import * as React from 'react';
type TableRowTitleDescriptionProps = {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    description?: string;
    descriptionAsMarkdown?: boolean;
    label?: React.ReactNode;
};
declare const TableRowTitleDescription: React.FC<TableRowTitleDescriptionProps>;
export default TableRowTitleDescription;
