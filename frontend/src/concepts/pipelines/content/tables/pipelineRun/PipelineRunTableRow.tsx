import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Skeleton } from '@patternfly/react-core';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';

import {
  RunCreated,
  RunDuration,
  CoreResourceExperiment,
  CoreResourcePipeline,
  RunStatus,
} from '~/concepts/pipelines/content/tables/renderUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import CheckboxTd from '~/components/table/CheckboxTd';
import { GetJobInformation } from '~/concepts/pipelines/context/useJobRelatedInformation';
import PipelineRunTableRowTitle from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRowTitle';

type PipelineRunTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  onDelete: () => void;
  run: PipelineRunKF;
  getJobInformation: GetJobInformation;
};

const PipelineRunTableRow: React.FC<PipelineRunTableRowProps> = ({
  isChecked,
  onToggleCheck,
  onDelete,
  run,
  getJobInformation,
}) => {
  const { namespace } = usePipelinesAPI();
  const { loading, data } = getJobInformation(run);

  return (
    <Tr>
      <CheckboxTd id={run.id} isChecked={isChecked} onToggle={onToggleCheck} />
      <Td>
        <PipelineRunTableRowTitle resource={run} />
      </Td>
      <Td>
        <CoreResourceExperiment resource={run} />
      </Td>
      <Td>
        {loading ? (
          <Skeleton />
        ) : (
          <CoreResourcePipeline resource={data || run} namespace={namespace} />
        )}
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
