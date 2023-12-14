import React from 'react';
import { TableText, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { EdgeModelVersion } from '~/concepts/edge/types';
import { relativeTime } from '~/utilities/time';

type EdgeModeVersionRowProps = {
  version: EdgeModelVersion;
};

const EdgeModeVersionRow: React.FC<EdgeModeVersionRowProps> = ({ version }) => (
  <Tr>
    <Td dataLabel="Model container image">{`${version.modelName}:${version.version}`}</Td>
    <Td dataLabel="Image size">-</Td>
    <Td dataLabel="Created">
      {version.latestRun.run.metadata.creationTimestamp
        ? relativeTime(
            Date.now(),
            new Date(version.latestRun.run.metadata.creationTimestamp).getTime(),
          )
        : ''}
    </Td>
    <Td dataLabel="Pipeline run name">
      <TableText>
        <Link to={`/edgePipelines/pipelineRun/view/${version.latestRun.run.metadata.name}`}>
          {version.latestRun.run.metadata.name}
        </Link>
      </TableText>
    </Td>
    <Td dataLabel="Model container image URL">
      {version.latestSuccessfulRun ? (
        <TableText>
          <a
            href={`https://${version.latestSuccessfulRun?.containerImageUrl}:${version.version}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {`${version.latestSuccessfulRun?.containerImageUrl}:${version.version}`}
            {'   '}
            <ExternalLinkAltIcon />
          </a>
        </TableText>
      ) : (
        ''
      )}
    </Td>
  </Tr>
);

export default EdgeModeVersionRow;
