import { Collection } from '~/app/types';
export type UseCollectionsResult = {
    collections: Collection[];
    totalCount: number;
    loaded: boolean;
    loadError: Error | undefined;
    isTruncated: boolean;
    page: number;
    pageSize: number;
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    nameFilter: string;
    setNameFilter: (name: string) => void;
    categoryFilter: string;
    setCategoryFilter: (category: string) => void;
    availableCategories: string[];
    refresh: () => void;
};
export declare const useCollections: (namespace: string) => UseCollectionsResult;
