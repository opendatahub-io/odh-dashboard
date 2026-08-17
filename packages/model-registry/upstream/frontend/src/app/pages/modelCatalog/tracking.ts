/**
 * Model Catalog Segment event names for validated arguments / tool calling.
 * @see https://docs.google.com/document/d/13UKq-QHree-MTwhgEp70OqWt-HTWC1mFVmEOFEEOrWU
 */
export const MODEL_CATALOG_EVENTS = {
  VALIDATED_ARGUMENTS_COPIED: 'Model Catalog Validated Arguments Copied',
  VALIDATED_ARGUMENTS_EXPANDED: 'Model Catalog Validated Arguments Card Expanded',
  VALIDATED_ARGUMENTS_FILTER_APPLIED: 'Model Catalog Validated Arguments Filter Applied',
  VALIDATED_LABEL_CLICKED: 'Model Catalog Validated Label Clicked',
} as const;

/** Diff helper: which single value was added or removed between two filter arrays. */
export const getToggledFilterValue = (
  previousValues: string[] | undefined,
  nextValues: string[],
): string | undefined => {
  const prev = previousValues ?? [];
  const added = nextValues.find((value) => !prev.includes(value));
  if (added) {
    return added;
  }
  return prev.find((value) => !nextValues.includes(value));
};
