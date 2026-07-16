type UseEmptyCategoryTrackingResult = {
    emptyCategoryLabels: Set<string>;
    categoriesResolved: boolean;
    reportCategoryEmpty: (label: string, isEmpty: boolean) => void;
    setCategoryCount: (count: number) => void;
};
declare const useEmptyCategoryTracking: () => UseEmptyCategoryTrackingResult;
export default useEmptyCategoryTracking;
