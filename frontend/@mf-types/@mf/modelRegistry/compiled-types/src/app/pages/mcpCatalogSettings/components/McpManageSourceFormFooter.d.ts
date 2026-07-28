import * as React from 'react';
type McpManageSourceFormFooterProps = {
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
declare const McpManageSourceFormFooter: React.FC<McpManageSourceFormFooterProps>;
export default McpManageSourceFormFooter;
