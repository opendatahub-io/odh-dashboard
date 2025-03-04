import React from 'react';
import { Link } from 'react-router';
import { modelVersionUrl } from '~/pages/modelRegistry/screens/routeUtils';
import { PipelineRunArtifactModelData } from './artifacts/types';

type PipelineRunRegisteredModelDeatilsProps = {
  artifactModelData: PipelineRunArtifactModelData;
};

const PipelineRunRegisteredModelDetails = ({
  artifactModelData,
}: PipelineRunRegisteredModelDeatilsProps): React.ReactNode => (
  <>
    <Link
      to={modelVersionUrl(
        artifactModelData.modelVersionId ?? '',
        artifactModelData.registeredModelId,
        artifactModelData.modelRegistryName,
      )}
    >
      {artifactModelData.registeredModelName}
    </Link>{' '}
    ({artifactModelData.modelVersionName ?? 'N/A'}) in{' '}
    <strong>{artifactModelData.modelRegistryName ?? 'N/A'}</strong> registry
  </>
);

export default PipelineRunRegisteredModelDetails;
