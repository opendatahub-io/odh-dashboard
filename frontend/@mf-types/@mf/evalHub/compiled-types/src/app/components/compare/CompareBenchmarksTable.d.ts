import * as React from 'react';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import { EvaluationJob } from '~/app/types';
type CompareBenchmarksTableProps = {
    jobs: EvaluationJob[];
    collectionNameMap: CollectionNameMap;
    searchText: string;
    selectedBenchmarkKeys: Set<string>;
    onSelectionChange: (selectionKeys: string[], checked: boolean) => void;
};
declare const CompareBenchmarksTable: React.FC<CompareBenchmarksTableProps>;
export default CompareBenchmarksTable;
