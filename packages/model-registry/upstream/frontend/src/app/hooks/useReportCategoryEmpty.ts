import { startTransition, useEffect } from 'react';

const useReportCategoryEmpty = (
  reportCategoryEmpty: (label: string, isEmpty: boolean) => void,
  label: string,
  isLoaded: boolean,
  itemCount: number,
  searchTerm: string,
  loadError?: Error | undefined,
): void => {
  useEffect(() => {
    if (searchTerm) {
      return;
    }
    if (!isLoaded && !loadError) {
      return;
    }
    startTransition(() => {
      reportCategoryEmpty(label, itemCount === 0);
    });
  }, [isLoaded, itemCount, label, searchTerm, reportCategoryEmpty, loadError]);
};

export default useReportCategoryEmpty;
