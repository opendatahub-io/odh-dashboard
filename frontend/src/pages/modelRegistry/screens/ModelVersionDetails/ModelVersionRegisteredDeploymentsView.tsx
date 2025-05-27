import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, Stack } from '@patternfly/react-core';
import InferenceServiceTable from '~/pages/modelServing/screens/global/InferenceServiceTable';
import { getVersionDetailsInferenceServiceColumns } from '~/pages/modelServing/screens/global/data';
import ModelVersionDetailsTabs from '~/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionDetailsTabs';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import EmptyModelRegistryState from '~/pages/modelRegistry/screens/components/EmptyModelRegistryState';

type ModelVersionRegisteredDeploymentsViewProps = Pick<
  React.ComponentProps<typeof ModelVersionDetailsTabs>,
  'inferenceServices' | 'servingRuntimes' | 'refresh'
>;

const ModelVersionRegisteredDeploymentsView: React.FC<
  ModelVersionRegisteredDeploymentsViewProps
> = ({ inferenceServices, servingRuntimes, refresh }) => {
  const isLoading = !inferenceServices.loaded || !servingRuntimes.loaded;

  if (!isLoading && !inferenceServices.data.items.length) {
    return (
      <EmptyModelRegistryState
        title="No deployments from model registry"
        headerIcon={() => (
          <img
            src={typedEmptyImage(ProjectObjectType.registeredModels, 'MissingDeployment')}
            alt="missing deployment"
          />
        )}
        description="No deployments initiated from model registry for this model version."
        testid="model-version-deployments-empty-state"
      />
    );
  }

  return (
    <Stack hasGutter>
      <Alert variant="info" isInline title="Filtered list: Deployments from model registry only">
        This list includes only deployments that were initiated from the model registry. To view and
        manage all of your deployments, go to the <Link to="/modelServing">Model Serving</Link>{' '}
        page.
      </Alert>

      <InferenceServiceTable
        isGlobal
        getColumns={getVersionDetailsInferenceServiceColumns}
        inferenceServices={inferenceServices.data.items}
        servingRuntimes={servingRuntimes.data.items}
        isLoading={isLoading}
        refresh={refresh}
      />
    </Stack>
  );
};

export default ModelVersionRegisteredDeploymentsView;
