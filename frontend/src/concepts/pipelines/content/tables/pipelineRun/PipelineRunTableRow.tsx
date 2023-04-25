import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import TableRowTitleDescription from '~/components/table/TableRowTitleDescription';
import {
  RunCreated,
  RunDuration,
  RunLikeExperiment,
  RunLikePipeline,
  RunStatus,
} from '~/concepts/pipelines/content/tables/renderUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import CheckboxTd from '~/components/table/CheckboxTd';

type PipelineRunTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  onDelete: () => void;
  run: PipelineRunKF;
};

const PipelineRunTableRow: React.FC<PipelineRunTableRowProps> = ({
  isChecked,
  onToggleCheck,
  onDelete,
  run,
}) => {
  const { namespace } = usePipelinesAPI();

  return (
    <Tr>
      <CheckboxTd id={run.id} isChecked={isChecked} onToggle={onToggleCheck} />
      <Td>
        <TableRowTitleDescription title={run.name} description={run.description} />
      </Td>
      <Td>
        <RunLikeExperiment runLike={run} />
      </Td>
      <Td>
        <RunLikePipeline runLike={run} namespace={namespace} />
      </Td>
      <Td>
        <RunCreated run={run} />
      </Td>
      <Td>
        <RunDuration run={run} />
      </Td>
      <Td>
        <RunStatus justIcon run={run} />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Delete',
              onClick: () => {
                onDelete();
              },
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default PipelineRunTableRow;
