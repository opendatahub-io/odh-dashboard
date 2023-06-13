import * as React from 'react';
import { ActionsColumn, ExpandableRowContent, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import TableRowTitleDescription from '~/components/table/TableRowTitleDescription';
import {
  CoreResourcePipeline,
  RunCreated,
  RunDuration,
  RunStatus,
} from '~/concepts/pipelines/content/tables/renderUtils';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type ExperimentsTableRowExpandedRunCellsProps = {
  run: PipelineRunKF;
  onDelete: () => void;
};

const ExperimentsTableRowExpandedRunCells: React.FC<ExperimentsTableRowExpandedRunCellsProps> = ({
  run,
  onDelete,
}) => {
  const { namespace } = usePipelinesAPI();

  return (
    <>
      <Td>
        <ExpandableRowContent>
          <TableRowTitleDescription
            title={
              <Link to={`/pipelineRuns/${namespace}/pipelineRun/view/${run.id}`}>{run.name}</Link>
            }
            description={run.description}
            descriptionAsMarkdown
          />
        </ExpandableRowContent>
      </Td>
      <Td>
        <ExpandableRowContent>
          <CoreResourcePipeline resource={run} namespace={namespace} />
        </ExpandableRowContent>
      </Td>
      <Td>
        <ExpandableRowContent>
          <RunCreated run={run} />
        </ExpandableRowContent>
      </Td>
      <Td>
        <ExpandableRowContent>
          <RunDuration run={run} />
        </ExpandableRowContent>
      </Td>
      <Td>
        <ExpandableRowContent>
          <RunStatus justIcon run={run} />
        </ExpandableRowContent>
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
    </>
  );
};

export default ExperimentsTableRowExpandedRunCells;
