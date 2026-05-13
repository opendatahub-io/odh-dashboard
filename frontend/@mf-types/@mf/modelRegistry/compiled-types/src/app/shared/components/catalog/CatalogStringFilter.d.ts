import * as React from 'react';
export type CatalogStringFilterProps = {
    title: string;
    filterValues: string[];
    selectedValues: string[];
    onToggle: (value: string, checked: boolean) => void;
    getLabel?: (value: string) => string;
    testIdBase: string;
    getCheckboxTestId?: (value: string) => string;
};
declare const CatalogStringFilter: React.FC<CatalogStringFilterProps>;
export default CatalogStringFilter;
