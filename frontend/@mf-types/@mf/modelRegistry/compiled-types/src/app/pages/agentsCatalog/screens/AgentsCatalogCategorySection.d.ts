import * as React from 'react';
type AgentsCatalogCategorySectionProps = {
    label: string;
    searchTerm: string;
    pageSize: number;
    onShowMore: (label: string) => void;
};
declare const AgentsCatalogCategorySection: React.FC<AgentsCatalogCategorySectionProps>;
export default AgentsCatalogCategorySection;
