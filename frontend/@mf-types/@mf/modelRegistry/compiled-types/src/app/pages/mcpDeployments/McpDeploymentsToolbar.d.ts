import * as React from 'react';
type McpDeploymentsToolbarProps = {
    filterText: string;
    onFilterChange: (value: string) => void;
    onClearFilters: () => void;
};
declare const McpDeploymentsToolbar: React.FC<McpDeploymentsToolbarProps>;
export default McpDeploymentsToolbar;
