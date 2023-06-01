import * as React from 'react';
import { Td, Tbody, Tr, ActionsColumn } from '@patternfly/react-table';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { relativeTime } from '~/utilities/time';
import usePipelineRunsForPipeline from '~/concepts/pipelines/apiHooks/usePipelineRunsForPipeline';
import TableRowTitleDescription from '~/components/table/TableRowTitleDescription';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelinesTableExpandedRow from '~/concepts/pipelines/content/tables/pipeline/PipelinesTableExpandedRow';
import { getLastRun } from '~/concepts/pipelines/content/tables/utils';
import {
  NoRunContent,
  RunDuration,
  RunNameForPipeline,
  RunStatus,
} from '~/concepts/pipelines/content/tables/renderUtils';

type PipelinesTableRowProps = {
  pipeline: PipelineKF;
  pipelineDetailsPath: (namespace: string, id: string) => string;
  rowIndex: number;
  onDeletePipeline: () => void;
};

const PipelinesTableRow: React.FC<PipelinesTableRowProps> = ({
  pipeline,
  rowIndex,
  pipelineDetailsPath,
  onDeletePipeline,
}) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const runsFetchState = usePipelineRunsForPipeline(pipeline);
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
          <Td>{lastRun ? <RunNameForPipeline run={lastRun} /> : <NoRunContent />}</Td>
          <Td>{lastRun ? <RunStatus run={lastRun} /> : <NoRunContent />}</Td>
          <Td>{lastRun ? <RunDuration run={lastRun} /> : <NoRunContent />}</Td>
          <Td>
            <span style={{ whiteSpace: 'nowrap' }}>
              <Timestamp
                date={createdDate}
                tooltip={{
                  variant: TimestampTooltipVariant.default,
                }}
              >
                {relativeTime(Date.now(), createdDate.getTime())}
              </Timestamp>
            </span>
          </Td>
          <Td isActionCell>
            <ActionsColumn
              items={[
                {
                  title: 'Create run',
                  onClick: () => {
                    navigate(`/pipelines/${namespace}/pipelineRun/create`, {
                      state: { lastPipeline: pipeline },
                    });
                  },
                },
                {
                  title: 'View all runs',
                  onClick: () => {
                    navigate(`/pipelineRuns/${namespace}`);
                  },
                },
                {
                  isSeparator: true,
                },
                {
                  title: 'Delete pipeline',
                  onClick: () => {
                    onDeletePipeline();
                  },
                },
              ]}
            />
          </Td>
        </Tr>
      </Tbody>
      <PipelinesTableExpandedRow
        isExpanded={isExpanded}
        runsFetchState={runsFetchState}
        pipeline={pipeline}
      />
    </>
  );
};

export default PipelinesTableRow;
