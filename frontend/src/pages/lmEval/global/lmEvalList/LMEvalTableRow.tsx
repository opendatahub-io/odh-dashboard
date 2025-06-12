import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Timestamp } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { LMEvalKind } from '#~/k8sTypes';
import { downloadString } from '#~/utilities/string';
import { LMEvalState } from '#~/pages/lmEval/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils.ts';
import LMEvalStatus from './LMEvalStatus';

type LMEvalTableRowType = {
  lmEval: LMEvalKind;
  onDeleteLMEval: (lmEval: LMEvalKind) => void;
};

const LMEvalTableRow: React.FC<LMEvalTableRowType> = ({ lmEval }) => {
  const handleDownload = () => {
    downloadString(`${lmEval.metadata.name}.json`, lmEval.status?.results || '{}');
  };
  return (
    <Tr>
      <Td dataLabel="Evaluation">
        <Link
          data-testid={`lm-eval-link-${lmEval.metadata.name}`}
          to={`/modelEvaluation/${lmEval.metadata.namespace}/${lmEval.metadata.name}`}
        >
          {getDisplayNameFromK8sResource(lmEval)}
        </Link>
      </Td>
      <Td dataLabel="Model">
        {lmEval.spec.modelArgs?.find((arg) => arg.name === 'model')?.value || '-'}
      </Td>
      <Td dataLabel="Evaluated">
        {lmEval.metadata.creationTimestamp ? (
          <Timestamp date={new Date(lmEval.metadata.creationTimestamp)} />
        ) : (
          'Unknown'
        )}
      </Td>
      <Td dataLabel="Status">
        <LMEvalStatus status={lmEval.status} />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            ...(lmEval.status?.state === LMEvalState.COMPLETE && lmEval.status.results
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
