import * as React from 'react';
import './catalogToolbar.css';
export type CatalogSourceLabelSelectorProps = {
    searchTerm: string;
    onSearch: (term: string) => void;
    onClearSearch: () => void;
    onResetAllFilters: () => void;
    /** Drives default clear-all visibility and conditional active-filter rendering. */
    hasFiltersApplied: boolean;
    /**
     * Explicit override for Toolbar clearAllFilters.
     * Defaults to `hasFiltersApplied`.
     */
    showResetAllButton?: boolean;
    /**
     * Remount Toolbar when filter state toggles (MCP/Agents key trick).
     * Default true. Model sets false.
     */
    remountToolbarOnFilterChange?: boolean;
    searchPlaceholder: string;
    searchInputTestId: string;
    searchButtonTestId: string;
    searchAriaLabel?: string;
    /** Render active filter chips in the toolbar. */
    renderActiveFilters?: () => React.ReactNode;
    /**
     * Always render active filters even when none are applied.
     * Model needs this for the PF ToolbarFilter mount workaround.
     */
    alwaysMountActiveFilters?: boolean;
    /** Category toggle blocks row. */
    renderSourceLabelBlocks?: () => React.ReactNode;
    /** Right-side content in the category row (e.g. sort dropdown). */
    sourceLabelRowExtra?: React.ReactNode;
    /** Extra StackItems after toolbar/category row (e.g. performance sections). */
    additionalSections?: React.ReactNode;
};
declare const CatalogSourceLabelSelector: React.FC<CatalogSourceLabelSelectorProps>;
export default CatalogSourceLabelSelector;
