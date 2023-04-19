import * as React from 'react';
import { Td, Tbody, Tr } from '@patternfly/react-table';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { relativeTime } from '~/utilities/time';
import usePipelineRuns from '~/concepts/pipelines/apiHooks/usePipelineRuns';
import TableRowTitleDescription from '~/components/TableRowTitleDescription';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelinesTableExpandedRow from '~/concepts/pipelines/content/pipelinesTable/PipelinesTableExpandedRow';
import { getLastRun } from '~/concepts/pipelines/content/pipelinesTable/utils';
import {
  NoRunContent,
  RunDuration,
  RunName,
  RunStatus,
} from '~/concepts/pipelines/content/pipelinesTable/runRenderUtils';

type PipelinesTableRowProps = {
  pipeline: PipelineKF;
  pipelineDetailsPath: (namespace: string, id: string) => string;
  rowIndex: number;
};

const PipelinesTableRow: React.FC<PipelinesTableRowProps> = ({
  pipeline,
  rowIndex,
  pipelineDetailsPath,
}) => {
  const { namespace } = usePipelinesAPI();
  const runsFetchState = usePipelineRuns(pipeline);
  const [isExpanded, setExpanded] = React.useState(false);

  const createdDate = new Date(pipeline.created_at);
  const lastRun = getLastRun(runsFetchState[0]);

  return (
    <>
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
              title={<Link to={pipelineDetailsPath(namespace, pipeline.id)}>{pipeline.name}</Link>}
              description={pipeline.description}
              descriptionAsMarkdown
            />
          </Td>
          <Td>{lastRun ? <RunName run={lastRun} /> : <NoRunContent />}</Td>
          <Td>{lastRun ? <RunStatus run={lastRun} /> : <NoRunContent />}</Td>
          <Td>{lastRun ? <RunDuration run={lastRun} /> : <NoRunContent />}</Td>
          <Td>
            <Timestamp date={createdDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
              {relativeTime(Date.now(), createdDate.getTime())}
            </Timestamp>
          </Td>
          <Td isActionCell>
            {/* TODO: https://github.com/opendatahub-io/odh-dashboard/issues/1063
          <ActionsColumn />
          */}
          </Td>
        </Tr>
      </Tbody>
      <PipelinesTableExpandedRow isExpanded={isExpanded} runsFetchState={runsFetchState} />
    </>
  );
};

export default PipelinesTableRow;
