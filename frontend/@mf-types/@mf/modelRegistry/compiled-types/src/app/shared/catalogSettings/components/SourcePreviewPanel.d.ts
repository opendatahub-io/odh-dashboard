import * as React from 'react';
import { CatalogSettingsPreviewTab } from '~/app/shared/catalogSettings/hooks/previewTypes';
export type SourcePreviewItem = {
    name: string;
    included: boolean;
};
export type SourcePreviewTabState<TItem> = {
    items: TItem[];
    hasMore: boolean;
};
export type SourcePreviewPanelTestIds = {
    panel?: string;
    previewButtonHeader?: string;
    previewButtonPanel?: string;
    previewButtonPanelRetry?: string;
    refreshPreviewLink?: string;
};
type SourcePreviewPanelProps<TItem extends SourcePreviewItem, TSummary> = {
    activeTab: CatalogSettingsPreviewTab;
    tabStates: Record<CatalogSettingsPreviewTab, SourcePreviewTabState<TItem>>;
    summary?: TSummary;
    isLoadingInitial: boolean;
    isLoadingMore: boolean;
    /** Preview-relevant error; pass `undefined` while in a different mode (e.g. validate). */
    error?: Error;
    hasFormChanged: boolean;
    canPreview: boolean;
    previewDisabledTooltip?: string;
    onPreview: () => void;
    onLoadMore: () => void;
    onTabChange: (tab: CatalogSettingsPreviewTab) => void;
    pageTitle: string;
    previewLabel: string;
    tabsAriaLabel: string;
    includedTabTitle: string;
    excludedTabTitle: string;
    initialEmptyStateTitle: string;
    initialEmptyStateBody: React.ReactNode;
    errorStateTitle?: string;
    noIncludedTitle: string;
    noIncludedBody: string;
    noExcludedTitle: string;
    noExcludedBody: string;
    getTotalCount: (summary: TSummary) => number;
    getIncludedCount: (summary: TSummary) => number;
    getExcludedCount: (summary: TSummary) => number;
    includedCountLabel: (included: number, total: number) => string;
    excludedCountLabel: (excluded: number, total: number) => string;
    /** Optional domain-specific list row icon (defaults to included/excluded check icons). */
    renderListItemIcon?: (item: TItem) => React.ReactNode;
    /** Warning shown under the panel header (e.g. source disabled). */
    sourceDisabledWarning?: React.ReactNode;
    /** Warning shown above preview tabs when preview results need attention. */
    gatedAccessWarning?: React.ReactNode;
    testIds?: SourcePreviewPanelTestIds;
};
declare const SourcePreviewPanel: <TItem extends SourcePreviewItem, TSummary>({ activeTab, tabStates, summary, isLoadingInitial, isLoadingMore, error, hasFormChanged, canPreview, previewDisabledTooltip, onPreview, onLoadMore, onTabChange, pageTitle, previewLabel, tabsAriaLabel, includedTabTitle, excludedTabTitle, initialEmptyStateTitle, initialEmptyStateBody, errorStateTitle, noIncludedTitle, noIncludedBody, noExcludedTitle, noExcludedBody, getTotalCount, getIncludedCount, getExcludedCount, includedCountLabel, excludedCountLabel, renderListItemIcon, sourceDisabledWarning, gatedAccessWarning, testIds, }: SourcePreviewPanelProps<TItem, TSummary>) => React.ReactElement;
export default SourcePreviewPanel;
