import React from 'react';
import { ExpandableRowContent, TableText, Td, Tr } from '@patternfly/react-table';
import { Button } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { EdgeModel } from '~/concepts/edge/types';
import { PipelineKind } from '~/k8sTypes';
import { relativeTime } from '~/utilities/time';
import { Table } from '~/components/table';
import { edgeModelRunColumns, edgePipelineColumns } from './const';
import EdgeModelRunRow from './EdgeModelRunRow';
import { EdgeStatus } from './EdgeStatus';

type EdgePipelineRowProps = {
  // an array of edge models that use the same pipeline
  models: EdgeModel[];
  pipeline: PipelineKind;
  onCreateRun: () => void;
  rowIndex: number;
};

const EdgePipelineRow: React.FC<EdgePipelineRowProps> = ({
  models,
  pipeline,
  onCreateRun,
  rowIndex,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // get runs from all models
  const sortedRuns = React.useMemo(
    () =>
      models
        .map((model) => Object.values(model.versions).map((version) => version.runs))
        .flat(2)
        .sort(
          (a, b) =>
            new Date(b.run.status?.startTime ?? '').getTime() -
            new Date(a.run.status?.startTime ?? '').getTime(),
        ),
    [models],
  );

  // used to get model from a model run
  const modelMap = models.reduce<{ [key: string]: EdgeModel }>((acc, model) => {
    acc[model.params.modelName] = model;
    return acc;
  }, {});

  // data for cols
  const lastRun = sortedRuns[0];
  const lastRunStartTime = lastRun?.run.status?.startTime
    ? new Date(lastRun.run.status?.startTime)
    : undefined;

  return (
    <>
      <Tr>
        <Td
          expand={
            sortedRuns.length > 0
              ? {
                  rowIndex,
                  isExpanded: isExpanded,
                  onToggle: () => setIsExpanded(!isExpanded),
                  expandId: 'composable-expandable-pipelines',
                }
              : undefined
          }
        />
        <Td dataLabel="Pipeline name">
          <TableText>
            <Link to={`/edgePipelines/pipeline/view/${pipeline.metadata.name}`}>
              {pipeline.metadata.name}
            </Link>
          </TableText>
        </Td>
        <Td dataLabel="Last run time">
          {lastRunStartTime ? relativeTime(Date.now(), lastRunStartTime.getTime()) : ''}
        </Td>
        <Td dataLabel="Last run status">
          <EdgeStatus status={lastRun.status} run={lastRun.run} />
        </Td>
        <Td dataLabel="Runs">{sortedRuns.length}</Td>
        <Td modifier="fitContent">
          <TableText>
            <Button
              variant="secondary"
              onClick={onCreateRun}
              isDisabled={sortedRuns.length === 0} // because runs collections are models, no runs means no models
            >
              Create run
            </Button>
          </TableText>
        </Td>
      </Tr>
      {isExpanded && (
        <Tr isExpanded={isExpanded}>
          <Td colSpan={edgePipelineColumns.length}>
            <ExpandableRowContent>
              <Table
                data={sortedRuns}
                columns={edgeModelRunColumns}
                rowRenderer={(modelRun) => (
                  <EdgeModelRunRow
                    key={modelRun.run.metadata.name}
                    model={modelMap[modelRun.modelName]}
                    modelRun={modelRun}
                  />
                )}
              />
            </ExpandableRowContent>
          </Td>
        </Tr>
      )}
    </>
  );
};

export default EdgePipelineRow;
