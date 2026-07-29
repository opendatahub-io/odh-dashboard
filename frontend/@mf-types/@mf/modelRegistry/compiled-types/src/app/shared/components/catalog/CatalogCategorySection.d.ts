import * as React from 'react';
import type { CatalogGridSpans } from './types/catalogFilterTypes';
type CatalogCategorySectionTestIds = {
    title?: string;
    showMore?: string;
    error?: string;
    skeleton?: (index: number) => string;
    empty?: string;
};
type CatalogCategorySectionProps<T> = {
    label: string;
    categoryTitle: string;
    categoryDescription?: string;
    items: T[];
    loaded: boolean;
    loadError: Error | undefined;
    pageSize: number;
    onShowMore: (label: string) => void;
    renderCard: (item: T) => React.ReactNode;
    getItemKey: (item: T) => string;
    gridSpans?: CatalogGridSpans;
    showAllThreshold?: number;
    skeletonCount?: number;
    loadingScreenReaderText?: string;
    testIds?: CatalogCategorySectionTestIds;
};
declare function CatalogCategorySection<T>({ label, categoryTitle, categoryDescription, items, loaded, loadError, pageSize, onShowMore, renderCard, getItemKey, gridSpans, showAllThreshold, skeletonCount, loadingScreenReaderText, testIds, }: CatalogCategorySectionProps<T>): React.ReactElement;
export default CatalogCategorySection;
