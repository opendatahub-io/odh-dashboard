import React from 'react';
import { TableText, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { EdgeModel, EdgeModelRun } from '~/concepts/edge/types';
import { relativeTime } from '~/utilities/time';
import { getPipelineRunThatOverrodeSelectedRun } from '~/concepts/edge/utils';
import { EdgeStatus } from './EdgeStatus';

type EdgeModelRunRowProps = {
  modelRun: EdgeModelRun;
  model: EdgeModel;
};

const EdgeModelRunRow: React.FC<EdgeModelRunRowProps> = ({ modelRun, model }) => {
  const createdTime = modelRun?.run.status?.startTime
    ? new Date(modelRun.run.status?.startTime)
    : undefined;

  const overwritten = getPipelineRunThatOverrodeSelectedRun(
    model.versions[modelRun.version], // fetch the version of the model that was used for this run
    modelRun,
  );

  return (
    <Tr>
      <Td dataLabel="Pipeline name">
        <TableText>
          <Link to={`/edgePipelines/pipelineRun/view/${modelRun.run.metadata.name}`}>
            {modelRun.run.metadata.name}
          </Link>
        </TableText>
      </Td>
      <Td dataLabel="Model">{modelRun.modelName}</Td>
      <Td dataLabel="Status">
        <EdgeStatus status={modelRun.status} run={modelRun.run} />
      </Td>
      <Td dataLabel="Created">
        {createdTime ? relativeTime(Date.now(), createdTime.getTime()) : ''}
      </Td>
      <Td dataLabel="Model container image URL">
        {modelRun.containerImageUrl &&
          (overwritten ? (
            <TableText>
              {`Output file overwritten by `}
              <Link to={`/edgePipelines/pipelineRun/view/${overwritten.run.metadata.name}`}>
                {overwritten.run.metadata.name}
              </Link>
            </TableText>
          ) : modelRun.containerImageUrl ? (
            <TableText>
              <a
                href={`https://${modelRun.containerImageUrl}:${modelRun.version}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {`${modelRun.containerImageUrl}:${modelRun.version}`}
                {'   '}
                <ExternalLinkAltIcon />
              </a>
            </TableText>
          ) : (
            ''
          ))}
      </Td>
    </Tr>
  );
};

export default EdgeModelRunRow;
