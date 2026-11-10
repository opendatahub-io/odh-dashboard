import * as React from 'react';
type ManageSourceFormFooterProps = {
    submitLabel: string;
    submitError?: Error;
    saveFailedTitle: string;
    isSubmitDisabled: boolean;
    isSubmitting: boolean;
    onSubmit: () => void;
    onCancel: () => void;
    cancelLabel?: string;
    isPreviewDisabled: boolean;
    isPreviewLoading: boolean;
    onPreview: () => void;
    previewLabel: string;
    previewDisabledTooltip?: string;
    testIdPrefix?: string;
};
declare const ManageSourceFormFooter: React.FC<ManageSourceFormFooterProps>;
export default ManageSourceFormFooter;
