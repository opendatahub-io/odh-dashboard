/**
 * Model Catalog Segment event names for validated arguments / tool calling.
 * @see https://docs.google.com/document/d/13UKq-QHree-MTwhgEp70OqWt-HTWC1mFVmEOFEEOrWU
 */
export declare const MODEL_CATALOG_EVENTS: {
    readonly VALIDATED_ARGUMENTS_COPIED: "Model Catalog Validated Arguments Copied";
    readonly VALIDATED_ARGUMENTS_EXPANDED: "Model Catalog Validated Arguments Card Expanded";
    readonly VALIDATED_ARGUMENTS_FILTER_APPLIED: "Model Catalog Validated Arguments Filter Applied";
    readonly VALIDATED_LABEL_CLICKED: "Model Catalog Validated Label Clicked";
    readonly MODEL_SELECTED: "Model Catalog Model Selected";
};
/** Diff helper: which single value was added or removed between two filter arrays. */
export declare const getToggledFilterValue: (previousValues: string[] | undefined, nextValues: string[]) => string | undefined;
