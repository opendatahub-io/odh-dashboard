import * as React from 'react';
export type ManageSourceFormLayoutProps = {
    /** Form body sections rendered inside the left sidebar content. */
    children: React.ReactNode;
    /** Preview panel rendered in the right sidebar. */
    previewPanel: React.ReactNode;
    /** Sticky footer (submit / preview / cancel). */
    footer: React.ReactNode;
};
/**
 * Shared manage-source layout: form on the left, preview on the right, sticky footer.
 * Domain forms own submit logic and section composition; this only owns the chrome.
 */
declare const ManageSourceFormLayout: React.FC<ManageSourceFormLayoutProps>;
export default ManageSourceFormLayout;
