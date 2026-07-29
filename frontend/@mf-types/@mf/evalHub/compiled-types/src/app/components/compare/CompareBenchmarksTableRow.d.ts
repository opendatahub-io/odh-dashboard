import * as React from 'react';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import { EvaluationJob } from '~/app/types';
type CompareBenchmarksTableRowProps = {
    job: EvaluationJob;
    collectionNameMap: CollectionNameMap;
    rowIndex: number;
    searchText: string;
    selectedBenchmarkKeys: Set<string>;
    onSelectionChange: (selectionKeys: string[], checked: boolean) => void;
};
declare const CompareBenchmarksTableRow: React.FC<CompareBenchmarksTableRowProps>;
export default CompareBenchmarksTableRow;
