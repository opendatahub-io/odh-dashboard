import React from 'react';
import { TableText, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { EdgeModel, EdgeModelRun } from '~/concepts/edge/types';
import { relativeTime } from '~/utilities/time';
import { isPipelineRunOutputOverridden } from '~/concepts/edge/utils';
import { EdgeStatus } from './EdgeStatus';

type EdgeModelRunRowProps = {
  modelRun: EdgeModelRun;
  model: EdgeModel;
};

const EdgeModelRunRow: React.FC<EdgeModelRunRowProps> = ({ modelRun, model }) => {
  const createdTime = modelRun?.run.status?.startTime
    ? new Date(modelRun.run.status?.startTime)
    : undefined;

  const isOverridden = isPipelineRunOutputOverridden(
    model.versions[modelRun.version], // fetch the version of the model that was used for this run
    modelRun,
  );

  return (
    <Tr>
      <Td dataLabel="Pipeline name">
        <TableText>
          <Link to={`/edgePipeline/pipelineRun/view/${modelRun.run.metadata.name}`}>
            {modelRun.run.metadata.name}
          </Link>
        </TableText>
      </Td>
      <Td dataLabel="Model">{modelRun.modelName}</Td>
      <Td dataLabel="Status">
        <EdgeStatus status={modelRun.status} />
      </Td>
      <Td dataLabel="Created">
        {createdTime ? relativeTime(Date.now(), createdTime.getTime()) : ''}
      </Td>
      <Td dataLabel="Model container image URL">
        {modelRun.containerImageUrl &&
          (isOverridden ? (
            <TableText>
              {`Output file overwritten by `}
              <Link to={`/edgePipeline/pipelineRun/view/${model.latestRun.run.metadata.name}`}>
                {model.latestRun.run.metadata.name}
              </Link>
            </TableText>
          ) : (
            <i>{`${modelRun.containerImageUrl}:${modelRun.version}`}</i>
          ))}
      </Td>
    </Tr>
  );
};

export default EdgeModelRunRow;
