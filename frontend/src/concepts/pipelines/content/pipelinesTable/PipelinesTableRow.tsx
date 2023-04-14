import * as React from 'react';
import { Td, Tbody, Tr, ExpandableRowContent } from '@patternfly/react-table';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { relativeTime } from '~/utilities/time';
import usePipelineRuns from '~/concepts/pipelines/apiHooks/usePipelineRuns';
import TableRowTitleDescription from '~/components/TableRowTitleDescription';

type PipelinesTableRowProps = {
  pipeline: PipelineKF;
  rowIndex: number;
};

const PipelinesTableRow: React.FC<PipelinesTableRowProps> = ({ pipeline, rowIndex }) => {
  const [runs, loaded] = usePipelineRuns(pipeline);
  const [isExpanded, setExpanded] = React.useState(false);

  const createdDate = new Date(pipeline.created_at);

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr>
        <Td
          expand={{
            rowIndex,
            expandId: 'pipeline-row-item',
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />
        <Td dataLabel="Name">
          <TableRowTitleDescription
            title={pipeline.name}
            description={pipeline.description}
            descriptionAsMarkdown
          />
        </Td>
        <Td>-</Td>
        <Td>-</Td>
        <Td>-</Td>
        <Td>
          <Timestamp date={createdDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
            {relativeTime(Date.now(), createdDate.getTime())}
          </Timestamp>
        </Td>
        <Td isActionCell>
          {/* TODO: https://github.com/opendatahub-io/odh-dashboard/issues/1058
          <ActionsColumn />
          */}
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td />
        {/* TODO: https://github.com/opendatahub-io/odh-dashboard/issues/1058 */}
        <Td colSpan={6}>
          <ExpandableRowContent>
            {loaded
              ? `TBD Runs Information. ${runs.length} run${
                  runs.length === 1 ? '' : 's'
                } to display.`
              : 'Loading...'}
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default PipelinesTableRow;
