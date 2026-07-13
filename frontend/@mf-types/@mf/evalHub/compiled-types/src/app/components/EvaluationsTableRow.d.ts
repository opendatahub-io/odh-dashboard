import * as React from 'react';
import { EvaluationJob } from '~/app/types';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
type EvaluationsTableRowProps = {
    job: EvaluationJob;
    rowIndex: number;
    namespace: string;
    collectionNameMap: CollectionNameMap;
    onActionComplete: () => void;
    isSelected: boolean;
    onSelectionChange: (checked: boolean) => void;
};
declare const EvaluationsTableRow: React.FC<EvaluationsTableRowProps>;
export default EvaluationsTableRow;
