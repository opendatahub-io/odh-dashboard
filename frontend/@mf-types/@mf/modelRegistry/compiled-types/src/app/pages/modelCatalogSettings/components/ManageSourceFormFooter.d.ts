import * as React from 'react';
type ManageSourceFormFooterProps = {
    submitLabel: string;
    submitError?: Error;
    isSubmitDisabled: boolean;
    isSubmitting: boolean;
    onSubmit: () => void;
    onCancel: () => void;
    isPreviewDisabled: boolean;
    isPreviewLoading: boolean;
    onPreview: () => void;
};
declare const ManageSourceFormFooter: React.FC<ManageSourceFormFooterProps>;
export default ManageSourceFormFooter;
