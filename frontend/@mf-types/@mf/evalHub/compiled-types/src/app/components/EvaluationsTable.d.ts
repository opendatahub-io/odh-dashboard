import * as React from 'react';
import { EvaluationJob } from '~/app/types';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
type EvaluationsTableProps = {
    evaluations: EvaluationJob[];
    loaded: boolean;
    namespace?: string;
    collectionNameMap: CollectionNameMap;
    collectionsLoaded: boolean;
    onRefresh: () => void;
};
declare const EvaluationsTable: React.FC<EvaluationsTableProps>;
export default EvaluationsTable;
