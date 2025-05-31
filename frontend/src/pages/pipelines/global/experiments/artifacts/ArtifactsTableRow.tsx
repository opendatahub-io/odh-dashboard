import { Label } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import React from 'react';
import { Link } from 'react-router';
import { ArtifactUriLink } from '#~/concepts/pipelines/content/artifacts/ArtifactUriLink';
import PipelinesTableRowTime from '#~/concepts/pipelines/content/tables/PipelinesTableRowTime';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { artifactsDetailsRoute } from '#~/routes/pipelines/artifacts';
import { Artifact } from '#~/third_party/mlmd';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { getArtifactName, getIsArtifactModelRegistered } from './utils';

type ArtifactsTableRowProps = {
  artifact: Artifact;
};

const ArtifactsTableRow: React.FC<ArtifactsTableRowProps> = ({ artifact }) => {
  const { namespace } = usePipelinesAPI();
  const { status: modelRegistryAvailable } = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY);
  const isArtifactModelRegistered = modelRegistryAvailable
    ? getIsArtifactModelRegistered(artifact)
    : false;

  return (
    <Tr key={artifact.getId()}>
      <Td dataLabel="Artifact">
        <>
          <Link to={artifactsDetailsRoute(namespace, artifact.getId())}>
            {getArtifactName(artifact)}
          </Link>
          {isArtifactModelRegistered && (
            <>
              {' '}
              <Label color="green" isCompact data-testid="model-registered-label">
                Registered
              </Label>
            </>
          )}
        </>
      </Td>
      <Td dataLabel="ID">{artifact.getId()}</Td>
      <Td dataLabel="Type">{artifact.getType()}</Td>
      <Td dataLabel="URI">
        <ArtifactUriLink artifact={artifact} />
      </Td>
      <Td dataLabel="Created">
        <PipelinesTableRowTime date={new Date(artifact.getCreateTimeSinceEpoch())} />
      </Td>
    </Tr>
  );
};

export default ArtifactsTableRow;
