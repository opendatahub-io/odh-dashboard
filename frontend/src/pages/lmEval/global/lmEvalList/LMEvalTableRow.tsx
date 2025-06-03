import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { LMEvalKind } from '#~/k8sTypes';

type LMEvalTableRowType = {
  lmEval: LMEvalKind;
};

const LMEvalTableRow: React.FC<LMEvalTableRowType> = ({ lmEval }) => (
  <Tr>
    <Td dataLabel="Evaluation">{lmEval.metadata.name}</Td>
    <Td dataLabel="Model">{lmEval.spec.model}</Td>
    <Td dataLabel="Date">{lmEval.status?.completeTime}</Td>
    <Td dataLabel="Time">
      {lmEval.status?.completeTime && new Date(lmEval.status.completeTime).toLocaleTimeString()}
    </Td>
    <Td isActionCell>
      <ActionsColumn
        items={[
          {
            title: 'Download JSON',
            onClick: () => undefined,
          },
        ]}
      />
    </Td>
  </Tr>
);

export default LMEvalTableRow;
