import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Timestamp } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { LMEvalKind } from '#~/k8sTypes';
import { downloadString } from '#~/utilities/string';
import { LMEvalState } from '#~/pages/lmEval/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils.ts';
import LMEvalStatus from './lmEvalStatus/LMEvalStatus';
import { getLMEvalState } from './utils';

type LMEvalTableRowType = {
  lmEval: LMEvalKind;
  onDeleteLMEval: (lmEval: LMEvalKind) => void;
};

const LMEvalTableRow: React.FC<LMEvalTableRowType> = ({ lmEval, onDeleteLMEval }) => {
  const handleDownload = () => {
    downloadString(`${lmEval.metadata.name}.json`, lmEval.status?.results || '{}');
  };
  const currentState = getLMEvalState(lmEval.status);
  return (
    <Tr>
      <Td dataLabel="Evaluation">
        {currentState === LMEvalState.COMPLETE ? (
          <Link
            data-testid={`lm-eval-link-${lmEval.metadata.name}`}
            to={`/modelEvaluations/${lmEval.metadata.namespace}/${lmEval.metadata.name}`}
          >
            {getDisplayNameFromK8sResource(lmEval)}
          </Link>
        ) : (
          getDisplayNameFromK8sResource(lmEval)
        )}
      </Td>
      <Td dataLabel="Model">
        {lmEval.spec.modelArgs?.find((arg) => arg.name === 'model')?.value || '-'}
      </Td>
      <Td dataLabel="Evaluated">
        {lmEval.metadata.creationTimestamp ? (
          <Timestamp
            data-testid="evaluation-run-start-time"
            date={new Date(lmEval.metadata.creationTimestamp)}
          />
        ) : (
          'Unknown'
        )}
      </Td>
      <Td dataLabel="Status">
        <LMEvalStatus lmEval={lmEval} />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          data-testid="evaluation-run-actions"
          items={[
            ...(currentState === LMEvalState.COMPLETE && lmEval.status?.results
              ? [{ title: 'Download JSON', itemKey: 'download-json', onClick: handleDownload }]
              : []),
            { title: 'Delete', itemKey: 'lm-eval-delete', onClick: () => onDeleteLMEval(lmEval) },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default LMEvalTableRow;
