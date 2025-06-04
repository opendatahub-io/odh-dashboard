import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { LMEvalKind } from '#~/k8sTypes';
import { downloadString } from '#~/utilities/string';

type LMEvalTableRowType = {
  lmEval: LMEvalKind;
};

const LMEvalTableRow: React.FC<LMEvalTableRowType> = ({ lmEval }) => {
  const handleDownload = () => {
    const rawData = JSON.stringify(lmEval);
    downloadString(`${lmEval.metadata.name}.json`, rawData);
  };

  return (
    <Tr>
      <Td dataLabel="Evaluation">{lmEval.metadata.name}</Td>
      <Td dataLabel="Model">
        {lmEval.spec.modelArgs?.find((arg) => arg.name === 'model')?.value || '-'}
      </Td>
      <Td dataLabel="Date">{lmEval.status?.completeTime}</Td>
      <Td dataLabel="Time">
        {lmEval.status?.completeTime && new Date(lmEval.status.completeTime).toLocaleTimeString()}
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Download JSON',
              onClick: handleDownload,
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default LMEvalTableRow;
