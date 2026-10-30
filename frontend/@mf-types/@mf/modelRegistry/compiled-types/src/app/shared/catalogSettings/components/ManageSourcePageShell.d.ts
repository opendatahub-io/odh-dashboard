import * as React from 'react';
type ManageSourcePageShellProps = {
    listPageUrl: string;
    listPageLabel: string;
    breadcrumbLabel: string;
    breadcrumbTestId: string;
    title: string;
    description: string;
    errorMessage?: string;
    empty: boolean;
    loaded: boolean;
    isExpectedFormatDrawerOpen: boolean;
    drawerPanelContent: React.ReactNode;
    children: React.ReactNode;
};
declare const ManageSourcePageShell: React.FC<ManageSourcePageShellProps>;
export default ManageSourcePageShell;
