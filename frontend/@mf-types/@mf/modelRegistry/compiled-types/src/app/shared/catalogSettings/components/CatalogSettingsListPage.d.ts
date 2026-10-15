import * as React from 'react';
type CatalogSettingsListPageProps = {
    title: React.ReactNode;
    description: string;
    isEmpty: boolean;
    loaded: boolean;
    loadError?: Error;
    errorMessage: string;
    emptyStateTitle: string;
    emptyStateBody: string;
    emptyStateTestId: string;
    addSourceLabel: string;
    addSourceButtonTestId: string;
    onAddSource: () => void;
    children: React.ReactNode;
};
declare const CatalogSettingsListPage: React.FC<CatalogSettingsListPageProps>;
export default CatalogSettingsListPage;
