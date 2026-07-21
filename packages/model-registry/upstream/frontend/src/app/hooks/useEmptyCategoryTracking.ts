import * as React from 'react';

const EMPTY_SET = new Set<string>();

type UseEmptyCategoryTrackingResult = {
  emptyCategoryLabels: Set<string>;
  categoriesResolved: boolean;
  reportCategoryEmpty: (label: string, isEmpty: boolean) => void;
  setCategoryCount: (count: number) => void;
};

const useEmptyCategoryTracking = (): UseEmptyCategoryTrackingResult => {
  const [rawEmptyLabels, setRawEmptyLabels] = React.useState<Set<string>>(() => new Set<string>());
  const [reportedLabels, setReportedLabels] = React.useState<Set<string>>(() => new Set<string>());
  const [categoryCount, setCategoryCount] = React.useState<number | null>(null);

  const categoriesResolved =
    categoryCount !== null && (categoryCount === 0 || reportedLabels.size >= categoryCount);

  // Hold back empty labels until all categories have reported.
  // Since reportCategoryEmpty updates both sets in the same startTransition,
  // rawEmptyLabels is fully populated when categoriesResolved flips to true.
  const emptyCategoryLabels =
    categoriesResolved && rawEmptyLabels.size > 0 ? rawEmptyLabels : EMPTY_SET;

  const reportCategoryEmpty = React.useCallback((label: string, isEmpty: boolean) => {
    setReportedLabels((prev) => {
      if (prev.has(label)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(label);
      return next;
    });

    setRawEmptyLabels((prev) => {
      const hasLabel = prev.has(label);
      if (isEmpty && !hasLabel) {
        const next = new Set(prev);
        next.add(label);
        return next;
      }
      if (!isEmpty && hasLabel) {
        const next = new Set(prev);
        next.delete(label);
        return next;
      }
      return prev;
    });
  }, []);

  return { emptyCategoryLabels, categoriesResolved, reportCategoryEmpty, setCategoryCount };
};

export default useEmptyCategoryTracking;
