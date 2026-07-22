import * as React from 'react';
import type { CatalogLabelList, CatalogSourceList } from '~/app/modelCatalogTypes';
type CatalogSourceLabelToggleProps = {
    catalogSources: CatalogSourceList | null;
    catalogLabels: CatalogLabelList | null;
    selectedSourceLabel: string | undefined;
    onSelectSourceLabel: (label: string | undefined) => void;
    allBlockLabel?: string | undefined;
    allBlockDisplayName: string;
    emptyCategoryLabels?: Set<string>;
    className?: string;
    testId?: string;
    ariaLabel?: string;
    hideWhenSingleCategory?: boolean;
    getLabelDisplayNameOverride?: (label: string) => string;
    getTestId?: (blockId: string) => string;
};
declare const CatalogSourceLabelToggle: React.FC<CatalogSourceLabelToggleProps>;
export default CatalogSourceLabelToggle;
