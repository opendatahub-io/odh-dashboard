import * as React from 'react';
type ViewAllVersionsButtonProps = {
    rmId?: string;
    totalVersions: number;
    isArchiveModel?: boolean;
    showIcon?: boolean;
};
declare const ViewAllVersionsButton: React.FC<ViewAllVersionsButtonProps>;
export default ViewAllVersionsButton;
