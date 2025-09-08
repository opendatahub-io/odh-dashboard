import * as React from 'react';
import { Grid, GridItem, Stack } from '@patternfly/react-core';
import { RegisteredModel } from '~/app/types';
import ModelDetailsCard from './ModelDetailsCard';
import ModelVersionsCard from './ModelVersionsCard';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isModelDetailsDeploymentCardExtension } from '~/odh/extension-points';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { useParams } from 'react-router';

type ModelDetailsViewProps = {
  registeredModel: RegisteredModel;
  refresh: () => void;
  isArchiveModel?: boolean;
};

const ModelDetailsView: React.FC<ModelDetailsViewProps> = ({
  registeredModel: rm,
  refresh,
  isArchiveModel,
}) => {
  const { modelRegistry } = useParams<{ modelRegistry: string }>();
  const modelDetailsDeploymentCardExtention = useExtensions(isModelDetailsDeploymentCardExtension);
  const deploymentCard = modelDetailsDeploymentCardExtention.map((extension) => (
    <LazyCodeRefComponent
      key={extension.uid}
      component={extension.properties.component}
      props={{ mrName: modelRegistry, rmId: rm.id }}
    />
  ));

  return (
    <Grid hasGutter>
      <GridItem span={12} lg={8}>
        <ModelDetailsCard registeredModel={rm} refresh={refresh} isArchiveModel={isArchiveModel} />
      </GridItem>
      <GridItem span={12} lg={4}>
        <Stack hasGutter>
          <ModelVersionsCard rm={rm} isArchiveModel={isArchiveModel} />
          {deploymentCard}
        </Stack>
      </GridItem>
    </Grid>
  );
};

export default ModelDetailsView;
