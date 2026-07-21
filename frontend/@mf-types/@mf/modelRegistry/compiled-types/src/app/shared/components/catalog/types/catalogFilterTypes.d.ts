import type { gridSpans } from '@patternfly/react-core';
export type CatalogGridSpans = {
    sm?: gridSpans;
    md?: gridSpans;
    lg?: gridSpans;
    xl?: gridSpans;
    xl2?: gridSpans;
};
export declare const DEFAULT_CATALOG_GRID_SPANS: CatalogGridSpans;
export type CatalogFilterStringOption<T extends string = string> = {
    type: 'string';
    values?: T[];
};
export type CatalogFilterNumberOption = {
    type: 'number';
    range?: {
        max?: number;
        min?: number;
    };
};
