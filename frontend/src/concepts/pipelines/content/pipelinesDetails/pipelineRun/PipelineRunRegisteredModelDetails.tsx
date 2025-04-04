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
  <div data-testid="registered-model-details">
    <strong>
      <Link
        to={modelVersionUrl(
          artifactModelData.modelVersionId ?? '',
          artifactModelData.registeredModelId,
          artifactModelData.modelRegistryName,
        )}
        data-testid="model-version-link"
      >
        {artifactModelData.registeredModelName} ({artifactModelData.modelVersionName ?? 'N/A'})
      </Link>
    </strong>{' '}
    in <strong>{artifactModelData.modelRegistryName ?? 'N/A'}</strong> registry
  </div>
);

export default PipelineRunRegisteredModelDetails;
