import { Label } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import React from 'react';
import { Link } from 'react-router';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import PipelinesTableRowTime from '#~/concepts/pipelines/content/tables/PipelinesTableRowTime';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { artifactsDetailsRoute } from '#~/routes/pipelines/artifacts';
import { ArtifactKF } from '#~/concepts/pipelines/kfTypes';
import {
  getArtifactResourceName,
  getIsArtifactResourceModelRegistered,
} from './artifactResourceUtils';

type ArtifactsTableRowProps = {
  artifact: ArtifactKF;
};

const ArtifactsTableRow: React.FC<ArtifactsTableRowProps> = ({ artifact }) => {
  const { namespace } = usePipelinesAPI();
  const { status: modelRegistryAvailable } = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY);
  return (
    <Tr key={artifact.artifact_id}>
      <Td dataLabel="Artifact">
        <Link to={artifactsDetailsRoute(namespace, artifact.artifact_id)}>
          {getArtifactResourceName(artifact)}
        </Link>
        {modelRegistryAvailable && getIsArtifactResourceModelRegistered(artifact) && (
          <>
            {' '}
            <Label variant="outline" color="green" isCompact data-testid="model-registered-label">
              Registered
            </Label>
          </>
        )}
      </Td>
      <Td dataLabel="ID">{artifact.artifact_id}</Td>
      <Td dataLabel="Type">{artifact.type}</Td>
      <Td dataLabel="URI">{artifact.uri || '-'}</Td>
      <Td dataLabel="Created">
        {artifact.created_at ? <PipelinesTableRowTime date={new Date(artifact.created_at)} /> : '-'}
      </Td>
    </Tr>
  );
};

export default ArtifactsTableRow;
