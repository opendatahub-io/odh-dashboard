import * as React from 'react';
export type StringFilterPanelItem = {
    key: string;
    title: string;
    filterValues: string[];
    selectedValues: string[];
    onToggle: (value: string, checked: boolean) => void;
    getLabel?: (value: string) => string;
    footer?: React.ReactNode;
    visible?: boolean;
    testIdBase?: string;
    getCheckboxTestId?: (value: string) => string;
};
export type CustomFilterPanelItem = {
    key: string;
    title: string;
    customContent: React.ReactNode;
    visible?: boolean;
};
export type FilterPanelItem = StringFilterPanelItem | CustomFilterPanelItem;
export declare const isCustomFilterItem: (item: FilterPanelItem) => item is CustomFilterPanelItem;
type CatalogFilterConfigsInput = {
    filterKeys: string[];
    filterNames: Record<string, string>;
    filterOptions: Record<string, {
        type?: string;
        values?: string[];
    }> | undefined;
    selectedFilters: Record<string, string[] | undefined>;
    onFilterChange: (key: string, values: string[]) => void;
    labelMappings?: Record<string, Record<string, string>>;
};
/**
 * Builds a FilterPanelItem[] from catalog-specific config.
 * Handles toggle logic, value extraction, and label mappings.
 * The caller passes catalog-specific context data; the hook returns
 * a ready-made array for CatalogFilterPanel.
 */
export declare function useCatalogFilterConfigs({ filterKeys, filterNames, filterOptions, selectedFilters, onFilterChange, labelMappings, }: CatalogFilterConfigsInput): StringFilterPanelItem[];
export {};
